import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdfItemsToCells, recordsFromCells } from '../../src/lib/docImport.js';

async function pagesOf(path) {
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(path)), verbosity: 0 }).promise;
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const { items } = await (await pdf.getPage(p)).getTextContent();
    pages.push(items.filter((i) => i.transform).map((i) => ({ x: i.transform[4], y: i.transform[5], str: i.str })));
  }
  return pages;
}

describe('table-layout PDF (Question / Option / Solution rows)', () => {
  it('reads every question of the weekly test export', async () => {
    const cells = pdfItemsToCells(await pagesOf('tests/fixtures/manzil-table.pdf'));
    const { records } = recordsFromCells(cells);
    expect(records).toHaveLength(20);
    for (const r of records) {
      expect(r.question.length).toBeGreaterThan(5);
      expect(['A', 'B', 'C', 'D']).toContain(r.correct_option);
      ['option_a', 'option_b', 'option_c', 'option_d'].forEach((k) => expect(r[k]).not.toBe(''));
    }
    expect(records[0]).toMatchObject({ question: 'The theme of World Environmental Health Day 2026 is:', option_b: 'Environmental Health: Standing with Science to Protect Communities', correct_option: 'B' });
    expect(records[1].question).toBe('With reference to PRAMAAN, consider the following statements:\n1. It is applicable only to recorded forest areas.\n2. It operates under the Indian Forest and Wood Certification Scheme (IFWCS).\nWhich of the statement/s given above is/are incorrect?');
    expect(records[19].question.split('\n').pop()).toBe('Which of the statements given above is/are correct?');
    expect(records[19]).toMatchObject({ option_a: '1 and 2 only', option_d: '1,2 and 3', correct_option: 'D' });
    expect(records[18].question.endsWith('signifies:')).toBe(true);
    expect(records.map((r) => r.correct_option).join('')).toBe('BADCABCCCCAABCAABCBD');
    expect(records[2].question).toBe('Which Rabi crop received the highest absolute increase in MSP for Marketing Season 2027–28?');
  });
});
