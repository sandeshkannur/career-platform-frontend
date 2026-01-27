import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiGet } from "../../apiClient";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { useSession } from "../../hooks/useSession";
import { getContextImpactCopyV1 } from "../../content/contextImpact.v1";
import { renderCareerExplainabilityV1 } from "../../content/careerExplainability.v1";
import {
  getResultsBlocksV1,
  formatTopCareerLabel,
  formatTopCareerScore,
} from "../../content/resultsBlocks.v1";
import resultsNotReady_v1 from "../../content/resultsNotReady.v1";

function PencilIcon({ size = 14 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block" }}
    >
      <path
        fill="currentColor"
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l8.06-8.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
      />
    </svg>
  );
}
function ResultsNotReadyView({ content }) {
  const blocks = content?.blocks || [];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      {blocks.map((b, idx) => {
        if (b.type === "hero") {
          return (
            <div key={idx} style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, margin: "0 0 8px 0" }}>
                {b.title}
              </h1>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{b.body}</p>
            </div>
          );
        }

        if (b.type === "info_list") {
          return (
            <div key={idx} style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 8px 0" }}>
                {b.title}
              </h2>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                {(b.items || []).map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            </div>
          );
        }

        if (b.type === "cta_row") {
          return (
            <div key={idx} style={{ marginTop: 20 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button onClick={() => (window.location.href = b.primaryCta.to)}>
                  {b.primaryCta.label}
                </Button>

                <Button
                  variant="secondary"
                  onClick={() => (window.location.href = b.secondaryCta.to)}
                >
                  {b.secondaryCta.label}
                </Button>
              </div>

              {b.note ? (
                <p
                  style={{
                    marginTop: 12,
                    marginBottom: 0,
                    lineHeight: 1.5,
                    opacity: 0.85,
                  }}
                >
                  {b.note}
                </p>
              ) : null}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export default function StudentResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionUser } = useSession();
    const canSeeScores =
    sessionUser?.role === "admin" || sessionUser?.role === "counsellor";

  // ✅ Page state (required by existing logic below)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [ctx, setCtx] = useState(null);

  // ✅ Which assessment result to show:
  // Priority:
  // 1) location.state.assessment_id (when navigating from History)
  // 2) query param ?assessment_id=123
  const selectedAssessmentId = useMemo(() => {
    const fromState =
      location?.state?.assessment_id ??
      location?.state?.selectedAssessmentId ??
      null;

    const params = new URLSearchParams(location?.search || "");
    const fromQuery = params.get("assessment_id");

    if (fromState != null) return Number(fromState);
    if (fromQuery != null && fromQuery !== "") return Number(fromQuery);

    return null;
  }, [location?.state, location?.search]);
  

  // ✅ Source of truth: session (comes from /v1/auth/me)
  // Matches what StudentDashboardPage already uses.
  const studentId = sessionUser?.student_profile?.student_id ?? null;

  useEffect(() => {
    async function load() {
      if (!studentId) {
        setError("Student not ready");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const res = await apiGet(`/v1/students/${studentId}/results`);
        setData(res);
      } catch (e) {
        setError(
          e?.message ||
            "Results not ready. Please try again after submitting assessment."
        );
      } finally {
        setLoading(false);
      }
    }

    if (studentId) load();
  }, [studentId]);

  const selectedResult = useMemo(() => {
    if (!Array.isArray(data?.results) || data.results.length === 0) {
      return null;
    }

    if (selectedAssessmentId != null) {
      const match = data.results.find(
        (r) => r.assessment_id === selectedAssessmentId
      );
      return match ?? data.results[0];
    }

    return data.results[0];
  }, [data, selectedAssessmentId]);

  useEffect(() => {
    async function loadCtx() {
      if (!selectedResult?.assessment_id) {
        setCtx(null);
        return;
      }

      try {
        const res = await apiGet(
          `/v1/assessments/${selectedResult.assessment_id}/context-profile`
        );
        setCtx(res);
      } catch {
        // Context is optional; keep the page usable if it fails
        setCtx(null);
      }
    }

    loadCtx();
  }, [selectedResult?.assessment_id]);

  function labelOrNotShared(v) {
    const val = (v ?? "unknown").toString().trim();
    return !val || val.toLowerCase() === "unknown" ? "Not shared yet" : val;
  }

    function getMatchBandByRank(idx) {
    if (idx === 0) return "Strong match";
    if (idx === 1) return "Good match";
    return "Emerging match";
  }

  function extractCareerMetaFromExplainability(lines) {
    const meta = { cluster: null, driver: null, driverScore: null };

    const text = (lines || []).join(" ");

    // Extract: It sits under "Health Science"
    const clusterMatch = text.match(/sits under\s+["“](.+?)["”]/i);
    if (clusterMatch && clusterMatch[1]) meta.cluster = clusterMatch[1].trim();

    // Extract: driven mainly by: Animal Care
    const driverMatch = text.match(/driven mainly by:\s*(.+?)(\.|$)/i);
    if (driverMatch && driverMatch[1]) {
      meta.driver = driverMatch[1]
        .trim()
        .replace(/\s*\(\s*\d+\s*%\s*\)\s*/g, "")   // remove "(35%)"
        .replace(/\s*\(\s*\d+\s*\/\s*\d+\s*\)\s*/g, "") // remove "(35/100)"
        .replace(/\.$/, "");
    }

    return meta;
  }
    function sanitizeExplainabilityForStudent(text) {
    if (!text || typeof text !== "string") return text;

    let t = text;

    // Remove bracketed scores like "(35/100)" or "(35%)"
    t = t.replace(/\(\s*\d+\s*\/\s*\d+\s*\)/g, "");
    t = t.replace(/\(\s*\d+\s*%\s*\)/g, "");

    // Remove standalone "35/100" and "35%" if present in the sentence
    t = t.replace(/\b\d+\s*\/\s*\d+\b/g, "");
    t = t.replace(/\b\d+\s*%\b/g, "");

    // Clean up double spaces created by removals
    t = t.replace(/\s{2,}/g, " ").trim();

    // Clean up awkward leftover punctuation like "answers ." or "by :"
    t = t.replace(/\s+\./g, ".").replace(/\s+,/g, ",");

    return t;
  }

  const isContextUnknown = useMemo(() => {
    if (!ctx) return true;
    const fields = [
      ctx.ses_band,
      ctx.education_board,
      ctx.support_level,
      ctx.resource_access,
    ];
    return fields.every((v) => (v || "unknown") === "unknown");
  }, [ctx]);

  function renderTopCareersBlock(block) {
    const items = Array.isArray(block.value) ? block.value : [];

    if (items.length === 0) {
      return (
        <div className="text-muted" style={{ fontSize: 13 }}>
          {block.emptyText}
        </div>
      );
    }

    return (
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.slice(0, block.maxItems ?? 5).map((c, idx) => {
          const label = formatTopCareerLabel(c, idx);
          

          return (
            <li key={`${label}-${idx}`} style={{ marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{label}</span>
                <span className="text-muted" style={{ fontSize: 13 }}>
                  — {getMatchBandByRank(idx)}
                </span>
              </div>

              {Array.isArray(c?.explainability) && c.explainability.length > 0 ? (
                (() => {
                  const rawLines = c.explainability
                    .map((item) => renderCareerExplainabilityV1(item))
                    .filter(Boolean);

                  const meta = extractCareerMetaFromExplainability(rawLines);

                  return (
                    <div className="text-muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>
                      {meta.cluster ? (
                        <div>
                          <span style={{ fontWeight: 600 }}>Cluster:</span>{" "}
                          {meta.cluster}
                        </div>
                      ) : null}

                      {meta.driver ? (
                        <div>
                          <span style={{ fontWeight: 600 }}>Driven by:</span>{" "}
                          {meta.driver}
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }


  return (
    <SkeletonPage
      title="Your Career Results"
      subtitle="Top recommendations based on your assessment."
    >
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={() => navigate("/student/dashboard")}>
          Back to Dashboard
        </Button>

        <Button onClick={() => navigate("/student/results/history")}>
          View History
        </Button>

        <Button variant="secondary" disabled>
          Download Report
        </Button>
      </div>

      {loading && <p>Loading results…</p>}

      {!loading && error && <ResultsNotReadyView content={resultsNotReady_v1} />}

      {!loading && !error && (
        <>
          {/* Context wrapper */}
          <div className="card" style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Your context (optional)
                </div>

                {isContextUnknown ? (
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Optional details that help us interpret results more fairly.
                    You can change this anytime.
                  </div>
                ) : (
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    We use this only to adjust assumptions, not to judge you.
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                onClick={() => navigate("/student/context")}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <PencilIcon />
                  {isContextUnknown ? "Add" : "Edit"}
                </span>
              </Button>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div className="card" style={{ padding: 12 }}>
                <div
                  className="text-muted"
                  style={{ fontSize: 12, marginBottom: 4 }}
                >
                  Education board
                </div>
                <div style={{ fontWeight: 600 }}>
                  {labelOrNotShared(ctx?.education_board)}
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div
                  className="text-muted"
                  style={{ fontSize: 12, marginBottom: 4 }}
                >
                  Support level
                </div>
                <div style={{ fontWeight: 600 }}>
                  {labelOrNotShared(ctx?.support_level)}
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div
                  className="text-muted"
                  style={{ fontSize: 12, marginBottom: 4 }}
                >
                  Resource access
                </div>
                <div style={{ fontWeight: 600 }}>
                  {labelOrNotShared(ctx?.resource_access)}
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <div
                  className="text-muted"
                  style={{ fontSize: 12, marginBottom: 4 }}
                >
                  SES band
                </div>
                <div style={{ fontWeight: 600 }}>
                  {labelOrNotShared(ctx?.ses_band)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <details>
                <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                  {getContextImpactCopyV1({ ctx }).title}
                </summary>

                <div
                  className="text-muted"
                  style={{ fontSize: 13, marginTop: 8 }}
                >
                  <div style={{ marginBottom: 8 }}>
                    {getContextImpactCopyV1({ ctx }).intro}
                  </div>

                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {getContextImpactCopyV1({ ctx }).bullets.map((line, idx) => (
                      <li key={idx} style={{ marginBottom: 6 }}>
                        {line}
                      </li>
                    ))}
                  </ul>

                  <div style={{ marginTop: 8 }}>
                    {getContextImpactCopyV1({ ctx }).footer}{" "}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate("/student/context")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          navigate("/student/context");
                        }
                      }}
                      style={{ textDecoration: "underline", cursor: "pointer" }}
                    >
                      Context
                    </span>
                    .
                  </div>
                </div>
              </details>
            </div>

            <style>{`
              @media (max-width: 980px) {
                .card > div[style*="grid-template-columns: repeat(4"] {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                }
              }
              @media (max-width: 560px) {
                .card > div[style*="grid-template-columns: repeat(4"] {
                  grid-template-columns: 1fr !important;
                }
              }
            `}</style>
          </div>

          {/* Results card */}
          <div className="card" style={{ marginTop: 12 }}>
            <h3>Latest Assessment</h3>

            <p>
              You have completed{" "}
              <strong>{data?.total_results ?? 0}</strong> assessment(s).
            </p>

            {selectedResult ? (
              <>
                <p>
                  Showing result for{" "}
                  <strong>Assessment #{selectedResult.assessment_id}</strong>
                </p>
                <p>
                  Generated on{" "}
                  <strong>
                    {selectedResult.generated_at
                      ? new Date(selectedResult.generated_at).toLocaleString()
                      : "Just now"}
                  </strong>
                </p>

                {/* Data-driven recommendations from content blocks */}
                {(() => {
                  const copy = getResultsBlocksV1({ result: selectedResult });
                  const rec = copy.recommendations;

                  return (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>
                        {rec.title}
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        {rec.blocks.map((block) => (
                          <div
                            key={block.key}
                            className="card"
                            style={{ padding: 12 }}
                          >
                            <div
                              className="text-muted"
                              style={{ fontSize: 12, marginBottom: 4 }}
                            >
                              {block.title}
                            </div>

                            {block.key === "top_careers" ? (
                              renderTopCareersBlock(block)
                            ) : (
                              <>
                                <div style={{ fontWeight: 600 }}>
                                  {block.value}
                                </div>
                                {block.helper ? (
                                  <div
                                    className="text-muted"
                                    style={{ fontSize: 13, marginTop: 6 }}
                                  >
                                    {block.helper}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="text-muted" style={{ marginTop: 12 }}>
                        {rec.footer}
                      </div>

                      <style>{`
                        @media (max-width: 720px) {
                          .card > div[style*="grid-template-columns: repeat(2"] {
                            grid-template-columns: 1fr !important;
                          }
                        }
                      `}</style>
                    </div>
                  );
                })()}
              </>
            ) : (
              <ResultsNotReadyView content={resultsNotReady_v1} />
            )}
          </div>
        </>
      )}
    </SkeletonPage>
  );
}
