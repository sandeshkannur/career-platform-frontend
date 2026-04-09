// src/pages/admin/AdminCareerClustersPage.jsx
import React, { useState, useEffect } from 'react';
import { getAdminClusters } from '../../api/adminAnalytics';

const C = {
  navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0',
  muted: '#64748b', bg: '#f8fafc', card: '#ffffff', red: '#dc2626',
};

export default function AdminCareerClustersPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminClusters().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 32, color: C.muted }}>Loading clusters...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Career Clusters</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {data?.total} clusters · {data?.clusters?.reduce((s, c) => s + c.active_career_count, 0)} active careers
          </div>
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
    </div>
  );
}
