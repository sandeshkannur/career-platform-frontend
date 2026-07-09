// src/pages/counsellor/CounsellorCaseloadPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Card from "../../ui/Card";
import Button from "../../ui/Button";
import { apiGet } from "../../apiClient";

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

export default function CounsellorCaseloadPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: "var(--font-size-2xl)", fontWeight: 800 }}>
          My Caseload
        </h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: "var(--font-size-base)" }}>
          {loading ? "Loading…" : `${total} assigned student${total !== 1 ? "s" : ""}`}
        </p>
      </div>

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
