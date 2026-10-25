import { OPTIONS, optKey, normText, DIFFICULTIES, isSlug } from './text.js';

// Returns an object of { field: message }. Empty object = valid. Mirrors the database constraints.
export function validateQuestion(q, { topics = [] } = {}) {
  const e = {};
  if (!q.subject_id) e.subject_id = 'Choose a subject.';
  if (!q.question || q.question.trim().length < 5) e.question = 'Write the question (at least 5 characters).';
  const seen = new Map();
  OPTIONS.forEach((L) => {
    const v = (q[optKey(L)] || '').trim();
    if (!v) e[optKey(L)] = `Option ${L} is required.`;
    else if (seen.has(normText(v))) e[optKey(L)] = `Option ${L} is the same as option ${seen.get(normText(v))}.`;
    else seen.set(normText(v), L);
  });
  if (!OPTIONS.includes(q.correct_option)) e.correct_option = 'Select the correct answer (A, B, C or D).';
  if (!DIFFICULTIES.includes(q.difficulty)) e.difficulty = 'Choose a difficulty.';
  if (!['draft', 'published'].includes(q.status)) e.status = 'Status must be Draft or Published.';
  if (q.topic_id) {
    const t = topics.find((x) => x.id === q.topic_id);
    if (topics.length && (!t || t.subject_id !== q.subject_id)) e.topic_id = 'This topic does not belong to the chosen subject.';
  }
  if (q.image_url && !/^https?:\/\//i.test(q.image_url)) e.image_url = 'Image URL must start with http:// or https://';
  return e;
}

export function validateSlugged(item, label = 'Name', titleKey = 'name') {
  const e = {};
  if (!item[titleKey] || !item[titleKey].trim()) e[titleKey] = `${label} is required.`;
  if (!isSlug(item.slug)) e.slug = 'Slug may contain only lowercase letters, numbers and single hyphens.';
  return e;
}
