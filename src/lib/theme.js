import { useEffect, useState } from 'react';

// One shared light/dark setting, saved in localStorage (index.html applies it before first paint).
const KEY = 'sv-theme';
const listeners = new Set();
let current = (() => { try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } })();

function apply(t) {
  current = t;
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0b1020' : '#1e1b5e');
  try { localStorage.setItem(KEY, t); } catch { /* private mode */ }
  listeners.forEach((fn) => fn(t));
}

export function useTheme() {
  const [theme, setTheme] = useState(current);
  useEffect(() => { listeners.add(setTheme); return () => listeners.delete(setTheme); }, []);
  return [theme, () => apply(current === 'dark' ? 'light' : 'dark')];
}
