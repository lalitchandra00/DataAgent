# DataAgent 🧹

> **AI-powered automated data cleaning and LLM-driven dataset analysis.**  
> Upload a `.csv` or `.xlsx` file, let the automated pipeline clean it, then chat with an LLM that knows your data inside-out.

[![Live App](https://img.shields.io/badge/Frontend-Live_App-7c3aed?style=for-the-badge&logo=vercel)](https://data-agent-sigma.vercel.app/)
[![API](https://img.shields.io/badge/Backend-API-06b6d4?style=for-the-badge&logo=render)](https://dataagent-7h81.onrender.com/)

---

## Deployment

| Layer | URL |
|-------|-----|
| **Frontend** (Vercel) | [https://data-agent-sigma.vercel.app/](https://data-agent-sigma.vercel.app/) |
| **Backend** (Render)  | [https://dataagent-7h81.onrender.com/](https://dataagent-7h81.onrender.com/) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite (plain CSS, dark theme) |
| Backend | Python 3.11+ · FastAPI · uvicorn |
| Data | pandas · numpy · openpyxl · scipy |
| Charts | matplotlib · seaborn (dark-themed) |
| LLM | Google Gemini API (gemini-2.0-flash / 2.5-pro) |

---

## Features

- **Upload & Profile** — Drag-and-drop CSV/XLSX upload with instant dataset overview (row count, column types, missing values, memory usage, and a 30-row preview table).
- **Automated Cleaning** — One-click pipeline: removes duplicates, strips whitespace, fills numeric NaNs with median, fills categorical NaNs with mode, and flags statistical outliers via the 1.5×IQR rule.
- **LLM Chat** — Conversational Q&A with a Gemini-powered agent that is context-aware of your dataset. Ask about trends, correlations, anomalies, or distributions.
- **AI Chart Inference** — Let the LLM suggest and render the best chart for your question (line, bar, scatter, histogram, box, or heatmap).
- **Manual Chart Builder** — Pick columns and chart type yourself via an intuitive UI — no AI needed.
- **Export** — Download the cleaned dataset as an Excel (`.xlsx`) file.

---

## Project Structure

```
DataAgent/
├── backend/
│   ├── main.py              FastAPI routes
│   ├── data_handler.py      File parsing + cleaning pipeline
│   ├── llm_agent.py         LLM chat agent + chart spec inference
│   ├── chart_builder.py     matplotlib/seaborn → PNG bytes
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css        Design system (dark theme)
│   │   ├── api/client.js    All API calls
│   │   └── components/
│   │       ├── Sidebar.jsx
│   │       ├── UploadPanel.jsx
│   │       ├── DataOverview.jsx
│   │       ├── CleaningReport.jsx
│   │       ├── ChatPanel.jsx
│   │       └── GraphPanel.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── start.bat                One-click local launcher (Windows)
├── test_dataset.csv
└── README.md
```

---

## Quick Start (Local Development)

### 1 — Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# → API running at http://localhost:8000
```

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev
# → App running at http://localhost:5173
```

### 3 — Configure Environment

| File | Variable | Description |
|------|----------|-------------|
| `backend/.env` | `GEMINI_API_KEY` | Your Gemini API key from [aistudio.google.com](https://aistudio.google.com/) |
| `backend/.env` | `FRONTEND_URL` | (Optional) CORS origin — defaults to `localhost:5173` |
| `frontend/.env` | `VITE_API_BASE_URL` | Backend URL — omit for local dev (uses Vite proxy) |

### 4 — Use the App

1. Open [http://localhost:5173](http://localhost:5173)
2. Drag-and-drop a `.csv` or `.xlsx` file
3. Review the dataset overview
4. Click **Run Cleaner** to auto-clean
5. Download the cleaned Excel file
6. Chat with your data in natural language
7. Build custom graphs from your columns

> On Windows, simply run `start.bat` to launch both servers simultaneously.

---

## Cleaning Pipeline

| Step | Action |
|------|--------|
| 1 | Remove fully-duplicate rows |
| 2 | Strip leading/trailing whitespace from string columns |
| 3 | Fill numeric NaN values with column **median** |
| 4 | Fill categorical NaN values with column **mode** |
| 5 | Flag outliers via 1.5×IQR rule (adds `_outlier_*` columns) |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/upload` | Upload CSV/XLSX — returns profile + session_id |
| `POST` | `/api/clean` | Run automated cleaning pipeline |
| `POST` | `/api/chat` | LLM Q&A about the dataset |
| `POST` | `/api/chart` | AI-inferred chart as base64 PNG |
| `POST` | `/api/manual-chart` | Manual chart from user-selected columns |
| `GET` | `/api/download` | Download cleaned dataset as `.xlsx` |
