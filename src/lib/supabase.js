import { createClient } from '@supabase/supabase-js';

// Default environment variables
const ENV_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ENV_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Function to retrieve effective credentials (env vars take precedence, then localStorage)
export const getSupabaseCredentials = () => {
  if (typeof window !== 'undefined') {
    const localUrl = localStorage.getItem('nongkame_supabase_url');
    const localKey = localStorage.getItem('nongkame_supabase_key');
    if (ENV_URL && !ENV_URL.includes('mock-url') && !ENV_URL.includes('your-project-id')) {
      return { url: ENV_URL, anonKey: ENV_ANON_KEY, source: 'env' };
    }
    if (localUrl && localKey) {
      return { url: localUrl, anonKey: localKey, source: 'localStorage' };
    }
  }
  return {
    url: ENV_URL || 'https://mock-url.supabase.co',
    anonKey: ENV_ANON_KEY || 'mock-key',
    source: 'default',
  };
};

export const isSupabaseConfigured = () => {
  const { url, anonKey } = getSupabaseCredentials();
  return (
    Boolean(url) &&
    Boolean(anonKey) &&
    !url.includes('mock-url') &&
    !url.includes('your-project-id') &&
    anonKey !== 'mock-key'
  );
};

// Create client helper
export const initSupabaseClient = (customUrl, customKey) => {
  const creds = customUrl && customKey ? { url: customUrl, anonKey: customKey } : getSupabaseCredentials();
  return createClient(creds.url, creds.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
};

export const supabase = initSupabaseClient();

// Save Supabase credentials to localStorage (for web UI dynamic setup)
export const saveSupabaseCredentials = (url, anonKey) => {
  if (typeof window !== 'undefined') {
    if (url && anonKey) {
      localStorage.setItem('nongkame_supabase_url', url.trim());
      localStorage.setItem('nongkame_supabase_key', anonKey.trim());
      // Reload page to reinitialize all states with new client
      window.location.reload();
    } else {
      localStorage.removeItem('nongkame_supabase_url');
      localStorage.removeItem('nongkame_supabase_key');
      window.location.reload();
    }
  }
};

// Test connection to Supabase
export const testSupabaseConnection = async (testUrl, testKey) => {
  try {
    const client = testUrl && testKey ? createClient(testUrl, testKey) : supabase;
    const { data, error } = await client.from('products').select('id').limit(1);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Connection failed' };
  }
};
