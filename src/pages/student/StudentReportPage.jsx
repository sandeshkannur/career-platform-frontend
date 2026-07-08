// src/pages/student/StudentReportPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { getScorecardReportJson, downloadScorecardPdf } from "../../api/reports";
import { useContent } from "../../locales/LanguageProvider";

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// True when a block carries anything the UI can show. Explainability blocks
// arrive with explanation_text=null when the CMS has no copy for a key yet.
function blockHasContent(block) {
  return Boolean(
    block?.text ||
      block?.explanation_text ||
      (Array.isArray(block?.items) && block.items.length > 0) ||
      block?.career_title ||
      block?.description
  );
}

// Renders one ReportBlock by its `kind`:
//   paragraph → prose (text, or CMS explanation_text)
//   callout   → soft highlighted box
//   bullets | cluster_list | career_list → list of item strings
//   career_card → title/fit/cluster/description card (PDF variant only today;
//                 rendered defensively in case json output adopts it)
// Unknown kinds fall back to whatever text/items they carry.
function ReportBlockView({ block }) {
  const kind = block?.kind;
  const text = block?.text ?? block?.explanation_text ?? "";
  const items = Array.isArray(block?.items) ? block.items : [];

  if (kind === "callout" && text) {
    return (
      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {text}
      </div>
    );
  }

  if (kind === "career_card") {
    return (
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {block?.career_title || ""}
          {block?.indian_job_title ? (
            <span style={{ fontWeight: 400, color: "#64748b" }}>
              {" "}— {block.indian_job_title}
            </span>
          ) : null}
        </div>
        {block?.fit_band_label && (
          <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>
            {block.fit_band_label}
          </div>
        )}
        {block?.cluster_name && (
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {block.cluster_name}
          </div>
        )}
        {block?.description && (
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            {block.description}
          </div>
        )}
      </div>
    );
  }

  if (items.length > 0) {
    return (
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7 }}>
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }

  if (text) {
    return <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{text}</p>;
  }

  return null;
}

export default function StudentReportPage() {
  const params = useParams();
  const { t, language } = useContent();

  const studentId = useMemo(() => {
    // Route is /student/reports/:reportId (which is actually student_id)
    const raw = params.reportId;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }, [params.reportId]);

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  // Special states
  const [notReady, setNotReady] = useState(false); // 404
  const [unsupported, setUnsupported] = useState(false); // 400

  const [error, setError] = useState(null);

  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!studentId) return;

      setLoading(true);
      setReport(null);
      setNotReady(false);
      setUnsupported(false);
      setError(null);

      try {
        const data = await getScorecardReportJson(studentId, language || "en");
        if (cancelled) return;
        setReport(data);
      } catch (e) {
        if (cancelled) return;

        const status = e?.status || e?.response?.status;

        if (status === 404) {
          setNotReady(true);
          return;
        }

        if (status === 400) {
          setUnsupported(true);
          return;
        }

        const message =
          e?.message ||
          e?.detail ||
          e?.response?.data?.detail ||
          t("student.report.error.defaultMessage", "Failed to load report.");

        setError({ status, message, raw: e });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [studentId, language, t]);

  const canDownloadJson = !!report && !loading;

  // The route param (:reportId) is the student_id, not an assessment id — the
  // report being displayed identifies its own source assessment in the
  // ReportDocument's meta. Pinning the PDF to it means the download can never
  // resolve to a different (e.g. newer, abandoned) assessment than the one on
  // screen.
  const reportAssessmentId = report?.report_payload?.report_meta?.assessment_id ?? null;

  const sections = Array.isArray(report?.report_payload?.sections)
    ? report.report_payload.sections
    : [];

  async function handleDownloadPdf() {
    if (!studentId || !report || pdfDownloading) return;
    setPdfDownloading(true);
    setPdfError("");
    try {
      await downloadScorecardPdf(studentId, language || "en", reportAssessmentId);
    } catch (e) {
      setPdfError(
        e?.message ||
          t(
            "student.report.errors.pdfDownloadFailed",
            "Could not download the PDF. Please try again."
          )
      );
    } finally {
      setPdfDownloading(false);
    }
  }

  return (
    <SkeletonPage
      title={t("student.report.title", "Assessment Report")}
      subtitle={t("student.report.subtitle", "Report derived from your latest analytics snapshot.")}
      actions={
        <>
          <Button
            variant="secondary"
            disabled={!canDownloadJson}
            onClick={() => {
              if (!report) return;
              downloadJson(`student-report-${studentId}.json`, report);
            }}
          >
            {t("student.report.actions.downloadJson", "Download JSON")}
          </Button>

          <Button
            disabled={!studentId || loading || !report || pdfDownloading}
            onClick={handleDownloadPdf}
          >
            {pdfDownloading
              ? t("student.report.actions.generatingPdf", "Generating…")
              : t("student.report.actions.downloadPdf", "Download PDF")}
          </Button>

          {pdfError && (
            <span style={{ fontSize: 12, color: "var(--color-error, #E02424)" }}>
              {pdfError}
            </span>
          )}
        </>
      }
    >
      {!studentId && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          {t("student.report.invalidStudentId", "Invalid student id in route.")}
        </div>
      )}

      {studentId && loading && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          {t("student.report.loading", "Loading report…")}
        </div>
      )}

      {studentId && notReady && !loading && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {t("student.report.notReady.title", "Report not ready yet")}
          </div>
          <div style={{ fontSize: 14 }}>
            {t("student.report.notReady.body", "Complete an assessment (or refresh after analytics are generated), then come back here.")}
          </div>
        </div>
      )}

      {studentId && unsupported && !loading && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f3c27b",
            background: "#fff9ef",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {t("student.report.unsupported.title", "Unsupported report version")}
          </div>
          <div style={{ fontSize: 14 }}>
            {t("student.report.unsupported.body", "Your backend report/scoring version is not supported by this UI.")}
          </div>
        </div>
      )}

      {studentId && error && !loading && (
        <div
          style={{
            padding: 12,
            border: "1px solid #f3b4b4",
            background: "#fff6f6",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            {t("student.report.error.title", "Failed to load report")}
            {error.status ? ` (${t("common.http", "HTTP")} ${error.status})` : ""}
          </div>
          <div style={{ fontSize: 14 }}>{error.message}</div>
          <div style={{ marginTop: 10 }}>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              {t("student.report.actions.retry", "Retry")}
            </Button>
          </div>
        </div>
      )}

      {studentId && report && !loading && (
        <>
          {sections
            .map((s) => ({
              ...s,
              blocks: (Array.isArray(s?.blocks) ? s.blocks : []).filter(blockHasContent),
            }))
            .filter((s) => s.blocks.length > 0)
            .map((s, i) => (
              <div
                key={s.type || i}
                style={{
                  padding: 12,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  marginBottom: 10,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{s.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.blocks.map((b, j) => (
                    <ReportBlockView key={j} block={b} />
                  ))}
                </div>
              </div>
            ))}

          {sections.length === 0 && (
            <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginBottom: 10 }}>
              {t("student.report.emptySections", "No report content available yet.")}
            </div>
          )}

          <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                {t("student.report.previewTitle", "Report JSON (temporary preview)")}
              </summary>
              <pre style={{ margin: 0, padding: 10, overflowX: "auto" }}>
                {JSON.stringify(report, null, 2)}
              </pre>
            </details>
          </div>
        </>
      )}
    </SkeletonPage>
  );
}
