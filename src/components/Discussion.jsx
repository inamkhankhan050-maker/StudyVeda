import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, UserRound, LogIn, Trash2 } from 'lucide-react';
import { backend } from '../lib/api.js';
import { useAuth, displayName } from '../lib/auth.jsx';

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
  for (const [n, u] of units) if (s >= n) { const v = Math.floor(s / n); return `${v} ${u}${v > 1 ? 's' : ''} ago`; }
  return 'just now';
}

// Per-question discussion. Reading and posting both need a login (enforced by RLS in 002_comments.sql).
function Thread({ qid }) {
  const { user } = useAuth();
  const loc = useLocation();
  const [list, setList] = useState(null);
  const [err, setErr] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    setList(null); setErr(null);
    backend.listComments(qid).then((r) => alive && setList(r)).catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [qid, user]);

  const post = async (e) => {
    e.preventDefault(); if (busy || !text.trim()) return;
    setBusy(true); setErr(null);
    try { const row = await backend.addComment(qid, text, displayName(user)); setList((l) => [row, ...(l || [])]); setText(''); }
    catch (er) { setErr(er.message); }
    setBusy(false);
  };
  const remove = async (id) => {
    try { await backend.deleteComment(id); setList((l) => l.filter((c) => c.id !== id)); } catch (er) { setErr(er.message); }
  };

  return (
    <section className="disc" aria-label="Discussion">
      <div className="disc-top">
        <div><span className="disc-kicker">COMMUNITY</span><h3>Join the Discussion</h3></div>
        {user && list && <span className="muted small">{list.length} {list.length === 1 ? 'Comment' : 'Comments'}</span>}
      </div>
      {!user ? (
        <div className="disc-join">
          <span className="disc-ic" aria-hidden="true"><UserRound size={22} /></span>
          <div>
            <strong>Join the discussion</strong>
            <p className="muted small">Login to read comments, ask doubts or share your explanation.</p>
            <Link to="/login" state={{ from: loc.pathname + loc.search + loc.hash }} className="btn btn-primary btn-sm"><LogIn size={16} /> Login</Link>
          </div>
        </div>
      ) : (
        <>
          <form className="disc-form" onSubmit={post}>
            <label className="sr-only" htmlFor={`c-${qid}`}>Your comment</label>
            <textarea id={`c-${qid}`} className="input" rows={3} maxLength={1000} placeholder={`Comment as ${displayName(user)}…`} value={text} onChange={(e) => setText(e.target.value)} />
            <div className="disc-form-row"><span className="muted small">{text.length}/1000</span><button className="btn btn-primary btn-sm" disabled={busy || !text.trim()}>{busy ? 'Posting…' : 'Post comment'}</button></div>
          </form>
          {err && <div className="notice err" role="alert">{err}</div>}
          {!list && !err && <p className="muted small">Loading comments…</p>}
          {list && list.length === 0 && <p className="muted small">No comments yet. Be the first to share your explanation.</p>}
          <ul className="disc-list">
            {list?.map((c) => (
              <li key={c.id} className="disc-item">
                <span className="disc-av" aria-hidden="true">{(c.author_name || '?').charAt(0).toUpperCase()}</span>
                <div className="disc-body">
                  <div className="disc-meta"><strong>{c.author_name}</strong><span className="muted small">{ago(c.created_at)}</span>
                    {c.user_id === user.id && <button className="icon-btn danger disc-del" onClick={() => remove(c.id)} aria-label="Delete my comment"><Trash2 size={16} /></button>}
                  </div>
                  <p>{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

// Collapsed by default, so a page of questions doesn't load every thread at once.
export default function Discussion({ qid, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="disc-wrap">
      <button type="button" className="btn btn-ghost btn-sm disc-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
        <MessageSquare size={16} /> {open ? 'Hide discussion' : 'Discussion'}
      </button>
      {open && <Thread qid={qid} />}
    </div>
  );
}
