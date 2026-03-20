// src/ui/PublicHeader.jsx
// CHANGES FROM LIVE VERSION:
//   1. Brand name: "CareerPlatform" → "MapYourCareer"
//   2. Added: position sticky + top 0 + z-index 50 on the outer div
// UNCHANGED: useContent(), LanguageSwitcher, NavLink, all styles, all t() keys

import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "./LanguageSwitcher";
import { useContent } from "../locales/LanguageProvider";

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;

  return (
    <Link
      to={to}
      style={{
        textDecoration: "none",
        fontWeight: isActive ? 700 : 500,
        borderBottom: isActive ? "2px solid #111" : "2px solid transparent",
        paddingBottom: 2,
        color: "#111",
      }}
    >
      {children}
    </Link>
  );
}

export default function PublicHeader() {
  const { t } = useContent();

  return (
    <div
      style={{
        borderBottom: "1px solid #eee",
        background: "#fff",
        position: "sticky",   // ← NEW: stays at top on scroll
        top: 0,               // ← NEW
        zIndex: 50,           // ← NEW: above page content
      }}
    >
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* ← CHANGED: CareerPlatform → MapYourCareer */}
        <Link to="/" style={{ textDecoration: "none", color: "#111" }}>
          <span style={{ fontWeight: 800 }}>MapYourCareer</span>
        </Link>

        <div style={{ display: "flex", gap: 14, marginLeft: 12 }}>
          <NavLink to="/">{t("nav.home", "Home")}</NavLink>
          <NavLink to="/pricing">{t("nav.pricing", "Pricing")}</NavLink>
        </div>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <LanguageSwitcher compact />

          <Link
            to="/login"
            style={{
              textDecoration: "none",
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              color: "#111",
              fontWeight: 600,
            }}
          >
            {t("nav.login", "Login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
