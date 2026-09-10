"use client";

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { Bell, CheckCheck, AlertTriangle, AlertOctagon, ShoppingBag, DollarSign, Info } from 'lucide-react';
import { formatDateTime } from '@/lib/formatters';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle size={16} color="var(--warning)" />;
      case 'out_of_stock':
        return <AlertOctagon size={16} color="var(--danger)" />;
      case 'new_order':
        return <ShoppingBag size={16} color="var(--primary)" />;
      case 'payment_success':
        return <DollarSign size={16} color="var(--success)" />;
      default:
        return <Info size={16} color="var(--secondary)" />;
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="Notifications"
        style={{
          position: 'relative',
          padding: '0.5rem',
          borderRadius: '0.5rem',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid var(--card-border)',
          color: 'var(--text-color)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: 'var(--danger)',
              color: '#fff',
              fontSize: '0.7rem',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '340px',
            maxHeight: '440px',
            borderRadius: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '0 15px 35px rgba(0,0,0,0.5)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--card-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>แจ้งเตือน</span>
              {unreadCount > 0 && (
                <span className="badge badge-primary">{unreadCount} ใหม่</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  cursor: 'pointer',
                }}
              >
                <CheckCheck size={14} /> อ่านทั้งหมด
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '2rem 1rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                ไม่มีการแจ้งเตือน
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  style={{
                    padding: '0.65rem 0.75rem',
                    borderRadius: '0.5rem',
                    marginBottom: '0.4rem',
                    background: n.is_read ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                    borderLeft: n.is_read ? '3px solid transparent' : '3px solid var(--primary)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    {getIcon(n.type)}
                    <span style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.85rem' }}>
                      {n.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '1.5rem' }}>
                    {n.message}
                  </div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      paddingLeft: '1.5rem',
                      marginTop: '0.25rem',
                      opacity: 0.7,
                    }}
                  >
                    {formatDateTime(n.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
