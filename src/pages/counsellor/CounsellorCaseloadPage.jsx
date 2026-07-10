// src/pages/counsellor/CounsellorCaseloadPage.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import Input from "../../ui/Input";
import AdminModal from "../../components/AdminModal";
import { apiGet, apiPost } from "../../apiClient";

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function TypeBadge({ type }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
      background: type === "self_claimed" ? "#fef3c7" : "#dbeafe",
      color: type === "self_claimed" ? "#92400e" : "#1e40af",
    }}>
      {(type || "—").replace(/_/g, " ")}
    </span>
  );
}

// ── Add Student search + claim ──────────────────────────────────────────

function AddStudentSearch({ assignedIds, onClose, onClaimed }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [locallyAssigned, setLocallyAssigned] = useState(() => new Set());
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const d = await apiGet(`/v1/counsellor/students/search?q=${encodeURIComponent(trimmed)}`);
        const list = Array.isArray(d) ? d : Array.isArray(d?.students) ? d.students : Array.isArray(d?.results) ? d.results : [];
        setResults(list);
        setSearchError("");
      } catch (e) {
        setSearchError(e.message || "Search failed.");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleClaim = async (student) => {
    const id = student.student_id ?? student.id;
    setClaimingId(id);
    try {
      await apiPost(`/v1/counsellor/students/${id}/claim`, {});
      onClaimed();
      onClose();
    } catch (e) {
      if (e.status === 409) {
        setLocallyAssigned((prev) => new Set(prev).add(id));
      } else {
        setSearchError(e.message || "Could not claim this student.");
      }
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <AdminModal title="Add Student" onClose={onClose}>
      <Input
        autoFocus
        placeholder="Search by name or email…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
        Claims are logged and visible to admins.
      </p>

      <div style={{ marginTop: 14, minHeight: 60 }}>
        {searching ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", margin: "16px 0" }}>
            Searching…
          </p>
        ) : searchError ? (
          <p style={{ color: "#dc2626", fontSize: 13, textAlign: "center", margin: "16px 0" }}>
            {searchError}
          </p>
        ) : query.trim().length < 2 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", margin: "16px 0" }}>
            Type at least 2 characters to search.
          </p>
        ) : results.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", margin: "16px 0" }}>
            No students found.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {results.map((r) => {
              const id = r.student_id ?? r.id;
              const alreadyAssigned = assignedIds.has(id) || locallyAssigned.has(id);
              return (
                <div key={id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 12, padding: "10px 12px", border: "1px solid var(--border)", borderRadius: 8,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name || `Student #${id}`}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {r.grade != null ? `Grade ${r.grade} · ` : ""}{r.email || "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={alreadyAssigned ? "secondary" : "primary"}
                    disabled={alreadyAssigned || claimingId === id}
                    onClick={() => handleClaim(r)}
                  >
                    {alreadyAssigned ? "Already assigned" : claimingId === id ? "Claiming…" : "Claim"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminModal>
  );
}

export default function CounsellorCaseloadPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await apiGet("/v1/counsellor/students");
      setData(d);
    } catch (e) {
      setError(e.message || "Failed to load your caseload.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const assignments = Array.isArray(data?.assignments) ? data.assignments : [];
  const total = data?.total ?? assignments.length;
  const assignedIds = new Set(assignments.map((a) => a.student_id));

  return (
    <>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--font-size-2xl)", fontWeight: 800 }}>
            My Caseload
          </h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "var(--font-size-base)" }}>
            {loading ? "Loading…" : `${total} assigned student${total !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button onClick={() => setSearchOpen(true)}>+ Add Student</Button>
      </div>

      {searchOpen && (
        <AddStudentSearch
          assignedIds={assignedIds}
          onClose={() => setSearchOpen(false)}
          onClaimed={load}
        />
      )}

      <Card>
        {loading ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0", margin: 0 }}>
            Loading your caseload…
          </p>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ color: "#dc2626", fontSize: 14, margin: "0 0 12px" }}>{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        ) : assignments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>No students assigned yet</p>
            <p style={{ margin: "8px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
              Students will appear here once an admin assigns them to you.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  {["Student", "Assignment Type", "Assigned At", ""].map((h, i) => (
                    <th key={i} style={{
                      padding: "8px 10px", fontWeight: 700,
                      color: "var(--text-muted)", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, idx) => (
                  <tr key={a.id} style={{
                    borderBottom: "1px solid var(--border)",
                    background: idx % 2 === 0 ? "transparent" : "var(--bg-app)",
                  }}>
                    <td style={{ padding: "10px 10px", fontWeight: 600 }}>
                      <Link
                        to={`/counsellor/students/${a.student_id}`}
                        style={{ color: "#0d9488", textDecoration: "none" }}
                      >
                        {a.student_name || `Student #${a.student_id}`}
                      </Link>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <TypeBadge type={a.assignment_type} />
                    </td>
                    <td style={{ padding: "10px 10px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {fmtDateTime(a.assigned_at)}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "right" }}>
                      <Link to={`/counsellor/students/${a.student_id}`}>
                        <Button size="sm" variant="secondary">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
