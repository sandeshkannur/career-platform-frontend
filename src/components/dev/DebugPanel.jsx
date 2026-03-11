// frontend/src/components/dev/DebugPanel.jsx
import React from "react";
import { useContent } from "../../locales/LanguageProvider";

/**
 * DebugPanel
 * - DEV-only usage (wrap in: const showDebug = import.meta.env.DEV)
 * - Safe JSON rendering with fallback
 */
export default function DebugPanel({ title, data }) {
  const { t } = useContent();

  const resolvedTitle = title || t("debugPanel.title", "Debug Data");

  const safeJson = (() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return t(
        "debugPanel.errors.stringifyFailed",
        "<< Could not stringify debug data: {{error}} >>",
        { error: String(e) }
      );
    }
  })();

  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
        {resolvedTitle}{" "}
        <span className="text-xs font-normal text-slate-500">
          ({t("debugPanel.temporaryView", "temporary debug view")})
        </span>
      </summary>

      <div className="border-t border-slate-200">
        <pre className="max-h-[320px] overflow-auto p-3 text-xs leading-5 text-slate-800">
          {safeJson}
        </pre>
      </div>
    </details>
  );
}