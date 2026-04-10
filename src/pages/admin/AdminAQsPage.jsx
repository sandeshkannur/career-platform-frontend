// src/pages/admin/AdminAQsPage.jsx
import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import { apiGet } from "../../apiClient";

/* ─── domain badge colours ─── */
const DOMAIN_COLORS = {
  cognitive:   { bg: "#dbeafe", color: "#1e40af" },
  behavioral:  { bg: "#dcfce7", color: "#166534" },
  behavioural: { bg: "#dcfce7", color: "#166534" }, // alternate spelling
  emotional:   { bg: "#fef9c3", color: "#854d0e" },
};

function domainStyle(domain) {
  const key = (domain || "").toLowerCase();
  return DOMAIN_COLORS[key] ?? { bg: "#f1f5f9", color: "#475569" };
}

/* ─── chapter from AQ code ─────────────────────────────────────────────
   AQ_01–AQ_05 = Chapter 1, AQ_06–AQ_10 = Chapter 2, etc.
   Falls back gracefully if the code doesn't follow the pattern.
─────────────────────────────────────────────────────────────────────── */
function chapterFromCode(aq_code) {
  const match = (aq_code || "").match(/(\d+)$/);
  if (!match) return null;
  return Math.ceil(parseInt(match[1], 10) / 5);
}

/* ─── group AQs by chapter, preserving original order ─── */
function groupByChapter(aqs) {
  const groups = [];
  let currentChapter = null;

  for (const aq of aqs) {
    const ch = chapterFromCode(aq.aq_code);
    if (ch !== currentChapter) {
      currentChapter = ch;
      groups.push({ chapter: ch, items: [] });
    }
    groups[groups.length - 1].items.push(aq);
  }
  return groups;
}

export default function AdminAQsPage() {
  const [aqs,     setAqs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [search,       setSearch]       = useState("");
  const [domainFilter, setDomainFilter] = useState("");

  /* ─── load ─── */

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet("/v1/admin/aqs");
      setAqs(Array.isArray(data) ? data : (data?.aqs ?? []));
    } catch (e) {
      setError(e.message || "Failed to load AQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ─── derive domain options from data ─── */

  const domainOptions = useMemo(() => {
    const seen = new Set();
    aqs.forEach(a => { if (a.domain) seen.add(a.domain); });
    return Array.from(seen).sort();
  }, [aqs]);

  /* ─── filtered list ─── */

  const filtered = useMemo(() => {
    let list = aqs;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(a =>
        a.aq_code?.toLowerCase().includes(q) ||
        a.aq_name?.toLowerCase().includes(q)
      );
    }
    if (domainFilter) {
      list = list.filter(a => a.domain === domainFilter);
    }
    return list;
  }, [aqs, search, domainFilter]);

  /* ─── subtitle ─── */

  const subtitleText = () => {
    if (loading) return "Loading…";
    const n = filtered.length;
    if (domainFilter) return `${n} ${domainFilter} ${n === 1 ? "quality" : "qualities"}`;
    return `${n} Associated ${n === 1 ? "Quality" : "Qualities"}`;
  };

  /* ─── grouped view ─── */

  const grouped = useMemo(() => groupByChapter(filtered), [filtered]);

  /* ─── input style ─── */

  const inputCls = [
    "rounded-md border border-[var(--border)] bg-white px-3 py-2",
    "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
    "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
  ].join(" ");

  /* ─── render ─── */

  return (
    <SkeletonPage
      title="Associated Qualities (AQs)"
      subtitle={subtitleText()}
      loading={loading}
      error={!loading ? error : ""}
      onRetry={loadAll}
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
      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className={inputCls}
          style={{ width: 260 }}
          placeholder="Search by code or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={inputCls}
          value={domainFilter}
          onChange={e => setDomainFilter(e.target.value)}
        >
          <option value="">All Domains</option>
          {domainOptions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        {(search || domainFilter) && (
          <Button size="sm" variant="ghost"
            onClick={() => { setSearch(""); setDomainFilter(""); }}>
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
          No AQs match the current filters.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                {["AQ Code", "Name", "Domain", "Chapter"].map(h => (
                  <th key={h} style={{
                    padding: "8px 12px", fontWeight: 700,
                    color: "var(--text-muted)", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map(({ chapter, items }) => (
                <>
                  {/* ── Chapter group separator ── */}
                  <tr key={`ch-${chapter}`}>
                    <td colSpan={4} style={{
                      padding: "6px 12px",
                      background: "var(--bg-app)",
                      borderTop: "1px solid var(--border)",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 11, fontWeight: 700,
                      color: "var(--text-muted)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}>
                      {chapter != null ? `Chapter ${chapter}` : "Ungrouped"}
                    </td>
                  </tr>

                  {/* ── AQ rows ── */}
                  {items.map((aq, idx) => {
                    const ds = domainStyle(aq.domain);
                    return (
                      <tr key={aq.id ?? aq.aq_code} style={{
                        borderBottom: "1px solid var(--border)",
                        background: idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                      }}>
                        <td style={{
                          padding: "9px 12px",
                          fontFamily: "monospace", fontSize: 12,
                          fontWeight: 700, color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                        }}>
                          {aq.aq_code}
                        </td>
                        <td style={{ padding: "9px 12px", color: "var(--text-primary)" }}>
                          {aq.aq_name || "—"}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          {aq.domain
                            ? <span style={{
                                display: "inline-block",
                                fontSize: 11, fontWeight: 600,
                                padding: "2px 9px", borderRadius: 4,
                                background: ds.bg, color: ds.color,
                              }}>
                                {aq.domain}
                              </span>
                            : <span style={{ color: "var(--text-muted)" }}>—</span>
                          }
                        </td>
                        <td style={{
                          padding: "9px 12px",
                          color: "var(--text-muted)", fontSize: 12,
                        }}>
                          {chapter != null ? `Ch. ${chapter}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SkeletonPage>
  );
}
