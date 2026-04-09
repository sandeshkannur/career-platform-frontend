// src/components/FormField.jsx
import React from 'react';

export default function FormField({ label, required, hint, error, children }) {
  const C = { navy: '#0b1f3a', muted: '#64748b', red: '#dc2626', border: '#e2e8f0' };
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: C.navy, marginBottom: 4,
      }}>
        {label}
        {required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{hint}</div>}
      {error && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{error}</div>}
    </div>
  );
}
