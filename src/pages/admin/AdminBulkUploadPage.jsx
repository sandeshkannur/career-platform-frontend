// src/pages/admin/AdminBulkUploadPage.jsx
import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { getToken, apiBase } from "../../auth";

/* ─────────────────────────────────────────────────────────────────────────
   CSV TEMPLATE
   Add a column here and it appears in the downloaded CSV and example table.
────────────────────────────────────────────────────────────────────────── */
const CSV_HEADERS = [
  "title", "career_code", "cluster_name", "description",
  "recommended_stream", "salary_entry_inr", "salary_mid_inr", "salary_peak_inr",
  "automation_risk", "future_outlook", "indian_job_title", "prestige_title",
];

const CSV_EXAMPLES = [
  ["Agricultural Scientist", "AGR_001", "Agriculture", "Research and improve farming techniques",
   "Science PCB", "450000", "900000", "1800000", "low", "growing",
   "Krishi Vaigyanik", "Food Security Scientist"],
  ["Software Engineer", "TECH_050", "Technology", "Design and build software systems",
   "Science PCM", "600000", "1400000", "3500000", "medium", "growing",
   "Software Engineer", "Principal Engineer"],
];

function downloadTemplate() {
  const rows = [CSV_HEADERS, ...CSV_EXAMPLES];
  const csv  = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "careers_bulk_import_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── state machine phases ─── */
const PHASE = {
  IDLE:           "idle",
  READY:          "ready",        // file chosen, no run yet
  DRY_LOADING:    "dry_loading",
  DRY_DONE:       "dry_done",
  IMPORT_LOADING: "import_loading",
  IMPORT_DONE:    "import_done",
};

function fmtBytes(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── upload helper — uses fetch directly to send FormData ─── */
async function uploadCSV(file, isDryRun) {
  const base     = apiBase();
  const token    = getToken();
  const endpoint = `${base}/v1/admin/careers/bulk-import?dry_run=${isDryRun}`;

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(endpoint, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}` },
    body:    formData,
    credentials: "include",
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.detail || data.message)) ||
      (typeof data === "string" ? data : null) ||
      `Upload failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  return data;
}

/* ─────────────────────────────────────────────────────────────────────────
   RESULT CARD
────────────────────────────────────────────────────────────────────────── */
function ResultCard({ result, isDryRun }) {
  if (!result) return null;

  const { valid_rows, error_rows, errors = [], inserted, updated } = result;
  const isDry = isDryRun;

  return (
    <Card className="mt-4">
      <div style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
          {isDry ? "Dry Run Results" : "Import Results"}
        </span>
      </div>

      {/* Summary chips */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        {isDry ? (
          <>
            <Chip label="Valid rows" value={valid_rows ?? "—"} color="green" />
            <Chip label="Error rows" value={error_rows ?? errors?.length ?? 0} color={error_rows > 0 || errors?.length > 0 ? "red" : "green"} />
          </>
        ) : (
          <>
            <Chip label="Inserted" value={inserted ?? "—"} color="green" />
            <Chip label="Updated"  value={updated  ?? "—"} color="blue"  />
            <Chip label="Errors"   value={errors?.length ?? 0} color={errors?.length > 0 ? "red" : "green"} />
          </>
        )}
      </div>

      {/* Ready to import notice */}
      {isDry && (errors?.length ?? error_rows ?? 0) === 0 && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 14,
          background: "#dcfce7", border: "1px solid #86efac",
          fontSize: 13, color: "#166534", fontWeight: 600,
        }}>
          ✓ No errors found — ready to import for real.
        </div>
      )}

      {/* Error table */}
      {errors?.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#dc2626", marginBottom: 8 }}>
            Errors ({errors.length})
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#fef2f2", borderBottom: "1px solid #fecaca" }}>
                {["Row", "Field", "Message"].map(h => (
                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: "#991b1b", fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {errors.map((err, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #fee2e2" }}>
                  <td style={{ padding: "5px 10px", fontFamily: "monospace", color: "#dc2626" }}>
                    {err.row ?? err.line ?? i + 1}
                  </td>
                  <td style={{ padding: "5px 10px", color: "var(--text-muted)" }}>
                    {err.field ?? "—"}
                  </td>
                  <td style={{ padding: "5px 10px", color: "var(--text-primary)" }}>
                    {err.message ?? err.error ?? String(err)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const CHIP_STYLES = {
  green: { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  red:   { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5" },
  blue:  { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
};

function Chip({ label, value, color = "green" }) {
  const s = CHIP_STYLES[color] ?? CHIP_STYLES.green;
  return (
    <div style={{
      padding: "8px 14px", borderRadius: 8,
      background: s.bg, border: `1px solid ${s.border}`,
      minWidth: 90, textAlign: "center",
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: s.color, marginTop: 3 }}>{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminBulkUploadPage() {
  const [phase,      setPhase]      = useState(PHASE.IDLE);
  const [file,       setFile]       = useState(null);
  const [dragOver,   setDragOver]   = useState(false);
  const [dryResult,  setDryResult]  = useState(null);
  const [realResult, setRealResult] = useState(null);
  const [uploadErr,  setUploadErr]  = useState("");
  const fileInputRef = useRef(null);

  const dryErrorCount = dryResult
    ? (dryResult.errors?.length ?? dryResult.error_rows ?? 0)
    : null;
  const dryPassed = dryResult !== null && dryErrorCount === 0;

  /* ─── file selection ─── */

  const selectFile = useCallback((f) => {
    if (!f || !f.name.endsWith(".csv")) {
      setUploadErr("Please select a .csv file.");
      return;
    }
    setFile(f);
    setPhase(PHASE.READY);
    setDryResult(null);
    setRealResult(null);
    setUploadErr("");
  }, []);

  const handleFileInput = (e) => selectFile(e.target.files?.[0]);
  const handleDrop      = (e) => { e.preventDefault(); setDragOver(false); selectFile(e.dataTransfer.files?.[0]); };
  const handleDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = ()  => setDragOver(false);

  /* ─── dry run ─── */

  const runDry = async () => {
    setPhase(PHASE.DRY_LOADING);
    setDryResult(null);
    setRealResult(null);
    setUploadErr("");
    try {
      const result = await uploadCSV(file, true);
      setDryResult(result);
      setPhase(PHASE.DRY_DONE);
    } catch (e) {
      setUploadErr(e.message || "Dry run failed.");
      setPhase(PHASE.READY);
    }
  };

  /* ─── real import ─── */

  const runImport = async () => {
    setPhase(PHASE.IMPORT_LOADING);
    setUploadErr("");
    try {
      const result = await uploadCSV(file, false);
      setRealResult(result);
      setPhase(PHASE.IMPORT_DONE);
    } catch (e) {
      setUploadErr(e.message || "Import failed.");
      setPhase(PHASE.DRY_DONE);
    }
  };

  const isLoading = phase === PHASE.DRY_LOADING || phase === PHASE.IMPORT_LOADING;

  /* ─── shared input style ─── */
  const inputCls = [
    "w-full rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  return (
    <SkeletonPage
      title="Bulk Import — Careers"
      subtitle="Upload a CSV to create or update career records in bulk"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <Link to="/admin" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
            ← Admin Console
          </Link>
          <Link to="/" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Upload + actions ── */}
        <div>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
              1. Select CSV File
            </div>

            {/* Drag-and-drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "var(--brand-primary)" : "var(--border)"}`,
                borderRadius: 10,
                padding: "28px 20px",
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? "#eff6ff" : "var(--bg-app)",
                transition: "border-color 0.15s, background 0.15s",
                marginBottom: 12,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Drag &amp; drop a CSV here, or{" "}
                <span style={{ color: "var(--brand-primary)", fontWeight: 600 }}>click to browse</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                .csv files only
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: "none" }}
                onChange={handleFileInput}
              />
            </div>

            {/* Selected file info */}
            {file && (
              <div style={{
                padding: "10px 12px", borderRadius: 8, marginBottom: 14,
                background: "#f0fdf4", border: "1px solid #86efac",
                fontSize: 13, color: "#166534",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span>📄 <strong>{file.name}</strong></span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{fmtBytes(file.size)}</span>
              </div>
            )}

            {/* Error message */}
            {uploadErr && (
              <div style={{
                padding: "10px 12px", borderRadius: 8, marginBottom: 14,
                background: "#fef2f2", border: "1px solid #fca5a5",
                fontSize: 13, color: "#dc2626",
              }}>
                {uploadErr}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12, marginTop: 4 }}>
              2. Validate &amp; Import
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button
                onClick={runDry}
                disabled={!file || isLoading || phase === PHASE.IMPORT_DONE}
                style={{ justifyContent: "center" }}
              >
                {phase === PHASE.DRY_LOADING ? "Validating…" : "Validate (Dry Run)"}
              </Button>

              <Button
                variant={dryPassed ? "primary" : "secondary"}
                onClick={runImport}
                disabled={!dryPassed || isLoading || phase === PHASE.IMPORT_DONE}
                style={{ justifyContent: "center" }}
              >
                {phase === PHASE.IMPORT_LOADING ? "Importing…" : "Import for Real"}
              </Button>

              {!dryPassed && phase !== PHASE.IDLE && phase !== PHASE.IMPORT_DONE && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
                  Run a successful dry run first to unlock Import.
                </p>
              )}
            </div>

            {/* Reset after import */}
            {phase === PHASE.IMPORT_DONE && (
              <Button
                variant="ghost"
                style={{ marginTop: 10, width: "100%", justifyContent: "center" }}
                onClick={() => {
                  setFile(null);
                  setPhase(PHASE.IDLE);
                  setDryResult(null);
                  setRealResult(null);
                  setUploadErr("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                Start over
              </Button>
            )}
          </Card>

          {/* Results */}
          {dryResult && (
            <ResultCard result={dryResult} isDryRun={true} />
          )}
          {realResult && (
            <ResultCard result={realResult} isDryRun={false} />
          )}
        </div>

        {/* ── RIGHT: Template + format reference ── */}
        <div>
          <Card>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              CSV Template
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
              Download the template and fill in your data. The first row must be the header row exactly as shown.
            </div>

            <Button variant="secondary" onClick={downloadTemplate} style={{ marginBottom: 18 }}>
              ⬇ Download Template CSV
            </Button>

            {/* Column reference */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Expected columns
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>Column</th>
                    <th style={{ padding: "6px 8px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)" }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["title",              "Required. Career title."],
                    ["career_code",        "Required. Unique code e.g. AGR_001."],
                    ["cluster_name",       "Cluster name (must match exactly)."],
                    ["description",        "Optional. Short description."],
                    ["recommended_stream", "Science PCM / Science PCB / Commerce / Arts/Humanities / Any"],
                    ["salary_entry_inr",   "Annual salary in ₹ e.g. 450000"],
                    ["salary_mid_inr",     "Mid-career salary in ₹"],
                    ["salary_peak_inr",    "Peak salary in ₹"],
                    ["automation_risk",    "low / medium / high"],
                    ["future_outlook",     "growing / stable / declining"],
                    ["indian_job_title",   "Localised job title for India."],
                    ["prestige_title",     "Aspirational / prestige framing."],
                  ].map(([col, note], i) => (
                    <tr key={col} style={{ borderBottom: "1px solid var(--border)", background: i % 2 ? "var(--bg-app)" : "transparent" }}>
                      <td style={{ padding: "5px 8px", fontFamily: "monospace", fontWeight: 600, color: "#0d9488", whiteSpace: "nowrap" }}>{col}</td>
                      <td style={{ padding: "5px 8px", color: "var(--text-muted)" }}>{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Example rows */}
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", margin: "16px 0 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Example rows
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 10, width: "100%" }}>
                <thead>
                  <tr style={{ background: "var(--bg-app)", borderBottom: "1px solid var(--border)" }}>
                    {CSV_HEADERS.map(h => (
                      <th key={h} style={{ padding: "4px 6px", fontFamily: "monospace", color: "var(--text-muted)", whiteSpace: "nowrap", textAlign: "left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CSV_EXAMPLES.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 ? "var(--bg-app)" : "transparent" }}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: "4px 6px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </SkeletonPage>
  );
}
