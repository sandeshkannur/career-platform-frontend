// src/pages/admin/AdminMappingsPage.jsx
import React, { useState, useEffect } from 'react';
import AdminNav from '../../components/AdminNav';
import AdminModal from '../../components/AdminModal';
import FormField from '../../components/FormField';
import { getMappingHealth, createMapping } from '../../api/adminAnalytics';

const fieldStyle = {
  width: '100%', fontSize: 13, padding: '8px 10px',
  border: '0.5px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function AdminMappingsPage() {
  const C = {
    navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0', muted: '#64748b',
    bg: '#f8fafc', card: '#fff', red: '#dc2626', green: '#16a34a', amber: '#d97706',
  };
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [form, setForm] = useState({ career_id: '', keyskill_id: '', weight_percentage: '' });
  const [formError, setFormError] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    getMappingHealth().then(setHealth).finally(() => setLoading(false));
  }, []);

  const closeModal = () => {
    setShowCreate(false);
    setForm({ career_id: '', keyskill_id: '', weight_percentage: '' });
    setFormError('');
    setCreateResult(null);
  };

  const handleCreate = async () => {
    if (!form.career_id) { setFormError('Career ID is required'); return; }
    if (!form.keyskill_id) { setFormError('Key Skill ID is required'); return; }
    const weight = parseFloat(form.weight_percentage);
    if (isNaN(weight) || weight < 0 || weight > 100) { setFormError('Weight must be a number between 0 and 100'); return; }
    setCreating(true);
    setFormError('');
    try {
      const result = await createMapping({
        career_id: parseInt(form.career_id),
        keyskill_id: parseInt(form.keyskill_id),
        weight_percentage: weight,
      });
      setCreateResult(result);
      setHistory(h => [{
        action: 'Mapped', type: 'Career→KeySkill',
        name: `Career ${result.career_id} → Skill ${result.keyskill_id}`,
        id: `${result.weight_percentage}%`, at: new Date().toLocaleTimeString('en-IN'),
      }, ...h].slice(0, 10));
    } catch (e) {
      setFormError(e?.message || 'Failed to create mapping');
    } finally { setCreating(false); }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Mappings & Weights</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Career ↔ KeySkill ↔ Student Skill weight health</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{
          background: C.teal, color: '#fff', border: 'none',
          borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
        }}>Map Career → KeySkill</button>
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

      {/* Session activity */}
      {history.length > 0 && (
        <div style={{ marginTop: 20, background: C.bg, borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.navy, marginBottom: 8 }}>
            Session activity ({history.length})
          </div>
          {history.map((item, i) => (
            <div key={i} style={{
              fontSize: 11, color: C.muted, padding: '3px 0',
              borderBottom: `0.5px solid ${C.border}`,
            }}>
              <span style={{ color: C.green, fontWeight: 500 }}>{item.action}</span>
              {' '}{item.type}: <strong>{item.name}</strong> | Weight: {item.id} at {item.at}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Create mapping modal */}
    {showCreate && (
      <AdminModal title="Map Career → KeySkill" onClose={closeModal}>
        {createResult ? (
          <div style={{
            background: '#f0fdf4', border: '0.5px solid #bbf7d0',
            borderRadius: 8, padding: '16px',
          }}>
            <div style={{ color: C.green, fontWeight: 500, marginBottom: 8 }}>✓ Mapping created</div>
            <div style={{ fontSize: 12, color: '#166534' }}>
              Career ID: {createResult.career_id} → KeySkill ID: {createResult.keyskill_id} | Weight: {createResult.weight_percentage}%
            </div>
            <button onClick={() => { setCreateResult(null); setForm({ career_id: '', keyskill_id: '', weight_percentage: '' }); }}
              style={{
                marginTop: 12, background: C.teal, color: '#fff', border: 'none',
                borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
              }}>
              Map another
            </button>
          </div>
        ) : (
          <>
            {formError && (
              <div style={{
                fontSize: 12, color: C.red, background: '#fef2f2', padding: '8px 12px',
                borderRadius: 6, marginBottom: 12, border: '0.5px solid #fecaca',
              }}>{formError}</div>
            )}
            <div style={{ fontSize: 11, color: C.muted, background: C.bg, padding: '8px 12px', borderRadius: 6, marginBottom: 16 }}>
              Tip: To find Career IDs, go to the Careers page. To find KeySkill IDs, go to the Key Skills page.
              This upserts — if the mapping already exists, the weight will be updated.
            </div>
            <FormField label="Career ID" required hint="Numeric ID of the career (from Careers page)">
              <input type="number" value={form.career_id}
                onChange={e => setForm(f => ({ ...f, career_id: e.target.value }))}
                placeholder="e.g. 42" style={fieldStyle} />
            </FormField>
            <FormField label="Key Skill ID" required hint="Numeric ID of the key skill (from Key Skills page)">
              <input type="number" value={form.keyskill_id}
                onChange={e => setForm(f => ({ ...f, keyskill_id: e.target.value }))}
                placeholder="e.g. 7" style={fieldStyle} />
            </FormField>
            <FormField label="Weight %" required hint="Percentage weight (0–100). Sum across all keyskills for a career should be ~100.">
              <input type="number" min="0" max="100" value={form.weight_percentage}
                onChange={e => setForm(f => ({ ...f, weight_percentage: e.target.value }))}
                placeholder="e.g. 35" style={fieldStyle} />
            </FormField>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={{
                background: 'none', border: `0.5px solid ${C.border}`,
                borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12,
              }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{
                background: C.navy, color: '#fff', border: 'none',
                borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}>
                {creating ? 'Saving...' : 'Save Mapping'}
              </button>
            </div>
          </>
        )}
      </AdminModal>
    )}
    </>
  );
}
