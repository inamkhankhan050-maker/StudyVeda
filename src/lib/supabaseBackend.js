// Supabase backend. Uses ONLY the public anon key; every permission is enforced by
// Row Level Security in supabase/migrations/001_schema.sql, not by this file.
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, KEY_IS_SECRET } from './config.js';

let client;
const sb = () => {
  if (KEY_IS_SECRET) throw new Error('Configuration error: VITE_SUPABASE_ANON_KEY contains a SECRET (service_role) key. Replace it with the public anon/publishable key and rotate the secret key in Supabase immediately.');
  return (client ||= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } }));
};

function friendly(error) {
  if (!error) return null;
  const m = error.message || String(error);
  const e = new Error(
    error.code === '23505' ? (m.includes('questions_unique_text') ? 'An identical question already exists in this subject.' : 'That slug or name is already in use. Choose another.')
    : error.code === '23503' ? 'This item is still linked to other content (topics, questions or sets). Move or remove that content first, or archive it instead.'
    : error.code === '23514' ? 'The data failed a validation rule (check required fields, options and the correct answer).'
    : error.code === '42501' || /row-level security/i.test(m) ? 'You are not authorised to make this change. Sign in with an administrator account.'
    : /Failed to fetch|NetworkError/i.test(m) ? 'Could not reach the database. Check your connection and try again.'
    : m);
  e.code = error.code;
  return e;
}
const unwrap = ({ data, error, count }) => { if (error) throw friendly(error); return count !== undefined && count !== null ? { data, count } : data; };

async function fetchAll(build) {
  const out = []; const size = 1000;
  for (let from = 0; ; from += size) {
    const data = unwrap(await build().range(from, from + size - 1));
    out.push(...data);
    if (data.length < size) return out;
  }
}

const QCOLS = 'id,subject_id,topic_id,exam_id,question,option_a,option_b,option_c,option_d,correct_option,explanation,image_url,tags,source,difficulty,status,created_at,updated_at';

