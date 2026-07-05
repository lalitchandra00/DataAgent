import { useState } from "react";
import { uploadFile, cleanData } from "./api/client";
import Sidebar        from "./components/Sidebar";
import UploadPanel    from "./components/UploadPanel";
import DataOverview   from "./components/DataOverview";
import CleaningReport from "./components/CleaningReport";
import ChatPanel      from "./components/ChatPanel";
import GraphPanel     from "./components/GraphPanel";

export default function App() {
  // Sidebar settings
  const [modelName,  setModelName]  = useState("gemini-2.0-flash");
  const [useCleaned, setUseCleaned] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exhaustedModels, setExhaustedModels] = useState({});

  function handleModelExhausted(model) {
    setExhaustedModels(prev => ({ ...prev, [model]: true }));
  }

  // Session state
  const [sessionId,      setSessionId]      = useState(null);
  const [filename,       setFilename]       = useState("");
  const [profile,        setProfile]        = useState(null);
  const [cleanReport,    setCleanReport]    = useState(null);
  const [cleanedProfile, setCleanedProfile] = useState(null);

  // Loading flags
  const [uploading, setUploading] = useState(false);
  const [cleaning,  setCleaning]  = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleUpload(file) {
    setUploading(true);
    setProfile(null);
    setCleanReport(null);
    setCleanedProfile(null);
    setSessionId(null);
    try {
      const res = await uploadFile(file);
      setSessionId(res.session_id);
      setFilename(res.filename);
      setProfile(res.profile);
      showToast(`✅ "${res.filename}" loaded — ${res.profile.rows.toLocaleString()} rows`);
    } catch (e) {
      showToast(`❌ Upload failed: ${e.message}`, "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleClean() {
    if (!sessionId) return;
    setCleaning(true);
    try {
      const res = await cleanData(sessionId);
      setCleanReport(res.report);
      setCleanedProfile(res.cleaned_profile);
      showToast("🧹 Cleaning complete!");
    } catch (e) {
      showToast(`❌ Cleaning failed: ${e.message}`, "error");
    } finally {
      setCleaning(false);
    }
  }

  return (
    <div className="app-container">
      {/* Mobile Top Header */}
      <header className="mobile-header">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: "1.25rem" }}>🧹</span>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>DataAgent</h2>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setSidebarOpen(true)}
          style={{ padding: ".4rem .6rem" }}
        >
          ⚙️ Settings
        </button>
      </header>

      {/* Sidebar Backdrop Overlay on Mobile */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar
        modelName={modelName} setModelName={setModelName}
        useCleaned={useCleaned} setUseCleaned={setUseCleaned}
        exhaustedModels={exhaustedModels}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main */}
      <main className="main-content">
        {/* Page title */}
        <div>
          <h1>
            <span className="gradient-text">DataAgent</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: ".35rem", fontSize: ".9rem" }}>
            Upload → Clean → Chat → Graph. Your AI data analyst, ready instantly.
          </p>
        </div>

        {/* Step 1: Upload */}
        <UploadPanel onUpload={handleUpload} loading={uploading} />

        {/* Step 2: Overview */}
        {profile && (
          <DataOverview profile={profile} filename={filename} />
        )}

        {/* Step 3: Clean */}
        {profile && (
          <CleaningReport
            report={cleanReport}
            cleanedProfile={cleanedProfile}
            sessionId={sessionId}
            loading={cleaning}
            onClean={handleClean}
          />
        )}

        {/* Step 4: Chat */}
        <ChatPanel
          sessionId={sessionId}
          modelName={modelName}
          useCleaned={useCleaned}
          onModelExhausted={handleModelExhausted}
        />

        {/* Step 5: Graph */}
        <GraphPanel
          sessionId={sessionId}
          profile={profile}
          useCleaned={useCleaned}
        />
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
