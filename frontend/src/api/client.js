/* API client — all fetch calls to the FastAPI backend centralised here */

const BASE = import.meta.env.VITE_API_BASE_URL || "";

async function _handleResponse(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let detail = null;
    try {
      const j = await res.json();
      detail = j.detail;
      msg = (typeof detail === "object" && detail !== null) ? (detail.message || msg) : (detail || j.message || msg);
    } catch {}
    const err = new Error(msg);
    err.detail = detail;
    throw err;
  }
  return res.json();
}

/** Upload a CSV or XLSX file. Returns { session_id, profile, filename } */
export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: form });
  return _handleResponse(res);
}

/** Trigger the auto-cleaning pipeline. Returns { report, cleaned_profile } */
export async function cleanData(sessionId) {
  const form = new FormData();
  form.append("session_id", sessionId);
  const res = await fetch(`${BASE}/api/clean`, { method: "POST", body: form });
  return _handleResponse(res);
}

/** Ask the LLM a question. Returns { answer } */
export async function chatWithData({ sessionId, question, modelName = "gemini-2.0-flash", useCleaned = true }) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id:   sessionId,
      question:     question,
      model_name:   modelName,
      use_cleaned:  useCleaned,
    }),
  });
  return _handleResponse(res);
}

/** Generate a chart PNG (base64) from a question. Returns { chart, spec } */
export async function generateChart({ sessionId, question, modelName = "gemini-2.0-flash", useCleaned = true }) {
  const res = await fetch(`${BASE}/api/chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id:   sessionId,
      question:     question,
      model_name:   modelName,
      use_cleaned:  useCleaned,
    }),
  });
  return _handleResponse(res);
}

/** Generate a chart manually — user picks columns & chart type. Returns { chart, error } */
export async function generateManualChart({ sessionId, chartType, xColumn, yColumn, hueColumn, title, useCleaned = true }) {
  const res = await fetch(`${BASE}/api/manual-chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id:   sessionId,
      chart_type:   chartType,
      x_column:     xColumn,
      y_column:     yColumn,
      hue_column:   hueColumn,
      title:        title,
      use_cleaned:  useCleaned,
    }),
  });
  return _handleResponse(res);
}

/** Download the cleaned Excel — triggers a browser download */
export function downloadCleanedExcel(sessionId) {
  const url = `${BASE}/api/download?session_id=${encodeURIComponent(sessionId)}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = "cleaned_data.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
