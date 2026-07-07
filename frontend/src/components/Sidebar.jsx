import { useState } from "react";

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash",   label: "Gemini 2.0 Flash (Fast)" },
  { value: "gemini-2.5-flash",   label: "Gemini 2.5 Flash" },
  { value: "gemini-1.5-flash",   label: "Gemini 1.5 Flash" },
  { value: "gemini-2.5-pro",     label: "Gemini 2.5 Pro (Smart)" },
  { value: "gemini-1.5-pro",     label: "Gemini 1.5 Pro" },
];

export default function Sidebar({ modelName, setModelName, useCleaned, setUseCleaned, exhaustedModels = {}, isOpen, onClose }) {
  const [customModel, setCustomModel] = useState(false);

  function handleModelSelect(e) {
    const val = e.target.value;
    if (val === "__custom__") {
      setCustomModel(true);
      setModelName("");
    } else {
      setCustomModel(false);
      setModelName(val);
    }
  }

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      {/* Brand */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div style={{
              width: 34, height: 34,
              borderRadius: 8,
              background: "var(--accent-grad)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem",
            }}>🧹</div>
            <h2 style={{ fontSize: "1.1rem" }}>DataAgent</h2>
          </div>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>
        <p style={{ fontSize: ".72rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          AI-powered data cleaning &amp; insights
        </p>
        <div style={{
          marginTop: ".5rem",
          display: "inline-flex",
          alignItems: "center",
          gap: ".35rem",
          background: "rgba(66,133,244,.12)",
          border: "1px solid rgba(66,133,244,.3)",
          borderRadius: 6,
          padding: ".2rem .55rem",
          fontSize: ".68rem",
          color: "#4285f4",
          fontWeight: 600,
        }}>
          <span>✦</span> Powered by Gemini
        </div>
      </div>

      <div className="divider" style={{ margin: 0 }} />

      {/* Model */}
      <div>
        <label style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: ".5rem" }}>
          Model
        </label>
        {!customModel ? (
          <div style={{ display: "flex", flexDirection: "column", gap: ".35rem" }}>
            <select
              id="model-select"
              className="input"
              value={GEMINI_MODELS.find(m => m.value === modelName) ? modelName : "__custom__"}
              onChange={handleModelSelect}
              style={{ cursor: "pointer" }}
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.value} value={m.value}>
                  {exhaustedModels[m.value] ? "🔴 " : ""}{m.label} {exhaustedModels[m.value] ? "(Quota Exhausted)" : ""}
                </option>
              ))}
              <option value="__custom__">Custom model name…</option>
            </select>
            {exhaustedModels[modelName] && (
              <p style={{ fontSize: ".7rem", color: "var(--warn, #f59e0b)", marginTop: ".15rem", display: "flex", alignItems: "center", gap: ".25rem" }}>
                <span>⚠️</span> Quota exhausted. Try selecting a different model.
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: ".4rem" }}>
            <input
              id="model-name-input"
              className="input"
              type="text"
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              placeholder="gemini-2.0-flash"
              autoFocus
            />
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: ".72rem" }}
              onClick={() => { setCustomModel(false); setModelName("gemini-2.0-flash"); }}
            >
              ← Back to presets
            </button>
          </div>
        )}
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", flexDirection: "column", gap: ".85rem" }}>
        <label style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Options
        </label>
        <Toggle id="use-cleaned-toggle" label="Use cleaned data" checked={useCleaned} onChange={setUseCleaned} />
      </div>

      <div style={{ flex: 1 }} />

      {/* Flow steps */}
      <div style={{
        background: "var(--bg-card2)",
        borderRadius: "var(--radius-sm)",
        padding: ".75rem .9rem",
        border: "1px solid var(--border)",
      }}>
        <p style={{ fontSize: ".65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: ".5rem", fontWeight: 600 }}>
          Workflow
        </p>
        {[
          { num: "1", label: "Upload data" },
          { num: "2", label: "View overview" },
          { num: "3", label: "Clean dataset" },
          { num: "4", label: "Chat with AI" },
          { num: "5", label: "Build graphs" },
        ].map(s => (
          <div key={s.num} className="flex items-center gap-2" style={{ marginBottom: ".3rem", fontSize: ".72rem" }}>
            <span style={{
              width: 18, height: 18, borderRadius: "50%",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: ".6rem", fontWeight: 700, color: "var(--text-muted)",
              flexShrink: 0,
            }}>{s.num}</span>
            <span style={{ color: "var(--text-secondary)" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{ fontSize: ".65rem", color: "var(--text-muted)", lineHeight: 1.6, marginTop: ".25rem" }}>
        No data ever leaves your machine — all processing is local.
      </p>
    </aside>
  );
}

function Toggle({ id, label, checked, onChange }) {
  return (
    <label htmlFor={id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: ".75rem" }}>
      <span style={{ fontSize: ".82rem", color: "var(--text-primary)" }}>{label}</span>
      <div
        id={id}
        onClick={() => onChange(v => !v)}
        role="switch"
        aria-checked={checked}
        style={{
          width: 38, height: 22,
          borderRadius: 99,
          background: checked ? "var(--accent)" : "var(--border)",
          position: "relative",
          transition: "background .2s",
          flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute",
          top: 3, left: checked ? 18 : 3,
          width: 16, height: 16,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .2s",
          boxShadow: "0 1px 4px rgba(0,0,0,.3)",
        }} />
      </div>
    </label>
  );
}
