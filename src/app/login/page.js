"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/Toast';
import { Store, Lock, Mail, User, ArrowRight, Loader2, Sparkles, KeyRound, X } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/pos';
  const { signIn, signUp, switchDemoRole } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState('employee');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Admin Password Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'signin') {
        const res = await signIn(email.trim(), password);
        if (res.error) {
          setErrorMsg(res.error.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
          toast.error(res.error.message || 'เข้าสู่ระบบไม่สำเร็จ');
        } else {
          toast.success('เข้าสู่ระบบสำเร็จ ยินดีต้อนรับ!');
          router.push(redirectUrl);
        }
      } else {
        if (!fullName.trim()) {
          setErrorMsg('กรุณากรอกชื่อ-นามสกุล');
          setLoading(false);
          return;
        }
        const res = await signUp(email.trim(), password, fullName.trim(), selectedRole);
        if (res.error) {
          setErrorMsg(res.error.message || 'สมัครสมาชิกไม่สำเร็จ');
          toast.error(res.error.message || 'สมัครสมาชิกไม่สำเร็จ');
        } else {
          toast.success('สมัครสมาชิกและเข้าสู่ระบบสำเร็จ!');
          router.push(redirectUrl);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    if (role === 'admin') {
      // Require password 1111 for Admin
      setAdminPinInput('');
      setAdminPinError('');
      setShowAdminModal(true);
      return;
    }

    await switchDemoRole(role);
    toast.success(`เข้าสู่ระบบด้วยสิทธิ์ ${role.toUpperCase()} สำเร็จ!`);
    router.push(role === 'customer' ? '/orders' : redirectUrl);
  };

  const handleAdminPinSubmit = async (e) => {
    e.preventDefault();
    if (adminPinInput === '1111') {
      setShowAdminModal(false);
      await switchDemoRole('admin');
      toast.success('เข้าสู่ระบบ Admin สำเร็จ ยินดีต้อนรับ!');
      router.push('/dashboard');
    } else {
      setAdminPinError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div
      className="glass-panel"
      style={{
        width: '100%',
        maxWidth: '460px',
        borderRadius: '1.5rem',
        padding: '2.25rem',
        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
      }}
    >
      {/* Brand Logo */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px var(--primary-glow)',
            marginBottom: '0.75rem',
          }}
        >
          <Store color="#ffffff" size={30} />
        </div>
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            background: 'linear-gradient(to right, var(--primary), var(--secondary))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          nongkame888
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
          ระบบบริหารจัดการร้านและจุดขายสินค้าแฟชั่น
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '0.75rem',
          padding: '0.25rem',
          marginBottom: '1.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setErrorMsg('');
          }}
          style={{
            padding: '0.6rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            background: mode === 'signin' ? 'var(--primary)' : 'transparent',
            color: mode === 'signin' ? '#ffffff' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
        >
          เข้าสู่ระบบ
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup');
            setErrorMsg('');
          }}
          style={{
            padding: '0.6rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '0.9rem',
            background: mode === 'signup' ? 'var(--primary)' : 'transparent',
            color: mode === 'signup' ? '#ffffff' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}
        >
          ลงทะเบียน
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <>
            <div className="form-group">
              <label className="form-label">ชื่อ-นามสกุล</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={18}
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น สมศรี แฟชั่นนิสต้า"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '2.5rem', width: '100%' }}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ตำแหน่ง / บทบาท (Role)</label>
              <select
                className="form-input"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: '100%', background: 'var(--input-bg)' }}
              >
                <option value="employee" style={{ background: '#1e293b' }}>พนักงานขาย (Employee / POS)</option>
                <option value="customer" style={{ background: '#1e293b' }}>ลูกค้าทั่วไป (Customer)</option>
                <option value="admin" style={{ background: '#1e293b' }}>ผู้จัดการร้าน (Admin)</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label className="form-label">อีเมล (Email) หรือชื่อผู้ใช้</label>
          <div style={{ position: 'relative' }}>
            <Mail
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="admin@nongkame888.com หรือ admin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">รหัสผ่าน (Password)</label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              required
            />
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '0.5rem',
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem' }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>กำลังประมวลผล...</span>
            </>
          ) : (
            <>
              <span>{mode === 'signin' ? 'เข้าสู่ระบบ' : 'สร้างบัญชีผู้ใช้'}</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Role Selector */}
      <div
        style={{
          marginTop: '1.75rem',
          paddingTop: '1.25rem',
          borderTop: '1px dashed var(--card-border)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-muted)',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          <Sparkles size={14} color="var(--primary)" />
          <span>เข้าสู่ระบบทดสอบแบบ 1-CLICK DEMO</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => handleQuickDemo('admin')}
            style={{
              padding: '0.5rem 0.25rem',
              borderRadius: '0.5rem',
              background: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span>ADMIN</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(ผู้ดูแลระบบ)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('employee')}
            style={{
              padding: '0.5rem 0.25rem',
              borderRadius: '0.5rem',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--warning)',
              color: 'var(--warning)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span>EMPLOYEE</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(พนักงานขาย)</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickDemo('customer')}
            style={{
              padding: '0.5rem 0.25rem',
              borderRadius: '0.5rem',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
            }}
          >
            <span>CUSTOMER</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>(ลูกค้าทั่วไป)</span>
          </button>
        </div>
      </div>

      {/* Admin Password Input Modal */}
      {showAdminModal && (
        <div className="modal-overlay" onClick={() => setShowAdminModal(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px', padding: '1.75rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--primary-glow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <KeyRound size={20} color="var(--primary)" />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>ใส่รหัสผ่าน Admin</h3>
              </div>
              <button onClick={() => setShowAdminModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              กรุณากรอกรหัสผ่านสำหรับเข้าใช้งานระบบในฐานะ Admin
            </p>

            <form onSubmit={handleAdminPinSubmit}>
              <div className="form-group">
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••"
                  value={adminPinInput}
                  onChange={(e) => {
                    setAdminPinInput(e.target.value);
                    setAdminPinError('');
                  }}
                  autoFocus
                  style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    letterSpacing: '0.3em',
                    fontWeight: 800,
                    padding: '0.75rem',
                  }}
                  maxLength={10}
                />
              </div>

              {adminPinError && (
                <div
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: 'var(--danger)',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    marginBottom: '1rem',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                >
                  {adminPinError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAdminModal(false)}
                  style={{ flex: 1 }}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                  ยืนยันเข้าสู่ระบบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <Suspense fallback={<div style={{ color: 'var(--text-muted)' }}>กำลังโหลด...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
