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
// ─── Helpers ──────────────────────────────────────────────────────────────
function fmtInr(v) {
  if (!v) return null;
  return v >= 100000
    ? `\u20b9${(v / 100000).toFixed(0)}L`
    : `\u20b9${(v / 1000).toFixed(0)}K`;
}

const BAND_STYLES = {
  high_potential: { bg: "#0b1f3a", color: "#fff" },
  strong:         { bg: "#064e3b", color: "#fff" },
  promising:      { bg: "#1e3a8a", color: "#fff" },
  developing:     { bg: "#581c87", color: "#fff" },
  exploring:      { bg: "#374151", color: "#fff" },
};

const RISK_CFG = {
  low:    { label: "Low automation risk", bg: "#f0fdf4", color: "#166534", dot: "#16a34a" },
  medium: { label: "Medium risk",         bg: "#fffbeb", color: "#92400e", dot: "#d97706" },
  high:   { label: "Higher risk",         bg: "#fef2f2", color: "#991b1b", dot: "#dc2626" },
};

const CLUSTER_COLORS = {
  "Business":     "#185FA5", "Architecture": "#0F6E56",
  "Arts & A/V":   "#854F0B", "Education":    "#534AB7",
  "Human Serv":   "#993C1D", "Health Sci":   "#065F46",
  "Info Tech":    "#1E40AF", "STEM":         "#155E75",
  "Government":   "#374151", "Finance":      "#3B1F7A",
  "Manufacturing":"#7C2D12", "Hospitality":  "#0C4A6E",
  "Marketing":    "#701A75", "Law/Safety":   "#78350F",
  "Agriculture":  "#14532D",
};

// Interest inventory cluster weights
// Each question option maps to clusters that receive a +15% boost
export const INTEREST_CLUSTER_MAP = {
  // Q1 — Science Exhibition
  "q1_a": ["Manufacturing", "Architecture", "STEM"],
  "q1_b": ["Arts & A/V", "Marketing"],
  "q1_c": ["STEM", "Education", "Info Tech"],
  // Q2 — Colony volunteer
  "q2_a": ["Education", "Human Serv"],
  "q2_b": ["Government", "Law/Safety"],
  "q2_c": ["Health Sci", "Human Serv"],
  // Q3 — School club
  "q3_a": ["Info Tech", "STEM"],
  "q3_b": ["Arts & A/V", "Marketing"],
  "q3_c": ["Government", "Law/Safety", "Business"],
  // Q4 — Free Saturday
  "q4_a": ["Business", "Agriculture", "Hospitality"],
  "q4_b": ["Agriculture", "Architecture", "Manufacturing"],
  "q4_c": ["Arts & A/V", "Education", "Marketing"],
  // Q5 — Career visit
  "q5_a": ["Health Sci", "Human Serv"],
  "q5_b": ["Government", "Law/Safety"],
  "q5_c": ["Info Tech", "STEM", "Manufacturing"],
  // Q6 — Friend support
  "q6_a": ["Human Serv", "Health Sci", "Education"],
  "q6_b": ["STEM", "Info Tech"],
  "q6_c": ["Hospitality", "Marketing", "Arts & A/V"],
  // Q7 — New subject
  "q7_a": ["Agriculture", "STEM"],
  "q7_b": ["Business", "Finance", "Marketing"],
  "q7_c": ["Health Sci", "STEM"],
  // Q8 — School problem
  "q8_a": ["Manufacturing", "Architecture", "STEM", "Info Tech"],
  "q8_b": ["Government", "Law/Safety", "Education"],
  "q8_c": ["Business", "Human Serv", "Government"],
  // Q9 — Family visit
  "q9_a": ["Manufacturing", "Business", "Transport"],
  "q9_b": ["Education", "Government", "Agriculture"],
  "q9_c": ["Hospitality", "Marketing", "Arts & A/V"],
  // Q10 — Class 10 project
  "q10_a": ["Info Tech", "STEM", "Business"],
  "q10_b": ["Government", "Law/Safety", "Education"],
  "q10_c": ["Marketing", "Arts & A/V", "Human Serv"],
};

