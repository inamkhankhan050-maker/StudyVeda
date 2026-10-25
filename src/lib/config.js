export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
export const BACKEND = SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR-PROJECT') ? 'supabase' : 'demo';
export const IS_DEMO = BACKEND === 'demo';
export const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, '');
export const BASE_PATH = import.meta.env.BASE_URL || '/';

// Safety net: a service_role / secret key must never be shipped to browsers.
export const KEY_IS_SECRET = (() => {
  if (SUPABASE_ANON_KEY.startsWith('sb_secret_')) return true;
  try { return JSON.parse(atob(SUPABASE_ANON_KEY.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'service_role'; } catch { return false; }
})();
