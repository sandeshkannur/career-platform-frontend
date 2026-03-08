// frontend/src/hooks/useContent.js
// Now powered by locale JSON files instead of DEFAULTS.

import { t as tGlobal } from "../i18n";

/**
 * useContent(sectionKey)
 *
 * Example:
 *   const { t } = useContent("login");
 *   t("title")  -> resolves "login.title"
 *
 *   const { t } = useContent("results");
 *   t("premium.locked") -> resolves "results.premium.locked"
 */

export default function useContent(sectionKey = "") {
  const prefix = sectionKey ? `${sectionKey}.` : "";

  function t(key, fallback = "") {
    const fullKey = key.includes(".") ? key : `${prefix}${key}`;
    return tGlobal(fullKey, fallback);
  }

  return { t };
}
