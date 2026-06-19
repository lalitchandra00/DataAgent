"""main.py — FastAPI application entry point for DataAgent.

Routes:
  POST /api/upload    — parse uploaded file, return profile
  POST /api/clean     — run auto-cleaning pipeline, return report
  POST /api/chat      — LLM Q&A about the dataset
  POST /api/chart     — generate chart PNG from a question
  GET  /api/download  — download cleaned CSV
  GET  /               — health check
"""

from __future__ import annotations

import base64
import uuid
from typing import Any

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

from chart_builder import build_chart_png
from data_handler import auto_clean, dataframe_to_csv_bytes, load_file, profile_dataframe
from llm_agent import get_or_create_agent, infer_chart_spec, reset_agent

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="DataAgent API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # React dev server + production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store: session_id → DataFrame (raw and cleaned)
_raw_frames:     dict[str, pd.DataFrame] = {}
_cleaned_frames: dict[str, pd.DataFrame] = {}


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
def health():
    return {"status": "ok", "service": "DataAgent API"}


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)) -> dict[str, Any]:
    """Accept a CSV or XLSX file and return its profile + a session_id."""

    allowed = {".csv", ".xlsx", ".xls"}
    import os
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Use .csv or .xlsx.")

    file_bytes = await file.read()
    try:
        df = load_file(file_bytes, file.filename or "upload.csv")
    except Exception as exc:
        raise HTTPException(422, f"Could not parse file: {exc}") from exc

    session_id = str(uuid.uuid4())
    _raw_frames[session_id]     = df
    _cleaned_frames[session_id] = df.copy()   # will be overwritten on /clean
    reset_agent(session_id)

    profile = profile_dataframe(df)
    return {"session_id": session_id, "profile": profile, "filename": file.filename}


# ---------------------------------------------------------------------------
# Clean
# ---------------------------------------------------------------------------

@app.post("/api/clean")
def clean_data(session_id: str = Form(...)) -> dict[str, Any]:
    """Run the automated cleaning pipeline on the uploaded dataset."""

    df = _get_frame(session_id, raw=True)
    cleaned_df, report = auto_clean(df)
    _cleaned_frames[session_id] = cleaned_df

    cleaned_profile = profile_dataframe(cleaned_df)
    return {"report": report, "cleaned_profile": cleaned_profile}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    session_id: str
    question: str
    api_key: str
    model_name: str = "gemini-1.5-flash"
    use_cleaned: bool = True


@app.post("/api/chat")
def chat(req: ChatRequest) -> dict[str, Any]:
    """Send a user question to the LLM agent and return the answer."""

    df = _get_frame(req.session_id, raw=not req.use_cleaned)

    try:
        agent = get_or_create_agent(req.session_id, req.api_key, req.model_name, df)
        answer = agent.ask(req.question)
    except Exception as exc:
        raise HTTPException(500, f"LLM error: {exc}") from exc

    return {"answer": answer}


# ---------------------------------------------------------------------------
# Chart
# ---------------------------------------------------------------------------

class ChartRequest(BaseModel):
    session_id: str
    question: str
    api_key: str
    model_name: str = "gemini-1.5-flash"
    use_cleaned: bool = True


@app.post("/api/chart")
def generate_chart(req: ChartRequest) -> dict[str, Any]:
    """Infer a chart spec from the user question and return a base64-encoded PNG."""

    df = _get_frame(req.session_id, raw=not req.use_cleaned)

    spec = infer_chart_spec(req.question, df, req.api_key, req.model_name)
    if not spec:
        return {"chart": None, "message": "No chart applicable for this question."}

    png_bytes = build_chart_png(spec, df)
    if not png_bytes:
        return {"chart": None, "message": "Chart could not be rendered."}

    encoded = base64.b64encode(png_bytes).decode("utf-8")
    return {"chart": encoded, "spec": spec}


# ---------------------------------------------------------------------------
# Download cleaned CSV
# ---------------------------------------------------------------------------

@app.get("/api/download")
def download_csv(session_id: str) -> StreamingResponse:
    """Return the cleaned DataFrame as a downloadable CSV."""

    df = _get_frame(session_id, raw=False)
    csv_bytes = dataframe_to_csv_bytes(df)

    import io
    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cleaned_data.csv"},
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_frame(session_id: str, *, raw: bool) -> pd.DataFrame:
    store = _raw_frames if raw else _cleaned_frames
    df = store.get(session_id)
    if df is None:
        raise HTTPException(404, "Session not found. Please upload a file first.")
    return df


# ---------------------------------------------------------------------------
# Dev entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

