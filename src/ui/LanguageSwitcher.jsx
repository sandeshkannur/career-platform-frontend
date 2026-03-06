// src/ui/LanguageSwitcher.jsx
import { useEffect, useState } from "react";
import { getPreferredLang, setPreferredLang } from "../apiClient";
import { t, SUPPORTED_LANGS } from "../i18n";



export default function LanguageSwitcher({ compact = false }) {
  const [lang, setLang] = useState("en");

  useEffect(() => {
    setLang(getPreferredLang() || "en");
  }, []);

  function onChange(e) {
    const next = (e?.target?.value || "en").trim().toLowerCase();
    setPreferredLang(next);
    setLang(next);

    // simplest + safest: reload so all pages/components pick up new language
    window.location.reload();
  }

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {!compact && (
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          {t("nav.language", "Language")}
        </span>
      )}

      <select
        value={lang}
        onChange={onChange}
        style={{
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
        }}
      >
        {SUPPORTED_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}