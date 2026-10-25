import { Link } from 'react-router-dom';
import { Trash2, LogOut } from 'lucide-react';
import { backend } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useAsync, useMeta, useToast } from '../lib/hooks.js';
import { fmtDate, cap } from '../lib/text.js';
import { formatDuration } from '../lib/scoring.js';
import { IS_DEMO } from '../lib/config.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { Loading, ErrorState, Empty } from '../components/States.jsx';

export default function Progress() {
  useMeta('My Progress', undefined, { noindex: true });
  const { user, ready, signOut } = useAuth();
  const toast = useToast();
  const canLoad = IS_DEMO || !!user;
  const { data, loading, error, reload } = useAsync(() => (canLoad ? backend.listAttempts() : Promise.resolve([])), [canLoad, user?.id]);

  if (!ready) return <Loading />;
  if (!canLoad) return (
    <div className="container section narrow">
      <Breadcrumbs items={[{ label: 'My Progress' }]} />
      <Empty title="Sign in to track your progress" action={<Link className="btn btn-primary" to="/login" state={{ from: '/progress' }}>Sign in</Link>}>Your results and bookmarks are private to your account.</Empty>
    </div>
  );
  const attempts = data || [];
  const totals = attempts.reduce((a, x) => ({ q: a.q + x.total, c: a.c + x.correct, att: a.att + x.correct + x.incorrect }), { q: 0, c: 0, att: 0 });
  const del = async (id) => { try { await backend.deleteAttempt(id); reload(); } catch (e) { toast(e.message, 'error'); } };

  return (
    <div className="container section narrow">
      <Breadcrumbs items={[{ label: 'My Progress' }]} />
      <div className="section-head">
        <div><h1>My progress</h1><p className="muted small">{IS_DEMO ? 'Saved on this device (demo mode).' : `Signed in as ${user.email}`}</p></div>
        {!IS_DEMO && <button className="btn btn-outline btn-sm" onClick={signOut}><LogOut size={16} /> Sign out</button>}
      </div>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : attempts.length === 0 ? (
        <Empty title="No attempts yet" action={<Link className="btn btn-primary" to="/practice">Start practising</Link>}>Finish a practice session or test and your results will appear here.</Empty>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat"><strong>{attempts.length}</strong><span>Sessions</span></div>
            <div className="stat"><strong>{totals.q}</strong><span>Questions seen</span></div>
            <div className="stat ok"><strong>{totals.c}</strong><span>Correct</span></div>
            <div className="stat"><strong>{totals.att ? Math.round((totals.c / totals.att) * 100) : 0}%</strong><span>Accuracy</span></div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Session</th><th>Mode</th><th>Score</th><th>Time</th><th>Date</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.title}</td><td>{cap(a.mode)}</td>
                    <td><strong>{a.correct}/{a.total}</strong> <span className="muted small">({a.total ? Math.round((a.correct / a.total) * 100) : 0}%)</span></td>
                    <td>{formatDuration(a.duration_seconds)}</td><td>{fmtDate(a.created_at)}</td>
                    <td><button className="icon-btn" aria-label={`Delete ${a.title} attempt`} onClick={() => del(a.id)}><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
