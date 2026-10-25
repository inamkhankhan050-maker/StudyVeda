export const slugify = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/&/g, ' and ').replace(/\+\+/g, 'pp').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
export const isSlug = (s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s || '');
export const normText = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
export const OPTIONS = ['A', 'B', 'C', 'D'];
export const optKey = (L) => 'option_' + L.toLowerCase();
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
