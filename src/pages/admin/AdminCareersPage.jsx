// src/pages/admin/AdminCareersPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import AdminModal from '../../components/AdminModal';
import FormField from '../../components/FormField';
import { getAdminClusters, getAdminCareers, updateCareerTier, createCareer } from '../../api/adminAnalytics';

const TIER_LABELS = { 1: 'Aspirational', 2: 'Automation Risk', 3: 'Western/Irrelevant', 4: 'Low Aspiration' };
const TIER_COLORS = { 1: '#16a34a', 2: '#d97706', 3: '#64748b', 4: '#dc2626' };

const fieldStyle = {
  width: '100%', fontSize: 13, padding: '8px 10px',
  border: '0.5px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function AdminCareersPage() {
  const C = {
    navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0', muted: '#64748b',
    bg: '#f8fafc', card: '#fff', red: '#dc2626', green: '#16a34a', amber: '#d97706',
  };

  const navigate = useNavigate();
  const [careers, setCareers] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ cluster_id: '', is_active: '', tier: '', search: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [updating, setUpdating] = useState(null);
  const PAGE_SIZE = 50;

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [form, setForm] = useState({ title: '', career_code: '', cluster_id: '', description: '', career_tier: '1' });
  const [formError, setFormError] = useState('');
  const [history, setHistory] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (filters.cluster_id) params.cluster_id = filters.cluster_id;
      if (filters.is_active !== '') params.is_active = filters.is_active;
      if (filters.tier) params.tier = filters.tier;
      if (filters.search) params.search = `%${filters.search}%`;
      const d = await getAdminCareers(params);
      setCareers(d.careers || []);
      setTotal(d.total || 0);
    } finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => {
    getAdminClusters().then(d => setClusters(d.clusters || []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleTierChange = async (careerId, field, value) => {
    setUpdating(careerId);
    try {
      const career = careers.find(c => c.id === careerId);
      const body = {
        is_active: field === 'is_active' ? value : career.is_active,
        career_tier: field === 'career_tier' ? parseInt(value) : career.career_tier,
        tier_reason: career.tier_reason || '',
      };
      await updateCareerTier(careerId, body);
      await load();
    } catch (e) {
      console.error(e);
    } finally { setUpdating(null); }
  };

  const closeModal = () => {
    setShowCreate(false);
    setForm({ title: '', career_code: '', cluster_id: '', description: '', career_tier: '1' });
    setFormError('');
    setCreateResult(null);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { setFormError('Career title is required'); return; }
    if (!form.career_code.trim()) { setFormError('Career code is required'); return; }
    if (!form.cluster_id) { setFormError('Cluster is required'); return; }
    setCreating(true);
    setFormError('');
    try {
      const result = await createCareer({ ...form, career_tier: parseInt(form.career_tier) });
      setCreateResult(result);
      const clusterName = clusters.find(c => String(c.id) === String(form.cluster_id))?.name || form.cluster_id;
      setHistory(h => [{
        action: 'Created', type: 'Career', name: result.title,
        id: result.id, at: new Date().toLocaleTimeString('en-IN'),
        extra: `${result.career_code} · ${clusterName} · T${result.career_tier}`,
      }, ...h].slice(0, 10));
      load();
    } catch (e) {
      setFormError(e?.message || 'Failed to create career');
    } finally { setCreating(false); }
  };

  const inputStyle = {
    fontSize: 12, padding: '5px 8px',
    border: `0.5px solid ${C.border}`, borderRadius: 6, background: C.card,
  };

  return (
    <>
    <AdminNav title="Careers" subtitle="Manage career tiers and active status" />
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Careers</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {total} careers · Page {page} of {Math.ceil(total / PAGE_SIZE)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)} style={{
            background: C.teal, color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>+ New Career</button>
          <button onClick={() => navigate('/admin/bulk-upload')} style={{
            background: C.navy, color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12,
          }}>+ Upload CSV</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input style={{ ...inputStyle, minWidth: 200 }} placeholder="Search career title..."
          value={filters.search}
          onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
        />
        <select style={inputStyle} value={filters.cluster_id}
          onChange={e => { setFilters(f => ({ ...f, cluster_id: e.target.value })); setPage(1); }}>
          <option value="">All Clusters</option>
          {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select style={inputStyle} value={filters.is_active}
          onChange={e => { setFilters(f => ({ ...f, is_active: e.target.value })); setPage(1); }}>
          <option value="">All (active + inactive)</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
        <select style={inputStyle} value={filters.tier}
          onChange={e => { setFilters(f => ({ ...f, tier: e.target.value })); setPage(1); }}>
          <option value="">All Tiers</option>
          <option value="1">Tier 1 — Aspirational India</option>
          <option value="2">Tier 2 — Automation Risk</option>
          <option value="3">Tier 3 — Western/Irrelevant</option>
          <option value="4">Tier 4 — Low Aspiration</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `0.5px solid ${C.border}` }}>
              {['Title', 'Cluster', 'Code', 'Active', 'Tier', 'KeySkills', 'Weights', 'Skill Wt Total', 'Actions'].map(h => (
                <th key={h} style={{
                  padding: '8px 12px', textAlign: h === 'Active' || h === 'KeySkills' || h === 'Weights' || h === 'Skill Wt Total' ? 'center' : 'left',
                  color: C.muted, fontWeight: 500,
                }}>{h}{h === 'Skill Wt Total' && <div style={{ fontSize: 9, fontWeight: 400 }}>(should be ~100)</div>}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: C.muted }}>Loading...</td></tr>
            ) : careers.map(career => (
              <React.Fragment key={career.id}>
                <tr style={{
                  borderBottom: `0.5px solid ${C.border}`,
                  background: !career.is_active ? '#fef9f9' : 'transparent',
                  opacity: updating === career.id ? 0.5 : 1,
                }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, color: career.is_active ? C.navy : C.muted }}>
                    <span style={{ cursor: 'pointer', color: C.teal }}
                      onClick={() => setExpandedId(expandedId === career.id ? null : career.id)}>
                      {career.title}
                    </span>
                    {!career.is_active && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, color: C.red,
                        background: '#fef2f2', padding: '1px 5px', borderRadius: 3,
                      }}>inactive</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px', color: C.muted }}>{career.cluster_name}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10, color: C.muted }}>{career.career_code}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <input type="checkbox" checked={career.is_active}
                      onChange={e => handleTierChange(career.id, 'is_active', e.target.checked)}
                      disabled={updating === career.id}
                    />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <select style={{ ...inputStyle, fontSize: 11 }}
                      value={career.career_tier}
                      onChange={e => handleTierChange(career.id, 'career_tier', e.target.value)}
                      disabled={updating === career.id}>
                      {[1, 2, 3, 4].map(t => (
                        <option key={t} value={t} style={{ color: TIER_COLORS[t] }}>
                          T{t} — {TIER_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace' }}>
                    <span style={{ color: career.keyskill_count === 0 ? C.red : C.navy }}>
                      {career.keyskill_count}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace' }}>
                    <span style={{ color: career.skill_weight_count === 0 ? C.red : C.navy }}>
                      {career.skill_weight_count}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontFamily: 'monospace', color: C.navy }}>
                    {career.skill_weight_total?.toFixed(1) || '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ cursor: 'pointer', color: C.teal, fontSize: 11 }}
                      onClick={() => setExpandedId(expandedId === career.id ? null : career.id)}>
                      {expandedId === career.id ? '▲ hide' : '▼ details'}
                    </span>
                  </td>
                </tr>
                {expandedId === career.id && (
                  <tr>
                    <td colSpan={9} style={{ background: C.bg, padding: '12px 16px', borderBottom: `0.5px solid ${C.border}` }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 11 }}>
                        <div>
                          <div style={{ fontWeight: 500, color: C.navy, marginBottom: 4 }}>Tier info</div>
                          <div style={{ color: C.muted }}>Tier: <strong style={{ color: TIER_COLORS[career.career_tier] }}>T{career.career_tier} — {TIER_LABELS[career.career_tier]}</strong></div>
                          {career.tier_reason && <div style={{ color: C.muted, marginTop: 2 }}>Reason: {career.tier_reason}</div>}
                          {career.deactivated_by && <div style={{ color: C.muted, marginTop: 2 }}>By: {career.deactivated_by}</div>}
                          {career.deactivated_at && <div style={{ color: C.muted, marginTop: 2 }}>At: {new Date(career.deactivated_at).toLocaleDateString('en-IN')}</div>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: C.navy, marginBottom: 4 }}>Content (EN)</div>
                          {career.content_en ? (
                            <>
                              <div style={{ color: C.muted }}>Indian title: {career.content_en.indian_job_title || '—'}</div>
                              <div style={{ color: C.muted }}>Stream: {career.content_en.recommended_stream || '—'}</div>
                              <div style={{ color: C.muted }}>Automation risk: {career.content_en.automation_risk || '—'}</div>
                              <div style={{ color: C.muted }}>Future outlook: {career.content_en.future_outlook || '—'}</div>
                              <div style={{ color: C.muted }}>Salary: ₹{((career.content_en.salary_entry_inr || 0) / 100000).toFixed(1)}L – ₹{((career.content_en.salary_peak_inr || 0) / 100000).toFixed(1)}L</div>
                            </>
                          ) : <div style={{ color: C.red }}>No content found</div>}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, color: C.navy, marginBottom: 4 }}>Pathways</div>
                          {career.content_en ? (
                            <>
                              <div style={{ color: C.muted }}>Step 1: {career.content_en.pathway_step1 || '—'}</div>
                              <div style={{ color: C.muted }}>Step 2: {career.content_en.pathway_step2 || '—'}</div>
                              <div style={{ color: C.muted }}>Step 3: {career.content_en.pathway_step3 || '—'}</div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
        <button style={inputStyle} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
        <span style={{ fontSize: 12, color: C.muted, padding: '5px 8px' }}>
          Page {page} of {Math.ceil(total / PAGE_SIZE)}
        </span>
        <button style={inputStyle} disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(p => p + 1)}>Next →</button>
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
      <AdminModal title="Create Career" onClose={closeModal}>
        {createResult ? (
          <div style={{
            background: '#f0fdf4', border: '0.5px solid #bbf7d0',
            borderRadius: 8, padding: '16px',
          }}>
            <div style={{ color: C.green, fontWeight: 500, marginBottom: 8 }}>✓ Career created</div>
            <div style={{ fontSize: 12, color: '#166534' }}>
              ID: {createResult.id} | Code: {createResult.career_code} | Tier: T{createResult.career_tier}
            </div>
            <button onClick={() => { setCreateResult(null); setForm({ title: '', career_code: '', cluster_id: '', description: '', career_tier: '1' }); }}
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
            <FormField label="Career Title" required>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Wildlife Conservationist" style={fieldStyle} />
            </FormField>
            <FormField label="Career Code" required hint="Unique code, auto-uppercased. e.g. AGR_030">
              <input value={form.career_code}
                onChange={e => setForm(f => ({ ...f, career_code: e.target.value.toUpperCase() }))}
                placeholder="AGR_030" style={fieldStyle} />
            </FormField>
            <FormField label="Career Cluster" required>
              <select value={form.cluster_id} onChange={e => setForm(f => ({ ...f, cluster_id: e.target.value }))}
                style={fieldStyle}>
                <option value="">— Select cluster —</option>
                {clusters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Description" hint="Optional — brief description of this career">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} placeholder="Brief description..."
                style={{ ...fieldStyle, resize: 'vertical' }} />
            </FormField>
            <FormField label="Career Tier" hint="Tier 1 = Aspirational India (default for new careers)">
              <select value={form.career_tier} onChange={e => setForm(f => ({ ...f, career_tier: e.target.value }))}
                style={fieldStyle}>
                <option value="1">Tier 1 — Aspirational India</option>
                <option value="2">Tier 2 — Automation Risk</option>
                <option value="3">Tier 3 — Western/Irrelevant</option>
                <option value="4">Tier 4 — Low Aspiration</option>
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
                {creating ? 'Creating...' : 'Create Career'}
              </button>
            </div>
          </>
        )}
      </AdminModal>
    )}
    </>
  );
}
