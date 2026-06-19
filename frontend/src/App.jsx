import { useState } from "react";
import { uploadFile, cleanData } from "./api/client";
import Sidebar        from "./components/Sidebar";
import UploadPanel    from "./components/UploadPanel";
import DataOverview   from "./components/DataOverview";
import CleaningReport from "./components/CleaningReport";
import ChatPanel      from "./components/ChatPanel";

export default function App() {
  // Sidebar settings
  const [apiKey,     setApiKey]     = useState("");
  const [modelName,  setModelName]  = useState("gemini-1.5-flash");
  const [autoChart,  setAutoChart]  = useState(true);
  const [useCleaned, setUseCleaned] = useState(true);

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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Sidebar
        apiKey={apiKey}       setApiKey={setApiKey}
        modelName={modelName} setModelName={setModelName}
        autoChart={autoChart} setAutoChart={setAutoChart}
        useCleaned={useCleaned} setUseCleaned={setUseCleaned}
      />

      {/* Main */}
      <main style={{
        flex: 1,
        padding: "2rem",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "2rem",
        maxWidth: 960,
      }}>
        {/* Page title */}
        <div>
          <h1>
            <span className="gradient-text">DataAgent</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: ".35rem", fontSize: ".9rem" }}>
            Upload → Clean → Chat. Your AI data analyst, ready instantly.
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
          apiKey={apiKey}
          modelName={modelName}
          autoChart={autoChart}
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
