import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { OPTIONS, optKey, cap } from '../lib/text.js';

// Read-only question with a "Show answer" toggle (used on topic pages and admin preview)
export function QuestionStudy({ q, n, forceOpen }) {
  const [open, setOpen] = useState(!!forceOpen);
  const show = forceOpen || open;
  return (
    <article className="q-study" id={`q-${q.id}`}>
      <div className="q-head">
        <span className="q-num">{n != null ? `Q${n}.` : ''}</span>
        <span className={`diff diff-${q.difficulty}`}>{cap(q.difficulty)}</span>
      </div>
      <p className="q-text">{q.question}</p>
      {q.image_url && <img className="q-img" src={q.image_url} alt="Figure for this question" loading="lazy" />}
      <ol className="opt-list" type="A">
        {OPTIONS.map((L) => (
          <li key={L} className={show && q.correct_option === L ? 'opt-static correct' : 'opt-static'}>
            <span className="opt-letter">{L}</span><span>{q[optKey(L)]}</span>
            {show && q.correct_option === L && <Check size={18} className="opt-mark" aria-label="Correct answer" />}
          </li>
        ))}
      </ol>
      {!forceOpen && <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide answer' : 'Show answer'}</button>}
      {show && (
        <div className="explain">
          <strong>Answer: {q.correct_option}</strong>
          {q.explanation && <p>{q.explanation}</p>}
          {q.source && <p className="muted small">Source: {q.source}</p>}
        </div>
      )}
    </article>
  );
}

// Interactive option button used by the practice engine
export function OptionButton({ L, text, selected, reveal, correct, disabled, onSelect }) {
  let cls = 'opt';
  if (selected) cls += ' selected';
  if (reveal && correct) cls += ' correct';
  if (reveal && selected && !correct) cls += ' wrong';
  return (
    <button type="button" className={cls} onClick={() => onSelect(L)} disabled={disabled} aria-pressed={selected}>
      <span className="opt-letter">{L}</span>
      <span className="opt-text">{text}</span>
      {reveal && correct && <Check size={18} className="opt-mark" aria-label="Correct answer" />}
      {reveal && selected && !correct && <X size={18} className="opt-mark" aria-label="Your answer, incorrect" />}
    </button>
  );
}
