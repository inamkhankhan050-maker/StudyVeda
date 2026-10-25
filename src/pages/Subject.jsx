import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Play, Timer } from 'lucide-react';
import { getSubjectPage } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import { SubjectIcon } from '../components/Icon.jsx';
import { SetCard, SubjectCard } from '../components/Cards.jsx';
import { Loading, ErrorState, Empty, NotFoundBlock } from '../components/States.jsx';
import { plural } from '../lib/text.js';

export default function Subject() {
  const { subject: slug } = useParams();
  const { data, loading, error, reload } = useAsync(() => getSubjectPage(slug), [slug]);
  const s = data?.subject;
  useMeta(s ? `${s.name} MCQ Questions and Answers` : 'Subject', s ? `Practise ${s.name} MCQs topic by topic with answers and explanations. ${s.question_count} questions available.` : undefined);

  if (loading) return <Loading />;
  if (error) return <div className="container section"><ErrorState error={error} onRetry={reload} /></div>;
  if (!data) return <NotFoundBlock what="subject" />;
  const { topics, sets, related, categories } = data;

  return (
    <div className="container section">
      <Breadcrumbs items={[{ to: '/subjects', label: 'Subjects' }, { label: s.name }]} />
      <header className="entity-head">
        <SubjectIcon name={s.icon} k={s.slug} size={28} />
        <div>
          <h1>{s.name}</h1>
          <p className="muted">{s.description}</p>
          <p className="meta-line">{plural(s.question_count, 'question')} · {plural(topics.length, 'topic')} · {categories.map((k) => k.name).join(', ')}</p>
        </div>
      </header>
      {s.question_count > 0 && (
        <div className="action-row">
          <Link className="btn btn-primary" to={`/play?type=subject&slug=${s.slug}&mode=practice`}><Play size={17} /> Practice all</Link>
          <Link className="btn btn-outline" to={`/play?type=subject&slug=${s.slug}&mode=test`}><Timer size={17} /> Take as test</Link>
        </div>
      )}

      <section className="block">
        <h2>Topics</h2>
        {topics.length ? (
          <ul className="topic-list">
            {topics.map((t) => (
              <li key={t.id}>
                <Link to={`/subjects/${s.slug}/${t.slug}`} className="topic-row">
                  <span><strong>{t.name}</strong><span className="muted small">{t.question_count ? plural(t.question_count, 'question') : 'Coming soon'}</span></span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Questions for this subject are on the way">We're still writing and checking {s.name} questions. Meanwhile, try a related subject below.</Empty>
        )}
      </section>

      {sets.length > 0 && <section className="block"><h2>Practice sets</h2><div className="grid-sets">{sets.map((p) => <SetCard key={p.id} p={p} />)}</div></section>}
      {related.length > 0 && <section className="block"><h2>Related subjects</h2><div className="grid-compact">{related.map((r) => <SubjectCard key={r.id} s={r} compact />)}</div></section>}
    </div>
  );
}
