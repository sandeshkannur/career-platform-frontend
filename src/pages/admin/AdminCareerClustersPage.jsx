// src/pages/admin/AdminCareerClustersPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import AdminModal from '../../components/AdminModal';
import FormField from '../../components/FormField';
import { getAdminClusters, createCluster } from '../../api/adminAnalytics';

const C = {
  navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0',
  muted: '#64748b', bg: '#f8fafc', card: '#ffffff', red: '#dc2626', green: '#16a34a',
};

const fieldStyle = {
  width: '100%', fontSize: 13, padding: '8px 10px',
  border: '0.5px solid #e2e8f0', borderRadius: 6, fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function AdminCareerClustersPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formError, setFormError] = useState('');
  const [history, setHistory] = useState([]);

  const load = () => {
    setLoading(true);
    getAdminClusters().then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const closeModal = () => {
    setShowCreate(false);
    setForm({ name: '', description: '' });
    setFormError('');
    setCreateResult(null);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { setFormError('Cluster name is required'); return; }
    setCreating(true);
    setFormError('');
    try {
      const result = await createCluster(form);
      setCreateResult(result);
      setHistory(h => [{
        action: 'Created', type: 'Career Cluster', name: result.name,
        id: result.id, at: new Date().toLocaleTimeString('en-IN'),
      }, ...h].slice(0, 10));
      load();
    } catch (e) {
      setFormError(e?.message || 'Failed to create cluster');
    } finally { setCreating(false); }
  };

  if (loading && !data) return <div style={{ padding: 32, color: C.muted }}>Loading clusters...</div>;

  return (
    <>
    <AdminNav title="Career Clusters" subtitle="Cluster overview" />
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Career Clusters</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {data?.total} clusters · {data?.clusters?.reduce((s, cl) => s + cl.active_career_count, 0)} active careers
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowCreate(true)} style={{
            background: C.teal, color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>+ New Cluster</button>
          <button onClick={() => navigate('/admin/bulk-upload')} style={{
            background: C.navy, color: '#fff', border: 'none',
            borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 12,
          }}>+ Upload CSV</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
        {(data?.clusters || []).map(cluster => (
          <div key={cluster.id} style={{
            background: C.card, border: `0.5px solid ${C.border}`,
            borderRadius: 10, padding: '16px 18px',
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.navy, marginBottom: 4 }}>
              {cluster.name}
            </div>
            {cluster.description && (
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 10, lineHeight: 1.5 }}>
                {cluster.description}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <div>
                <span style={{ fontWeight: 500, color: C.teal }}>{cluster.active_career_count}</span>
                <span style={{ color: C.muted }}> active</span>
              </div>
              <div>
                <span style={{ fontWeight: 500, color: C.navy }}>{cluster.career_count}</span>
                <span style={{ color: C.muted }}> total careers</span>
              </div>
              <div>
                <span style={{ fontWeight: 500, color: C.navy }}>{cluster.keyskill_count}</span>
                <span style={{ color: C.muted }}> keyskills</span>
              </div>
            </div>
          </div>
        ))}
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
              {' '}{h.type}: <strong>{h.name}</strong> (ID: {h.id}) at {h.at}
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Create modal */}
    {showCreate && (
      <AdminModal title="Create Career Cluster" onClose={closeModal}>
        {createResult ? (
          <div style={{
            background: '#f0fdf4', border: '0.5px solid #bbf7d0',
            borderRadius: 8, padding: '16px',
          }}>
            <div style={{ color: C.green, fontWeight: 500, marginBottom: 8 }}>✓ Cluster created successfully</div>
            <div style={{ fontSize: 12, color: '#166534' }}>ID: {createResult.id}</div>
            <div style={{ fontSize: 12, color: '#166534' }}>Name: {createResult.name}</div>
            {createResult.description && (
              <div style={{ fontSize: 12, color: '#166534' }}>Description: {createResult.description}</div>
            )}
            <button onClick={() => { setCreateResult(null); setForm({ name: '', description: '' }); }}
              style={{
                marginTop: 12, background: C.teal, color: '#fff', border: 'none',
                borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 12,
              }}>
              Create another
            </button>
          </div>
        ) : (
          <>
            <FormField label="Cluster Name" required error={formError}>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Agriculture"
                style={fieldStyle} />
            </FormField>
            <FormField label="Description" hint="Optional — brief description of this cluster">
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="e.g. Careers in farming, horticulture and environmental science"
                style={{ ...fieldStyle, resize: 'vertical' }} />
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
                {creating ? 'Creating...' : 'Create Cluster'}
              </button>
            </div>
          </>
        )}
      </AdminModal>
    )}
    </>
  );
}
