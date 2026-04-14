// src/pages/admin/AdminCareerWizardPage.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import SkeletonPage from "../../ui/SkeletonPage";
import Button from "../../ui/Button";
import Card from "../../ui/Card";
import { apiGet, apiPost } from "../../apiClient";

/* ─────────────────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────────────────── */
const INPUT_CLS = [
  "rounded-md border border-[var(--border)] bg-white px-3 py-2",
  "text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)]",
  "focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-1",
].join(" ");

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Indian Context" },
  { id: 3, label: "Career Content" },
  { id: 4, label: "Pathways" },
  { id: 5, label: "Key Skills" },
  { id: 6, label: "Review" },
];

const STREAM_OPTIONS  = ["", "Science PCM", "Science PCB", "Commerce", "Arts/Humanities", "Any"];
const RISK_OPTIONS    = ["", "low", "medium", "high"];
const OUTLOOK_OPTIONS = ["", "growing", "stable", "declining"];

const SKILL_COLORS = [
  "#1e40af", "#0f766e", "#166534", "#92400e",
  "#7c3aed", "#be185d", "#0369a1", "#065f46",
];

const EMPTY_FORM = {
  // Step 1
  title: "", career_code: "", cluster_id: "", description: "",
  // Step 2
  indian_job_title: "", prestige_title: "", recommended_stream: "",
  // Step 3
  salary_entry_inr: "", salary_mid_inr: "", salary_peak_inr: "",
  automation_risk: "", future_outlook: "",
  // Step 4
  pathway_step1: "", pathway_step2: "", pathway_step3: "",
  pathway_accessible: "", pathway_premium: "", pathway_earn_learn: "",
};

