import { Link } from 'react-router-dom';
import { Plus, FileUp, ClipboardList } from 'lucide-react';
import { admin } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';
import { fmtDate } from '../lib/text.js';
import { AdminHead, StatusBadge } from './common.jsx';
import { Loading, ErrorState, Empty } from '../components/States.jsx';

export default function Dashboard() {
  const { data: s, loading, error, reload } = useAsync(() => admin.stats(), []);
  return (
    <>
      <AdminHead title="Dashboard" sub="Live counts from the question bank.">
        <Link className="btn btn-primary" to="/admin/questions/new"><Plus size={17} /> New question</Link>
      </AdminHead>
      {loading ? <Loading /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <div className="stat-grid">
            {[['Subjects', s.subjects, '/admin/subjects'], ['Topics', s.topics, '/admin/topics'], ['Questions', s.questions, '/admin/questions'],
              ['Published', s.published, '/admin/questions?status=published'], ['Drafts', s.drafts, '/admin/questions?status=draft'], ['Practice sets', s.sets, '/admin/sets']].map(([l, n, to]) => (
              <Link key={l} to={to} className="card stat-card"><span className="muted small">{l}</span><strong>{n}</strong></Link>
            ))}
          </div>
          <div className="admin-two">
            <section className="card">
              <h2>Recent updates</h2>
              {s.recent.length ? (
                <ul className="recent-updates">
                  {s.recent.map((r, i) => (
                    <li key={i}><Link to={r.to}><span className="muted small">{r.kind} · {fmtDate(r.at)}</span><span className="clamp-1">{r.title}</span></Link><StatusBadge s={r.status} /></li>
                  ))}
                </ul>
              ) : <Empty title="No content yet">Create a subject to get started.</Empty>}
            </section>
            <section className="card">
              <h2>Quick actions</h2>
              <div className="quick">
                <Link className="btn btn-outline btn-block" to="/admin/questions/new"><Plus size={17} /> Add a question</Link>
                <Link className="btn btn-outline btn-block" to="/admin/import"><FileUp size={17} /> Import questions from CSV</Link>
                <Link className="btn btn-outline btn-block" to="/admin/sets"><ClipboardList size={17} /> Build a practice set</Link>
                <Link className="btn btn-outline btn-block" to="/admin/questions?status=draft">Review {s.drafts} draft{s.drafts === 1 ? '' : 's'}</Link>
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
