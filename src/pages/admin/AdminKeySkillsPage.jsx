// src/pages/admin/AdminKeySkillsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import AdminModal from '../../components/AdminModal';
import FormField from '../../components/FormField';
import { getAdminKeySkills, getAdminClusters, createKeySkill } from '../../api/adminAnalytics';

const fieldStyle = {
  width: '100%', fontSize: 13, padding: '8px 10px',
  border: '0.5px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function AdminKeySkillsPage() {
  const C = {
    navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0',
    muted: '#64748b', bg: '#f8fafc', card: '#fff', red: '#dc2626', green: '#16a34a',
  };
  const navigate = useNavigate();
  const [keyskills, setKeyskills] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cluster_id: '', search: '' });

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', cluster_id: '' });
  const [formError, setFormError] = useState('');
  const [history, setHistory] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.cluster_id) params.cluster_id = filters.cluster_id;
      if (filters.search) params.search = `%${filters.search}%`;
      const d = await getAdminKeySkills(params);
      setKeyskills(d.keyskills || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { getAdminClusters().then(d => setClusters(d.clusters || [])); }, []);
  useEffect(() => { load(); }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeModal = () => {
    setShowCreate(false);
    setForm({ name: '', description: '', cluster_id: '' });
    setFormError('');
    setCreateResult(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('Skill name is required'); return; }
    setCreating(true);
    setFormError('');
    try {
      const result = await createKeySkill(form);
      setCreateResult(result);
      const clusterName = clusters.find(c => String(c.id) === String(form.cluster_id))?.name || 'Unassigned';
      setHistory(h => [{
        action: 'Created', type: 'Key Skill', name: result.name,
        id: result.id, at: new Date().toLocaleTimeString('en-IN'),
        extra: clusterName,
      }, ...h].slice(0, 10));
      load();
    } catch (e) {
      setFormError(e?.message || 'Failed to create key skill');
    } finally { setCreating(false); }
  };

  const inputStyle = {
    fontSize: 12, padding: '5px 8px',
    border: `0.5px solid ${C.border}`, borderRadius: 6,
  };

  return (
    <>
    <AdminNav title="Key Skills" subtitle="Skill to cluster mapping and weights" />
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Key Skills</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{keyskills.length} keyskills</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)} style={{
            background: C.teal, color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>+ New Key Skill</button>
          <button onClick={() => navigate('/admin/bulk-upload')} style={{
            background: C.navy, color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12,
          }}>+ Upload CSV</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input style={{ ...inputStyle, minWidth: 200 }} placeholder="Search skill name..."
          value={filters.search}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <select style={inputStyle} value={filters.cluster_id}
          onChange={e => setFilters(f => ({ ...f, cluster_id: e.target.value }))}>
          <option value="">All Clusters</option>
          {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `0.5px solid ${C.border}` }}>
              {['Key Skill', 'Cluster', 'Description', 'Careers', 'Avg Weight %'].map((h, i) => (
                <th key={h} style={{
                  padding: '8px 12px',
                  textAlign: i >= 3 ? 'center' : 'left',
                  color: C.muted, fontWeight: 500,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: C.muted }}>Loading...</td></tr>
            ) : keyskills.map(ks => (
              <tr key={ks.id} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                <td style={{ padding: '8px 12px', fontWeight: 500, color: C.navy }}>{ks.name}</td>
                <td style={{ padding: '8px 12px', color: C.muted }}>{ks.cluster_name || '—'}</td>
                <td style={{ padding: '8px 12px', color: C.muted, maxWidth: 300, fontSize: 11 }}>
                  {ks.description || '—'}
                </td>
                <td style={{
                  padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace',
                  color: ks.career_count === 0 ? C.red : C.navy,
                }}>
                  {ks.career_count}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: C.teal }}>
                  {ks.weight_percentage_avg?.toFixed(1) || '—'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Session activity */}
      {history.length > 0 && (
        <div style={{ marginTop: 20, background: C.bg, borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: C.navy, marginBottom: 8 }}>
            Session activity ({history.length})
          </div>
          {history.map((h, i) => (
            <div key={i} style={{
              fontSize: 11, color: C.muted, padding: '3px 0',
              borderBottom: `0.5px solid ${C.border}`,
            }}>
              <span style={{ color: C.green, fontWeight: 500 }}>{h.action}</span>
              {' '}{h.type}: <strong>{h.name}</strong> (ID: {h.id}){h.extra ? ` · ${h.extra}` : ''} at {h.at}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Create modal */}
    {showCreate && (
      <AdminModal title="Create Key Skill" onClose={closeModal}>
        {createResult ? (
          <div style={{
            background: '#f0fdf4', border: '0.5px solid #bbf7d0',
            borderRadius: 8, padding: '16px',
          }}>
            <div style={{ color: C.green, fontWeight: 500, marginBottom: 8 }}>✓ Key skill created successfully</div>
            <div style={{ fontSize: 12, color: '#166534' }}>ID: {createResult.id}</div>
            <div style={{ fontSize: 12, color: '#166534' }}>Name: {createResult.name}</div>
            <button onClick={() => { setCreateResult(null); setForm({ name: '', description: '', cluster_id: '' }); }}
              style={{
                marginTop: 12, background: C.teal, color: '#fff', border: 'none',
                borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
              }}>
              Create another
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
            <FormField label="Skill Name" required>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Logical Reasoning" style={fieldStyle} />
            </FormField>
            <FormField label="Description" hint="Optional — brief description of this skill">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="e.g. Ability to solve structured problems"
                style={{ ...fieldStyle, resize: 'vertical' }} />
            </FormField>
            <FormField label="Cluster" hint="Optional — assign this skill to a cluster">
              <select value={form.cluster_id} onChange={e => setForm(f => ({ ...f, cluster_id: e.target.value }))}
                style={fieldStyle}>
                <option value="">— No cluster —</option>
                {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
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
                {creating ? 'Creating...' : 'Create Key Skill'}
              </button>
            </div>
          </>
        )}
      </AdminModal>
    )}
    </>
  );
}
