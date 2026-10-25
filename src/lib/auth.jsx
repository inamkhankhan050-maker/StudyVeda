import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { backend } from './api.js';
import { IS_DEMO } from './config.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(IS_DEMO);
  const [adminChecked, setAdminChecked] = useState(IS_DEMO);

  const refreshAdmin = useCallback(async (u) => {
    if (IS_DEMO) return;
    setAdminChecked(false);
    try { setIsAdmin(u ? await backend.isAdmin() : false); } catch { setIsAdmin(false); }
    setAdminChecked(true);
  }, []);

  useEffect(() => {
    let alive = true;
    backend.getUser().then((u) => { if (!alive) return; setUser(u); setReady(true); refreshAdmin(u); })
      .catch(() => { if (alive) { setUser(null); setReady(true); setAdminChecked(true); } });
    const off = backend.onAuthChange((u) => { setUser(u); refreshAdmin(u); });
    return () => { alive = false; off(); };
  }, [refreshAdmin]);

  const value = {
    user, ready, isAdmin, adminChecked, demo: IS_DEMO,
    signIn: async (e, p) => { const u = await backend.signIn(e, p); setUser(u); await refreshAdmin(u); return u; },
    signUp: (e, p) => backend.signUp(e, p),
    signOut: async () => { await backend.signOut(); setUser(null); setIsAdmin(IS_DEMO); },
    resetPassword: (e) => backend.resetPassword?.(e),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
