"""llm_agent.py — LLM chat agent and chart spec inference.

Uses the Google Gen AI Python SDK (google-genai >= 1.0).
Supports any Gemini model (e.g. gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash).
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np
import pandas as pd
from google import genai
from google.genai import types


# ---------------------------------------------------------------------------
# Dataset context builder
# ---------------------------------------------------------------------------

def _build_context(df: pd.DataFrame) -> str:
    """Produce a compact textual profile to inject into the LLM prompt."""
    lines: list[str] = [
        f"Rows: {len(df)}, Columns: {len(df.columns)}",
        f"Column names & dtypes: {', '.join(f'{c}({t})' for c, t in df.dtypes.items())}",
    ]

    numeric = df.select_dtypes(include=np.number)
    if not numeric.empty:
        lines.append("Numeric summary:")
        lines.append(numeric.describe().round(3).to_string())

    cat_cols = df.select_dtypes(include="object").columns
    if len(cat_cols):
        lines.append("Categorical top values:")
        for col in cat_cols[:6]:  # limit to avoid huge prompts
            top = df[col].value_counts().head(5).to_dict()
            lines.append(f"  {col}: {top}")

    lines.append("Sample rows (first 8):")
    lines.append(df.head(8).to_string(index=False))

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Chat agent
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are DataAgent, an expert data analyst AI. "
    "You have been given a dataset and must answer the user's questions accurately. "
    "Always reference specific column names, numbers, and statistics from the dataset. "
    "Be concise but thorough. Format numbers clearly. "
    "If asked about trends, correlations, or patterns, explain them with supporting data."
)


@dataclass
class DataChatAgent:
    """Wraps a Gemini client to answer questions about a DataFrame."""

    api_key: str
    model_name: str
    dataframe: pd.DataFrame
    _chat: Any = field(default=None, init=False, repr=False)
    _context_injected: bool = field(default=False, init=False, repr=False)

    def _get_chat(self):
        """Lazily create or reuse the Gemini chat session."""
        if self._chat is None:
            client = genai.Client(api_key=self.api_key)
            self._chat = client.chats.create(
                model=self.model_name,
                config=types.GenerateContentConfig(
                    system_instruction=_SYSTEM_PROMPT,
                    temperature=0.2,
                ),
            )
        return self._chat

    def ask(self, question: str) -> str:
        """Send a user question, maintain conversation history, return answer text."""
        chat = self._get_chat()

        if not self._context_injected:
            context = _build_context(self.dataframe)
            first_content = (
                f"Here is the dataset I want to discuss:\n\n{context}\n\n"
                f"My first question: {question.strip()}"
            )
            self._context_injected = True
            response = chat.send_message(first_content)
        else:
            response = chat.send_message(question.strip())

        return response.text.strip()


# ---------------------------------------------------------------------------
# Agent factory (one agent per session stored server-side in memory)
# ---------------------------------------------------------------------------

_agents: dict[str, DataChatAgent] = {}


def get_or_create_agent(
    session_id: str,
    api_key: str,
    model_name: str,
    df: pd.DataFrame,
) -> DataChatAgent:
    """Return an existing agent for this session or create a new one."""
    if session_id not in _agents or _agents[session_id].dataframe is not df:
        _agents[session_id] = DataChatAgent(
            api_key=api_key, model_name=model_name, dataframe=df
        )
    return _agents[session_id]


def reset_agent(session_id: str) -> None:
    """Clear the agent for a session (e.g. on new file upload)."""
    _agents.pop(session_id, None)


# ---------------------------------------------------------------------------
# Chart spec inference
# ---------------------------------------------------------------------------

_CHART_SCHEMA = (
    '{"make_chart": bool, '
    '"chart_type": "line|bar|scatter|hist|box|heatmap", '
    '"x": "<column_name_or_empty>", '
    '"y": "<column_name_or_empty>", '
    '"hue": "<column_name_or_empty>", '
    '"title": "<short title>"}'
)


def infer_chart_spec(
    question: str,
    df: pd.DataFrame,
    api_key: str,
    model_name: str,
) -> dict[str, Any] | None:
    """Ask Gemini to derive a chart specification from a natural-language question."""

    schema = ", ".join(f"{c}:{t}" for c, t in df.dtypes.items())
    prompt = (
        "You are a chart planner for a data analysis app. "
        "Given a question and a dataset schema, return ONLY a JSON object with this exact shape:\n"
        f"{_CHART_SCHEMA}\n\n"
        "Rules:\n"
        "- Set make_chart=false if no visualisation is appropriate.\n"
        "- x and y must be column names that exist in the schema (or empty string).\n"
        "- hue should be a categorical column or empty string.\n"
        "- For correlation questions, use heatmap.\n"
        "- For distributions, use hist.\n"
        "- Always set make_chart=true if a chart would be helpful.\n\n"
        f"Dataset schema: {schema}\n"
        f"Question: {question}\n\n"
        "Return ONLY valid JSON, no explanation, no markdown code fences."
    )

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction="You are a JSON-only chart planner. Return only valid JSON.",
            temperature=0,
            response_mime_type="application/json",
        ),
    )
    raw = (response.text or "").strip()

    try:
        spec = _extract_json(raw)
    except Exception:
        return None

    if not isinstance(spec, dict) or not spec.get("make_chart"):
        return None
    return spec


def _extract_json(text: str) -> Any:
    """Strip markdown code fences then parse JSON."""
    cleaned = re.sub(r"^```[a-z]*\n?", "", text.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"```$", "", cleaned.strip())
    return json.loads(cleaned.strip())