export const supa = {
  name: 'supabase',

  async loadCatalog() {
    const c = sb();
    const [categories, subjects, subject_categories, topics, exams, sets, set_questions, subject_stats, topic_stats, exam_stats] = await Promise.all([
      c.from('categories').select('*').order('sort_order'),
      c.from('subjects').select('*').eq('status', 'published').order('sort_order'),
      c.from('subject_categories').select('*'),
      c.from('topics').select('*').eq('status', 'published').order('sort_order'),
      c.from('exams').select('*').eq('status', 'published').order('sort_order'),
      c.from('practice_sets').select('*').eq('status', 'published').order('created_at'),
      c.from('practice_set_questions').select('set_id,question_id,position, questions!inner(status)').eq('questions.status', 'published'),
      c.from('subject_stats').select('*'),
      c.from('topic_stats').select('*'),
      c.from('exam_stats').select('*'),
    ]).then((rs) => rs.map(unwrap));
    const pubSubj = new Set(subjects.map((s) => s.id));
    const setIds = new Set(sets.map((s) => s.id));
    return {
      categories, subjects, exams, sets, subject_stats, topic_stats, exam_stats,
      subject_categories: subject_categories.filter((x) => pubSubj.has(x.subject_id)),
      topics: topics.filter((t) => pubSubj.has(t.subject_id)),
      set_questions: set_questions.filter((x) => setIds.has(x.set_id)).map(({ set_id, question_id, position }) => ({ set_id, question_id, position })),
    };
  },

  // Published questions only. Questions whose topic or subject is unpublished are removed.
  async fetchQuestions({ subject_id, topic_id, exam_id, ids, limit } = {}) {
    const build = () => {
      let q = sb().from('questions').select(`${QCOLS}, subjects!inner(status), topics(status)`).eq('status', 'published').eq('subjects.status', 'published');
      if (subject_id) q = q.eq('subject_id', subject_id);
      if (topic_id) q = q.eq('topic_id', topic_id);
      if (exam_id) q = q.eq('exam_id', exam_id);
      if (ids) q = q.in('id', ids);
      return q.order('created_at');
    };
    let rows = limit ? unwrap(await build().limit(limit)) : await fetchAll(build);
    rows = rows.filter((r) => !r.topic_id || r.topics?.status === 'published').map(({ subjects, topics, ...q }) => q);
    if (ids) rows = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
    return rows;
  },

  async searchQuestions(text, limit = 20) {
    const pattern = '%' + text.replace(/[%_\\]/g, (m) => '\\' + m) + '%';
    const rows = unwrap(await sb().from('questions').select(`${QCOLS}, subjects!inner(status), topics(status)`)
      .eq('status', 'published').eq('subjects.status', 'published').ilike('question', pattern).limit(limit));
    return rows.filter((r) => !r.topic_id || r.topics?.status === 'published').map(({ subjects, topics, ...q }) => q);
  },

  async recentQuestions(limit = 5) {
    const rows = unwrap(await sb().from('questions').select(`${QCOLS}, subjects!inner(status), topics(status)`)
      .eq('status', 'published').eq('subjects.status', 'published').order('created_at', { ascending: false }).limit(limit * 2));
    return rows.filter((r) => !r.topic_id || r.topics?.status === 'published').slice(0, limit).map(({ subjects, topics, ...q }) => q);
  },

  // ---------- auth ----------
  async getUser() { const { data } = await sb().auth.getSession(); return data.session?.user || null; },
  onAuthChange(cb) { const { data } = sb().auth.onAuthStateChange((_e, session) => cb(session?.user || null)); return () => data.subscription.unsubscribe(); },
  async signIn(email, password) { const r = await sb().auth.signInWithPassword({ email, password }); if (r.error) throw new Error(r.error.message); return r.data.user; },
  async signUp(email, password, name) {
    const r = await sb().auth.signUp({ email, password, options: { data: { full_name: (name || '').trim().slice(0, 40) }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL + 'login' } });
    if (r.error) throw new Error(r.error.message); return r.data;
  },
  async signOut() { await sb().auth.signOut(); },
  async resetPassword(email) {
    const r = await sb().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + import.meta.env.BASE_URL + 'login' });
    if (r.error) throw new Error(r.error.message);
  },
  // UI hint only. The real protection is RLS: a non-admin's writes are rejected by the database.
  async isAdmin() { const { data, error } = await sb().rpc('is_admin'); if (error) throw friendly(error); return data === true; },

  // ---------- student data (RLS: owner only) ----------
  async saveAttempt(a) { return unwrap(await sb().from('attempts').insert(a).select().single()); },
  async listAttempts() { return unwrap(await sb().from('attempts').select('*').order('created_at', { ascending: false }).limit(200)); },
  async deleteAttempt(id) { unwrap(await sb().from('attempts').delete().eq('id', id)); return true; },
  async listBookmarks() { return unwrap(await sb().from('bookmarks').select('question_id')).map((b) => b.question_id); },
  async toggleBookmark(question_id, on) {
    if (on) unwrap(await sb().from('bookmarks').upsert({ question_id }, { onConflict: 'user_id,question_id', ignoreDuplicates: true }));
    else unwrap(await sb().from('bookmarks').delete().eq('question_id', question_id));
    return on;
  },

  // ---------- discussion (RLS: signed-in users read/post; own or admin delete) ----------
  async listComments(question_id) {
    return unwrap(await sb().from('question_comments').select('id,question_id,user_id,author_name,body,created_at').eq('question_id', question_id).order('created_at', { ascending: false }).limit(200));
  },
  async addComment(question_id, body, author_name) {
    return unwrap(await sb().from('question_comments').insert({ question_id, body: (body || '').trim(), author_name: (author_name || '').trim().slice(0, 40) || 'Student' }).select().single());
  },
  async deleteComment(id) {
    const data = unwrap(await sb().from('question_comments').delete().eq('id', id).select('id'));
    if (!data.length) throw new Error('You can delete only your own comments.');
    return true;
  },

  // ---------- admin (RLS: admins only) ----------
  async adminSelect(table) {
    const order = { questions: 'updated_at', categories: 'sort_order', subjects: 'sort_order', topics: 'sort_order', exams: 'sort_order', practice_sets: 'updated_at' }[table];
    return fetchAll(() => { const q = sb().from(table).select(table === 'questions' ? QCOLS : '*'); return order ? q.order(order) : q; });
  },
  async adminInsert(table, row) { return unwrap(await sb().from(table).insert(row).select().single()); },
  async adminInsertMany(table, rows) { return unwrap(await sb().from(table).insert(rows).select('id')); },
  async adminUpdate(table, id, patch) {
    const data = unwrap(await sb().from(table).update(patch).eq('id', id).select());
    if (!data.length) throw new Error('Nothing was updated. The record may have been removed, or you are not an administrator.');
    return data[0];
  },
  async adminDelete(table, id) {
    const data = unwrap(await sb().from(table).delete().eq('id', id).select('id'));
    if (!data.length) throw new Error('Nothing was deleted. The record may already be gone, or you are not an administrator.');
    return true;
  },
  async replaceLinks(table, key, value, rows) {
    unwrap(await sb().from(table).delete().eq(key, value));
    if (rows.length) unwrap(await sb().from(table).insert(rows));
    return true;
  },
  async adminQueryQuestions({ search, subject_id, topic_id, exam_id, difficulty, status, page = 1, pageSize = 20 }) {
    let q = sb().from('questions').select(QCOLS, { count: 'exact' });
    if (search) q = q.ilike('question', '%' + search.replace(/[%_\\]/g, (m) => '\\' + m) + '%');
    if (subject_id) q = q.eq('subject_id', subject_id);
    if (topic_id) q = q.eq('topic_id', topic_id);
    if (exam_id) q = q.eq('exam_id', exam_id);
    if (difficulty) q = q.eq('difficulty', difficulty);
    if (status) q = q.eq('status', status);
    const { data, count } = unwrap(await q.order('updated_at', { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1));
    return { rows: data, count: count ?? data.length };
  },
  async adminGet(table, id) { return unwrap(await sb().from(table).select('*').eq('id', id).maybeSingle()); },
};
