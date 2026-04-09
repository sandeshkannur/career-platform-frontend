// src/pages/admin/AdminBulkUploadPage.jsx
import React, { useState } from 'react';
import AdminNav from '../../components/AdminNav';
import { apiPost } from '../../apiClient';

const C = {
  navy: '#0b1f3a', teal: '#0d9488', border: '#e2e8f0',
  muted: '#64748b', bg: '#f8fafc', card: '#fff',
  red: '#dc2626', green: '#16a34a', amber: '#d97706',
};

const UPLOAD_TYPES = [
  {
    id: 'careers',
    label: 'Careers',
    endpoint: '/v1/admin/bulk/careers',
    description: 'Create or update career records (title, cluster, tier, active status).',
    headers: ['career_code', 'title', 'cluster_id', 'career_tier', 'is_active'],
    example: 'CAR001,Software Engineer,1,1,true',
  },
  {
    id: 'career_content_en',
    label: 'Career Content (EN)',
    endpoint: '/v1/admin/bulk/career-content-en',
    description: 'English content for careers: salary, pathways, streams, automation risk.',
    headers: ['career_code', 'indian_job_title', 'recommended_stream', 'automation_risk', 'future_outlook', 'salary_entry_inr', 'salary_peak_inr', 'pathway_step1', 'pathway_step2', 'pathway_step3'],
    example: 'CAR001,Software Developer,Science,Low,High,400000,2000000,B.Tech CS,Work at startup,Senior Engineer',
  },
  {
    id: 'career_content_kn',
    label: 'Career Content (KN)',
    endpoint: '/v1/admin/bulk/career-content-kn',
    description: 'Kannada content for careers (same columns as EN).',
    headers: ['career_code', 'indian_job_title', 'recommended_stream', 'automation_risk', 'future_outlook', 'salary_entry_inr', 'salary_peak_inr', 'pathway_step1', 'pathway_step2', 'pathway_step3'],
    example: 'CAR001,ಸಾಫ್ಟ್‌ವೇರ್ ಡೆವಲಪರ್,...',
  },
  {
    id: 'clusters',
    label: 'Career Clusters',
    endpoint: '/v1/admin/bulk/clusters',
    description: 'Create or update career cluster records.',
    headers: ['id', 'name', 'description'],
    example: '1,Technology,Careers in software and IT',
  },
  {
    id: 'keyskills',
    label: 'Key Skills',
    endpoint: '/v1/admin/bulk/keyskills',
    description: 'Create or update key skill records linked to clusters.',
    headers: ['id', 'name', 'cluster_id', 'description'],
    example: '1,Logical Reasoning,1,Ability to solve structured problems',
  },
  {
    id: 'career_keyskill_weights',
    label: 'Career ↔ KeySkill Weights',
    endpoint: '/v1/admin/bulk/career-keyskill-weights',
    description: 'Set weight_percentage for each career–keyskill pair. Sum per career should be ~100.',
    headers: ['career_code', 'keyskill_id', 'weight_percentage'],
    example: 'CAR001,1,35',
  },
  {
    id: 'student_skills',
    label: 'Student Skills (seed)',
    endpoint: '/v1/admin/bulk/student-skills',
    description: 'Seed or override student skill scores (use carefully — overwrites existing).',
    headers: ['student_id', 'keyskill_id', 'score'],
    example: 'STU001,1,75',
  },
  {
    id: 'questions',
    label: 'Assessment Questions',
    endpoint: '/v1/admin/bulk/questions',
    description: 'Create or update assessment questions (chapters 1–5).',
    headers: ['id', 'chapter', 'question_text_en', 'question_text_kn', 'skill_id', 'reverse_scored'],
    example: '1,1,I enjoy solving puzzles,ನಾನು ಒಗಟುಗಳನ್ನು ಪರಿಹರಿಸಲು ಇಷ್ಟಪಡುತ್ತೇನೆ,1,false',
  },
  {
    id: 'interest_inventory',
    label: 'Interest Inventory (Ch.5)',
    endpoint: '/v1/admin/bulk/interest-inventory',
    description: 'Update Chapter 5 interest questions and their cluster mappings.',
    headers: ['id', 'question_text_en', 'question_text_kn', 'cluster_id'],
    example: '51,I like designing things,ನಾನು ವಿನ್ಯಾಸ ಮಾಡಲು ಇಷ್ಟಪಡುತ್ತೇನೆ,3',
  },
  {
    id: 'tier_reasons',
    label: 'Career Tier Reasons',
    endpoint: '/v1/admin/bulk/tier-reasons',
    description: 'Bulk-set tier_reason text for careers.',
    headers: ['career_code', 'tier_reason'],
    example: 'CAR001,High demand in Indian market; strong salary growth',
  },
  {
    id: 'deactivate_careers',
    label: 'Deactivate Careers',
    endpoint: '/v1/admin/bulk/deactivate-careers',
    description: 'Deactivate a list of careers by code. Sets is_active=false.',
    headers: ['career_code'],
    example: 'CAR042',
  },
];

