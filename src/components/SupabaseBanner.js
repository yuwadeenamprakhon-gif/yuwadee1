"use client";

import { useState } from 'react';
import { isSupabaseConfigured, saveSupabaseCredentials, testSupabaseConnection } from '@/lib/supabase';
import { Database, CheckCircle2, AlertCircle, Settings2, X } from 'lucide-react';

export default function SupabaseBanner() {
  const configured = isSupabaseConfigured();
  const [showModal, setShowModal] = useState(false);
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    if (!url || !anonKey) {
      setStatus({ type: 'error', message: 'กรุณากรอก Supabase URL และ Anon Key' });
      return;
    }
    setLoading(true);
    setStatus(null);

    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setLoading(false);
    if (res.success) {
      setStatus({ type: 'success', message: 'เชื่อมต่อ Supabase สำเร็จ! กำลังโหลดหน้าใหม่...' });
      setTimeout(() => {
        saveSupabaseCredentials(url.trim(), anonKey.trim());
      }, 1000);
    } else {
      setStatus({
        type: 'error',
        message: 'เชื่อมต่อล้มเหลว: ' + res.error + ' (กรุณาตรวจสอบว่าได้รัน database.sql ใน Supabase หรือยัง)',
      });
    }
  };

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '0.5rem',
          background: configured ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.15)',
          border: `1px solid ${configured ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: configured ? 'var(--success)' : 'var(--warning)',
          cursor: 'pointer',
        }}
        onClick={() => setShowModal(true)}
        title={configured ? 'Supabase Connected' : 'Click to Configure Supabase'}
      >
        <Database size={13} />
        <span>{configured ? 'Supabase Live' : 'Connect Supabase'}</span>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database color="var(--primary)" size={22} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>ตั้งค่าการเชื่อมต่อ Supabase Database</h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              เชื่อมต่อกับฐานข้อมูล Supabase เพื่อใช้งานระบบแบบ Real-time จริง (ดึงสินค้า, ตัดสต็อก, สร้างออเดอร์, จัดการผู้ใช้)
              คุณสามารถคัดลอกคำสั่งจากไฟล์ <code>database.sql</code> ไปรันใน Supabase SQL Editor ได้ทันที
            </p>

            <form onSubmit={handleTestAndSave}>
              <div className="form-group">
                <label className="form-label">Project URL (NEXT_PUBLIC_SUPABASE_URL)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Anon / Public API Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  required
                />
              </div>

              {status && (
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: status.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${status.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}
                >
                  {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <span>{status.message}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={loading}>
                  {loading ? 'กำลังทดสอบการเชื่อมต่อ...' : 'ทดสอบและบันทึกการเชื่อมต่อ'}
                </button>
                {configured && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => saveSupabaseCredentials('', '')}
                  >
                    ตัดการเชื่อมต่อ
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
