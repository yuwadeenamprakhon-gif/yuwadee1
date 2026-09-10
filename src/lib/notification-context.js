"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    if (!isSupabaseConfigured()) {
      // Local notifications
      const local = localStorage.getItem('nongkame_notifications');
      if (local) {
        try {
          const list = JSON.parse(local);
          setNotifications(list);
          setUnreadCount(list.filter((n) => !n.is_read).length);
        } catch (e) {}
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel('public:notifications')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            setNotifications((prev) => [payload.new, ...prev]);
            setUnreadCount((count) => count + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      } catch (e) {}
    } else {
      const updated = notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      localStorage.setItem('nongkame_notifications', JSON.stringify(updated));
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
      } catch (e) {}
    } else {
      const updated = notifications.map((n) => ({ ...n, is_read: true }));
      localStorage.setItem('nongkame_notifications', JSON.stringify(updated));
    }
  };

  const addNotification = async ({ type, title, message }) => {
    const newNotif = {
      id: 'notif-' + Date.now(),
      type: type || 'system',
      title,
      message,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setUnreadCount((c) => c + 1);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').insert([newNotif]);
      } catch (e) {}
    } else {
      const updated = [newNotif, ...notifications];
      localStorage.setItem('nongkame_notifications', JSON.stringify(updated));
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
