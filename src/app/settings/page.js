"use client";

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, saveSupabaseCredentials, getSupabaseCredentials } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import AuthGuard from '@/components/AuthGuard';
import {
  Settings,
  Store,
  QrCode,
  FileText,
  Phone,
  MapPin,
  Save,
  Database,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export default function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store Settings
  const [store, setStore] = useState({
    store_name: 'Nongkame888 - Women Fashion',
    address: '99/8 Fashion Avenue, Sukhumvit, Bangkok 10110',
    phone: '081-234-5678',
    promptpay_id: '0812345678',
    tax_id: '0105558123456',
    logo_url: '',
  });

  // Supabase Config
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const creds = getSupabaseCredentials();
        if (creds.url && !creds.url.includes('mock-url')) {
          setSupabaseUrl(creds.url);
          setSupabaseKey(creds.anonKey);
        }

        if (isSupabaseConfigured()) {
          const { data } = await supabase.from('store_settings').select('*').limit(1).single();
          if (data) {
            setStore(data);
          }
        } else {
          const local = localStorage.getItem('nongkame_store_settings');
          if (local) {
            setStore(JSON.parse(local));
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSaveStore = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('store_settings').upsert({
          ...store,
          id: store.id || undefined,
        });
        if (error) throw error;
      } else {
        localStorage.setItem('nongkame_store_settings', JSON.stringify(store));
      }
      toast.success('บันทึกการตั้งค่าร้านค้าเรียบร้อยแล้ว');
    } catch (err) {
      toast.error('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSupabaseConfig = (e) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      saveSupabaseCredentials(supabaseUrl.trim(), supabaseKey.trim());
      toast.success('บันทึกการตั้งค่า Supabase เรียบร้อย กำลังรีโหลด...');
    } else {
      saveSupabaseCredentials('', '');
      toast.info('ล้างการเชื่อมต่อ Supabase เรียบร้อย');
    }
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings color="var(--primary)" size={24} />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>ตั้งค่าระบบและร้านค้า (Store Settings)</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            กำหนดข้อมูลร้านค้า เบอร์โทรศัพท์ เลขประจำตัวผู้เสียภาษี และเบอร์ PromptPay สำหรับสร้าง QR Code ชำระเงิน
          </p>
        </div>

        {/* Form: Store Profile */}
        <div className="glass" style={{ padding: '1.75rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
            <Store size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>ข้อมูลร้านค้าและใบเสร็จ (Store Info & Receipts)</h2>
          </div>

          <form onSubmit={handleSaveStore}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">ชื่อร้านค้า (Store Name) *</label>
                <input
                  type="text"
                  className="form-input"
                  value={store.store_name}
                  onChange={(e) => setStore({ ...store, store_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">เบอร์โทรศัพท์ร้าน</label>
                <input
                  type="text"
                  className="form-input"
                  value={store.phone}
                  onChange={(e) => setStore({ ...store, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">เบอร์ PromptPay หรือ เลขบัตร ปชช. สำหรับสร้าง QR Code *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="0812345678"
                  value={store.promptpay_id}
                  onChange={(e) => setStore({ ...store, promptpay_id: e.target.value })}
                  required
                  style={{ fontWeight: 700 }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ระบบจะใช้หมายเลขนี้สร้าง QR Code รับเงินในหน้า POS อัตโนมัติ
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">เลขประจำตัวผู้เสียภาษี (Tax ID)</label>
                <input
                  type="text"
                  className="form-input"
                  value={store.tax_id}
                  onChange={(e) => setStore({ ...store, tax_id: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">ที่อยู่ร้าน (จะแสดงบนหัวใบเสร็จรับเงิน)</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={store.address}
                  onChange={(e) => setStore({ ...store, address: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ marginTop: '1.25rem', padding: '0.7rem 1.5rem' }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>บันทึกข้อมูลร้านค้า</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Form: Supabase Configuration */}
        <div className="glass" style={{ padding: '1.75rem', borderRadius: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.75rem' }}>
            <Database size={20} color="var(--primary)" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>การเชื่อมต่อฐานข้อมูล Supabase Database</h2>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            ระบบจะดึงค่าจากไฟล์ <code>.env.local</code> เป็นหลัก หรือคุณสามารถระบุข้อมูลการเชื่อมต่อที่นี่เพื่อเชื่อมต่อทันที
            สถานะปัจจุบัน: <strong>{isSupabaseConfigured() ? 'เชื่อมต่อออนไลน์แล้ว (Live)' : 'ยังไม่ได้เชื่อมต่อ (Local Fallback)'}</strong>
          </p>

          <form onSubmit={handleSaveSupabaseConfig}>
            <div className="form-group">
              <label className="form-label">Project URL (NEXT_PUBLIC_SUPABASE_URL)</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://xyz.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Anon / Public Key (NEXT_PUBLIC_SUPABASE_ANON_KEY)</label>
              <input
                type="text"
                className="form-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
                <Save size={16} />
                <span>บันทึกและเชื่อมต่อ Supabase</span>
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AuthGuard>
  );
}