export default function AdminBulkUploadPage() {
  const [step, setStep] = useState(1); // 1=select type, 2=choose file, 3=result
  const [selectedType, setSelectedType] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSelectType = (type) => {
    setSelectedType(type);
    setFile(null);
    setResult(null);
    setError(null);
    setStep(2);
  };

  const handleUpload = async () => {
    if (!file || !selectedType) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiPost(selectedType.endpoint, form);
      setResult(res);
      setStep(3);
    } catch (e) {
      setError(e?.message || 'Upload failed. Check the CSV format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setSelectedType(null);
    setFile(null);
    setResult(null);
    setError(null);
  };

  const inputStyle = {
    fontSize: 12, padding: '5px 8px',
    border: `0.5px solid ${C.border}`, borderRadius: 6, background: C.card,
  };

  const btnPrimary = {
    fontSize: 12, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
    background: C.teal, color: '#fff', border: 'none', fontFamily: 'inherit',
  };

  const btnSecondary = {
    fontSize: 12, padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
    background: C.bg, color: C.navy, border: `0.5px solid ${C.border}`, fontFamily: 'inherit',
  };

  return (
    <>
    <AdminNav title="Bulk Upload" subtitle="Upload CSV files to update master data" />
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        {['Select type', 'Choose file', 'Result'].map((label, i) => {
          const s = i + 1;
          const active = step === s;
          const done = step > s;
          return (
            <React.Fragment key={s}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                color: active ? C.teal : done ? C.green : C.muted,
                fontWeight: active ? 600 : 400, fontSize: 12,
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: 10,
                  background: active ? C.teal : done ? C.green : C.border,
                  color: active || done ? '#fff' : C.muted,
                }}>
                  {done ? '✓' : s}
                </div>
                {label}
              </div>
              {i < 2 && <div style={{ flex: 1, height: 1, background: C.border }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 1 — Select upload type */}
      {step === 1 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.navy, marginBottom: 14 }}>
            What would you like to upload?
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
            {UPLOAD_TYPES.map(type => (
              <div key={type.id}
                onClick={() => handleSelectType(type)}
                style={{
                  background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10,
                  padding: '14px 16px', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = C.teal}
                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: C.navy, marginBottom: 4 }}>{type.label}</div>
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{type.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2 — Choose file */}
      {step === 2 && selectedType && (
        <div>
          <button style={{ ...btnSecondary, marginBottom: 16 }} onClick={reset}>← Change type</button>

          <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.navy, marginBottom: 4 }}>{selectedType.label}</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{selectedType.description}</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.navy, marginBottom: 6 }}>Expected CSV columns:</div>
              <div style={{
                fontFamily: 'monospace', fontSize: 11, background: C.bg,
                padding: '8px 12px', borderRadius: 6, border: `0.5px solid ${C.border}`,
                color: C.teal, wordBreak: 'break-all',
              }}>
                {selectedType.headers.join(',')}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: C.navy, marginBottom: 6 }}>Example row:</div>
              <div style={{
                fontFamily: 'monospace', fontSize: 11, background: C.bg,
                padding: '8px 12px', borderRadius: 6, border: `0.5px solid ${C.border}`,
                color: C.muted, wordBreak: 'break-all',
              }}>
                {selectedType.example}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: C.navy, display: 'block', marginBottom: 8 }}>
                Choose CSV file:
              </label>
              <input
                type="file"
                accept=".csv,text/csv"
                style={{ fontSize: 12 }}
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <div style={{ fontSize: 11, color: C.green, marginTop: 6 }}>
                  Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {error && (
              <div style={{
                fontSize: 12, color: C.red, background: '#fef2f2',
                padding: '10px 14px', borderRadius: 6, marginBottom: 14,
                border: `0.5px solid #fecaca`,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                style={{ ...btnPrimary, opacity: (!file || uploading) ? 0.6 : 1 }}
                disabled={!file || uploading}
                onClick={handleUpload}
              >
                {uploading ? 'Uploading...' : 'Upload CSV'}
              </button>
              <button style={btnSecondary} onClick={reset} disabled={uploading}>Cancel</button>
            </div>
          </div>

          <div style={{ fontSize: 11, color: C.muted }}>
            Endpoint: <span style={{ fontFamily: 'monospace' }}>{selectedType.endpoint}</span>
          </div>
        </div>
      )}

      {/* STEP 3 — Result */}
      {step === 3 && (
        <div>
          <div style={{
            background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10,
            padding: '20px 24px', marginBottom: 16,
          }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.green, marginBottom: 12 }}>
              Upload complete — {selectedType?.label}
            </div>

            {result && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Rows processed', value: result.processed },
                  { label: 'Inserted', value: result.inserted },
                  { label: 'Updated', value: result.updated },
                  { label: 'Skipped / errors', value: result.errors?.length ?? result.skipped },
                ].filter(s => s.value !== undefined).map(stat => (
                  <div key={stat.label} style={{
                    background: C.bg, borderRadius: 8, padding: '10px 12px',
                    border: `0.5px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize: 20, fontWeight: 500, color: C.navy, fontFamily: 'monospace' }}>
                      {stat.value ?? '—'}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {result?.errors?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.red, marginBottom: 6 }}>
                  Row errors ({result.errors.length}):
                </div>
                <div style={{
                  fontFamily: 'monospace', fontSize: 11, background: '#fef2f2',
                  padding: '10px 12px', borderRadius: 6, maxHeight: 200, overflowY: 'auto',
                  border: `0.5px solid #fecaca`, color: C.red,
                }}>
                  {result.errors.map((e, i) => (
                    <div key={i}>Row {e.row}: {e.message || e}</div>
                  ))}
                </div>
              </div>
            )}

            {result?.message && (
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>{result.message}</div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnPrimary} onClick={reset}>Upload another file</button>
            </div>
          </div>
        </div>
      )}

      {/* Reference table */}
      <div style={{ marginTop: 32 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: C.navy, marginBottom: 10 }}>All upload types reference</div>
        <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `0.5px solid ${C.border}` }}>
                {['Type', 'Endpoint', 'Key columns'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.muted, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UPLOAD_TYPES.map(type => (
                <tr key={type.id} style={{ borderBottom: `0.5px solid ${C.border}` }}>
                  <td style={{ padding: '7px 12px', fontWeight: 500, color: C.navy }}>{type.label}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', color: C.teal }}>{type.endpoint}</td>
                  <td style={{ padding: '7px 12px', color: C.muted, fontFamily: 'monospace' }}>
                    {type.headers.slice(0, 4).join(', ')}{type.headers.length > 4 ? ` +${type.headers.length - 4} more` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </>
  );
}
