// src/pages/student/LanguageSelectScreen.jsx
import { useNavigate } from "react-router-dom";
import { useContent } from "../../locales/LanguageProvider";
import { SUPPORTED_LANGS } from "../../i18n";

// Where to send the student after they pick a language.
const NEXT_ROUTE = "/login";

const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Kannada", sans-serif';

export default function LanguageSelectScreen() {
  const navigate = useNavigate();
  const { language, setLanguage } = useContent();

  function handlePick(code) {
    setLanguage(code); // persists to localStorage + syncs apiClient via provider
    navigate(NEXT_ROUTE);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-paper, #F8FAF9)",
        color: "var(--color-ink-900, #111521)",
        fontFamily: FONT_STACK,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ marginBottom: 28, textAlign: "center", lineHeight: 1.4 }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Choose your language</div>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
            ನಿಮ್ಮ ಭಾಷೆ ಆಯ್ಕೆ ಮಾಡಿ
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {SUPPORTED_LANGS.map(({ code, label }) => {
            const isActive = language === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => handlePick(code)}
                aria-label={`Select language: ${label}`}
                style={{
                  width: "100%",
                  minHeight: 56,
                  padding: "14px 18px",
                  fontSize: 18,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  fontFamily: FONT_STACK,
                  textAlign: "center",
                  color: "var(--color-on-fill-light, #FFFFFF)",
                  background: "var(--color-primary, #2540D9)",
                  border: isActive
                    ? "3px solid var(--color-ink-900, #111521)"
                    : "3px solid var(--color-border, #6B7280)",
                  borderRadius: 12,
                  cursor: "pointer",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                {isActive ? "✓ " : ""}
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
