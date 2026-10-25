import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Timer, RotateCcw } from 'lucide-react';
import { getCatalog } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { SearchBox } from '../components/Layout.jsx';
import { SubjectCard, ExamCard, SetCard } from '../components/Cards.jsx';
import { Loading, ErrorState } from '../components/States.jsx';

// Homepage headings and copy per category (original StudyVeda wording).
const SECTIONS = {
  'competitive-exams': ['Practice MCQs by Subject', 'Core sections of government and private recruitment tests, each with answers and explanations.'],
  'computer-programming': ['Computer & Programming MCQs', 'From computer basics to Python, SQL, data science and cloud.'],
  'engineering-gate': ['Engineering & GATE MCQs', 'Branch-wise engineering subjects plus maths, physics and chemistry for GATE.'],
  'graduation-postgraduate': ['Graduation & Postgraduate MCQs', 'University-level subjects for UG and PG students and entrance tests.'],
  'interview-preparation': ['Interview Questions & Answers', 'Get ready for HR, banking and technical interview rounds.'],
};

function SectionHead({ id, title, sub, to, more }) {
  return (
    <div className="sv-head">
      <div>
        <h2 id={id}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {to && <Link to={to} className="link-more">{more} <ArrowRight size={16} /></Link>}
    </div>
  );
}

export default function Home() {
  useMeta(null, 'StudyVeda: practise MCQs for SSC, Railway and other competitive exams, programming, engineering and university subjects, with answers and explanations.');
  const { data: c, loading, error, reload } = useAsync(getCatalog, []);
  const cats = c ? c.categories.filter((cat) => cat.slug !== 'interview-preparation') : [];
  const interview = c?.categories.find((cat) => cat.slug === 'interview-preparation');
  const sets = c ? c.sets.filter((p) => p.question_count).slice(0, 6) : [];

  const catSection = (cat) => {
    const list = c.subjects.filter((s) => s.category_ids.includes(cat.id));
    if (!list.length) return null;
    const [title, sub] = SECTIONS[cat.slug] || [cat.name, cat.description];
    return (
      <section key={cat.id} className="section sv-section" aria-labelledby={`h-${cat.slug}`}>
        <div className="container">
          <SectionHead id={`h-${cat.slug}`} title={title} sub={sub} to={`/subjects#${cat.slug}`} more="Browse" />
          <div className="sv-grid">{list.map((s) => <SubjectCard key={s.id} s={s} />)}</div>
        </div>
      </section>
    );
  };

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <span className="pill">Free MCQs with explanations</span>
          <h1>Practice MCQs for <span className="grad">Competitive Exams</span></h1>
          <p className="lead">Short, focused practice for SSC, Railway, programming, engineering and university subjects. Pick a topic, check each answer instantly, or take a timed test.</p>
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
          {cats.map(catSection)}

          <section className="section sv-section" aria-labelledby="h-exams">
            <div className="container">
              <SectionHead id="h-exams" title="Competitive Exam Preparation" sub="SSC and Railway practice organised by exam. StudyVeda is independent and not affiliated with any exam body." to="/exams" more="All exams" />
              <div className="sv-grid">{c.exams.map((e) => <ExamCard key={e.id} e={e} />)}</div>
            </div>
          </section>

          {interview && catSection(interview)}

          {sets.length > 0 && (
            <section className="section sv-section sv-tint" aria-labelledby="h-sets">
              <div className="container">
                <SectionHead id="h-sets" title="Featured Practice Sets" sub="Ready-made sets you can finish in a few minutes." to="/practice" more="All sets" />
                <div className="grid-sets">{sets.map((p) => <SetCard key={p.id} p={p} />)}</div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