/* ─────────────────────────────────────────────────────────────────────────
   STEP INDICATOR
────────────────────────────────────────────────────────────────────────── */
function StepIndicator({ current, steps }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 28, overflowX: "auto" }}>
      {steps.map((step, i) => {
        const done   = current > step.id;
        const active = current === step.id;
        const dotBg  = done ? "var(--brand-primary)" : active ? "#fff" : "#f1f5f9";
        const dotBdr = done || active ? "var(--brand-primary)" : "var(--border)";
        const dotClr = done ? "#fff" : active ? "var(--brand-primary)" : "var(--text-muted)";
        const lblClr = done || active ? "var(--brand-primary)" : "var(--text-muted)";

        return (
          <div key={step.id} style={{ display: "flex", alignItems: "flex-start", flex: i < steps.length - 1 ? 1 : "none", minWidth: 0 }}>
            {/* Dot + label */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: dotBg, border: `2px solid ${dotBdr}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: dotClr,
                transition: "all 0.2s",
              }}>
                {done ? "✓" : step.id}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, color: lblClr,
                whiteSpace: "nowrap", textAlign: "center",
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: 2, marginTop: 13,
                background: done ? "var(--brand-primary)" : "var(--border)",
                transition: "background 0.2s", minWidth: 12,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   FIELD WRAPPER
────────────────────────────────────────────────────────────────────────── */
function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 12, fontWeight: 700,
        marginBottom: 4, color: "var(--text-primary)",
      }}>
        {label}
        {required && <span style={{ color: "#dc2626", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint  && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--text-muted)" }}>{hint}</p>}
      {error && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#dc2626" }}>{error}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   INPUT PRIMITIVES
────────────────────────────────────────────────────────────────────────── */
function TInput({ value, onChange, placeholder, type = "text", ...rest }) {
  return (
    <input
      type={type}
      className={INPUT_CLS}
      style={{ width: "100%", boxSizing: "border-box" }}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
    />
  );
}

function TSelect({ value, onChange, options }) {
  return (
    <select
      className={INPUT_CLS}
      style={{ width: "100%", boxSizing: "border-box" }}
      value={value}
      onChange={onChange}
    >
      {options.map(o =>
        typeof o === "string"
          ? <option key={o} value={o}>{o || "— Select —"}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  );
}

function TArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      className={INPUT_CLS}
      style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   REVIEW VALUE — read-only display used in step 6
────────────────────────────────────────────────────────────────────────── */
function ReviewValue({ label, value, inr }) {
  let display;
  if (value == null || value === "") {
    display = <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>;
  } else if (inr) {
    const n = parseFloat(value);
    display = n
      ? <span style={{ fontWeight: 600 }}>₹{(n / 100000).toFixed(1)}L</span>
      : <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>;
  } else {
    display = <span style={{ color: "var(--text-primary)" }}>{String(value)}</span>;
  }

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 13 }}>{display}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   SKILL TOTAL BAR
────────────────────────────────────────────────────────────────────────── */
function SkillTotalBar({ total }) {
  const good = Math.abs(total - 100) < 0.5;
  const over = total > 100.5;
  const pct  = Math.min(100, Math.max(0, total));
  return (
    <div>
      <div style={{ height: 8, borderRadius: 4, background: "#e2e8f0", overflow: "hidden", marginBottom: 5 }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${pct}%`,
          background: good ? "#16a34a" : over ? "#dc2626" : "var(--brand-primary)",
          transition: "width 0.2s, background 0.2s",
        }} />
      </div>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: good ? "#166534" : over ? "#dc2626" : "#92400e",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span>Total: {total.toFixed(1)}%</span>
        {good
          ? <span>✓</span>
          : <span style={{ fontWeight: 400, fontSize: 11 }}>— must equal 100%</span>
        }
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   PAGE
────────────────────────────────────────────────────────────────────────── */
export default function AdminCareerWizardPage() {
  const navigate = useNavigate();

  /* ── reference data ── */
  const [clusters,   setClusters]   = useState([]);
  const [keySkills,  setKeySkills]  = useState([]);
  const [refLoading, setRefLoading] = useState(true);
  const [refError,   setRefError]   = useState("");

  /* ── wizard state ── */
  const [step,        setStep]        = useState(1);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [stepErrors,  setStepErrors]  = useState({});

  /* ── skill mapping (step 5) ── */
  const [selectedSkills, setSelectedSkills] = useState([]); // [{id, name, weight_percentage}]
  const [skillSearch,    setSkillSearch]    = useState("");

  /* ── submit ── */
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted,   setSubmitted]   = useState(false);
  const [createdId,   setCreatedId]   = useState(null);

  /* ─── load clusters + key skills once ─── */
  const loadRef = useCallback(async () => {
    setRefLoading(true);
    setRefError("");
    try {
      const [clusterData, skillData] = await Promise.all([
        apiGet("/v1/career-clusters"),
        apiGet("/v1/key-skills"),
      ]);
      setClusters(Array.isArray(clusterData) ? clusterData : (clusterData?.clusters ?? []));
      const skills = Array.isArray(skillData) ? skillData : (skillData?.key_skills ?? skillData?.keyskills ?? []);
      setKeySkills(skills);
    } catch (e) {
      setRefError(e.message || "Failed to load reference data. Please try again.");
    } finally {
      setRefLoading(false);
    }
  }, []);

  useEffect(() => { loadRef(); }, [loadRef]);

  /* ─── field setter ─── */
  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setStepErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  /* ─── step 1 validation ─── */
  const validateStep1 = () => {
    const errs = {};
    if (!form.title.trim())       errs.title       = "Title is required.";
    if (!form.career_code.trim()) errs.career_code = "Career Code is required.";
    if (!form.cluster_id)         errs.cluster_id  = "Cluster is required.";
    return errs;
  };

  /* ─── step 5 validation ─── */
  const validateStep5 = () => {
    const errs = {};
    if (selectedSkills.length < 5 || selectedSkills.length > 8) {
      errs._skills = `Select between 5 and 8 skills (currently ${selectedSkills.length}).`;
    }
    const total = selectedSkills.reduce((s, sk) => s + (parseFloat(sk.weight_percentage) || 0), 0);
    if (Math.abs(total - 100) >= 0.5) {
      errs._total = `Weights must sum to exactly 100% (currently ${total.toFixed(1)}%).`;
    }
    return errs;
  };

  /* ─── navigation ─── */
  const handleNext = () => {
    let errs = {};
    if (step === 1) errs = validateStep1();
    if (step === 5) errs = validateStep5();
    if (Object.keys(errs).length > 0) { setStepErrors(errs); return; }
    setStepErrors({});
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    setStepErrors({});
    setStep(s => Math.max(s - 1, 1));
  };

  /* ─── skill toggle / weight update ─── */
  const toggleSkill = (skill) => {
    setSelectedSkills(prev => {
      const exists = prev.find(s => s.id === skill.id);
      if (exists) return prev.filter(s => s.id !== skill.id);
      if (prev.length >= 8) return prev;
      return [...prev, { id: skill.id, name: skill.name, weight_percentage: "" }];
    });
    setStepErrors(e => { const n = { ...e }; delete n._skills; delete n._total; return n; });
  };

  const updateSkillWeight = (id, value) => {
    setSelectedSkills(prev => prev.map(s => s.id === id ? { ...s, weight_percentage: value } : s));
    setStepErrors(e => { const n = { ...e }; delete n._total; return n; });
  };

  const skillTotal = useMemo(
    () => selectedSkills.reduce((s, sk) => s + (parseFloat(sk.weight_percentage) || 0), 0),
    [selectedSkills]
  );

  const filteredSkills = useMemo(() => {
    const q = skillSearch.trim().toLowerCase();
    return q ? keySkills.filter(s => s.name?.toLowerCase().includes(q)) : keySkills;
  }, [keySkills, skillSearch]);

  /* ─── submit ─── */
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...form,
        cluster_id:       form.cluster_id       ? Number(form.cluster_id)       : null,
        salary_entry_inr: form.salary_entry_inr ? Number(form.salary_entry_inr) : null,
        salary_mid_inr:   form.salary_mid_inr   ? Number(form.salary_mid_inr)   : null,
        salary_peak_inr:  form.salary_peak_inr  ? Number(form.salary_peak_inr)  : null,
        key_skills: selectedSkills.map(s => ({
          key_skill_id:     s.id,
          weight_percentage: parseFloat(s.weight_percentage) || 0,
        })),
      };
      const result = await apiPost("/v1/admin/careers/wizard", payload);
      setCreatedId(result?.id ?? result?.career_id ?? null);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── helpers ─── */
  const clusterLabel = useMemo(() => {
    const c = clusters.find(c => String(c.id) === String(form.cluster_id));
    return c ? (c.title ?? c.name ?? String(c.id)) : "—";
  }, [clusters, form.cluster_id]);

  const resetWizard = () => {
    setForm(EMPTY_FORM);
    setSelectedSkills([]);
    setSkillSearch("");
    setStepErrors({});
    setSubmitError("");
    setSubmitted(false);
    setCreatedId(null);
    setStep(1);
  };

  /* ─────────────────────────────────────────────────────────────
     SUCCESS SCREEN
  ──────────────────────────────────────────────────────────────── */
  if (submitted) {
    return (
      <SkeletonPage
        title="Career Created"
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <Link to="/admin" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Admin Console</Link>
            <Link to="/"     style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Home</Link>
          </div>
        }
      >
        <Card>
          <div style={{ textAlign: "center", padding: "40px 24px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#dcfce7", border: "2px solid #86efac",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 28, margin: "0 auto 16px",
            }}>
              ✓
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
              "{form.title}" created successfully
            </h2>
            {createdId && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 28px" }}>
                Career ID: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{createdId}</span>
              </p>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Button onClick={resetWizard}>Create Another</Button>
              <Button variant="secondary" onClick={() => navigate("/admin/careers")}>View Careers</Button>
            </div>
          </div>
        </Card>
      </SkeletonPage>
    );
  }

  /* ─────────────────────────────────────────────────────────────
     WIZARD
  ──────────────────────────────────────────────────────────────── */
  return (
    <SkeletonPage
      title="Career Wizard"
      subtitle={`Step ${step} of ${STEPS.length} — ${STEPS[step - 1].label}`}
      loading={refLoading}
      error={!refLoading ? refError : ""}
      onRetry={loadRef}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <Link to="/admin" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Admin Console</Link>
          <Link to="/"     style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>← Home</Link>
        </div>
      }
    >
      {/* ── Step indicator ── */}
      <StepIndicator current={step} steps={STEPS} />

      {/* ══════════════════════════════════════════════════════════
          STEP 1 — Basic Info
          ══════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Basic Information
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Title" required error={stepErrors.title}>
              <TInput
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="e.g. Agricultural Scientist"
              />
            </Field>
            <Field label="Career Code" required error={stepErrors.career_code}
              hint="Uppercase identifier, e.g. AGR_030">
              <TInput
                value={form.career_code}
                onChange={e => set("career_code", e.target.value.toUpperCase())}
                placeholder="e.g. AGR_030"
              />
            </Field>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Field label="Career Cluster" required error={stepErrors.cluster_id}>
              <TSelect
                value={form.cluster_id}
                onChange={e => set("cluster_id", e.target.value)}
                options={[
                  { value: "", label: "— Select Cluster —" },
                  ...clusters.map(c => ({ value: String(c.id), label: c.title ?? c.name ?? String(c.id) })),
                ]}
              />
            </Field>
          </div>
          <Field label="Description">
            <TArea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Brief description of the career (optional)"
              rows={3}
            />
          </Field>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 2 — Indian Context
          ══════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Indian Context
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Indian Job Title">
              <TInput
                value={form.indian_job_title}
                onChange={e => set("indian_job_title", e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </Field>
            <Field label="Prestige Title">
              <TInput
                value={form.prestige_title}
                onChange={e => set("prestige_title", e.target.value)}
                placeholder="e.g. AI Researcher"
              />
            </Field>
          </div>
          <div style={{ maxWidth: 320 }}>
            <Field label="Recommended Stream" hint="Primary academic stream for this career path">
              <TSelect
                value={form.recommended_stream}
                onChange={e => set("recommended_stream", e.target.value)}
                options={STREAM_OPTIONS}
              />
            </Field>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 3 — Career Content
          ══════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Career Content
          </h3>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Salary (Annual CTC in INR)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Field label="Entry Level">
                <TInput
                  type="number"
                  value={form.salary_entry_inr}
                  onChange={e => set("salary_entry_inr", e.target.value)}
                  placeholder="e.g. 400000"
                  min={0}
                />
              </Field>
              <Field label="Mid Level">
                <TInput
                  type="number"
                  value={form.salary_mid_inr}
                  onChange={e => set("salary_mid_inr", e.target.value)}
                  placeholder="e.g. 800000"
                  min={0}
                />
              </Field>
              <Field label="Peak Level">
                <TInput
                  type="number"
                  value={form.salary_peak_inr}
                  onChange={e => set("salary_peak_inr", e.target.value)}
                  placeholder="e.g. 2000000"
                  min={0}
                />
              </Field>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 480 }}>
            <Field label="Automation Risk">
              <TSelect
                value={form.automation_risk}
                onChange={e => set("automation_risk", e.target.value)}
                options={RISK_OPTIONS}
              />
            </Field>
            <Field label="Future Outlook">
              <TSelect
                value={form.future_outlook}
                onChange={e => set("future_outlook", e.target.value)}
                options={OUTLOOK_OPTIONS}
              />
            </Field>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 4 — Pathways
          ══════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Career Pathways
          </h3>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Standard Pathway Steps
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <Field label="Step 1">
                <TInput
                  value={form.pathway_step1}
                  onChange={e => set("pathway_step1", e.target.value)}
                  placeholder="e.g. Complete B.Tech CS"
                />
              </Field>
              <Field label="Step 2">
                <TInput
                  value={form.pathway_step2}
                  onChange={e => set("pathway_step2", e.target.value)}
                  placeholder="e.g. Gain internship experience"
                />
              </Field>
              <Field label="Step 3">
                <TInput
                  value={form.pathway_step3}
                  onChange={e => set("pathway_step3", e.target.value)}
                  placeholder="e.g. Join as junior engineer"
                />
              </Field>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Accessible Route" hint="Low-barrier entry path for students from disadvantaged backgrounds">
              <TArea
                value={form.pathway_accessible}
                onChange={e => set("pathway_accessible", e.target.value)}
                placeholder="Describe low-barrier entry options…"
                rows={3}
              />
            </Field>
            <Field label="Premium Route" hint="Competitive or elite entry path">
              <TArea
                value={form.pathway_premium}
                onChange={e => set("pathway_premium", e.target.value)}
                placeholder="Describe the competitive / elite path…"
                rows={3}
              />
            </Field>
            <Field label="Earn &amp; Learn" hint="Work while studying options">
              <TArea
                value={form.pathway_earn_learn}
                onChange={e => set("pathway_earn_learn", e.target.value)}
                placeholder="Describe work-while-studying options…"
                rows={3}
              />
            </Field>
          </div>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 5 — Key Skill Mapping
          ══════════════════════════════════════════════════════════ */}
      {step === 5 && (
        <>
          {/* Validation error banner */}
          {(stepErrors._skills || stepErrors._total) && (
            <div style={{
              marginBottom: 16, padding: "10px 14px", borderRadius: 8,
              background: "#fee2e2", border: "1px solid #fca5a5",
              fontSize: 13, color: "#991b1b",
            }}>
              {stepErrors._skills && <div>⚠ {stepErrors._skills}</div>}
              {stepErrors._total  && <div>⚠ {stepErrors._total}</div>}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

            {/* ── Left: skill picker ── */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                Available Skills
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                Select between 5 and 8 skills. {selectedSkills.length >= 8 && (
                  <strong style={{ color: "#dc2626" }}>Maximum reached.</strong>
                )}
              </div>

              <input
                className={INPUT_CLS}
                style={{ width: "100%", boxSizing: "border-box", marginBottom: 12 }}
                placeholder="Search skills…"
                value={skillSearch}
                onChange={e => setSkillSearch(e.target.value)}
              />

              <div style={{ maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                {filteredSkills.map(skill => {
                  const isSelected = selectedSkills.some(s => s.id === skill.id);
                  const atCap      = !isSelected && selectedSkills.length >= 8;

                  return (
                    <button
                      key={skill.id}
                      onClick={() => !atCap && toggleSkill(skill)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 6, border: "1px solid",
                        borderColor: isSelected ? "var(--brand-primary)" : "var(--border)",
                        background: isSelected ? "#eff6ff" : "#fff",
                        cursor: atCap ? "not-allowed" : "pointer",
                        opacity: atCap ? 0.4 : 1,
                        textAlign: "left", fontFamily: "inherit",
                        transition: "border-color 0.1s, background 0.1s",
                        width: "100%",
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${isSelected ? "var(--brand-primary)" : "var(--border)"}`,
                        background: isSelected ? "var(--brand-primary)" : "#fff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.1s",
                      }}>
                        {isSelected && <span style={{ color: "#fff", fontSize: 9, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                          {skill.name}
                        </div>
                        {skill.description && (
                          <div style={{
                            fontSize: 11, color: "var(--text-muted)", marginTop: 1,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {skill.description}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredSkills.length === 0 && (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                    No skills match "{skillSearch}"
                  </p>
                )}
              </div>
            </Card>

            {/* ── Right: weight assignment ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Card>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  Selected Skills ({selectedSkills.length}/8)
                </div>

                <SkillTotalBar total={skillTotal} />

                {selectedSkills.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 16 }}>
                    Select skills from the left panel.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                    {selectedSkills.map((sk, i) => {
                      const clr = SKILL_COLORS[i % SKILL_COLORS.length];
                      return (
                        <div key={sk.id} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px", borderRadius: 8,
                          border: `1px solid ${clr}33`,
                          borderLeft: `4px solid ${clr}`,
                          background: `${clr}0d`,
                        }}>
                          <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {sk.name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              className={INPUT_CLS}
                              style={{ width: 76 }}
                              value={sk.weight_percentage}
                              onChange={e => updateSkillWeight(sk.id, e.target.value)}
                              placeholder="0–100"
                            />
                            <span style={{ fontSize: 12, color: "var(--text-muted)", userSelect: "none" }}>%</span>
                            <button
                              onClick={() => toggleSkill(sk)}
                              title="Remove"
                              style={{
                                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                border: "1px solid #fca5a5", background: "#fee2e2",
                                color: "#dc2626", cursor: "pointer", fontSize: 14, lineHeight: 1,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontFamily: "inherit",
                              }}
                            >×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Remaining hint */}
              {selectedSkills.length >= 5 && Math.abs(skillTotal - 100) >= 0.5 && (
                <div style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "#fefce8", border: "1px solid #fde68a",
                  fontSize: 12, color: "#854d0e",
                }}>
                  Remaining to assign:{" "}
                  <strong>{(100 - skillTotal).toFixed(1)}%</strong>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          STEP 6 — Review & Submit
          ══════════════════════════════════════════════════════════ */}
      {step === 6 && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Basic Info */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                Basic Information
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "span 2" }}>
                  <ReviewValue label="Title" value={form.title} />
                </div>
                <ReviewValue label="Career Code" value={form.career_code} />
                <ReviewValue label="Cluster" value={clusterLabel} />
                <div style={{ gridColumn: "span 3" }}>
                  <ReviewValue label="Description" value={form.description} />
                </div>
              </div>
            </Card>

            {/* Indian Context */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                Indian Context
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <ReviewValue label="Indian Job Title"    value={form.indian_job_title} />
                <ReviewValue label="Prestige Title"      value={form.prestige_title} />
                <ReviewValue label="Recommended Stream"  value={form.recommended_stream} />
              </div>
            </Card>

            {/* Career Content */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                Career Content
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <ReviewValue label="Salary Entry" value={form.salary_entry_inr} inr />
                <ReviewValue label="Salary Mid"   value={form.salary_mid_inr}   inr />
                <ReviewValue label="Salary Peak"  value={form.salary_peak_inr}  inr />
                <ReviewValue label="Automation Risk" value={form.automation_risk} />
                <ReviewValue label="Future Outlook"  value={form.future_outlook} />
              </div>
            </Card>

            {/* Pathways */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                Career Pathways
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
                <ReviewValue label="Step 1" value={form.pathway_step1} />
                <ReviewValue label="Step 2" value={form.pathway_step2} />
                <ReviewValue label="Step 3" value={form.pathway_step3} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <ReviewValue label="Accessible Route" value={form.pathway_accessible} />
                <ReviewValue label="Premium Route"    value={form.pathway_premium} />
                <ReviewValue label="Earn & Learn"     value={form.pathway_earn_learn} />
              </div>
            </Card>

            {/* Key Skills */}
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>
                Key Skill Mapping — {selectedSkills.length} skill{selectedSkills.length !== 1 ? "s" : ""}
              </div>
              {selectedSkills.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No skills selected.</p>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {selectedSkills.map((sk, i) => {
                      const clr = SKILL_COLORS[i % SKILL_COLORS.length];
                      return (
                        <div key={sk.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 12px", borderRadius: 6,
                          borderLeft: `4px solid ${clr}`,
                          background: `${clr}0d`,
                        }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {sk.name}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: clr, fontFamily: "monospace" }}>
                            {sk.weight_percentage || 0}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{
                    marginTop: 10, fontSize: 12, fontWeight: 700,
                    color: Math.abs(skillTotal - 100) < 0.5 ? "#166534" : "#dc2626",
                  }}>
                    Total: {skillTotal.toFixed(1)}%
                    {Math.abs(skillTotal - 100) < 0.5 ? " ✓" : " — must equal 100%"}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{
              marginTop: 14, padding: "10px 14px", borderRadius: 8,
              background: "#fee2e2", border: "1px solid #fca5a5",
              fontSize: 13, color: "#991b1b",
            }}>
              ⚠ {submitError}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          NAVIGATION BAR
          ══════════════════════════════════════════════════════════ */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)",
      }}>
        <div>
          {step > 1 && (
            <Button variant="secondary" onClick={handleBack} disabled={submitting}>
              ← Back
            </Button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map(s => (
              <div
                key={s.id}
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: s.id === step
                    ? "var(--brand-primary)"
                    : s.id < step
                      ? `${SKILL_COLORS[0]}88`
                      : "var(--border)",
                  transition: "background 0.2s",
                }}
              />
            ))}
          </div>

          {step < STEPS.length ? (
            <Button onClick={handleNext}>Next →</Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating…" : "Create Career"}
            </Button>
          )}
        </div>
      </div>
    </SkeletonPage>
  );
}
