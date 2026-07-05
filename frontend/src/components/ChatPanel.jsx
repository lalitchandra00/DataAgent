import { useEffect, useRef, useState } from "react";
import { chatWithData } from "../api/client";

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className="flex"
      style={{
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: ".75rem",
        animation: "fadeUp .25s ease both",
      }}
    >
      {!isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "var(--accent-grad)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: ".8rem", flexShrink: 0, marginRight: ".6rem", marginTop: 2,
        }}>🤖</div>
      )}
      <div style={{ maxWidth: "78%" }}>
        <div style={{
          background: isUser ? "var(--accent)" : "var(--bg-card2)",
          border: `1px solid ${isUser ? "transparent" : "var(--border)"}`,
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: ".65rem 1rem",
          fontSize: ".855rem",
          lineHeight: 1.6,
          color: isUser ? "#fff" : "var(--text-primary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize: ".67rem", color: "var(--text-muted)", marginTop: ".25rem",
          textAlign: isUser ? "right" : "left" }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
      {isUser && (
        <div style={{
          width: 30, height: 30, borderRadius: "50%",
          background: "var(--bg-card2)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: ".8rem", flexShrink: 0, marginLeft: ".6rem", marginTop: 2,
        }}>👤</div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex" style={{ marginBottom: ".75rem" }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: "var(--accent-grad)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: ".8rem", flexShrink: 0, marginRight: ".6rem",
      }}>🤖</div>
      <div style={{
        background: "var(--bg-card2)",
        border: "1px solid var(--border)",
        borderRadius: "16px 16px 16px 4px",
        padding: ".65rem 1rem",
        display: "flex", alignItems: "center", gap: ".35rem",
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--accent)",
            animation: `pulse-glow .9s ${i * .2}s ease infinite`,
            opacity: .8,
          }} />
        ))}
      </div>
    </div>
  );
}

export default function ChatPanel({ sessionId, modelName, useCleaned, onModelExhausted }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "👋 Hi! I'm DataAgent. Upload a dataset and I'll answer any questions about it — trends, statistics, correlations, anomalies, and more. What would you like to know?",
      ts: Date.now(),
    },
  ]);
  const [input, setInput]   = useState("");
  const [busy, setBusy]     = useState(false);
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    if (messages.length > 1) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, busy]);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;

    if (!sessionId) {
      alert("Please upload a dataset first.");
      return;
    }

    setMessages(m => [...m, { role: "user", content: q, ts: Date.now() }]);
    setInput("");
    setBusy(true);

    try {
      const chatRes = await chatWithData({ sessionId, question: q, modelName, useCleaned });

      let reply = chatRes.answer;
      if (chatRes.exhausted_model) {
        if (onModelExhausted) onModelExhausted(chatRes.exhausted_model);
        reply = `⚠️ (Auto-fallback: ${chatRes.exhausted_model} quota was exhausted. Fell back to ${chatRes.used_fallback})\n\n` + reply;
      }

      setMessages(m => [...m, {
        role: "assistant",
        content: reply,
        ts:      Date.now(),
      }]);
    } catch (err) {
      if (err.detail && err.detail.exhausted_model) {
        if (onModelExhausted) onModelExhausted(err.detail.exhausted_model);
      }
      setMessages(m => [...m, {
        role: "assistant",
        content: `⚠ Error: ${err.message}`,
        ts: Date.now(),
      }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const SUGGESTIONS = [
    "Summarise the dataset",
    "Show missing values per column",
    "What are the top correlations?",
    "Show distribution of numeric columns",
  ];

  return (
    <div className="card fade-up" style={{ display: "flex", flexDirection: "column", height: 540 }}>
      {/* Header */}
      <div className="flex-header-responsive mb-3">
        <div className="flex items-center gap-3">
          <div className="step-badge step-active">4</div>
          <div>
            <h2>Chat with Your Data</h2>
            <p style={{ fontSize: ".8rem", color: "var(--text-secondary)", marginTop: ".1rem" }}>
              Ask anything — the LLM analyses your dataset
            </p>
          </div>
        </div>
        <span className="badge badge-purple" style={{ fontSize: ".68rem" }}>
          {modelName || "gemini-2.0-flash"}
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: ".5rem 0",
        marginBottom: ".75rem",
      }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}
        {busy && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem", marginBottom: ".75rem" }}>
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              className="btn btn-ghost btn-sm"
              onClick={() => { setInput(s); inputRef.current?.focus(); }}
              style={{ fontSize: ".75rem" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: ".6rem", alignItems: "flex-end" }}>
        <textarea
          id="chat-input"
          ref={inputRef}
          className="input"
          rows={2}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about your dataset… (Enter to send, Shift+Enter for new line)"
          disabled={busy}
          style={{ resize: "none", lineHeight: 1.5 }}
        />
        <button
          id="send-btn"
          className="btn btn-primary"
          onClick={send}
          disabled={busy || !input.trim()}
          style={{ flexShrink: 0, height: "fit-content", alignSelf: "flex-end" }}
        >
          {busy ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "↑ Send"}
        </button>
      </div>
    </div>
  );
}