// ─── Inline language toggle ───────────────────────────────────────────────
function InlineLanguageToggle({ lang, onChange, t }) {
  return (
    <div
      role="group"
      aria-label={t("studentResults.languageAria", "Language")}
      style={{
        display: "flex", gap: 3,
        background: "#f1f5f9", borderRadius: 999, padding: 3, flexShrink: 0,
      }}
    >
      {[
        { code: "en", label: t("studentResults.language.enShort", "EN") },
        { code: "kn", label: "ಕನ್ನಡ" },
      ].map((l) => (
        <button
          key={l.code}
          onClick={() => onChange(l.code)}
          style={{
            padding: "3px 10px", borderRadius: 999,
            border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 600,
            background: lang === l.code ? "#0b1f3a" : "transparent",
            color: lang === l.code ? "#fff" : "#475569",
            transition: "all .15s",
          }}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// ─── Cluster strength map ─────────────────────────────────────────────────
function ClusterStrengthMap({ careers, t }) {
  if (!careers || careers.length === 0) return null;
  const counts = {};
  careers.forEach((c) => {
    const cl = c.cluster || c.cluster_title || "Other";
    if (!counts[cl]) counts[cl] = { n: 0, top: 0 };
    counts[cl].n++;
    counts[cl].top = Math.max(counts[cl].top, c.score || 0);
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1].top - a[1].top);
  const maxTop = sorted[0]?.[1]?.top || 1;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 12, padding: 16, marginBottom: 14,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
        {t("studentResults.clusterMap.title", "How your strengths spread across career worlds")}
      </div>
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>
        {t("studentResults.clusterMap.sub", "Each bar shows how many of your top matches fall in that career world.")}
      </div>
      {sorted.map(([cl, { n, top }]) => {
        const pct = Math.round((top / maxTop) * 100);
        const color = CLUSTER_COLORS[cl] || "#374151";
        return (
          <div key={cl} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", width: 110, flexShrink: 0 }}>{cl}</div>
            <div style={{ flex: 1, height: 7, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11, color: "#64748b", width: 56, textAlign: "right", flexShrink: 0 }}>
              {n} {n === 1
                ? t("studentResults.clusterMap.career", "career")
                : t("studentResults.clusterMap.careers", "careers")}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Interest Inventory teaser ────────────────────────────────────────────
function InterestInventoryTeaser({ t, interestData, studentId }) {
  const navigate = useNavigate();
  // Student has completed interest inventory — show their top clusters
  if (interestData?.top_clusters?.length > 0) {
    return (
      <div style={{
        background: "#fff", border: "1px solid #e2e8f0",
        borderRadius: 12, padding: 14, marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {t("interest.results.title", "Your interest signal is active")}
          </div>
          <button
            onClick={() => navigate("/student/interest")}
            style={{ fontSize: 11, color: "#0b1f3a", background: "none", border: "none", cursor: "pointer", fontWeight: 600, flexShrink: 0 }}
          >
            {t("interest.results.retake", "Retake →")}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
          {t("interest.results.sub", "Your recommendations now include your interest profile. Top career worlds:")}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {interestData.top_clusters.slice(0, 3).map((cl, i) => (
            <span key={cl} style={{
              background: i === 0 ? "#0b1f3a" : "#f0fdf4",
              color: i === 0 ? "#fff" : "#166534",
              border: i === 0 ? "none" : "1px solid #bbf7d0",
              borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600,
            }}>
              {cl}
            </span>
          ))}
        </div>
      </div>
    );
  }
  // Student has NOT completed interest inventory — show prompt with Start button
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 12, padding: 14, marginBottom: 12,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 3 }}>
            {t("studentResults.interestInventory.title", "Personalise your results")}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>
            {t("studentResults.interestInventory.sub", "Answer 10 quick activity questions to add your interest profile. This is included in Chapter 5 of your next assessment.")}
          </div>
        </div>
        <button
          onClick={() => navigate("/student/interest")}
          style={{
            background: "#0b1f3a", color: "#fff", border: "none",
            borderRadius: 8, padding: "6px 14px",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          {t("interest.teaser.cta", "Start →")}
        </button>
      </div>
    </div>
  );
}

// ─── Pathway dropdown content (shared by both card sizes) ─────────────────
function PathwayDropdown({ career, t }) {
  const steps = [career?.pathway_step1, career?.pathway_step2, career?.pathway_step3].filter(Boolean);
  const hasRoutes = career?.pathway_accessible || career?.pathway_earn_learn || career?.pathway_premium;
  if (!steps.length && !hasRoutes) return null;
  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{
        cursor: "pointer", listStyle: "none",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
        padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#0b1f3a",
      }}>
        <span>{t("studentResults.pathway.toggle", "How to get there")}</span>
        <span style={{ fontSize: 10, color: "#64748b" }}>▼</span>
      </summary>
      <div style={{ padding: "10px 4px 2px" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                background: ["#0b1f3a", "#0f6e56", "#16a34a"][i],
                color: "#fff", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: 10, fontWeight: 700,
              }}>{i + 1}</div>
              {i < steps.length - 1 && (
                <div style={{ width: 1, background: "#e2e8f0", minHeight: 10, margin: "2px 0" }} />
              )}
            </div>
            <div style={{ fontSize: 12, color: "#0f172a", lineHeight: 1.5, paddingBottom: i < steps.length - 1 ? 6 : 0, paddingTop: 2 }}>
              {s}
            </div>
          </div>
        ))}
        {(career?.pathway_accessible || career?.pathway_earn_learn || career?.pathway_premium || career?.top_tier_potential) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: steps.length ? 10 : 0 }}>
            {career?.pathway_accessible && (
              <div style={{ background: "#eff6ff", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#1e40af", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {t("studentResults.pathway.accessible", "Accessible route")}
                </div>
                <div style={{ fontSize: 12, color: "#1e3a8a", lineHeight: 1.5 }}>{career.pathway_accessible}</div>
              </div>
            )}
            {career?.pathway_earn_learn && (
              <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#166534", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {t("studentResults.pathway.earnLearn", "Earn while you learn")}
                </div>
                <div style={{ fontSize: 12, color: "#14532d", lineHeight: 1.5 }}>{career.pathway_earn_learn}</div>
              </div>
            )}
            {career?.pathway_premium && (
              <div style={{ background: "#fefce8", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#854d0e", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {t("studentResults.pathway.premium", "Premium route")}
                </div>
                <div style={{ fontSize: 12, color: "#713f12", lineHeight: 1.5 }}>{career.pathway_premium}</div>
              </div>
            )}
            {career?.top_tier_potential && (
              <div style={{ background: "#0b1f3a", borderRadius: 8, padding: "8px 12px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".04em" }}>
                  {t("studentResults.pathway.topTier", "Top tier potential")}
                </div>
                <div style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.5 }}>{career.top_tier_potential}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

// ─── Top career card (first card, full detail) ────────────────────────────
function TopCareerCard({ career, fitBandsCopy, t }) {
  const band      = fitBandsCopy?.[career?.fit_band_key] || null;
  const bandLabel = band?.label || career?.fit_band_key || t("studentResults.fitBandFallback", "Match");
  const bandStyle = BAND_STYLES[career?.fit_band_key] || BAND_STYLES.exploring;
  const title     = career?.title || career?.career_title || career?.name || t("studentResults.topCareerFallback", "Career");
  const prestige  = career?.prestige_title || "";
  const cluster   = career?.cluster || career?.cluster_title || "";
  const stream    = career?.recommended_stream || "";
  const indianTitle = career?.indian_job_title || "";
  const description = career?.description || "";
  const riskKey   = (career?.automation_risk || "").toLowerCase();
  const riskCfg   = RISK_CFG[riskKey] || null;
  const outlook   = career?.future_outlook || "";
  const outlookLabel = outlook === "growing"
    ? t("studentResults.outlook.growing", "Growing field")
    : outlook === "stable" ? t("studentResults.outlook.stable", "Stable") : "";
  const e  = fmtInr(career?.salary_entry_inr);
  const m  = fmtInr(career?.salary_mid_inr);
  const pk = fmtInr(career?.salary_peak_inr);
  const keyskills = Array.isArray(career?.matched_keyskills) ? career.matched_keyskills : [];

  return (
    <div style={{
      background: "#fff", border: "1.5px solid #0b1f3a",
      borderRadius: 12, overflow: "hidden", marginBottom: 12,
    }}>
      {/* Header bar — navy */}
      <div style={{
        background: "#0b1f3a", padding: "10px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.75)" }}>
          {t("studentResults.topMatchLabel", "Top match")}
        </span>
        <span style={{
          background: "rgba(255,255,255,.15)", color: "#fff",
          borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600,
        }}>
          {bandLabel}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", lineHeight: 1.25 }}>{title}</div>
        {prestige && <div style={{ fontSize: 12, color: "#059669", fontWeight: 600, marginTop: 2 }}>{prestige}</div>}

        {/* Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
          {cluster     && <span style={{ background: "#eff6ff", color: "#1e40af", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{cluster}</span>}
          {stream      && <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 999, padding: "2px 9px", fontSize: 11, fontWeight: 600 }}>{stream}</span>}
          {indianTitle && <span style={{ background: "#f8fafc", color: "#475569", borderRadius: 999, padding: "2px 9px", fontSize: 11, border: "1px solid #e2e8f0" }}>{indianTitle}</span>}
        </div>

        {/* Description */}
        {description && <div style={{ marginTop: 10, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{description}</div>}

        {/* Salary */}
        {(e || m || pk) && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>
              {t("studentResults.salaryRange", "Annual salary range")}
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "linear-gradient(90deg,#0b1f3a 0%,#0f6e56 55%,#16a34a 100%)", marginBottom: 4 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              {e  && <span style={{ color: "#64748b" }}>{e} <span style={{ fontSize: 10 }}>{t("studentResults.salary.entry", "entry")}</span></span>}
              {m  && <span style={{ fontWeight: 700, color: "#0f172a" }}>{m}</span>}
              {pk && <span style={{ color: "#059669", fontWeight: 700 }}>{pk} <span style={{ fontSize: 10, fontWeight: 400, color: "#64748b" }}>{t("studentResults.salary.peak", "peak")}</span></span>}
            </div>
          </div>
        )}

        {/* Risk + outlook badges */}
        {(riskCfg || outlookLabel) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
            {riskCfg && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: riskCfg.bg, color: riskCfg.color, borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: riskCfg.dot, flexShrink: 0 }} />
                {t(`studentResults.risk.${riskKey}`, riskCfg.label)}
              </span>
            )}
            {outlookLabel && (
              <span style={{ background: "#eff6ff", color: "#1e40af", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                {outlookLabel}
              </span>
            )}
          </div>
        )}

        {/* Why this matches you */}
        {keyskills.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>
              {t("studentResults.whyMatches", "Why this matches you")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {keyskills.slice(0, 4).map((ks, i) => (
                <span key={i} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                  ✓ {ks.keyskill_name || ks.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <PathwayDropdown career={career} t={t} />
      </div>
    </div>
  );
}

// ─── Compact career card (cards 2–9) ──────────────────────────────────────
function CompactCareerCard({ career, fitBandsCopy, t }) {
  const band      = fitBandsCopy?.[career?.fit_band_key] || null;
  const bandLabel = band?.label || career?.fit_band_key || t("studentResults.fitBandFallback", "Match");
  const bandStyle = BAND_STYLES[career?.fit_band_key] || BAND_STYLES.exploring;
  const title     = career?.title || career?.career_title || career?.name || "";
  const prestige  = career?.prestige_title || "";
  const cluster   = career?.cluster || career?.cluster_title || "";
  const stream    = career?.recommended_stream || "";
  const description = career?.description || "";
  const riskKey   = (career?.automation_risk || "").toLowerCase();
  const riskCfg   = RISK_CFG[riskKey] || null;
  const outlook   = career?.future_outlook || "";
  const outlookLabel = outlook === "growing"
    ? t("studentResults.outlook.growing", "Growing field")
    : outlook === "stable" ? t("studentResults.outlook.stable", "Stable") : "";
  const e  = fmtInr(career?.salary_entry_inr);
  const m  = fmtInr(career?.salary_mid_inr);
  const pk = fmtInr(career?.salary_peak_inr);
  const keyskills = Array.isArray(career?.matched_keyskills) ? career.matched_keyskills : [];

  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 12, overflow: "hidden", marginBottom: 10,
    }}>
      <div style={{ padding: "12px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>{title}</div>
            {prestige && <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 1 }}>{prestige}</div>}
          </div>
          <span style={{ background: bandStyle.bg, color: bandStyle.color, borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            {bandLabel}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {cluster && <span style={{ background: "#eff6ff", color: "#1e40af", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{cluster}</span>}
          {stream  && <span style={{ background: "#f0fdf4", color: "#166534", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{stream}</span>}
          {riskCfg && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: riskCfg.bg, color: riskCfg.color, borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: riskCfg.dot, flexShrink: 0 }} />{t(`studentResults.risk.${riskKey}`, riskCfg.label)}</span>}
          {outlookLabel && <span style={{ background: "#eff6ff", color: "#1e40af", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{outlookLabel}</span>}
        </div>

        {(e || m || pk) && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ height: 4, borderRadius: 999, background: "linear-gradient(90deg,#0b1f3a 0%,#0f6e56 55%,#16a34a 100%)", marginBottom: 3 }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b" }}>
              {e  && <span>{e}</span>}
              {m  && <span style={{ fontWeight: 700, color: "#0f172a" }}>{m}</span>}
              {pk && <span style={{ color: "#059669", fontWeight: 600 }}>{pk}</span>}
            </div>
          </div>
        )}

        {description && <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.55, marginBottom: 8 }}>{description}</div>}

        {keyskills.length > 0 && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
              {t("studentResults.whyMatches", "Why this matches you")}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {keyskills.slice(0, 3).map((ks, i) => (
                <span key={i} style={{ background: "#f0fdf4", color: "#166534", border: "1px solid #bbf7d0", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  ✓ {ks.keyskill_name || ks.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <PathwayDropdown career={career} t={t} />
      </div>
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

  const resultsTier = (
    sessionUser?.subscription_tier ||
    sessionUser?.tier ||
    sessionUser?.plan ||
    localStorage.getItem("CP_RESULTS_TIER") ||
    "free"
  ).toString().toLowerCase();

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
  const [contentLang, setContentLang] = React.useState(lang);
  React.useEffect(() => { setContentLang(lang); }, [lang]);

  const [recs, setRecs] = useState(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [interestData, setInterestData] = useState(null);

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

  useEffect(() => {
    async function loadRecs() {
      if (!studentId) return;
      try {
        setRecsLoading(true);
        const res = await apiGet(`/v1/recommendations/${studentId}?lang=${contentLang}&limit=9`);
        setRecs(res);
      } catch { /* silent — falls back to TOP_CAREERS block */ }
      finally { setRecsLoading(false); }
    }
    if (studentId) loadRecs();
  }, [studentId, contentLang]);

  useEffect(() => {
    async function loadInterest() {
      if (!studentId) return;
      try {
        const res = await apiGet(`/v1/interest/${studentId}`);
        setInterestData(res);
      } catch { /* silent — interest data is optional */ }
    }
    if (studentId) loadInterest();
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

  const isPaidOrPremium =
    resultsTier === "paid" ||
    resultsTier === "premium" ||
    sessionUser?.role === "admin" ||
    sessionUser?.role === "counsellor";

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

                      const allCareers = Array.isArray(selectedResult?.recommended_careers)
                        ? selectedResult.recommended_careers
                        : Array.isArray(selectedResult?.top_careers)
                        ? selectedResult.top_careers
                        : [];

                      const careersByCluster = {};
                      allCareers.forEach((c) => {
                        const name = c.cluster || c.cluster_title || t("studentResults.clusterSignals.other", "Other");
                        if (!careersByCluster[name]) careersByCluster[name] = [];
                        careersByCluster[name].push(c);
                      });
                      const clusterEntries = Object.entries(careersByCluster).slice(0, 3);

                      const renderTopCareersCards = () => {
                        // Prefer live recs (rich content) over stored block
                        let items = [];
                        if (recs?.recommended_careers?.length > 0) {
                          items = recs.recommended_careers;
                        } else {
                          const topBlock = backendBlocks.find((b) => b?.block_type === "TOP_CAREERS");
                          items = Array.isArray(topBlock?.items)
                            ? topBlock.items
                            : selectedResult?.top_careers || [];
                        }

                        const limit   = isPaidOrPremium ? 9 : 5;
                        const visible = items.slice(0, limit);

                        if (recsLoading && items.length === 0) {
                          return (
                            <div style={{ padding: "20px 0", textAlign: "center", color: "#64748b", fontSize: 13 }}>
                              {t("studentResults.loading", "Loading your career matches…")}
                            </div>
                          );
                        }

                        if (visible.length === 0) {
                          return (
                            <div style={{ padding: 12, color: "#64748b", fontSize: 13 }}>
                              {t("studentResults.noRecommendations", "No recommendations available yet.")}
                            </div>
                          );
                        }

                        // Cluster strength map — premium only
                        const strengthMap = isPaidOrPremium
                          ? <ClusterStrengthMap careers={items} t={t} />
                          : null;

                        // Interest inventory teaser — always shown (remove when Layer 2 ships)
                        const interestTeaser = <InterestInventoryTeaser t={t} interestData={interestData} studentId={studentId} />;

                        // Premium — group by cluster
                        if (isPaidOrPremium && visible.length > 1) {
                          const byCluster = {};
                          visible.forEach((c, i) => {
                            const cl = c.cluster || c.cluster_title || "Other";
                            if (!byCluster[cl]) byCluster[cl] = [];
                            byCluster[cl].push({ career: c, idx: i });
                          });

                          return (
                            <div>
                              {strengthMap}
                              {interestTeaser}
                              {Object.entries(byCluster).map(([cl, entries]) => (
                                <div key={cl} style={{ marginBottom: 6 }}>
                                  <div style={{
                                    fontSize: 10, fontWeight: 700, color: "#64748b",
                                    textTransform: "uppercase", letterSpacing: ".07em",
                                    paddingBottom: 6, borderBottom: "1px solid #e2e8f0", marginBottom: 10,
                                  }}>
                                    {cl} {t("studentResults.clusterSuffix", "careers")}
                                  </div>
                                  {entries.map(({ career, idx }) =>
                                    idx === 0
                                      ? <TopCareerCard key={career.career_id || career.career_code || idx} career={career} fitBandsCopy={fitBandsCopy} t={t} />
                                      : <CompactCareerCard key={career.career_id || career.career_code || idx} career={career} fitBandsCopy={fitBandsCopy} t={t} />
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        }

                        // Free tier — single column, top card full, rest compact
                        return (
                          <div>
                            {interestTeaser}
                            {visible.map((c, idx) =>
                              idx === 0
                                ? <TopCareerCard key={c.career_id || c.career_code || idx} career={c} fitBandsCopy={fitBandsCopy} t={t} />
                                : <CompactCareerCard key={c.career_id || c.career_code || idx} career={c} fitBandsCopy={fitBandsCopy} t={t} />
                            )}
                          </div>
                        );
                      };

                      const renderCareerDataSections = () => {
                        if (clusterEntries.length === 0 && allCareers.length === 0) return null;
                        const careersWithSkills = allCareers
                          .filter((c) => {
                            const skills = c.matched_keyskills || c.top_keyskills || c.keyskills || [];
                            return Array.isArray(skills) && skills.length > 0;
                          })
                          .slice(0, 3);
                        return (
                          <div style={{ marginTop: 14 }}>
                            <div className="cp-insightsStack">
                              <div className="cp-softPanel">
                                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                  {t("studentResults.clusterSignals.title", "Cluster signals")}
                                </div>
                                {clusterEntries.length > 0 ? (
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
                                {careersWithSkills.length > 0 ? (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                                    {careersWithSkills.map((c, idx) => {
                                      const skills = c.matched_keyskills || c.top_keyskills || c.keyskills || [];
                                      return (
                                        <div
                                          key={c.career_id || c.career_code || idx}
                                          style={{ paddingBottom: 10, borderBottom: "1px solid rgba(0,0,0,0.06)" }}
                                        >
                                          <div style={{ fontWeight: 700 }}>{c.title || c.career_title}</div>
                                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                                            {skills.slice(0, 3).map((sk, ski) => (
                                              <span
                                                key={sk.keyskill_code || sk.keyskill_name || sk.name || ski}
                                                style={{
                                                  fontSize: 12,
                                                  padding: "2px 8px",
                                                  borderRadius: 999,
                                                  background: "rgba(0,0,0,0.06)",
                                                  color: "var(--text-primary)",
                                                }}
                                              >
                                                {sk.keyskill_name || sk.name || sk.keyskill_code || String(sk)}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <ComingSoon />
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      };

                      const renderUpsellCard = () => (
                        <div
                          style={{
                            border: "1px solid var(--brand-primary)",
                            borderRadius: 12,
                            padding: 20,
                            marginTop: 16,
                            background: "var(--bg-card, #ffffff)",
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                            ⭐ {t("results.upsell.title", "Unlock deeper career insights")}
                          </div>
                          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12, margin: "0 0 12px 0", lineHeight: 1.5 }}>
                            {t("results.upsell.body", "See which career clusters match you, understand why each career fits your strengths, and get guided next steps to move forward.")}
                          </p>
                          <ul style={{ fontSize: 13, paddingLeft: 18, marginBottom: 16, margin: "0 0 16px 0" }}>
                            {["feature1", "feature2", "feature3", "feature4"].map((k) => (
                              <li key={k} style={{ marginBottom: 4 }}>
                                ✓ {t(`results.upsell.${k}`)}
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => navigate("/pricing")}
                            style={{
                              background: "var(--brand-primary)",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "10px 20px",
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: 14,
                            }}
                          >
                            {t("results.upsell.cta", "Get Premium")}
                          </button>
                        </div>
                      );

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
                          <div className="results-section__titleRow" style={{ alignItems: "center" }}>
                            <div>
                              <div className="results-section__title">{rec.title}</div>
                              <div className="text-muted results-section__sub">
                                {t(
                                  "studentResults.topMatches.subtitle",
                                  "Your top matches are shown using student-safe fit bands (no scores)."
                                )}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, letterSpacing: ".04em", textTransform: "uppercase" }}>
                                {t("studentResults.contentLang.label", "Career descriptions")}
                              </span>
                              <InlineLanguageToggle
                                lang={contentLang}
                                onChange={(next) => setContentLang(next)}
                                t={t}
                              />
                            </div>
                          </div>

                          <div className="card" style={{ padding: 16 }}>
                            {renderTopCareersCards()}

                            {isPaidOrPremium ? (
                              <>
                                {renderCareerDataSections()}
                                {renderPremiumInsightsCard()}
                              </>
                            ) : (
                              renderUpsellCard()
                            )}
                          </div>

                          <style>{`
                            .cp-results { display: flex; flex-direction: column; gap: 10px; }
                            .cp-resultsActions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
                            .results-section { margin-top: 4px; }
                            .results-section__titleRow { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
                            .results-section__title { font-size: 15px; font-weight: 800; line-height: 1.2; }
                            .results-section__sub { font-size: 12px; line-height: 1.45; }
                            .cp-sectionCard { padding: 12px; }
                            .cp-inlineIcon { display: inline-flex; align-items: center; gap: 6px; }
                            .cp-contextGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 2px; }
                            .cp-miniCard { border: 1px solid rgba(0,0,0,0.07); border-radius: 10px; padding: 8px 10px; }
                            .cp-miniLabel { font-size: 10px; margin-bottom: 2px; color: var(--text-muted); }
                            .cp-miniValue { font-size: 12px; font-weight: 700; line-height: 1.25; }
                            .cp-contextExplain { margin-top: 8px; }
                            .cp-detailsSummary { cursor: pointer; font-weight: 700; font-size: 13px; }
                            .cp-detailsBody { font-size: 12px; margin-top: 8px; line-height: 1.5; }
                            .cp-linkButton { text-decoration: underline; cursor: pointer; }
                            .cp-cards3 { display: grid; grid-template-columns: 1fr; gap: 8px; }
                            .cp-insights2 { display: grid; grid-template-columns: 1fr; gap: 10px; }
                            .cp-insightsStack { display: grid; grid-template-columns: 1fr; gap: 10px; margin-top: 10px; }
                            .cp-softPanel { border: 1px solid rgba(0,0,0,0.07); border-radius: 10px; padding: 10px; background: rgba(0,0,0,0.015); }
                            .top-career-card { padding: 12px; border-radius: 12px; }
                            .top-career-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
                            .top-career-card__titleWrap { min-width: 0; }
                            .top-career-card__title { font-weight: 800; line-height: 1.2; font-size: 15px; }
                            .top-career-card__cluster { font-size: 11px; margin-top: 2px; }
                            .top-career-card__bandPill { font-size: 11px; font-weight: 700; border: 1px solid rgba(0,0,0,0.1); border-radius: 999px; padding: 3px 8px; white-space: nowrap; }
                            .top-career-card__bandDesc { font-size: 12px; line-height: 1.45; margin-bottom: 6px; }
                            .top-career-card__drivers { margin: 0; padding-left: 14px; font-size: 12px; line-height: 1.45; }
                            .top-career-card__drivers li { margin-bottom: 4px; }
                            @media (max-width: 479px) {
                              .cp-resultsActions { flex-direction: column; }
                              .cp-resultsActions > * { width: 100%; text-align: center; }
                              .cp-results { gap: 8px; }
                              .cp-sectionCard { padding: 10px; }
                            }
                            @media (min-width: 480px) {
                              .cp-results { gap: 12px; }
                              .cp-contextGrid { grid-template-columns: repeat(4, 1fr); gap: 8px; }
                            }
                            @media (min-width: 640px) {
                              .cp-results { gap: 16px; }
                              .cp-resultsActions { gap: 10px; }
                              .cp-sectionCard { padding: 16px; }
                              .top-career-card { padding: 16px; }
                              .top-career-card__title { font-size: 17px; }
                            }
                            @media (min-width: 900px) {
                              .cp-cards3 { grid-template-columns: repeat(2, 1fr); gap: 12px; }
                            }
                            @media (min-width: 1200px) {
                              .cp-cards3 { grid-template-columns: repeat(3, 1fr); gap: 14px; }
                              .cp-insights2 { grid-template-columns: repeat(2, 1fr); }
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

