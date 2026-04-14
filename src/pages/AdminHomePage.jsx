// src/pages/AdminHomePage.jsx
import { Link } from "react-router-dom";
import SkeletonPage from "../ui/SkeletonPage";
import Button from "../ui/Button";
import { useSession } from "../hooks/useSession";

export default function AdminHomePage() {
  const { logout, sessionUser } = useSession();

  return (
    <SkeletonPage
      title="Admin Console"
      subtitle={
        sessionUser?.full_name
          ? `Welcome, ${sessionUser.full_name}. Manage master data and mappings.`
          : "Manage master data and mappings."
      }
      actions={<Button onClick={logout}>Logout</Button>}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <Link to="/" style={{ color: "var(--text-muted)", fontSize: 13, textDecoration: "none" }}>
            ← Home
          </Link>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Link to="/admin/sme">
          <Button style={{ width: "100%" }}>SME Registry</Button>
        </Link>

        <Link to="/admin/sme-tokens">
          <Button style={{ width: "100%" }}>SME Tokens</Button>
        </Link>

        <Link to="/admin/career-clusters">
          <Button style={{ width: "100%" }}>Career Clusters</Button>
        </Link>

        <Link to="/admin/careers">
          <Button style={{ width: "100%" }}>Careers</Button>
        </Link>

        <Link to="/admin/careers/wizard">
          <Button style={{ width: "100%" }}>Career Wizard</Button>
        </Link>

        <Link to="/admin/key-skills">
          <Button style={{ width: "100%" }}>Key Skills</Button>
        </Link>

        <Link to="/admin/mappings">
          <Button style={{ width: "100%" }}>Mappings</Button>
        </Link>

        <Link to="/admin/bulk-upload">
          <Button style={{ width: "100%" }}>Bulk Upload</Button>
        </Link>

        <Link to="/admin/analytics">
          <Button style={{ width: "100%" }}>Platform Analytics</Button>
        </Link>

        <Link to="/admin/student-skills">
          <Button style={{ width: "100%" }}>Student Skills (24)</Button>
        </Link>

        <Link to="/admin/aqs">
          <Button style={{ width: "100%" }}>Associated Qualities (AQs)</Button>
        </Link>

        <Link to="/admin/fit-bands">
          <Button style={{ width: "100%" }}>Fit Band Thresholds</Button>
        </Link>

        <Link to="/admin/compliance">
          <Button style={{ width: "100%" }}>DPDP Compliance</Button>
        </Link>

        <Link to="/admin/cps-factors">
          <Button style={{ width: "100%" }}>CPS Factor Weights</Button>
        </Link>

        <Link to="/admin/engine-health">
          <Button style={{ width: "100%" }}>Engine Health</Button>
        </Link>

        <Link to="/admin/audit-trail">
          <Button style={{ width: "100%" }}>Audit Trail</Button>
        </Link>

        <Link to="/admin/simulator">
          <Button style={{ width: "100%" }}>Assessment Simulator</Button>
        </Link>

</div>
    </SkeletonPage>
  );
}
