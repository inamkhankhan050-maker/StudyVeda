import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { OPTIONS, optKey, cap } from '../lib/text.js';
import Discussion from './Discussion.jsx';

// Read-only question with a "Show answer" toggle (used on topic pages and admin preview)
export function QuestionStudy({ q, n, forceOpen, discussion }) {
  const [open, setOpen] = useState(!!forceOpen);
  const [picked, setPicked] = useState(null);
  const show = forceOpen || open || !!picked;
  const pick = (L) => { if (!picked && !forceOpen) setPicked(L); };
  return (
    <article className="q-study" id={`q-${q.id}`}>
      <div className="q-head">
        <span className="q-num">{n != null ? `Q${n}.` : ''}</span>
        <span className={`diff diff-${q.difficulty}`}>{cap(q.difficulty)}</span>
      </div>
      <p className="q-text">{q.question}</p>
      {q.image_url && <img className="q-img" src={q.image_url} alt="Figure for this question" loading="lazy" />}
      {forceOpen ? (
        <ol className="opt-list" type="A">
          {OPTIONS.map((L) => (
            <li key={L} className={q.correct_option === L ? 'opt-static correct' : 'opt-static'}>
              <span className="opt-letter">{L}</span><span>{q[optKey(L)]}</span>
              {q.correct_option === L && <Check size={18} className="opt-mark" aria-label="Correct answer" />}
            </li>
          ))}
        </ol>
      ) : (
        <div className="opt-list" role="group" aria-label="Answer options">
          {OPTIONS.map((L) => {
            const isRight = q.correct_option === L, mine = picked === L;
            let cls = 'opt-static opt-tap';
            if (show && isRight) cls += ' correct';
            if (mine && !isRight) cls += ' wrong';
            return (
              <button key={L} type="button" className={cls} onClick={() => pick(L)} aria-pressed={mine} disabled={!!picked} aria-label={`Option ${L}: ${q[optKey(L)]}`}>
                <span className="opt-letter">{L}</span><span className="opt-text">{q[optKey(L)]}</span>
                {show && isRight && <Check size={18} className="opt-mark" aria-label="Correct answer" />}
                {mine && !isRight && <X size={18} className="opt-mark bad" aria-label="Your answer, incorrect" />}
              </button>
            );
          })}
        </div>
      )}
      {picked && <p className={'pick-result ' + (picked === q.correct_option ? 'ok' : 'bad')} role="status">{picked === q.correct_option ? 'Correct! Well done.' : `Wrong. The correct answer is ${q.correct_option}.`}</p>}
      {!forceOpen && !picked && <button className="btn btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? 'Hide answer' : 'Show answer'}</button>}
      {picked && <button className="btn btn-ghost btn-sm" onClick={() => { setPicked(null); setOpen(false); }}>Try again</button>}
      {show && (
        <div className="explain">
          <strong>Answer: {q.correct_option}</strong>
          {q.explanation && <p>{q.explanation}</p>}
          {q.source && <p className="muted small">Source: {q.source}</p>}
        </div>
      )}
      {discussion && <Discussion qid={q.id} />}
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
