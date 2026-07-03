import { useContent } from "../../locales/LanguageProvider";
import { useSession } from "../../hooks/useSession";
import Button from "../../ui/Button";

export default function StudentProfilePage() {
  const { t } = useContent();
  const { sessionUser, logout } = useSession();

  const fullName = sessionUser?.full_name || "";
  const email = sessionUser?.email || "";
  const role = sessionUser?.role || "student";
  const tier = sessionUser?.tier || sessionUser?.subscription_tier || null;
  const initials = fullName
    ? fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return (
    <div style={{ maxWidth: 600, display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>
          {t("student.profile.title", "Profile")}
        </h1>
        <p style={{ marginTop: 6, fontSize: 14, color: "var(--color-ink-500, #6B7280)" }}>
          {t("student.profile.subtitle", "Your account details and preferences.")}
        </p>
      </div>

      {/* Account card */}
      <div style={{ background: "var(--color-surface, #FFFFFF)", border: "1px solid var(--color-border, #6B7280)", borderRadius: 14, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "var(--color-primary, #2540D9)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>
              {fullName || t("student.profile.unknownName", "Student")}
            </div>
            <div style={{ fontSize: 13, color: "var(--color-ink-500, #6B7280)", marginTop: 2 }}>{email}</div>
          </div>
          {tier && (
            <div style={{
              marginLeft: "auto",
              background: tier === "premium" ? "var(--color-primary, #2540D9)" : "var(--color-paper, #F8FAF9)",
              color: tier === "premium" ? "#fff" : "var(--color-ink-500, #6B7280)",
              border: tier === "premium" ? "none" : "1px solid var(--color-border, #6B7280)",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              flexShrink: 0,
            }}>
              {tier}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 10, borderTop: "1px solid var(--color-border, #6B7280)", paddingTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--color-ink-500, #6B7280)" }}>{t("student.profile.field.role", "Role")}</span>
            <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{role}</span>
          </div>
          {email && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--color-ink-500, #6B7280)" }}>{t("student.profile.field.email", "Email")}</span>
              <span style={{ fontWeight: 600 }}>{email}</span>
            </div>
          )}
          {tier && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span style={{ color: "var(--color-ink-500, #6B7280)" }}>{t("student.profile.field.tier", "Plan")}</span>
              <span style={{ fontWeight: 600, textTransform: "capitalize" }}>{tier}</span>
            </div>
          )}
        </div>
      </div>

      {/* Coming soon card */}
      <div style={{ background: "var(--color-surface, #FFFFFF)", border: "1px solid var(--color-border, #6B7280)", borderRadius: 14, padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          {t("student.profile.comingSoonTitle", "More settings coming soon")}
        </div>
        <p style={{ fontSize: 13, color: "var(--color-ink-500, #6B7280)", margin: 0 }}>
          {t("student.profile.comingSoonBody", "Profile editing, notification preferences, and more will be available in a future release.")}
        </p>
      </div>

      {/* Sign out */}
      <div>
        <Button variant="secondary" onClick={logout}>
          {t("common.logout", "Sign out")}
        </Button>
      </div>
    </div>
  );
}
