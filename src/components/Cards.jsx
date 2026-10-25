import { Link } from 'react-router-dom';
import { ArrowRight, Clock, ListChecks } from 'lucide-react';
import { SubjectIcon } from './Icon.jsx';
import { plural } from '../lib/text.js';

export function SubjectCard({ s, compact }) {
  return (
    <Link to={`/subjects/${s.slug}`} className={'card subject-card' + (compact ? ' compact' : '')}>
      <SubjectIcon name={s.icon} k={s.slug} />
      <span className="subject-card-body">
        <span className="subject-card-title">{s.name}</span>
        <span className="muted small">{s.question_count ? plural(s.question_count, 'question') : 'Questions coming soon'}</span>
      </span>
      <ArrowRight className="arrow" size={18} aria-hidden="true" />
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
