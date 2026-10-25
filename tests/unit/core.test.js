import { describe, it, expect } from 'vitest';
import { computeResult, formatDuration } from '../../src/lib/scoring.js';
import { validateQuestion } from '../../src/lib/validate.js';
import { parseQuestionCSV, SAMPLE_CSV, questionsToCSV } from '../../src/lib/csv.js';
import { slugify, isSlug } from '../../src/lib/text.js';
import seed from '../../src/data/seed.json';

const qs = [{ id: '1', correct_option: 'A' }, { id: '2', correct_option: 'B' }, { id: '3', correct_option: 'C' }, { id: '4', correct_option: 'D' }];

describe('scoring', () => {
  it('counts correct, incorrect and unanswered', () => {
    const r = computeResult(qs, { 1: 'A', 2: 'C', 3: 'C' });
    expect([r.total, r.correct, r.incorrect, r.unanswered]).toEqual([4, 2, 1, 1]);
    expect(r.score).toBe(50); expect(r.accuracy).toBe(66.7);
  });
  it('ignores duplicate questions so nothing is counted twice', () => {
    const r = computeResult([...qs, qs[0], qs[0]], { 1: 'A' });
    expect(r.total).toBe(4); expect(r.correct).toBe(1);
  });
  it('handles empty input', () => { expect(computeResult([], {})).toMatchObject({ total: 0, score: 0, accuracy: 0 }); });
  it('formats durations', () => { expect(formatDuration(0)).toBe('0:00'); expect(formatDuration(605)).toBe('10:05'); });
});

describe('question validation', () => {
  const good = { subject_id: 's', question: 'What is 2 + 2?', option_a: '3', option_b: '4', option_c: '5', option_d: '6', correct_option: 'B', difficulty: 'easy', status: 'draft' };
  it('accepts a valid question', () => expect(validateQuestion(good)).toEqual({}));
  it('requires a valid correct answer', () => expect(validateQuestion({ ...good, correct_option: 'E' }).correct_option).toBeTruthy());
  it('rejects duplicate options (case/space-insensitive)', () => expect(validateQuestion({ ...good, option_c: ' 4 ' }).option_c).toMatch(/same as option B/));
  it('rejects missing fields', () => expect(Object.keys(validateQuestion({ ...good, question: '', option_d: '', subject_id: '' }))).toEqual(expect.arrayContaining(['question', 'option_d', 'subject_id'])));
  it('rejects a topic from another subject', () => expect(validateQuestion({ ...good, topic_id: 't' }, { topics: [{ id: 't', subject_id: 'other' }] }).topic_id).toBeTruthy());
});

describe('CSV import', () => {
  const lk = { subjects: seed.subjects, topics: seed.topics, exams: seed.exams, existing: seed.questions };
  it('sample template parses cleanly', () => {
    const r = parseQuestionCSV(SAMPLE_CSV, lk);
    expect(r.fileErrors).toEqual([]);
    expect(r.rows.map((x) => x.state)).toEqual(['valid', 'valid']);
    expect(r.rows[0].data.tags).toEqual(['percentage', 'basics']);
  });
  it('reports missing columns', () => expect(parseQuestionCSV('question,option_a\nx,y', lk).fileErrors[0]).toMatch(/Missing required column/));
  it('flags invalid rows with row numbers and duplicates', () => {
    const csv = 'question,option_a,option_b,option_c,option_d,correct_option,subject,topic\n' +
      'New question one?,a,b,c,d,A,aptitude,percentage\nNew question one?,a,b,c,d,A,aptitude,percentage\nBad?,a,b,c,d,Z,aptitude,\nWhat is 15% of 480?,62,72,82,68,B,Aptitude,Percentage\nTopic?,a,b,c,d,A,aptitude,joins';
    const r = parseQuestionCSV(csv, lk).rows;
    expect(r.map((x) => [x.rowNumber, x.state])).toEqual([[2, 'valid'], [3, 'duplicate'], [4, 'invalid'], [5, 'duplicate'], [6, 'invalid']]);
    expect(r[1].errors[0]).toMatch(/row 2/); expect(r[4].errors[0]).toMatch(/does not exist under Aptitude/);
  });
  it('round-trips export → import as duplicates', () => {
    const csv = questionsToCSV(seed.questions.slice(0, 5), lk);
    expect(parseQuestionCSV(csv, lk).rows.every((x) => x.state === 'duplicate')).toBe(true);
  });
});

describe('seed data integrity', () => {
  it('every sample question has 4 distinct options and a valid answer', () => {
    for (const q of seed.questions) expect(validateQuestion(q, { topics: seed.topics }), q.question).toEqual({});
  });
  it('no duplicate slugs; subjects shared across categories without duplicate rows', () => {
    expect(new Set(seed.subjects.map((s) => s.slug)).size).toBe(seed.subjects.length);
    const cf = seed.subjects.filter((s) => s.slug === 'computer-fundamentals');
    expect(cf.length).toBe(1);
    expect(seed.subject_categories.filter((x) => x.subject_id === cf[0].id).length).toBe(2);
  });
  it('practice sets contain only published questions, no duplicates', () => {
    const pub = new Set(seed.questions.filter((q) => q.status === 'published').map((q) => q.id));
    for (const l of seed.practice_set_questions) expect(pub.has(l.question_id)).toBe(true);
    expect(new Set(seed.practice_set_questions.map((l) => l.set_id + l.question_id)).size).toBe(seed.practice_set_questions.length);
  });
  it('slugify', () => { expect(slugify('C++ Programming')).toBe('cpp-programming'); expect(slugify('Mass Communication & Journalism')).toBe('mass-communication-and-journalism'); expect(isSlug('a-b')).toBe(true); expect(isSlug('A b')).toBe(false); });
});
