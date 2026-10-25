import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Timer, RotateCcw } from 'lucide-react';
import { getCatalog, getRecentQuestions } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { SearchBox } from '../components/Layout.jsx';
import { SubjectCard, SetCard, QuestionPreview } from '../components/Cards.jsx';
import { Loading, ErrorState } from '../components/States.jsx';

const POPULAR = ['aptitude', 'english', 'verbal-reasoning', 'general-knowledge', 'computer-fundamentals', 'python', 'sql', 'general-science'];

export default function Home() {
  useMeta(null, 'StudyVeda: practise MCQs for SSC, Railway and other competitive exams, programming, engineering and university subjects, with answers and explanations.');
  const { data: c, loading, error, reload } = useAsync(getCatalog, []);
  const { data: recent } = useAsync(() => getRecentQuestions(5), []);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <span className="pill">Free MCQ practice · Answers with explanations</span>
          <h1>Practice MCQs for <span className="grad">Competitive Exams</span></h1>
          <p className="lead">Aptitude, reasoning, English, GK, programming, engineering and more. Practise topic by topic, or take a timed test and review every answer.</p>
          <SearchBox big />
          <div className="hero-cta">
            <Link to="/practice" className="btn btn-primary btn-lg">Start Practicing <ArrowRight size={18} /></Link>
            <Link to="/subjects" className="btn btn-outline btn-lg">Explore Subjects</Link>
          </div>
          <ul className="hero-points">
            <li><CheckCircle2 size={16} /> Instant feedback</li>
            <li><Timer size={16} /> Timed test mode</li>
            <li><RotateCcw size={16} /> Retry wrong answers</li>
          </ul>
        </div>
      </section>

      {loading && <Loading />}
      {error && <div className="container"><ErrorState error={error} onRetry={reload} /></div>}
      {c && (
        <>
          <section className="section container">
            <div className="section-head"><h2>Popular subjects</h2><Link to="/subjects" className="link-more">All subjects <ArrowRight size={16} /></Link></div>
            <div className="grid-cards">
              {POPULAR.map((slug) => c.subjects.find((s) => s.slug === slug)).filter(Boolean).map((s) => <SubjectCard key={s.id} s={s} />)}
            </div>
          </section>

          {c.sets.some((p) => p.question_count) && (
            <section className="section section-tint">
              <div className="container">
                <div className="section-head"><h2>Featured practice sets</h2><Link to="/practice" className="link-more">All sets <ArrowRight size={16} /></Link></div>
                <div className="grid-sets">{c.sets.filter((p) => p.question_count).slice(0, 6).map((p) => <SetCard key={p.id} p={p} />)}</div>
              </div>
            </section>
          )}

          <section className="section container">
            <div className="section-head"><h2>Competitive examinations</h2><Link to="/exams" className="link-more">All exams <ArrowRight size={16} /></Link></div>
            <div className="chips">
              {c.exams.map((e) => <Link key={e.id} to={`/exams/${e.slug}`} className="chip">{e.name}</Link>)}
            </div>
          </section>

          {c.categories.map((cat) => {
            const list = c.subjects.filter((s) => s.category_ids.includes(cat.id));
            if (!list.length) return null;
            return (
              <section key={cat.id} className="section container cat-section">
                <div className="section-head">
                  <div><h2>{cat.name}</h2>{cat.description && <p className="muted small">{cat.description}</p>}</div>
                  <Link to={`/subjects#${cat.slug}`} className="link-more">View all {list.length} <ArrowRight size={16} /></Link>
                </div>
                <div className="grid-compact">{list.slice(0, 8).map((s) => <SubjectCard key={s.id} s={s} compact />)}</div>
              </section>
            );
          })}

          {recent?.length > 0 && (
            <section className="section container">
              <div className="section-head"><h2>Recently added questions</h2></div>
              <div className="recent-list">{recent.map((q) => <QuestionPreview key={q.id} q={q} />)}</div>
            </section>
          )}
        </>
      )}
    </>
  );
}
