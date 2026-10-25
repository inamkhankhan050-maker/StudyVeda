import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Clock, ListChecks, TrainFront, ClipboardList } from 'lucide-react';
import { SubjectIcon, tint } from './Icon.jsx';
import { plural } from '../lib/text.js';

function Count({ n }) {
  return n
    ? <span className="sv-count">{plural(n, 'question')}</span>
    : <span className="sv-count soon">Coming soon</span>;
}

// Full-width list card: icon tile, title, one-line subtitle, count, chevron. Whole card is the link.
export function SubjectCard({ s, compact }) {
  return (
    <Link to={`/subjects/${s.slug}`} className={'card subject-card' + (compact ? ' compact' : '')}>
      <SubjectIcon name={s.icon} k={s.slug} />
      <span className="subject-card-body">
        <span className="subject-card-title">{s.name}</span>
        {!compact && s.description && <span className="subject-card-sub">{s.description}</span>}
        <Count n={s.question_count} />
      </span>
      <span className="chev" aria-hidden="true"><ChevronRight size={18} /></span>
    </Link>
  );
}

export function ExamCard({ e }) {
  const Icon = e.group_name === 'Railway' ? TrainFront : ClipboardList;
  const [bg, fg] = tint('exam-' + (e.group_name || e.slug));
  return (
    <Link to={`/exams/${e.slug}`} className="card subject-card exam-row">
      <span className="icon-tile" style={{ background: bg, color: fg }} aria-hidden="true"><Icon size={22} strokeWidth={1.9} /></span>
      <span className="subject-card-body">
        <span className="subject-card-title">{e.name} <span className="exam-tag">Exam</span></span>
        {e.description && <span className="subject-card-sub">{e.description}</span>}
        <Count n={e.question_count} />
      </span>
      <span className="chev" aria-hidden="true"><ChevronRight size={18} /></span>
    </Link>
  );
}

export function SetCard({ p }) {
  return (
    <Link to={`/practice/${p.slug}`} className="card set-card">
      <span className="eyebrow">{p.exam?.name || p.subject?.name || 'Practice set'}</span>
      <span className="set-card-title">{p.title}</span>
      {p.description && <span className="muted small clamp-2">{p.description}</span>}
      <span className="set-meta">
        <span><ListChecks size={15} aria-hidden="true" /> {plural(p.question_count, 'question')}</span>
        <span><Clock size={15} aria-hidden="true" /> {p.time_limit_minutes ? `${p.time_limit_minutes} min` : 'Untimed'}</span>
        <ArrowRight size={15} className="set-go" aria-hidden="true" />
      </span>
    </Link>
  );
}

export function QuestionPreview({ q }) {
  const to = q.topic && q.subject ? `/subjects/${q.subject.slug}/${q.topic.slug}#q-${q.id}` : q.subject ? `/subjects/${q.subject.slug}` : '/subjects';
  return (
    <Link to={to} className="q-preview">
      <span className="eyebrow">{q.subject?.name}{q.topic ? ` · ${q.topic.name}` : ''}</span>
      <span className="clamp-2">{q.question}</span>
    </Link>
  );
}
