import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiGet } from "../../apiClient";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { useSession } from "../../hooks/useSession";
import { useContent } from "../../locales/LanguageProvider";
import { getContextImpactCopyV1 } from "../../content/contextImpact.v1";

import { getResultsBlocksV1 } from "../../content/resultsBlocks.v1";
import getResultsNotReadyV1 from "../../content/resultsNotReady.v1";

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
              <h1 style={{ fontSize: 22, margin: "0 0 8px 0" }}>{b.title}</h1>
              <p style={{ margin: 0, lineHeight: 1.5 }}>{b.body}</p>
            </div>
          );
        }

        if (b.type === "info_list") {
          return (
            <div key={idx} style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, margin: "0 0 8px 0" }}>{b.title}</h2>
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
function TopCareerCard({ career, fitBandsCopy, idx, t }) {
  const band = fitBandsCopy?.[career?.fit_band_key] || null;

  const bandLabel =
    band?.label || career?.fit_band_key || t("studentResults.fitBandFallback", "Fit band");
  const bandDesc = band?.desc || "";

  const title =
    career?.career_title ||
    career?.title ||
    career?.career_name ||
    career?.name ||
    `${t("studentResults.topCareerFallback", "Career")} #${idx + 1}`;

  // Use career.cluster (from API) not career.cluster_title
  const cluster = career?.cluster || career?.cluster_title || "";

  // matched_keyskills from API: [{ keyskill_name, keyskill_code }]
  const matchedSkills = Array.isArray(career?.matched_keyskills)
    ? career.matched_keyskills.slice(0, 3)
    : [];

  // top_keyskills from explainability vars
  const topKeyskills = career?.explainability
    ?.find((e) => e?.key === "CAREER_KEYSKILL_ALIGNMENT")
    ?.vars?.top_keyskills || [];

  // Fit band colour
  const bandColour = {
    high_potential: { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
    strong:         { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
    promising:      { bg: "#fefce8", border: "#fde047", text: "#854d0e" },
    developing:     { bg: "#fdf4ff", border: "#e9d5ff", text: "#7e22ce" },
    exploring:      { bg: "#f9fafb", border: "#d1d5db", text: "#374151" },
  }[career?.fit_band_key] || { bg: "#f9fafb", border: "#d1d5db", text: "#374151" };

  return (
    <div className="card top-career-card" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Header — title + cluster + fit band */}
      <div className="top-career-card__header">
        <div className="top-career-card__titleWrap">
          <div className="top-career-card__title">{title}</div>
          {cluster ? (
            <div className="text-muted top-career-card__cluster">{cluster}</div>
          ) : null}
        </div>
        <div
          className="top-career-card__bandPill"
          style={{ background: bandColour.bg, border: `1px solid ${bandColour.border}`, color: bandColour.text }}
          aria-label={`${t("studentResults.fitBandAriaPrefix", "Fit band:")} ${bandLabel}`}
        >
          {bandLabel}
        </div>
      </div>

      {/* Fit band description */}
      {bandDesc ? (
        <div className="text-muted top-career-card__bandDesc">{bandDesc}</div>
      ) : null}

      {/* Matched key skills — always shown, data always present */}
      {matchedSkills.length > 0 ? (
        <div className="top-career-card__skills">
          <div className="top-career-card__skillsLabel text-muted">
            {t("studentResults.card.matchedSkills", "Why this matches you")}
          </div>
          <div className="top-career-card__skillTags">
            {matchedSkills.map((s, i) => (
              <span key={i} className="top-career-card__skillTag">
                {s.display_name || s.keyskill_name}
              </span>
            ))}
          </div>
        </div>
      ) : null}


    </div>
  );
}
export default function StudentResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionUser } = useSession();
  const { t, language } = useContent();

  const canSeeScores =
    sessionUser?.role === "admin" || sessionUser?.role === "counsellor";

  const resultsTier =
    (sessionUser?.subscription_tier ||
      sessionUser?.tier ||
      sessionUser?.plan ||
      localStorage.getItem("CP_RESULTS_TIER") ||
      "free")
      .toString()
      .toLowerCase();

  const isPaidOrPremium = resultsTier === "paid" || resultsTier === "premium";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [ctx, setCtx] = useState(null);


  const [explainRes, setExplainRes] = useState({ facets: [], aqs: [] });
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState("");

  const [deepError, setDeepError] = useState("");
  const [deepRes, setDeepRes] = useState(null); // raw /deep response (keys only)
  const [deepCopy, setDeepCopy] = useState({}); // key -> resolved text
  const [deepLoading, setDeepLoading] = useState(false);
  const lang = language || "en";

  const lastExplainSigRef = useRef("");
  const lastDeepSigRef = useRef("");

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

  const studentId = sessionUser?.student_profile?.student_id ?? null;

  useEffect(() => {
    async function load() {
      if (!studentId) {
        setError(t("studentResults.errors.studentNotReady", "Student not ready"));
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
            t(
              "studentResults.errors.resultsNotReady",
              "Results not ready. Please try again after submitting assessment."
            )
        );
      } finally {
        setLoading(false);
      }
    }

    if (studentId) load();
  }, [studentId]);

  const selectedResult = useMemo(() => {
    if (!Array.isArray(data?.results) || data.results.length === 0) return null;

    if (selectedAssessmentId != null) {
      const match = data.results.find((r) => r.assessment_id === selectedAssessmentId);
      return match ?? data.results[0];
    }

    return data.results[0];
  }, [data, selectedAssessmentId]);

  const backendBlocks = useMemo(() => {
    return Array.isArray(selectedResult?.blocks) ? selectedResult.blocks : [];
  }, [selectedResult]);

  const facetKeys = useMemo(() => {
    const facetBlock = backendBlocks.find((b) => b?.block_type === "FACET_INSIGHTS");
    return Array.isArray(facetBlock?.facet_keys) ? facetBlock.facet_keys : [];
  }, [backendBlocks]);

  const aqKeys = useMemo(() => {
    const aqBlock = backendBlocks.find((b) => b?.block_type === "ASSOCIATED_QUALITIES");
    return Array.isArray(aqBlock?.aq_keys) ? aqBlock.aq_keys : [];
  }, [backendBlocks]);

  const hasPremiumSignals = facetKeys.length > 0 || aqKeys.length > 0;

  useEffect(() => {
    setCtx(null);
    if (!selectedResult?.assessment_id) return;

    let cancelled = false;
    apiGet(`/v1/assessments/${selectedResult.assessment_id}/context-profile`)
      .then((res) => {
        if (!cancelled) setCtx(res ?? null);
      })
      .catch((e) => {
        // 405 means the endpoint is not yet implemented on the backend — fail silently.
        // Any other error is also non-fatal: ctx stays null, fields show "Not shared yet".
        if (e?.status !== 405) {
          console.warn('[StudentResultsPage] context-profile fetch failed:', e?.status, e?.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [selectedResult?.assessment_id]);

  useEffect(() => {
    async function loadExplainability() {
      if (!isPaidOrPremium || !hasPremiumSignals) {
        setExplainRes({ facets: [], aqs: [] });
        setExplainError("");
        setExplainLoading(false);
        return;
      }

      try {
        setExplainLoading(true);
        setExplainError("");

        // Build a single keys list (backend expects `keys=...`)
        const combinedKeys = Array.from(
          new Set([...(facetKeys || []), ...(aqKeys || [])].filter(Boolean))
        );

        // If keys vanish, clear state calmly
        if (combinedKeys.length === 0) {
          lastExplainSigRef.current = "";
          setExplainRes({ facets: [], aqs: [] });
          setExplainError("");
          return;
        }
        const version = selectedResult?.results_payload_version || "v1";
        const locale = lang || "en";
        const sig = `${version}|${locale}|${combinedKeys.join(",")}`;

        // Guard against duplicate calls (dev strict mode / dependency churn)
        if (lastExplainSigRef.current === sig) return;
        lastExplainSigRef.current = sig;
        const params = new URLSearchParams();
        params.set("version", version);
        params.set("locale", locale);
        params.set("keys", combinedKeys.join(","));

        const res = await apiGet(`/v1/content/explainability?${params.toString()}`);
        const items = Array.isArray(res?.items) ? res.items : [];

        // Build lookup: { explanation_key -> text }
        const map = {};
        for (const it of items) {
          const k = (it?.explanation_key || "").toString().trim();
          const v = (it?.text || "").toString().trim();
          if (!k || !v) continue;
          map[k] = v;
        }

        // Preserve original ordering from blocks
        const facets = (facetKeys || []).map((k) => map[k]).filter(Boolean);
        const aqs = (aqKeys || []).map((k) => map[k]).filter(Boolean);

        setExplainRes({ facets, aqs });
      } catch (e) {
        setExplainError(
          e?.message ||
            t("studentResults.errors.insightsNotReady", "Could not load insights yet.")
        );
        setExplainRes({ facets: [], aqs: [] });
      } finally {
        setExplainLoading(false);
      }
    }

    loadExplainability();
  }, [isPaidOrPremium, hasPremiumSignals, lang, facetKeys, aqKeys, selectedResult?.results_payload_version]);

  useEffect(() => {
    async function loadDeepInsights() {
      if (!isPaidOrPremium || !hasPremiumSignals) {
        setDeepRes(null);
        setDeepCopy({});
        setDeepError("");
        setDeepLoading(false);
        lastDeepSigRef.current = "";
        return;
      }

      const version = selectedResult?.results_payload_version || "v1";
      const locale = lang || "en";
      const sig = `${studentId}|${version}|${locale}`;

      if (lastDeepSigRef.current === sig) return;
      lastDeepSigRef.current = sig;

      setDeepLoading(true);
      setDeepError("");

      try {

        // 1) Get keys-only deep insights
        const deep = await apiGet(
          `/v1/paid-analytics/${studentId}/deep?version=${encodeURIComponent(version)}&locale=${encodeURIComponent(locale)}`
        );

        setDeepRes(deep);

        // 2) Collect ALL keys to resolve via CMS content endpoint
        const keys = [];

        (deep?.cluster_insights || []).forEach((c) => {
          (c?.insight_keys || []).forEach((k) => keys.push(k));
        });

        (deep?.career_insights || []).forEach((c) => {
          (c?.why_keys || []).forEach((k) => keys.push(k));
        });

        (deep?.next_steps?.keys || []).forEach((k) => keys.push(k));

        // de-dup + clean
        const uniqueKeys = Array.from(
          new Set(keys.filter((k) => typeof k === "string" && k.trim().length > 0))
        );

        if (uniqueKeys.length === 0) {
          setDeepCopy({});
          return;
        }

        const params = new URLSearchParams();
        params.set("version", version);
        params.set("locale", locale);
        params.set("keys", uniqueKeys.join(","));

        const resolved = await apiGet(`/v1/content/explainability?${params.toString()}`);
        const items = Array.isArray(resolved?.items) ? resolved.items : [];

        const map = {};
        items.forEach((it) => {
          const k = it?.explanation_key;
          const t = it?.text;
          if (typeof k === "string" && typeof t === "string") {
            map[k] = t;
          }
        });

        setDeepCopy(map);
      } catch (e) {
        setDeepError(
          e?.message ||
            t(
              "studentResults.errors.deepInsightsNotReady",
              "Could not load deep insights yet."
            )
        );
        setDeepRes(null);
        setDeepCopy({});
      } finally {
        setDeepLoading(false);
      }
    }

    loadDeepInsights();
  }, [isPaidOrPremium, hasPremiumSignals, studentId, lang, selectedResult?.results_payload_version]);
  const ComingSoon = ({ text = t("studentResults.comingSoon", "Insights coming soon.") }) => (
    <div className="text-muted" style={{ fontSize: 13 }}>
      {text}
    </div>
  );

  function formatTemplate(text, vars = {}) {
    if (!text) return "";
    return text.replace(/\{(\w+)\}/g, (_, k) =>
      vars?.[k] != null ? String(vars[k]) : `{${k}}`
    );
  }

  function labelOrNotShared(v) {
    const val = (v ?? "unknown").toString().trim();
    return !val || val.toLowerCase() === "unknown"
      ? t("studentResults.notSharedYet", "Not shared yet")
      : val;
  }

  const isContextUnknown = useMemo(() => {
    if (!ctx) return true;
    const fields = [ctx.ses_band, ctx.education_board, ctx.support_level, ctx.resource_access];
    return fields.every((v) => (v || "unknown") === "unknown");
  }, [ctx]);
  return (
    <SkeletonPage
      title={t("studentResults.title", "Your Career Results")}
      subtitle={t("studentResults.subtitle", "Top recommendations based on your assessment.")}
    >
      <div className="cp-results">
        <div className="cp-resultsActions">
          <Button variant="secondary" onClick={() => navigate("/student/dashboard")}>
            {t("studentResults.actions.backToDashboard", "Back to Dashboard")}
          </Button>

          <Button onClick={() => navigate("/student/results/history")}>
            {t("studentResults.actions.viewHistory", "View History")}
          </Button>

          <Button variant="secondary" disabled>
            {t("studentResults.actions.downloadReport", "Download Report")}
          </Button>
        </div>

        {loading && <p>{t("studentResults.loading", "Loading results…")}</p>}

        {!loading && error && <ResultsNotReadyView content={getResultsNotReadyV1(t)} />}

        {!loading && !error && (
          <>
            {/* Context */}
            <div className="results-section">
              <div className="results-section__titleRow">
                <div>
                  <div className="results-section__title">
                    {t("studentResults.context.title", "Your context (optional)")}
                  </div>

                  {isContextUnknown ? (
                    <div className="text-muted results-section__sub">
                      {t(
                        "studentResults.context.helperUnknown",
                        "Optional details that help us interpret results more fairly. You can change this anytime."
                      )}
                    </div>
                  ) : (
                    <div className="text-muted results-section__sub">
                      {t(
                        "studentResults.context.helperKnown",
                        "We use this only to adjust assumptions, not to judge you."
                      )}
                    </div>
                  )}
                </div>

                <Button variant="secondary" onClick={() => navigate("/student/context")}>
                  <span className="cp-inlineIcon">
                    <PencilIcon />
                    {isContextUnknown
                      ? t("studentResults.context.add", "Add")
                      : t("studentResults.context.edit", "Edit")}
                  </span>
                </Button>
              </div>

              <div className="card cp-sectionCard">
                <div className="cp-contextGrid">
                  <div className="cp-miniCard">
                    <div className="cp-miniLabel text-muted">
                      {t("studentResults.context.educationBoard", "Education board")}
                    </div>
                    <div className="cp-miniValue">{labelOrNotShared(ctx?.education_board)}</div>
                  </div>

                  <div className="cp-miniCard">
                    <div className="cp-miniLabel text-muted">
                      {t("studentResults.context.supportLevel", "Support level")}
                    </div>
                    <div className="cp-miniValue">{labelOrNotShared(ctx?.support_level)}</div>
                  </div>

                  <div className="cp-miniCard">
                    <div className="cp-miniLabel text-muted">
                      {t("studentResults.context.resourceAccess", "Resource access")}
                    </div>
                    <div className="cp-miniValue">{labelOrNotShared(ctx?.resource_access)}</div>
                  </div>

                  <div className="cp-miniCard">
                    <div className="cp-miniLabel text-muted">
                      {t("studentResults.context.sesBand", "SES band")}
                    </div>
                    <div className="cp-miniValue">{labelOrNotShared(ctx?.ses_band)}</div>
                  </div>
                </div>

                <div className="cp-contextExplain">
                  <details className="cp-details">
                    <summary className="cp-detailsSummary">
                      {getContextImpactCopyV1({ ctx, t }).title}
                    </summary>

                    <div className="text-muted cp-detailsBody">
                      <div style={{ marginBottom: 8 }}>
                        {getContextImpactCopyV1({ ctx, t }).intro}
                      </div>

                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        {getContextImpactCopyV1({ ctx, t }).bullets.map((line, idx) => (
                          <li key={idx} style={{ marginBottom: 6 }}>
                            {line}
                          </li>
                        ))}
                      </ul>

                      <div style={{ marginTop: 8 }}>
                        {getContextImpactCopyV1({ ctx, t }).footer}{" "}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate("/student/context")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") navigate("/student/context");
                          }}
                          className="cp-linkButton"
                        >
                          {t("studentResults.context.linkLabel", "Context")}
                        </span>
                        .
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            {/* Latest Assessment */}
            <div className="results-section">
              <div className="results-section__titleRow">
                <div>
                  <div className="results-section__title">
                    {t("studentResults.latest.title", "Latest Assessment")}
                  </div>
                  <div className="text-muted results-section__sub">
                    {t(
                      "studentResults.latest.subtitle",
                      "A summary of the most recent assessment used for these results."
                    )}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: 12 }}>
                <p>
                  {t("studentResults.latest.completedPrefix", "You have completed")}{" "}
                  <strong>{data?.total_results ?? 0}</strong>{" "}
                  {t("studentResults.latest.assessmentCountSuffix", "assessment(s).")}
                </p>

                {selectedResult ? (
                  <>
                    <p>
                      {t("studentResults.latest.showingPrefix", "Showing result for")}{" "}
                      <strong>{t("studentResults.latest.latestStrong", "your latest assessment")}</strong>
                    </p>

                    <p>
                      {t("studentResults.latest.generatedOnPrefix", "Generated on")}{" "}
                      <strong>
                        {selectedResult.generated_at
                          ? new Date(selectedResult.generated_at).toLocaleString()
                          : t("studentResults.latest.justNow", "Just now")}
                      </strong>
                    </p>

                    {(() => {
                      const copy = getResultsBlocksV1({ result: selectedResult, t });
                      const rec = copy.recommendations;
                      const fitBandsCopy = copy.fitBands || {};
                      const assoc = copy.associatedQualities || null;

                      const renderTopCareersCards = () => {
                        const topBlock = backendBlocks.find((b) => b?.block_type === "TOP_CAREERS");
                        const items = Array.isArray(topBlock?.items)
                          ? topBlock.items
                          : selectedResult.top_careers || [];

                        if (!items || items.length === 0) {
                          return (
                            <div className="text-muted" style={{ padding: 12 }}>
                              {t("studentResults.noRecommendations", "No recommendations available yet.")}
                            </div>
                          );
                        }

                        return (
                          <div className="cp-cards3">
                            {items.slice(0, isPaidOrPremium ? 5 : 3).map((c, idx) => (
                              <TopCareerCard
                                key={c.career_id || c.career_code || c.career_title || idx}
                                career={c}
                                fitBandsCopy={fitBandsCopy}
                                idx={idx}
                                t={t}
                              />
                            ))}
                          </div>
                        );
                      };

                      const renderPremiumInsightsCard = () => {
                        if (!assoc) return null;

                        const resolvedFacets = (Array.isArray(explainRes?.facets) ? explainRes.facets : [])
                          .filter((t) => typeof t === "string" && t.trim().length > 0)
                          // Safety: never show raw facet keys if backend returns them as text
                          .filter((t) => !/^AQ\d{2}_F\d$/i.test(t.trim()));

                        const resolvedAqs = (Array.isArray(explainRes?.aqs) ? explainRes.aqs : [])
                          .filter((t) => typeof t === "string" && t.trim().length > 0)
                          // Safety: never show raw AQ keys if backend returns them as text
                          .filter((t) => !/^AQ_\d{2}$/i.test(t.trim()));

                        const allCareers = Array.isArray(selectedResult?.recommended_careers)
                          ? selectedResult.recommended_careers
                          : [];

                        console.log('selectedResult keys:', Object.keys(selectedResult || {}));
                        console.log('recommended_careers:', selectedResult?.recommended_careers?.length);
                        console.log('allCareers computed:', allCareers?.length);

                        const careersByCluster = {};
                        allCareers.forEach((c) => {
                          const name = c.cluster || c.cluster_title || t("studentResults.clusterSignals.other", "Other");
                          if (!careersByCluster[name]) careersByCluster[name] = [];
                          careersByCluster[name].push(c);
                        });
                        const clusterEntries = Object.entries(careersByCluster).slice(0, 3);

                        const qualitiesBody = explainLoading ? (
                          <div className="text-muted" style={{ fontSize: 13 }}>
                            {t("studentResults.loadingQualities", "Loading qualities…")}
                          </div>
                        ) : resolvedAqs.length > 0 ? (
                          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                            {resolvedAqs.map((q, idx) => (
                              <li key={idx} style={{ marginBottom: 8 }}>
                                {q}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ComingSoon />
                        );

                        const themesBody = explainLoading ? (
                          <div className="text-muted" style={{ fontSize: 13 }}>
                            {t("studentResults.loadingThemes", "Loading themes…")}
                          </div>
                        ) : resolvedFacets.length > 0 ? (
                          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                            {resolvedFacets.map((t, idx) => (
                              <li key={idx} style={{ marginBottom: 8 }}>
                                {t}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ComingSoon />
                        );
                                                
                        return (
                          <div style={{ marginTop: 14 }}>
                            <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>
                              {t("studentResults.premiumInsights.title", "Premium insights")}
                            </div>

                            <div className="cp-insights2">
                              <div className="cp-softPanel">
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                  {t("studentResults.focusThemes.title", "Focus themes")}
                                </div>
                                {themesBody}
                                {explainError ? (
                                  <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                                    {explainError}
                                  </div>
                                ) : null}
                              </div>

                              <div className="cp-softPanel">
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                  {t("studentResults.associatedQualities.title", "Associated qualities")}
                                </div>

                                {explainLoading || resolvedAqs.length > 0 ? (
                                  <details>
                                    <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                                      {t("studentResults.associatedQualities.view", "View qualities")}
                                    </summary>

                                    {qualitiesBody}

                                    <div className="text-muted" style={{ fontSize: 12, marginTop: 10 }}>
                                      {t(
                                        "studentResults.premiumInsights.note",
                                        "Premium will include deeper “why this fits you” stories and guided next steps."
                                      )}
                                    </div>
                                  </details>
                                ) : (
                                  <ComingSoon />
                                )}
                              </div>
                            </div>

                            <div className="cp-insightsStack">
                              <div className="cp-softPanel">
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                  {t("studentResults.clusterSignals.title", "Cluster signals")}
                                </div>

                                {deepLoading ? (
                                  <div className="text-muted" style={{ fontSize: 13 }}>
                                    {t("studentResults.clusterSignals.loading", "Loading cluster signals…")}
                                  </div>
                                ) : Array.isArray(deepRes?.cluster_insights) &&
                                  deepRes.cluster_insights.length > 0 ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                      marginTop: 10,
                                    }}
                                  >
                                    {deepRes.cluster_insights.slice(0, 2).map((cl, idx) => {
                                      const insightKeys = Array.isArray(cl?.insight_keys)
                                        ? cl.insight_keys
                                        : [];

                                      const resolved = insightKeys
                                        .map((k) => deepCopy?.[k])
                                        .filter(
                                          (t) => typeof t === "string" && t.trim().length > 0
                                        );

                                      return (
                                        <div
                                          key={cl?.cluster_id || cl?.cluster_title || idx}
                                          style={{
                                            paddingBottom: 10,
                                            borderBottom: "1px solid rgba(0,0,0,0.06)",
                                          }}
                                        >
                                          <div style={{ fontWeight: 700 }}>
                                            {cl?.cluster_title || t("studentResults.clusterSignals.fallbackTitle", "Cluster")}
                                          </div>

                                          {resolved.length > 0 ? (
                                            <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                                              {resolved.slice(0, 3).map((t, j) => (
                                                <li key={j} style={{ marginBottom: 6 }}>
                                                  {formatTemplate(t, {
                                                    cluster_title: cl?.cluster_title || "",
                                                  })}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <ComingSoon />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : clusterEntries.length > 0 ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                                    {clusterEntries.map(([clusterName, careers]) => (
                                      <div
                                        key={clusterName}
                                        style={{ paddingBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                                      >
                                        <div style={{ fontWeight: 700 }}>{clusterName}</div>
                                        <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                                          {careers.slice(0, 3).map((c, i) => {
                                            const bandLabel = fitBandsCopy?.[c.fit_band_key]?.label || c.fit_band_key || "";
                                            return (
                                              <li key={c.career_id || c.career_code || i} style={{ marginBottom: 4, fontSize: 13 }}>
                                                {c.title || c.career_title}
                                                {bandLabel ? (
                                                  <span style={{ marginLeft: 6, opacity: 0.6, fontStyle: "italic" }}>
                                                    ({bandLabel})
                                                  </span>
                                                ) : null}
                                              </li>
                                            );
                                          })}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <ComingSoon />
                                )}
                              </div>

                              <div className="cp-softPanel">
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                  {t("studentResults.whyFit.title", "Why these careers fit you")}
                                </div>

                                {deepLoading ? (
                                  <div className="text-muted" style={{ fontSize: 13 }}>
                                    {t("studentResults.whyFit.loading", "Loading deep insights…")}
                                  </div>
                                ) : Array.isArray(deepRes?.career_insights) &&
                                  deepRes.career_insights.length > 0 ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 10,
                                      marginTop: 10,
                                    }}
                                  >
                                    {deepRes.career_insights.slice(0, 3).map((ci, idx) => {
                                      const whyKey = Array.isArray(ci?.why_keys)
                                        ? ci.why_keys[0]
                                        : "";

                                      const rawWhy = deepCopy?.[whyKey] || "";
                                      const whyText = formatTemplate(rawWhy, {
                                        career_title: ci?.career_title || "",
                                      });

                                      return (
                                        <div
                                          key={ci?.career_id || idx}
                                          style={{
                                            paddingBottom: 10,
                                            borderBottom: "1px solid rgba(0,0,0,0.06)",
                                          }}
                                        >
                                          <div style={{ fontWeight: 700 }}>
                                            {ci?.career_title || t("studentResults.whyFit.fallbackTitle", "Career")}
                                          </div>
                                        <div style={{ marginTop: 6 }}>
                                          {whyText && whyText.trim().length > 0 ? (
                                            <span>{whyText}</span>
                                          ) : (
                                            <ComingSoon />
                                          )}
                                        </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (() => {
                                  const careersWithSkills = allCareers
                                    .filter((c) => Array.isArray(c.matched_keyskills) && c.matched_keyskills.length > 0)
                                    .slice(0, 3);
                                  return careersWithSkills.length > 0 ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                                      {careersWithSkills.map((c, idx) => (
                                        <div
                                          key={c.career_id || c.career_code || idx}
                                          style={{ paddingBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                                        >
                                          <div style={{ fontWeight: 700 }}>{c.title || c.career_title}</div>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                                            {c.matched_keyskills.slice(0, 3).map((sk) => (
                                              <span
                                                key={sk.keyskill_code || sk.keyskill_name}
                                                style={{
                                                  fontSize: 12,
                                                  padding: "2px 8px",
                                                  borderRadius: 999,
                                                  background: "rgba(0,0,0,0.06)",
                                                  color: "var(--text-primary)",
                                                }}
                                              >
                                                {sk.keyskill_name || sk.keyskill_code}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : <ComingSoon />;
                                })()}

                                {deepError ? (
                                  <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
                                    {deepError}
                                  </div>
                                ) : null}
                              </div>

                              <div className="cp-softPanel">
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                  {t("studentResults.guidedNextSteps.title", "Guided next steps")}
                                </div>

                                {deepLoading ? (
                                  <div className="text-muted" style={{ fontSize: 13 }}>
                                    {t("studentResults.guidedNextSteps.loading", "Loading next steps…")}
                                  </div>
                                ) : Array.isArray(deepRes?.next_steps?.keys) &&
                                  deepRes.next_steps.keys.length > 0 ? (
                                  <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                                    {deepRes.next_steps.keys.map((k, idx) => {
                                      const raw = deepCopy?.[k] || "";
                                      const txt = formatTemplate(raw);

                                      return (
                                        <li key={`${k}-${idx}`} style={{ marginBottom: 8 }}>
                                          {txt || t("studentResults.guidedNextSteps.fallback", "Next step coming soon.")}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <ComingSoon />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      };


                      return (
                        <div className="results-section" style={{ marginTop: 10 }}>
                          <div className="results-section__titleRow">
                            <div>
                              <div className="results-section__title">{rec.title}</div>
                              <div className="text-muted results-section__sub">
                                {t(
                                  "studentResults.topMatches.subtitle",
                                  "Your top matches are shown using student-safe fit bands (no scores)."
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="card" style={{ padding: 16 }}>
                            <div style={{ marginBottom: 14 }}>
                              <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>
                                {t("studentResults.recommendedStream", "Recommended stream")}
                              </div>
                              <div style={{ fontWeight: 700 }}>
                                {selectedResult.recommended_stream || t("studentResults.notAvailable", "—")}
                              </div>
                            </div>

                            {renderTopCareersCards()}

                            {(resultsTier === "paid" || resultsTier === "premium") &&
                              renderPremiumInsightsCard()}
                          </div>

                          <style>{`
                            .cp-results { display: flex; flex-direction: column; gap: 16px; }
                            .cp-resultsActions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
                            .results-section { margin-top: 6px; }
                            .results-section__titleRow { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
                            .results-section__title { font-size: 16px; font-weight: 800; line-height: 1.2; }
                            .results-section__sub { font-size: 13px; line-height: 1.45; }
                            .cp-sectionCard { padding: 16px; }
                            .cp-inlineIcon { display: inline-flex; align-items: center; gap: 8px; }
                            .cp-contextGrid { margin-top: 2px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
                            .cp-miniCard { border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 12px; }
                            .cp-miniLabel { font-size: 12px; margin-bottom: 4px; }
                            .cp-miniValue { font-weight: 700; line-height: 1.25; }
                            .cp-contextExplain { margin-top: 12px; }
                            .cp-detailsSummary { cursor: pointer; font-weight: 700; }
                            .cp-detailsBody { font-size: 13px; margin-top: 10px; line-height: 1.5; }
                            .cp-linkButton { text-decoration: underline; cursor: pointer; }
                            .cp-cards3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: stretch; }
                            .cp-insights2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
                            .cp-insightsStack { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 12px; }
                            .cp-softPanel { border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; padding: 14px; background: rgba(0,0,0,0.02); }
                            .top-career-card { padding: 16px; border-radius: 14px; }
                            .top-career-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
                            .top-career-card__titleWrap { min-width: 0; flex: 1; }
                            .top-career-card__title { font-weight: 800; line-height: 1.2; }
                            .top-career-card__cluster { font-size: 12px; margin-top: 4px; }
                            .top-career-card__bandPill { font-size: 12px; font-weight: 700; border: 1px solid rgba(0,0,0,0.12); border-radius: 999px; padding: 4px 10px; white-space: nowrap; flex-shrink: 0; }
                            .top-career-card__bandDesc { font-size: 13px; line-height: 1.45; margin-bottom: 10px; }
                            .top-career-card__skills { margin-top: auto; padding-top: 8px; border-top: 1px solid rgba(0,0,0,0.06); }
                            .top-career-card__skillsLabel { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
                            .top-career-card__skillTags { display: flex; flex-wrap: wrap; gap: 6px; }
                            .top-career-card__skillTag { background: var(--bg-app, #f3f4f6); border: 1px solid var(--border, #e5e7eb); border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 500; white-space: nowrap; }
                            @media (max-width: 980px) {
                              .cp-contextGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                              .cp-cards3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                              .cp-insights2 { grid-template-columns: 1fr; }
                              .results-section__titleRow { flex-direction: column; gap: 8px; }
                            }
                            @media (max-width: 640px) {
                              .cp-contextGrid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                              .cp-cards3 { grid-template-columns: 1fr; }
                              .cp-insights2 { grid-template-columns: 1fr; }
                              .cp-resultsActions { flex-direction: column; align-items: stretch; }
                              .cp-resultsActions > * { width: 100%; justify-content: center; }
                              .cp-miniCard { padding: 10px; }
                              .top-career-card { padding: 12px; }
                              .top-career-card__bandPill { font-size: 11px; padding: 3px 8px; }
                              .cp-sectionCard { padding: 12px; }
                              .results-section__title { font-size: 15px; }
                            }
                            @media (max-width: 400px) {
                              .cp-contextGrid { grid-template-columns: 1fr; }
                              .cp-cards3 { grid-template-columns: 1fr; }
                            }
                          `}</style>

                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <ResultsNotReadyView content={getResultsNotReadyV1(t)} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </SkeletonPage>
  );
}

