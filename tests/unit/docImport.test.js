import { describe, it, expect } from 'vitest';
import { parseQuestionText, DOC_SAMPLE } from '../../src/lib/docImport.js';

const LI = '\u0001LI';
describe('parseQuestionText', () => {
  it('parses the documented sample', () => {
    const { records } = parseQuestionText(DOC_SAMPLE);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ option_a: '20%', option_b: '25%', option_d: '50%', correct_option: 'B' });
    expect(records[0].question).toMatch(/^The price of a book/);
    expect(records[0].explanation).toMatch(/25%/);
    expect(records[1]).toMatchObject({ option_a: 'class', correct_option: 'A', explanation: '' });
  });
  it('handles inline options, Q-labels, (b) answers, wrapped lines and answer text', () => {
    const t = `Q1. What is 2+2
in decimal?
(a) 3 (b) 4 (c) 5 (d) 6
Ans: (b)
Q.2) Capital of India?
A. Mumbai
B. New Delhi
C. Kolkata
D. Chennai
Correct Answer: New Delhi
Solution: Delhi is the capital.
It is also a UT.
Question 3: 2.5 kg plus 2.5 kg is?
A) 4 kg B) 5 kg C) 6 kg D) 7 kg
Answer - Option C`;
    const { records } = parseQuestionText(t);
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ question: 'What is 2+2 in decimal?', option_b: '4', option_d: '6', correct_option: 'B' });
    expect(records[1]).toMatchObject({ option_b: 'New Delhi', correct_option: 'B', explanation: 'Delhi is the capital. It is also a UT.' });
    expect(records[2]).toMatchObject({ question: '2.5 kg plus 2.5 kg is?', option_b: '5 kg', correct_option: 'C' });
  });
  it('a question starting with "Correct" is not taken as an answer', () => {
    const t = `1. Pick one
A) x
B) y
C) z
D) w
Answer: A
2. Correct the sentence: he go
A) he goes
B) he going
C) he gone
D) he went go
Answer: A`;
    const { records } = parseQuestionText(t);
    expect(records).toHaveLength(2);
    expect(records[1].question).toBe('Correct the sentence: he go');
  });
  it('understands Word auto-numbered lists', () => {
    const t = [`${LI}0|What is H2O?`, `${LI}1|Water`, `${LI}1|Salt`, `${LI}1|Sugar`, `${LI}1|Air`, 'Answer: A',
      `${LI}0|Largest planet?`, `${LI}0|Earth`, `${LI}0|Jupiter`, `${LI}0|Mars`, `${LI}0|Venus`, 'Answer: B'].join('\n');
    const { records } = parseQuestionText(t);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({ question: 'What is H2O?', option_a: 'Water', option_d: 'Air', correct_option: 'A' });
    expect(records[1]).toMatchObject({ question: 'Largest planet?', option_b: 'Jupiter', correct_option: 'B' });
  });
  it('reports missing answers as empty correct_option (caught later by validation)', () => {
    const { records, warnings } = parseQuestionText('1. Q?\nA) a\nB) b\nC) c\nD) d');
    expect(records[0].correct_option).toBe('');
    expect(parseQuestionText('hello').records).toHaveLength(1);
    expect(parseQuestionText('').warnings.length).toBe(1);
    expect(warnings).toHaveLength(0);
  });
});

describe('statement-type questions', () => {
  it('keeps numbered statements inside the question', () => {
    const t = `1. Consider the following statements about the Forest Rights Act:
1. It recognises rights of forest dwellers.
2. It is applicable only to recorded forest areas.
Which of the statements given above is/are correct?
(a) 1 only
(b) 2 only
(c) Both 1 and 2
(d) Neither 1 nor 2
Answer: (a)
Explanation: Points:
1. Statement 1 is correct, statement 2 is wrong.
2. With reference to rivers, consider:
1. Ganga flows east.
2. Narmada flows west.
Which is correct?
(a) 1 only (b) 2 only (c) Both 1 and 2 (d) Neither 1 nor 2
Answer: c`;
    const { records } = parseQuestionText(t);
    expect(records).toHaveLength(2);
    expect(records[0].question).toBe('Consider the following statements about the Forest Rights Act:\n1. It recognises rights of forest dwellers.\n2. It is applicable only to recorded forest areas.\nWhich of the statements given above is/are correct?');
    expect(records[0]).toMatchObject({ option_c: 'Both 1 and 2', correct_option: 'A' });
    expect(records[0].explanation).toContain('statement 2 is wrong.');
    expect(records[1]).toMatchObject({ option_d: 'Neither 1 nor 2', correct_option: 'C' });
    expect(records[1].question).toContain('\n2. Narmada flows west.');
  });
  it('Q-labelled questions with numbered statements', () => {
    const t = `Q1. Consider:\n1. A\n2. B\nWhich?\nA) 1 only\nB) 2 only\nC) Both\nD) None\nAns: C\nQ2. Next one?\nA) w\nB) x\nC) y\nD) z\nAns: D`;
    const { records } = parseQuestionText(t);
    expect(records).toHaveLength(2);
    expect(records[0].question).toBe('Consider:\n1. A\n2. B\nWhich?');
  });
});
