import { useNavigate } from "react-router-dom";
import SkeletonPage from "../ui/SkeletonPage";
import Button from "../ui/Button";
import { useSession } from "../hooks/useSession";

const SECTIONS = [
  {
    label: "Career Data Management",
    items: [
      { label: "Career Clusters",   route: "/admin/career-clusters",  desc: "Manage the 16 clusters that group all careers" },
      { label: "Careers",            route: "/admin/careers",           desc: "Master directory of all 369 careers" },
      { label: "Career Wizard",      route: "/admin/careers/wizard",    desc: "Guided flow to onboard a new career" },
      { label: "Key Skills",         route: "/admin/key-skills",        desc: "Manage the 48 keyskills careers are scored against" },
      { label: "Mappings",           route: "/admin/mappings",          desc: "Edit skill-to-keyskill and career-to-keyskill weights" },
      { label: "Bulk Upload",        route: "/admin/bulk-upload",       desc: "Import careers and mappings from CSV" },
    ],
  },
  {
    label: "Expert Validation (SME)",
    items: [
      { label: "SME Registry",  route: "/admin/sme",        desc: "Manage subject-matter-expert profiles" },
      { label: "SME Tokens",    route: "/admin/sme-tokens", desc: "Issue and track SME validation access" },
    ],
  },
  {
    label: "Counselling Operations",
    items: [
      { label: "Counsellors", route: "/admin/counsellors", desc: "Manage counsellor accounts, download activity and caseloads" },
    ],
  },
  {
    label: "Scoring Engine Configuration",
    items: [
      { label: "Associated Qualities (AQs)", route: "/admin/aqs",            desc: "Reference view of the 25 measured qualities" },
      { label: "Student Skills (26)",         route: "/admin/student-skills", desc: "Reference view of the 26 canonical student skills" },
      { label: "Fit Band Thresholds",         route: "/admin/fit-bands",      desc: "Configure the five fit-band score cutoffs" },
      { label: "CPS Factor Weights",          route: "/admin/cps-factors",    desc: "Configure contextual profile score weights" },
      { label: "Weight Change Requests",      route: "/admin/weight-review",  desc: "Review queue and audit trail for keyskill weight proposals" },
    ],
  },
  {
    label: "Validation & Intelligence",
    items: [
      { label: "Assessment Simulator", route: "/admin/simulator", desc: "Run synthetic personas through the engine" },
      { label: "Career Proximity",     route: "/admin/careers",   desc: "Explore nearest-neighbour career similarity" },
    ],
  },
  {
    label: "Monitoring & Compliance",
    items: [
      { label: "Engine Health",      route: "/admin/engine-health", desc: "Scoring engine KPIs and trends" },
      { label: "Platform Analytics", route: "/admin/analytics",     desc: "Usage and operational metrics" },
      { label: "DPDP Compliance",    route: "/admin/compliance",    desc: "Consent rates and data-protection status" },
      { label: "Audit Trail",        route: "/admin/audit-trail",   desc: "Append-only log of admin actions" },
      { label: "Password Reset Logs", route: "/admin/password-reset-logs", desc: "Append-only log of password reset activity" },
    ],
  },
];

export default function AdminHomePage() {
  const navigate = useNavigate();
  const { logout, sessionUser } = useSession();

  return (
    <SkeletonPage
      title="Admin Console"
      subtitle={
        sessionUser?.full_name
          ? `Welcome, ${sessionUser.full_name}. Manage master data and mappings.`
          : "Manage master data and mappings."
      }
      actions={<Button onClick={logout} variant="secondary">Logout</Button>}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {SECTIONS.map((section, si) => (
          <div key={section.label}>
            {si > 0 && (
              <div style={{ height: 1, background: "#e2e8f0", margin: "20px 0" }} />
            )}
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "#64748b",
              marginBottom: 8,
            }}>
              {section.label}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
            }}>
              {section.items.map((item) => (
                <div key={item.label}>
                  <Button
                    style={{ width: "100%", borderRadius: 10, justifyContent: "center" }}
                    onClick={() => navigate(item.route)}
                  >
                    {item.label}
                  </Button>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4, lineHeight: 1.4 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SkeletonPage>
  );
}
