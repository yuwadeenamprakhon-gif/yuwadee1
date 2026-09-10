"use client";

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  { id: 'dark', name: 'Dark Mode (Midnight)', color: '#0f172a', accent: '#ec4899' },
  { id: 'light', name: 'Light Mode (Clean)', color: '#ffffff', accent: '#ec4899' },
  { id: 'blue', name: 'Ocean Blue (Tech)', color: '#0b1329', accent: '#3b82f6' },
  { id: 'green', name: 'Emerald Green (Fresh)', color: '#062217', accent: '#10b981' },
  { id: 'purple', name: 'Neon Purple (Cyber)', color: '#190b2c', accent: '#a855f7' },
  { id: 'gradient', name: 'Sunset Gradient (Vibrant)', color: '#111827', accent: '#f43f5e' },
  { id: 'custom', name: 'Rose Gold (Luxury)', color: '#1a1016', accent: '#fb7185' },
];

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('nongkame_theme') || 'dark';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } catch (e) {
      console.warn('Failed to read theme from localStorage', e);
    }
    setMounted(true);
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('nongkame_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme, themes: THEMES, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
