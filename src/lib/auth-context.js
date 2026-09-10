"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile row from public.profiles table
  const fetchProfile = async (userId, userEmail) => {
    try {
      if (!isSupabaseConfigured()) {
        // Fallback demo admin if not connected
        const storedDemo = localStorage.getItem('nongkame_demo_user');
        if (storedDemo) {
          const parsed = JSON.parse(storedDemo);
          setProfile(parsed);
          setUser({ id: parsed.id, email: parsed.email });
          return;
        }
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Could not fetch profile from DB:', error.message);
        // If profile doesn't exist yet, construct temporary profile
        const fallbackProfile = {
          id: userId,
          email: userEmail,
          full_name: userEmail?.split('@')[0] || 'User',
          role: 'customer',
          is_active: true,
        };
        setProfile(fallbackProfile);
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (!isSupabaseConfigured()) {
          // Check for saved demo session
          const storedDemo = localStorage.getItem('nongkame_demo_user');
          if (storedDemo) {
            const parsed = JSON.parse(storedDemo);
            if (mounted) {
              setUser({ id: parsed.id, email: parsed.email });
              setProfile(parsed);
            }
          }
          if (mounted) setLoading(false);
          return;
        }

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth state changes
    let authListener = null;
    if (isSupabaseConfigured()) {
      const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });
      authListener = listener;
    }

    return () => {
      mounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      // Local demo sign in
      let role = 'customer';
      if (email.toLowerCase().includes('admin')) {
        role = 'admin';
        if (password !== '1111') {
          return { error: { message: 'รหัสผ่าน Admin ไม่ถูกต้อง (รหัสผ่านคือ 1111)' } };
        }
      } else if (email.toLowerCase().includes('employee') || email.toLowerCase().includes('staff')) {
        role = 'employee';
      }

      const demoUser = {
        id: 'demo-' + role + '-id',
        email: email.includes('@') ? email : `${email}@nongkame888.com`,
        full_name: email.split('@')[0],
        role,
        is_active: true,
      };
      localStorage.setItem('nongkame_demo_user', JSON.stringify(demoUser));
      setUser({ id: demoUser.id, email: demoUser.email });
      setProfile(demoUser);
      return { data: { user: demoUser }, error: null };
    }

    const res = await supabase.auth.signInWithPassword({ email, password });
    if (!res.error && res.data?.user) {
      await fetchProfile(res.data.user.id, res.data.user.email);
    }
    return res;
  };

  const signUp = async (email, password, fullName, role = 'customer') => {
    if (!isSupabaseConfigured()) {
      const demoUser = {
        id: 'demo-' + Date.now(),
        email,
        full_name: fullName || email.split('@')[0],
        role,
        is_active: true,
      };
      localStorage.setItem('nongkame_demo_user', JSON.stringify(demoUser));
      setUser({ id: demoUser.id, email: demoUser.email });
      setProfile(demoUser);
      return { data: { user: demoUser }, error: null };
    }

    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (!res.error && res.data?.user) {
      // Also ensure profile row exists
      try {
        await supabase.from('profiles').upsert({
          id: res.data.user.id,
          email,
          full_name: fullName,
          role,
          is_active: true,
        });
        await fetchProfile(res.data.user.id, email);
      } catch (err) {
        console.warn('Profile upsert notice:', err);
      }
    }
    return res;
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('nongkame_demo_user');
    setUser(null);
    setProfile(null);
  };

  // Demo role switcher for testing & verification
  const switchDemoRole = async (targetRole) => {
    const updated = {
      ...(profile || {}),
      id: user?.id || 'demo-' + targetRole + '-id',
      email: `${targetRole}@nongkame888.com`,
      full_name: `${targetRole.toUpperCase()} User`,
      role: targetRole,
      is_active: true,
    };
    localStorage.setItem('nongkame_demo_user', JSON.stringify(updated));
    setUser({ id: updated.id, email: updated.email });
    setProfile(updated);

    if (isSupabaseConfigured() && user?.id) {
      try {
        await supabase.from('profiles').update({ role: targetRole }).eq('id', user.id);
      } catch (err) {
        console.warn('Update remote profile failed:', err);
      }
    }
  };

  const role = profile?.role || (user ? 'customer' : null);
  const isAdmin = role === 'admin';
  const isEmployee = role === 'employee';
  const isCustomer = role === 'customer';
  const canAccessPOS = isAdmin || isEmployee;
  const canAccessAdmin = isAdmin;
  const canAccessInventory = isAdmin || isEmployee;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        isAdmin,
        isEmployee,
        isCustomer,
        canAccessPOS,
        canAccessAdmin,
        canAccessInventory,
        signIn,
        signUp,
        signOut,
        switchDemoRole,
        refreshProfile: () => user && fetchProfile(user.id, user.email),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
