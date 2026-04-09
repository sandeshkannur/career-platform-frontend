// src/components/AdminNav.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminNav({ title, subtitle }) {
  const navigate = useNavigate();

  const C = {
    navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0', muted: '#64748b',
  };

  const btnStyle = {
    fontSize: 12, padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
    border: '0.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)',
    color: '#fff', fontFamily: 'inherit',
  };

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: C.navy, borderBottom: `1px solid ${C.border}`,
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <button style={btnStyle} onClick={() => navigate(-1)}>← Back</button>
      <button style={btnStyle} onClick={() => navigate('/admin')}>Admin Console</button>
      <button style={btnStyle} onClick={() => navigate('/')}>← Home</button>
      {title && (
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: C.muted }}>{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
