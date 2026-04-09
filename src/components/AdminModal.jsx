// src/components/AdminModal.jsx
import React from 'react';

export default function AdminModal({ title, onClose, children }) {
  const C = { navy: '#0b1f3a', border: '#e2e8f0', muted: '#64748b' };
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto',
        border: `0.5px solid ${C.border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `0.5px solid ${C.border}`,
        }}>
          <div style={{ fontSize: 15, fontWeight: 500, color: C.navy }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 18,
            cursor: 'pointer', color: C.muted, padding: '0 4px',
          }}>✕</button>
        </div>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}
