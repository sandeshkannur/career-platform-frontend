// src/pages/admin/AdminKeySkillsPage.jsx
import React, { useState, useEffect } from 'react';
import { getAdminKeySkills, getAdminClusters } from '../../api/adminAnalytics';

export default function AdminKeySkillsPage() {
  const C = {
    navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0',
    muted: '#64748b', bg: '#f8fafc', card: '#fff', red: '#dc2626',
  };
  const [keyskills, setKeyskills] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cluster_id: '', search: '' });

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

  const inputStyle = {
    fontSize: 12, padding: '5px 8px',
    border: `0.5px solid ${C.border}`, borderRadius: 6,
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Key Skills</h1>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{keyskills.length} keyskills</div>
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
    </div>
  );
}
