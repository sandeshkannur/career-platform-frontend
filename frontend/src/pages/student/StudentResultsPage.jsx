import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiGet } from "../../apiClient";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { useSession } from "../../hooks/useSession";
import { getContextImpactCopyV1 } from "../../content/contextImpact.v1";

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

function TopCareerCard({ career, bandCopy, idx }) {

  const band = bandCopy?.[career?.fit_band_key] || null;

  const bandLabel = band?.label || career?.fit_band_key || "Fit band";
  const bandDesc = band?.desc || "";

  const title =
    career?.career_title ||
    career?.title ||
    career?.career_name ||
    career?.name ||
    `Career #${idx + 1}`;

  const cluster = career?.cluster_title || "";
  const drivers = Array.isArray(career?.drivers) ? career.drivers.slice(0, 3) : [];

  return (
    <div className="card top-career-card">
      <div className="top-career-card__header">
        <div className="top-career-card__titleWrap">
          <div className="top-career-card__title">
            {title}
          </div>

          {cluster ? (
            <div className="text-muted top-career-card__cluster">
              {cluster}
            </div>
          ) : null}
        </div>

        <div
          className="top-career-card__bandPill"
          aria-label={`Fit band: ${bandLabel}`}
          title={bandDesc || bandLabel}
        >
          {bandLabel}
        </div>
      </div>

      {bandDesc ? (
        <div className="text-muted top-career-card__bandDesc">
          {bandDesc}
        </div>
      ) : null}

      {drivers.length > 0 ? (
        <ul className="top-career-card__drivers">
          {drivers.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function StudentResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionUser } = useSession();
  const canSeeScores =
  sessionUser?.role === "admin" || sessionUser?.role === "counsellor";

  // PR-B (Beta): Tier gating is frontend-only until backend exposes plan/tier in /v1/auth/me.
  // Default is "free" to avoid accidentally showing paid content.
  // Local override for QA/dev:
  //   localStorage.setItem("CP_RESULTS_TIER", "paid") or "premium" or "free"
  const resultsTier =
    (sessionUser?.subscription_tier ||
      sessionUser?.tier ||
      sessionUser?.plan ||
      localStorage.getItem("CP_RESULTS_TIER") ||
      "free")
      .toString()
      .toLowerCase();

  const isPaidOrPremium = resultsTier === "paid" || resultsTier === "premium";

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
      // PR-B Beta: context-profile endpoint is not available yet (405).
      // Keep UX clean by skipping the call; context page remains usable.
      setCtx(null);
    }

    loadCtx();
  }, [selectedResult?.assessment_id]);

  function labelOrNotShared(v) {
    const val = (v ?? "unknown").toString().trim();
    return !val || val.toLowerCase() === "unknown" ? "Not shared yet" : val;
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

function renderTopCareersBlock(block, fitBandsCopy) {
  const items = Array.isArray(block?.value) ? block.value : [];

  if (items.length === 0) {
    return (
      <div className="text-muted" style={{ fontSize: 13 }}>
        {block.emptyText}
      </div>
    );
  }

  return (
    <div
      className="top-careers-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 16,
        alignItems: "stretch",
        width: "100%",
      }}
    >
      {items.slice(0, block.maxItems ?? 3).map((c, idx) => (
        <TopCareerCard key={`${c?.career_code || idx}`} career={c} bandCopy={fitBandsCopy} idx={idx} />
      ))}

      <style>{`
        .top-careers-grid {
          width: 100%;
        }
        @media (max-width: 980px) {
          .top-careers-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 560px) {
          .top-careers-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
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
          <div className="results-section">
            <div className="card">
                        <div className="results-section__titleRow">
              <div>
                <div className="results-section__title">Your context (optional)</div>

                {isContextUnknown ? (
                  <div className="text-muted results-section__sub">
                    Optional details that help us interpret results more fairly. You can change this anytime.
                  </div>
                ) : (
                  <div className="text-muted results-section__sub">
                    We use this only to adjust assumptions, not to judge you.
                  </div>
                )}
              </div>

              <Button variant="secondary" onClick={() => navigate("/student/context")}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <PencilIcon />
                  {isContextUnknown ? "Add" : "Edit"}
                </span>
              </Button>
            </div>
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

          {/* Latest Assessment */}
          <div className="results-section">
            <div className="results-section__titleRow">
              <div>
                <div className="results-section__title">Latest Assessment</div>
                <div className="text-muted results-section__sub">
                  A summary of the most recent assessment used for these results.
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 12 }}>
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
                  const fitBandsCopy = copy.fitBands || {};
                  const assoc = copy.associatedQualities || null;

                  return (
                                         <div className="results-section">
                       <div className="results-section__titleRow">
                         <div>
                           <div className="results-section__title">{rec.title}</div>
                           <div className="text-muted results-section__sub">
                             Your top matches are shown using student-safe fit bands (no scores).
                           </div>
                         </div>
                       </div>

                       <div className="card" style={{ padding: 12 }}>
                         <div
                           className="results-reco-grid"
                           style={{
                             display: "grid",
                             gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                             gap: 10,
                           }}
                         >
                           {rec.blocks.map((block) => {
                             const isTopCareers = block.key === "top_careers";

                             return (
                               <div
                                 key={block.key}
                                 className="card"
                                 style={{
                                   padding: 12,
                                   gridColumn: isTopCareers ? "1 / -1" : undefined,
                                 }}
                               >
                                 <div
                                   className="text-muted"
                                   style={{ fontSize: 12, marginBottom: 4 }}
                                 >
                                   {block.title}
                                 </div>

                                 {isTopCareers ? (
                                   renderTopCareersBlock(block, fitBandsCopy)
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
                             );
                           })}
                         </div>

                         <div className="text-muted" style={{ marginTop: 12 }}>
                           {rec.footer}
                         </div>

                         {isPaidOrPremium && assoc ? (
                           <div className="results-section">
                             <div className="card" style={{ padding: 12 }}>
                               <div className="results-section__titleRow">
                                 <div>
                                   <div className="results-section__title">
                                     {assoc.title || "Associated qualities"}
                                   </div>
                                   {assoc.intro ? (
                                     <div className="text-muted results-section__sub">
                                       {assoc.intro}
                                     </div>
                                   ) : (
                                     <div className="text-muted results-section__sub">
                                       A few qualities that often support success in roles like these.
                                     </div>
                                   )}
                                 </div>
                               </div>

                               <details>
                                 <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                                   View qualities
                                 </summary>

                                 {Array.isArray(assoc.items) && assoc.items.length > 0 ? (
                                   <ul
                                     style={{
                                       marginTop: 10,
                                       marginBottom: 0,
                                       paddingLeft: 18,
                                       lineHeight: 1.6,
                                     }}
                                   >
                                     {assoc.items.map((it, idx) => (
                                       <li key={`${it}-${idx}`} style={{ marginBottom: 6 }}>
                                         {it}
                                       </li>
                                     ))}
                                   </ul>
                                 ) : (
                                   <div className="text-muted" style={{ fontSize: 13, marginTop: 8 }}>
                                     No qualities available yet.
                                   </div>
                                 )}

                                 {resultsTier === "paid" ? (
                                   <div className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
                                     Premium will include deeper “why this fits you” stories and guided next steps.
                                   </div>
                                 ) : null}
                               </details>
                             </div>
                           </div>
                         ) : null}

                         <style>{`
                           @media (max-width: 720px) {
                             .results-reco-grid {
                               grid-template-columns: 1fr !important;
                             }
                           }
                         `}</style>
                       </div>
                     </div>
                  );
                })()}
              </>
            ) : (
              <ResultsNotReadyView content={resultsNotReady_v1} />
            )}
                </div>
          </div>
        </>
      )}
    </SkeletonPage>
  );
}

