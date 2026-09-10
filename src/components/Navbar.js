"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ThemeSelector from './ThemeSelector';
import NotificationCenter from './NotificationCenter';
import SupabaseBanner from './SupabaseBanner';
import {
  Store,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Boxes,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, role, isAdmin, isEmployee, isCustomer, signOut, switchDemoRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // If on login page, don't show full navbar
  if (pathname === '/login') {
    return (
      <header
        className="glass"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1.5rem',
          borderBottom: '1px solid var(--card-border)',
        }}
      >
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store color="var(--primary)" size={24} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, background: 'linear-gradient(to right, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            nongkame888
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <SupabaseBanner />
          <ThemeSelector />
        </div>
      </header>
    );
  }

  // Define navigation items based on role
  const navLinks = [
    { href: '/pos', label: 'POS ขายหน้าร้าน', icon: ShoppingBag, show: isAdmin || isEmployee || !user },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: isAdmin },
    { href: '/products', label: 'สินค้า', icon: Package, show: isAdmin || isEmployee },
    { href: '/inventory', label: 'สต็อกสินค้า', icon: Boxes, show: isAdmin || isEmployee },
    { href: '/orders', label: 'ออเดอร์', icon: ClipboardList, show: Boolean(user) },
    { href: '/reports', label: 'รายงาน', icon: BarChart3, show: isAdmin },
    { href: '/users', label: 'ผู้ใช้งาน', icon: Users, show: isAdmin },
    { href: '/settings', label: 'ตั้งค่าร้าน', icon: Settings, show: isAdmin },
  ];

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'admin':
        return <span className="badge badge-primary">ADMIN</span>;
      case 'employee':
        return <span className="badge badge-warning">EMPLOYEE</span>;
      default:
        return <span className="badge badge-success">CUSTOMER</span>;
    }
  };

  return (
    <header
      className="glass"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        borderBottom: '1px solid var(--card-border)',
      }}
    >
      {/* Left: Brand & Main Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <Link href="/pos" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Store color="var(--primary)" size={24} />
          <span
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              background: 'linear-gradient(to right, var(--primary), var(--secondary))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            nongkame888
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav style={{ display: 'none', gap: '0.35rem' }} className="desktop-nav">
          {navLinks
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/pos' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? 'var(--primary-glow)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-color)',
                    border: isActive ? '1px solid var(--primary)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>
      </div>

      {/* Right: Tools, Theme, Notifications & User profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <SupabaseBanner />
        <ThemeSelector />
        {user && <NotificationCenter />}

        {user ? (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '0.5rem',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--card-border)',
                cursor: 'pointer',
                color: 'var(--text-color)',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {(profile?.full_name || user.email || 'U')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile?.full_name || user.email?.split('@')[0]}
              </span>
              {getRoleBadge(role)}
              <ChevronDown size={14} />
            </button>

            {roleMenuOpen && (
              <div
                className="glass-panel"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '230px',
                  borderRadius: '0.75rem',
                  padding: '0.5rem',
                  zIndex: 1000,
                  boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
                }}
              >
                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--card-border)', marginBottom: '0.35rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{profile?.full_name || 'User'}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </div>
                </div>

                {/* Quick Role Switcher (for quick evaluation) */}
                <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  QUICK ROLE SWITCH (TESTING)
                </div>
                {['admin', 'employee', 'customer'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      if (r === 'admin') {
                        const pin = window.prompt('กรุณากรอกรหัสผ่าน Admin (รหัสผ่านคือ 1111):');
                        if (pin !== '1111') {
                          if (pin !== null) alert('รหัสผ่าน Admin ไม่ถูกต้อง! (รหัสคือ 1111)');
                          return;
                        }
                      }
                      switchDemoRole(r);
                      setRoleMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.4rem 0.5rem',
                      fontSize: '0.8rem',
                      borderRadius: '0.35rem',
                      background: role === r ? 'var(--primary-glow)' : 'transparent',
                      color: role === r ? 'var(--primary)' : 'var(--text-color)',
                      fontWeight: role === r ? 600 : 400,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ textTransform: 'capitalize' }}>Switch to {r}</span>
                    {getRoleBadge(r)}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid var(--card-border)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.5rem',
                      borderRadius: '0.35rem',
                      color: 'var(--danger)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    <LogOut size={15} />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <LogIn size={15} />
            <span>เข้าสู่ระบบ</span>
          </Link>
        )}

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-btn"
          style={{
            display: 'flex',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            background: 'rgba(255, 255, 255, 0.08)',
            color: 'var(--text-color)',
          }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            padding: '1rem',
            borderBottom: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            zIndex: 999,
          }}
        >
          {navLinks
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 600 : 500,
                    background: isActive ? 'var(--primary-glow)' : 'transparent',
                    color: isActive ? 'var(--primary)' : 'var(--text-color)',
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </div>
      )}

      <style jsx>{`
        @media (min-width: 900px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
