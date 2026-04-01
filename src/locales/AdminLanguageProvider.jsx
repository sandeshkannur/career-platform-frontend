/**
 * src/locales/AdminLanguageProvider.jsx
 *
 * Admin-specific i18n provider — completely separate from the student
 * LanguageProvider. Admin and student translations never mix.
 *
 * Usage in any admin page:
 *   import { useAdminContent } from "../../locales/AdminLanguageProvider";
 *   const { t } = useAdminContent();
 *   t("admin.sme.pageTitle", "SME Registry")
 *
 * Adding a new language:
 *   1. Add keys to admin.<lang>.json
 *   2. Import the file below and add to adminDictionaries
 *   3. No other changes needed
 *
 * Adding new admin section keys:
 *   1. Add English keys to admin.en.json
 *   2. Add matching keys to admin.kn.json when Kannada is ready
 *   3. Use t("admin.<section>.<key>", "English fallback") in components
 *
 * Student files untouched:
 *   en.json, kn.json, LanguageProvider.jsx — never import or modify these here.
 */

import { createContext, useContext, useMemo } from "react";
import adminEn from "./admin.en.json";
import adminKn from "./admin.kn.json";

// ── Dictionary registry ───────────────────────────────────────────────────
// Add new languages here when ready. Key = ISO 639-1 language code.
const adminDictionaries = {
  en: adminEn,
  kn: adminKn,
};

// ── Interpolation helper ──────────────────────────────────────────────────
// Replaces {{ varName }} placeholders with values from vars object.
// Example: interpolate("Hello {{name}}", { name: "Ananya" }) → "Hello Ananya"
function interpolate(template, vars = {}) {
  if (typeof template !== "string") return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

// ── Translation helper ────────────────────────────────────────────────────
// Lookup order: dict[key] → fallback string → key itself
// This means admin pages always render something readable even if a key
// is missing from the current language's dictionary.
function translate(dict, key, fallback, vars) {
  const raw = dict?.[key];
  if (typeof raw === "string" && raw.length > 0) {
    return interpolate(raw, vars);
  }
  if (typeof fallback === "string") {
    return interpolate(fallback, vars);
  }
  return key;
}

// ── Context ───────────────────────────────────────────────────────────────
const AdminContentContext = createContext({
  t: (key, fallback, vars) => {
    if (typeof fallback === "string") return fallback;
    return key;
  },
});

// ── Provider ──────────────────────────────────────────────────────────────
// Reads the current language from localStorage (set by the student
// LanguageProvider) so admin and student UIs stay in sync on language choice.
// Falls back to "en" if the stored language has no admin dictionary.
export function AdminLanguageProvider({ children }) {
  // Read language preference set by the student LanguageProvider
  // so admin and student UIs always use the same selected language.
  const language = (() => {
    try {
      const saved = localStorage.getItem("career_platform_language");
      return saved && adminDictionaries[saved] ? saved : "en";
    } catch {
      return "en";
    }
  })();

  const dict = adminDictionaries[language] || adminDictionaries.en;

  const value = useMemo(
    () => ({
      t: (key, fallback, vars) => translate(dict, key, fallback, vars),
      language,
    }),
    [dict, language]
  );

  return (
    <AdminContentContext.Provider value={value}>
      {children}
    </AdminContentContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────
// Import this in every admin page/component that needs translated text.
// Never import useContent from LanguageProvider in admin pages.
export function useAdminContent() {
  return useContext(AdminContentContext);
}

export default AdminLanguageProvider;
