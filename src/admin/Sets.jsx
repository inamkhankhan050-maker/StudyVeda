import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, Archive, ArrowUp, ArrowDown, X, Eye } from 'lucide-react';
import { admin } from '../lib/api.js';
import { useAsync, useToast } from '../lib/hooks.js';
import { slugify, normText, isSlug, cap } from '../lib/text.js';
import { AdminHead, Field, StatusBadge } from './common.jsx';
import { Modal, Confirm } from '../components/Modal.jsx';
import { Loading, ErrorState, Empty } from '../components/States.jsx';
import { QuestionStudy } from '../components/QuestionView.jsx';

export function SetsAdmin() {
  const toast = useToast();
  const nav = useNavigate();
  const { data, loading, error, reload } = useAsync(async () => {
    const [sets, links, l] = await Promise.all([admin.select('practice_sets'), admin.select('practice_set_questions'), admin.lookups()]);
    return { sets, links, ...l };
  }, []);
  const [del, setDel] = useState(null); const [busy, setBusy] = useState(false);
  const nm = (list, id) => data?.[list].find((x) => x.id === id)?.name;
  const archive = async (p) => { try { await admin.update('practice_sets', p.id, { status: 'archived' }); toast('Set archived.'); reload(); } catch (e) { toast(e.message, 'error'); } };

  return (
    <>
      <AdminHead title="Practice sets" sub="Sets reference questions from the bank; a question can be in many sets without being copied.">
        <Link className="btn btn-primary" to="/admin/sets/new"><Plus size={17} /> New set</Link>
      </AdminHead>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : data.sets.length === 0 ? (
        <Empty title="No practice sets yet" action={<Link className="btn btn-primary" to="/admin/sets/new">Create a set</Link>}>Group questions into a set with an optional time limit.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Set</th><th>Subject / exam</th><th>Questions</th><th>Time</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.sets.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong><div className="muted small mono">/practice/{p.slug}</div></td>
                  <td className="small">{nm('subjects', p.subject_id) || '—'}{p.exam_id && <div className="muted">{nm('exams', p.exam_id)}</div>}</td>
                  <td>{data.links.filter((x) => x.set_id === p.id).length}</td>
                  <td>{p.time_limit_minutes ? `${p.time_limit_minutes} min` : '—'}</td>
                  <td><StatusBadge s={p.status} /></td>
                  <td className="row-actions">
                    <button className="icon-btn" aria-label={`Edit ${p.title}`} title="Edit" onClick={() => nav(`/admin/sets/${p.id}`)}><Pencil size={16} /></button>
                    {p.status !== 'archived' && <button className="icon-btn" aria-label={`Archive ${p.title}`} title="Archive" onClick={() => archive(p)}><Archive size={16} /></button>}
                    <button className="icon-btn danger" aria-label={`Delete ${p.title}`} title="Delete" onClick={() => setDel(p)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {del && (
        <Confirm title={`Delete “${del.title}”?`} busy={busy} onClose={() => setDel(null)} onConfirm={async () => {
          setBusy(true); try { await admin.remove('practice_sets', del.id); toast('Set deleted. Its questions are untouched.'); setDel(null); reload(); } catch (e) { toast(e.message, 'error'); } setBusy(false);
        }}><p>The set is removed; the questions in it stay in the question bank. Consider archiving instead to keep it for later.</p></Confirm>
      )}
    </>
  );
}

export function SetForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [sets, links, questions, l] = await Promise.all([admin.select('practice_sets'), admin.select('practice_set_questions'), admin.select('questions'), admin.lookups()]);
    return { sets, links, questions, ...l };
  }, [id]);
  const [form, setForm] = useState(null);
  const [picked, setPicked] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [slugTouched, setSlugTouched] = useState(!!id);
  const [pf, setPf] = useState({ subject: '', topic: '', q: '', status: '' });
  const [preview, setPreview] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    const s = id && data.sets.find((x) => x.id === id);
    setForm(s ? { ...s, subject_id: s.subject_id || '', exam_id: s.exam_id || '', time_limit_minutes: s.time_limit_minutes ?? '', description: s.description || '' }
      : { title: '', slug: '', description: '', subject_id: '', exam_id: '', time_limit_minutes: '', status: 'draft' });
    setPicked(s ? data.links.filter((x) => x.set_id === id).sort((a, b) => a.position - b.position).map((x) => x.question_id) : []);
  }, [data, id]);

  const qById = useMemo(() => Object.fromEntries((data?.questions || []).map((q) => [q.id, q])), [data]);
  const pool = useMemo(() => (data?.questions || []).filter((q) =>
    (!pf.subject || q.subject_id === pf.subject) && (!pf.topic || q.topic_id === pf.topic) && (!pf.status || q.status === pf.status) &&
    (!pf.q || normText(q.question).includes(normText(pf.q)))).slice(0, 200), [data, pf]);

  if (loading || (!form && !error)) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (id && !data.sets.find((x) => x.id === id)) return <Empty title="Set not found" action={<Link className="btn btn-primary" to="/admin/sets">Back</Link>} />;

  const set = (p) => setForm((f) => ({ ...f, ...p }));
  const toggle = (qid) => setPicked((p) => (p.includes(qid) ? p.filter((x) => x !== qid) : [...p, qid]));   // never duplicates
  const move = (i, d) => setPicked((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const drafts = picked.filter((x) => qById[x]?.status !== 'published').length;

  const save = async () => {
    if (busyRef.current) return;
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required.';
    if (!isSlug(form.slug)) e.slug = 'Use lowercase letters, numbers and hyphens.';
    else if (data.sets.some((s) => s.slug === form.slug && s.id !== id)) e.slug = 'Another set already uses this slug.';
    const tl = form.time_limit_minutes === '' ? null : Number(form.time_limit_minutes);
    if (tl !== null && (!Number.isInteger(tl) || tl < 1 || tl > 600)) e.time_limit_minutes = 'Enter whole minutes between 1 and 600, or leave blank.';
    if (form.status === 'published' && !picked.length) e.picked = 'Add at least one question before publishing.';
    setErrors(e); if (Object.keys(e).length) { toast('Please fix the highlighted fields.', 'error'); return; }
    busyRef.current = true; setBusy(true);
    try {
      const row = { title: form.title.trim(), slug: form.slug, description: form.description.trim() || null, subject_id: form.subject_id || null, exam_id: form.exam_id || null, time_limit_minutes: tl, status: form.status };
      const saved = id ? await admin.update('practice_sets', id, row) : await admin.insert('practice_sets', row);
      await admin.replaceLinks('practice_set_questions', 'set_id', saved.id, picked.map((question_id, position) => ({ set_id: saved.id, question_id, position })));
      toast('Practice set saved.');
      nav('/admin/sets');
    } catch (err) { toast(err.message, 'error'); }
    busyRef.current = false; setBusy(false);
  };

  return (
    <>
      <AdminHead title={id ? 'Edit practice set' : 'New practice set'}>
        <Link className="btn btn-ghost" to="/admin/sets">Back</Link>
        <button className="btn btn-outline" onClick={() => setPreview(true)} disabled={!picked.length}><Eye size={17} /> Preview</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save set'}</button>
      </AdminHead>
      <div className="card form-card">
        <div className="form-row">
          <Field label="Title" required error={errors.title}><input className="input" value={form.title} onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })} /></Field>
          <Field label="URL slug" required error={errors.slug} hint="Appears as /practice/your-slug"><input className="input mono" value={form.slug} onChange={(e) => { setSlugTouched(true); set({ slug: e.target.value.toLowerCase() }); }} /></Field>
        </div>
        <Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        <div className="form-row four">
          <Field label="Subject"><select className="input" value={form.subject_id} onChange={(e) => set({ subject_id: e.target.value })}><option value="">None</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
          <Field label="Exam"><select className="input" value={form.exam_id} onChange={(e) => set({ exam_id: e.target.value })}><option value="">None</option>{data.exams.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
          <Field label="Time limit (minutes)" error={errors.time_limit_minutes} hint="Blank = untimed"><input className="input" type="number" min="1" max="600" value={form.time_limit_minutes} onChange={(e) => set({ time_limit_minutes: e.target.value })} /></Field>
          <Field label="Status"><select className="input" value={form.status} onChange={(e) => set({ status: e.target.value })}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></Field>
        </div>
      </div>

      <div className="admin-two">
        <section className="card">
          <h2>Question bank</h2>
          <div className="filters wrap">
            <input className="input grow" placeholder="Search…" value={pf.q} onChange={(e) => setPf({ ...pf, q: e.target.value })} aria-label="Search question bank" />
            <select className="input" value={pf.subject} onChange={(e) => setPf({ ...pf, subject: e.target.value, topic: '' })} aria-label="Subject"><option value="">All subjects</option>{data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select className="input" value={pf.topic} disabled={!pf.subject} onChange={(e) => setPf({ ...pf, topic: e.target.value })} aria-label="Topic"><option value="">All topics</option>{data.topics.filter((t) => t.subject_id === pf.subject).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
            <select className="input" value={pf.status} onChange={(e) => setPf({ ...pf, status: e.target.value })} aria-label="Status"><option value="">Any status</option><option value="published">Published</option><option value="draft">Draft</option></select>
          </div>
          {pool.length === 0 ? <Empty title="No questions match" /> : (
            <ul className="pick-list">
              {pool.map((q) => (
                <li key={q.id}><label className="check">
                  <input type="checkbox" checked={picked.includes(q.id)} onChange={() => toggle(q.id)} />
                  <span><span className="clamp-2">{q.question}</span><span className="muted small">{data.subjects.find((s) => s.id === q.subject_id)?.name} · {cap(q.difficulty)} {q.status !== 'published' && '· Draft'}</span></span>
                </label></li>
              ))}
            </ul>
          )}
        </section>
        <section className="card">
          <h2>In this set ({picked.length})</h2>
          {errors.picked && <p className="err-text">{errors.picked}</p>}
          {drafts > 0 && <p className="notice">{drafts} selected question(s) are drafts and won't be shown to students until published.</p>}
          {picked.length === 0 ? <Empty title="No questions selected">Tick questions on the left to add them.</Empty> : (
            <ol className="picked-list">
              {picked.map((qid, i) => (
                <li key={qid}>
                  <span className="clamp-2">{qById[qid]?.question || 'Missing question'}</span>
                  <span className="row-actions">
                    <button className="icon-btn" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={15} /></button>
                    <button className="icon-btn" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === picked.length - 1}><ArrowDown size={15} /></button>
                    <button className="icon-btn danger" aria-label="Remove from set" onClick={() => toggle(qid)}><X size={15} /></button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      {preview && (
        <Modal title={`Preview: ${form.title || 'Untitled set'}`} onClose={() => setPreview(false)} wide>
          <p className="muted small">{picked.length} questions · {form.time_limit_minutes ? `${form.time_limit_minutes} minutes` : 'untimed'}{form.status === 'published' ? '' : ' · not yet published'}</p>
          <div className="q-stack">{picked.map((qid, i) => qById[qid] && <QuestionStudy key={qid} q={qById[qid]} n={i + 1} />)}</div>
        </Modal>
      )}
    </>
  );
}
