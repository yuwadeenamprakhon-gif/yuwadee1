"use client";

import { useState, useRef, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';
import { Palette, Check } from 'lucide-react';

export default function ThemeSelector() {
  const { theme, setTheme, themes } = useTheme();
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

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="Change Theme (7 themes available)"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.45rem 0.75rem',
          borderRadius: '0.5rem',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid var(--card-border)',
          color: 'var(--text-color)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <Palette size={16} color="var(--primary)" />
        <span style={{ textTransform: 'capitalize' }}>{theme}</span>
      </button>

      {open && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '240px',
            borderRadius: '0.75rem',
            padding: '0.5rem',
            zIndex: 1000,
            boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.4rem 0.5rem' }}>
            SELECT THEME
          </div>
          {themes.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem',
                  borderRadius: '0.4rem',
                  background: isActive ? 'var(--primary-glow)' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-color)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  border: 'none',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: t.accent,
                      border: `2px solid ${t.color}`,
                    }}
                  />
                  <span>{t.name}</span>
                </div>
                {isActive && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
