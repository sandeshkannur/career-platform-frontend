// src/pages/admin/AdminStudentSkillsPage.jsx
import React, { useState, useEffect } from 'react';
import AdminNav from '../../components/AdminNav';
import { getAdminStudentSkills, updateStudentSkillDisplayName } from '../../api/adminAnalytics';

export default function AdminStudentSkillsPage() {
  const C = {
    navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0',
    muted: '#64748b', bg: '#f8fafc', card: '#fff',
    red: '#dc2626', green: '#16a34a', amber: '#d97706',
  };
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  useEffect(() => {
    getAdminStudentSkills()
      .then(d => setSkills(d.skills || []))
      .finally(() => setLoading(false));
  }, []);

  const handleEdit = (skill) => {
    setEditing(skill.id);
    setEditValue(skill.student_skill_name || skill.engine_key);
    setSaveResult(null);
  };

  const handleSave = async (skillId) => {
    setSaving(true);
    try {
      await updateStudentSkillDisplayName(skillId, { student_skill_name: editValue });
      setSkills(s => s.map(sk =>
        sk.id === skillId ? { ...sk, student_skill_name: editValue } : sk
      ));
      setEditing(null);
      setSaveResult({ id: skillId, value: editValue });
    } catch (e) {
      alert('Failed to save: ' + (e?.message || 'Unknown error'));
    } finally { setSaving(false); }
  };

  const inputStyle = {
    fontSize: 12, padding: '5px 8px',
    border: `0.5px solid ${C.border}`, borderRadius: 6, width: '100%',
  };

  return (
    <div>
      <AdminNav title="Student Skills" subtitle="24 canonical engine skills" />
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: C.navy, margin: 0 }}>Student Skills</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            24 canonical engine skills — engine keys (name) are read-only.
            Only student_skill_name (display label) can be edited.
          </div>
        </div>

        {/* Warning banner */}
        <div style={{
          background: '#fefce8', border: '0.5px solid #fde68a',
          borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#854d0e',
        }}>
          ⚠ Engine keys (leftmost column) are the lookup keys used in scoring.
          Never rename them — use the student_skill_name column for display labels only.
          Orphan skills (no AQ feeding them) are highlighted in red — they score 0 for all students.
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total skills', value: skills.length, color: C.navy },
            { label: 'Orphan skills (no AQ)', value: skills.filter(s => s.is_orphan).length, color: C.red },
            { label: 'Active in scoring', value: skills.filter(s => !s.is_orphan).length, color: C.green },
            {
              label: 'Avg career weight',
              value: skills.length > 0
                ? (skills.reduce((s, k) => s + k.avg_career_weight, 0) / skills.length).toFixed(1) + '%'
                : '—',
              color: C.teal,
            },
          ].map(s => (
            <div key={s.label} style={{
              background: C.card, border: `0.5px solid ${C.border}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <div style={{ fontSize: 20, fontWeight: 500, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Skills table */}
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `0.5px solid ${C.border}` }}>
                {['ID', 'Engine Key (read-only)', 'Student Label', 'Careers Using', 'Avg Weight', 'AQs Feeding', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.muted, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: C.muted }}>Loading...</td></tr>
              ) : skills.map(skill => (
                <tr key={skill.id} style={{
                  borderBottom: `0.5px solid ${C.border}`,
                  background: skill.is_orphan ? '#fff8f8' : 'transparent',
                }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: C.muted }}>{skill.id}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 11,
                      background: skill.is_orphan ? '#fee2e2' : '#f1f5f9',
                      padding: '2px 6px', borderRadius: 4,
                      color: skill.is_orphan ? C.red : C.navy,
                    }}>
                      {skill.engine_key}
                    </span>
                    {skill.is_orphan && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: C.red }}>orphan</span>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {editing === skill.id ? (
                      <input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        style={{ ...inputStyle, width: 220 }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ color: skill.student_skill_name ? C.navy : C.muted }}>
                        {skill.student_skill_name || '— not set —'}
                      </span>
                    )}
                  </td>
                  <td style={{
                    padding: '8px 12px', fontFamily: 'monospace', textAlign: 'center',
                    color: skill.careers_using === 0 ? C.red : C.navy,
                  }}>
                    {skill.careers_using}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', textAlign: 'center', color: C.teal }}>
                    {skill.avg_career_weight > 0 ? skill.avg_career_weight.toFixed(1) + '%' : '—'}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: C.muted }}>
                    <span style={{ color: skill.aq_count === 0 ? C.red : C.teal }}>
                      {skill.aq_count > 0 ? skill.feeding_aqs : 'None — orphan'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {editing === skill.id ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleSave(skill.id)} disabled={saving}
                          style={{
                            fontSize: 11, padding: '3px 10px', background: C.teal, color: '#fff',
                            border: 'none', borderRadius: 4, cursor: 'pointer',
                          }}>
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setEditing(null)}
                          style={{
                            fontSize: 11, padding: '3px 10px', background: 'none',
                            border: `0.5px solid ${C.border}`, borderRadius: 4, cursor: 'pointer',
                          }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span onClick={() => handleEdit(skill)}
                        style={{ fontSize: 11, color: C.teal, cursor: 'pointer' }}>
                        Edit label
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {saveResult && (
          <div style={{
            marginTop: 12, background: '#f0fdf4', border: '0.5px solid #bbf7d0',
            borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534',
          }}>
            ✓ Skill ID {saveResult.id} label updated to: <strong>{saveResult.value}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
