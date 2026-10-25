import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Play, Timer } from 'lucide-react';
import { getTopicPage } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { QuestionStudy } from '../components/QuestionView.jsx';
import { Loading, ErrorState, Empty, NotFoundBlock } from '../components/States.jsx';
import { plural } from '../lib/text.js';

const PER_PAGE = 10;

export default function Topic() {
  const { subject, topic } = useParams();
  const { data, loading, error, reload } = useAsync(() => getTopicPage(subject, topic), [subject, topic]);
  const [page, setPage] = useState(1);
  const t = data?.topic, s = data?.subject;
  useMeta(t ? `${t.name} – ${s.name} MCQs` : 'Topic', t ? `${t.name} multiple-choice questions for ${s.name}, with answers and explanations.` : undefined);

  if (loading) return <Loading />;
  if (error) return <div className="container section"><ErrorState error={error} onRetry={reload} /></div>;
  if (!data) return <NotFoundBlock what="topic" />;
  const qs = data.questions, pages = Math.max(1, Math.ceil(qs.length / PER_PAGE));
  const shown = qs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="container section narrow">
      <Breadcrumbs items={[{ to: '/subjects', label: 'Subjects' }, { to: `/subjects/${s.slug}`, label: s.name }, { label: t.name }]} />
      <header className="page-head">
        <h1>{t.name}</h1>
        <p className="muted">{t.description || `${s.name} questions on ${t.name}.`} · {plural(qs.length, 'question')}</p>
      </header>
      {qs.length > 0 ? (
        <>
          <div className="action-row">
            <Link className="btn btn-primary" to={`/play?type=topic&subject=${s.slug}&slug=${t.slug}&mode=practice`}><Play size={17} /> Practice mode</Link>
            <Link className="btn btn-outline" to={`/play?type=topic&subject=${s.slug}&slug=${t.slug}&mode=test`}><Timer size={17} /> Test mode</Link>
          </div>
          <div className="q-stack">{shown.map((q, i) => <QuestionStudy key={q.id} q={q} n={(page - 1) * PER_PAGE + i + 1} discussion />)}</div>
          {pages > 1 && (
            <nav className="pager" aria-label="Question pages">
              <button className="btn btn-outline btn-sm" disabled={page === 1} onClick={() => { setPage(page - 1); window.scrollTo(0, 0); }}>Previous</button>
              <span>Page {page} of {pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page === pages} onClick={() => { setPage(page + 1); window.scrollTo(0, 0); }}>Next</button>
            </nav>
          )}
        </>
      ) : <Empty title="No questions here yet" action={<Link className="btn btn-outline" to={`/subjects/${s.slug}`}>Back to {s.name}</Link>}>Questions for this topic haven't been published yet.</Empty>}
      {data.siblings.length > 0 && (
        <section className="block">
          <h2>More {s.name} topics</h2>
          <div className="chips">{data.siblings.map((x) => <Link key={x.id} className="chip" to={`/subjects/${s.slug}/${x.slug}`}>{x.name}</Link>)}</div>
        </section>
      )}
    </div>
  );
}
