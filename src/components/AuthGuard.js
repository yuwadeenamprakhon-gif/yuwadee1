"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function AuthGuard({ children, allowedRoles = ['admin', 'employee', 'customer'] }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '1rem',
          color: 'var(--text-muted)',
        }}
      >
        <Loader2 className="animate-spin" size={36} color="var(--primary)" />
        <p style={{ fontSize: '0.9rem' }}>กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...</p>
        <style jsx>{`
          .animate-spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '2.5rem',
            borderRadius: '1.25rem',
            maxWidth: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={36} color="var(--danger)" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>สิทธิ์การเข้าถึงไม่เพียงพอ</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            หน้านี้สงวนไว้สำหรับผู้ใช้ระดับ <strong>{allowedRoles.join(' / ').toUpperCase()}</strong> เท่านั้น
            (สถานะของคุณปัจจุบัน: <strong>{role?.toUpperCase()}</strong>)
          </p>
          <button
            onClick={() => router.push(role === 'customer' ? '/orders' : '/pos')}
            className="btn-primary"
            style={{ marginTop: '0.5rem' }}
          >
            กลับสู่หน้าที่ได้รับอนุญาต
          </button>
        </div>
      </div>
    );
  }

  return children;
}
