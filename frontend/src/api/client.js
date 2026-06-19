/* API client — all fetch calls to the FastAPI backend centralised here */

const BASE = ""; // Vite proxies /api/* → http://localhost:8000

async function _handleResponse(res) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j.detail || j.message || msg; } catch {}
    throw new Error(msg);
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
export async function chatWithData({ sessionId, question, apiKey, modelName = "gpt-4o", useCleaned = true }) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id:   sessionId,
      question:     question,
      api_key:      apiKey,
      model_name:   modelName,
      use_cleaned:  useCleaned,
    }),
  });
  return _handleResponse(res);
}

/** Generate a chart PNG (base64) from a question. Returns { chart, spec } */
export async function generateChart({ sessionId, question, apiKey, modelName = "gpt-4o", useCleaned = true }) {
  const res = await fetch(`${BASE}/api/chart`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id:   sessionId,
      question:     question,
      api_key:      apiKey,
      model_name:   modelName,
      use_cleaned:  useCleaned,
    }),
  });
  return _handleResponse(res);
}

/** Download the cleaned CSV — triggers a browser download */
export function downloadCleanedCSV(sessionId) {
  const url = `${BASE}/api/download?session_id=${encodeURIComponent(sessionId)}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = "cleaned_data.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
