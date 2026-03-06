import en from "./locales/en.json";
import kn from "./locales/kn.json";
import { getPreferredLang } from "./apiClient";

/**
 * Language packs
 */
export const PACKS = {
  en,
  kn,
};

/**
 * Languages supported by the UI
 * Add new languages here
 */
export const SUPPORTED_LANGS = [
  { code: "en", label: "English" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)" },
];

/**
 * Default language
 */
export const FALLBACK_LANG = "en";

/**
 * Safely determine active language
 */
export function getActiveLang() {
  const raw = (getPreferredLang() || "").trim().toLowerCase();
  return PACKS[raw] ? raw : FALLBACK_LANG;
}

/**
 * Translation function
 */
export function t(key, fallback = "") {
  const lang = getActiveLang();
  const pack = PACKS[lang] || {};
  const fbPack = PACKS[FALLBACK_LANG] || {};

  const val = pack[key] ?? fbPack[key];

  if (val === undefined || val === null || val === "") {
    return fallback || key;
  }

  return val;
}