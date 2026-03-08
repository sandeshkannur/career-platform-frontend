// frontend/src/components/dev/DebugPanel.jsx
import React from "react";

/**
 * DebugPanel
 * - DEV-only usage (wrap in: const showDebug = import.meta.env.DEV)
 * - Safe JSON rendering with fallback
 */
export default function DebugPanel({ title = "Debug Data", data }) {
  const safeJson = (() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return `<< Could not stringify debug data: ${String(e)} >>`;
    }
  })();

  return (
    <details className="rounded-xl border border-slate-200 bg-white">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold">
        {title} <span className="text-xs font-normal text-slate-500">(temporary debug view)</span>
      </summary>

      <div className="border-t border-slate-200">
        <pre className="max-h-[320px] overflow-auto p-3 text-xs leading-5 text-slate-800">
          {safeJson}
        </pre>
      </div>
    </details>
  );
}