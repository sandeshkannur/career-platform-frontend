// src/pages/counsellor/CounsellorStudentDetailPage.jsx
import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
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

const microLabel = {
  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4,
};

function Field({ label, children }) {
  return (
    <div>
      <div style={microLabel}>{label}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
}

export default function CounsellorStudentDetailPage() {
  const { studentId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { status, message }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await apiGet(`/v1/counsellor/students/${studentId}`);
      setData(d);
    } catch (e) {
      setError({ status: e.status, message: e.message || "Failed to load student." });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  const backLink = (
    <Link to="/counsellor/caseload" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
      ← My Caseload
    </Link>
  );

  if (loading) {
    return (
      <Card>
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px 0", margin: 0 }}>
          Loading student…
        </p>
      </Card>
    );
  }

  // 403: not assigned to this counsellor — friendly, deliberate message
  if (error?.status === 403) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
            You don't have access to this student
          </p>
          <p style={{ margin: "8px 0 16px", color: "var(--text-muted)", fontSize: 14 }}>
            Only students actively assigned to you are visible here.
          </p>
          {backLink}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <p style={{ color: "#dc2626", fontSize: 14, margin: "0 0 12px" }}>
            {error.status === 404 ? "Student not found." : error.message}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
            <Button variant="secondary" onClick={load}>Retry</Button>
            {backLink}
          </div>
        </div>
      </Card>
    );
  }

  const assignment = data?.assignment ?? {};

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        {backLink}
        <h1 style={{ margin: "8px 0 0", fontSize: "var(--font-size-2xl)", fontWeight: 800 }}>
          {data?.name || `Student #${data?.student_id ?? studentId}`}
        </h1>
      </div>

      <Card>
        <h2 style={{ margin: "0 0 14px", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
          Student
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <Field label="Name">{data?.name || "—"}</Field>
          <Field label="Grade">{data?.grade != null ? data.grade : "—"}</Field>
          <Field label="Student ID">
            <span style={{ fontFamily: "monospace" }}>#{data?.student_id}</span>
          </Field>
        </div>
      </Card>

      <div style={{ height: 16 }} />

      <Card>
        <h2 style={{ margin: "0 0 14px", fontSize: "var(--font-size-lg)", fontWeight: 700 }}>
          Assignment
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <Field label="Type">
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
              background: assignment.assignment_type === "self_claimed" ? "#fef3c7" : "#dbeafe",
              color: assignment.assignment_type === "self_claimed" ? "#92400e" : "#1e40af",
            }}>
              {(assignment.assignment_type || "—").replace(/_/g, " ")}
            </span>
          </Field>
          <Field label="Assigned At">{fmtDateTime(assignment.assigned_at)}</Field>
        </div>
      </Card>
    </>
  );
}
