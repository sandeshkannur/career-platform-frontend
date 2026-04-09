// src/pages/admin/AdminMappingsPage.jsx
import React, { useState, useEffect } from 'react';
import AdminNav from '../../components/AdminNav';
import { getMappingHealth } from '../../api/adminAnalytics';

export default function AdminMappingsPage() {
  const C = {
    navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0', muted: '#64748b',
    bg: '#f8fafc', card: '#fff', red: '#dc2626', green: '#16a34a', amber: '#d97706',
  };
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMappingHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: C.muted }}>Loading mapping health...</div>;

  const h = health || {};

  const StatCard = ({ label, value, color, sub }) => (
    <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 24, fontWeight: 500, color: color || C.navy, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <>
    <AdminNav title="Mappings & Weights" subtitle="Career ↔ KeySkill ↔ Student Skill weight health" />
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Mappings & Weights</h1>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Career ↔ KeySkill ↔ Student Skill weight health</div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total careers" value={h.total_careers} />
        <StatCard label="Active careers" value={h.active_careers} color={C.teal} />
        <StatCard label="With keyskills" value={h.careers_with_keyskills} color={C.green} />
        <StatCard label="Missing keyskills" value={h.careers_without_keyskills}
          color={h.careers_without_keyskills > 0 ? C.red : C.green} />
        <StatCard label="Weight sum OK" value={h.careers_weight_sum_ok} color={C.green} />
        <StatCard label="Weight sum wrong" value={h.careers_weight_sum_wrong}
          color={h.careers_weight_sum_wrong > 0 ? C.red : C.green} />
      </div>

      {/* Tier breakdown */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: C.navy, marginBottom: 12 }}>Career Tier Breakdown</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { label: 'Tier 1 — Aspirational India', key: 'tier1_active', color: C.green, active: true },
            { label: 'Tier 2 — Automation Risk', key: 'tier2_active', color: C.amber, active: true },
            { label: 'Tier 3 — Western/Irrelevant', key: 'tier3_inactive', color: C.muted, active: false },
            { label: 'Tier 4 — Low Aspiration', key: 'tier4_inactive', color: C.red, active: false },
          ].map(tier => (
            <div key={tier.key} style={{
              background: tier.active ? '#f0fdf4' : '#f8fafc',
              borderRadius: 8, padding: '10px 12px',
              border: `0.5px solid ${tier.active ? '#bbf7d0' : C.border}`,
            }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: tier.color, fontFamily: 'monospace' }}>
                {h.tier_breakdown?.[tier.key] || 0}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{tier.label}</div>
              <div style={{ fontSize: 10, color: tier.active ? C.green : C.muted, marginTop: 2 }}>
                {tier.active ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: C.muted, background: C.bg, borderRadius: 8, padding: '10px 14px' }}>
        To manage individual career weights, go to the Careers tab and click any career row to expand its details.
        Bulk weight updates are done via Bulk Upload → Upload CSV.
      </div>
    </div>
    </>
  );
}
