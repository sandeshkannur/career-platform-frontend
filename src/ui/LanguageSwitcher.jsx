// src/ui/LanguageSwitcher.jsx
import { useContent } from "../locales/LanguageProvider";

const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
];

export default function LanguageSwitcher({ compact = false }) {
  const { language, setLanguage, t } = useContent();

  function onChange(e) {
    const next = (e?.target?.value || "en").trim().toLowerCase();
    setLanguage(next);
  }

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      {!compact && (
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          {t("nav.language", "Language")}
        </span>
      )}

      <select
        value={language}
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