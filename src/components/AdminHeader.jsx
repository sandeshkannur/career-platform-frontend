import { Link, useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { useSession } from "../hooks/useSession";

export default function AdminHeader({ title, crumbs = [] }) {
  const navigate = useNavigate();
  const { logout } = useSession();

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "0 24px",
      borderBottom: "1px solid #e2e8f0",
      background: "#fff",
      minHeight: 52,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden" }}>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <span style={{ color: "#e2e8f0", fontSize: 16, userSelect: "none" }}>|</span>
        <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 13, flexWrap: "nowrap", overflow: "hidden" }}>
          <Link to="/admin" style={{ color: "#0b1f3a", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            Admin Console
          </Link>
          {crumbs.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ color: "#94a3b8", margin: "0 2px" }}>/</span>
              {crumb.to ? (
                <Link to={crumb.to} style={{ color: "#0b1f3a", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>{crumb.label}</span>
              )}
            </span>
          ))}
          {title && (
            <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <span style={{ color: "#94a3b8", margin: "0 2px" }}>/</span>
              <span style={{ color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            </span>
          )}
        </nav>
      </div>
      <Button variant="secondary" size="sm" onClick={logout}>
        Logout
      </Button>
    </div>
  );
}
