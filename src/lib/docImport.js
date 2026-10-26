// Word (.docx) and PDF question import.
// Files are read entirely in the browser; nothing is uploaded anywhere until the admin confirms the import.
import { normText, OPTIONS, optKey } from './text.js';

export const DOC_SAMPLE = `1. The price of a book rises from ₹200 to ₹250. What is the percentage increase?
A) 20%
B) 25%
C) 30%
D) 50%
Answer: B
Explanation: Increase = 50. 50 ÷ 200 × 100 = 25%.

2. Which Python keyword is used to create a class?
A) class
B) def
C) object
D) struct
Answer: A`;

// A list item coming from Word's automatic numbering. depth 0 = top level.
const LI = '\u0001LI';

const RE = {
  qStart: /^(?:Q(?:uestion)?\s*\.?\s*|प्रश्न\s*)?(\d{1,4})\s*[.):\-–](?!\d)\s*(.*)$/i,
  qLabelOnly: /^Q(?:uestion)?\s*\.?\s*(\d{1,4})\s*[.):\-–]?\s*(.*)$/i,
  answer: /^(?:ans(?:wer)?|correct\s+(?:answer|option)|right\s+answer|उत्तर|सही\s*उत्तर)\s*(?:is\s*)?(?:[:.\-–=]\s*(.+)|\s*\(?([A-Da-d])\)?\.?)$/i,
  explanation: /^(?:explanation|solution|exp|reason|व्याख्या|हल)\s*[:.\-–]\s*(.*)$/i,
  optStart: /^\(?([A-Da-d])\s*[).:]\s*(.*)$/,
};

// Split "A) 20% B) 25% C) 30% D) 50%" (all on one line) into [['A','20%'], ...]
function splitOptions(line) {
  const first = line.match(RE.optStart);
  if (!first) return null;
  const upper = first[1] === first[1].toUpperCase();
  const re = upper ? /(?:^|\s)\(?([A-D])\s*[).:]\s*/g : /(?:^|\s)\(?([a-d])\s*[).:]\s*/g;
  const marks = [];
  let m;
  while ((m = re.exec(line))) marks.push({ L: m[1].toUpperCase(), at: m.index, end: re.lastIndex });
  // keep only markers that run A, B, C, D in order from the first one
  const seq = [];
  for (const mk of marks) { const want = OPTIONS[OPTIONS.indexOf(marks[0].L) + seq.length]; if (mk.L === want) seq.push(mk); }
  return seq.map((mk, i) => [mk.L, line.slice(mk.end, i + 1 < seq.length ? seq[i + 1].at : undefined).trim()]);
}

function parseAnswer(rest) {
  const s = rest.trim().replace(/^option\s*/i, '');
  const m = s.match(/^\(?([A-Da-d])\)?(?=$|[\s.):\]-])/);
  return m ? { letter: m[1].toUpperCase() } : { text: s };
}

/**
 * Turn plain text into question records. Returns { records, warnings }.
 * Each record: { rowNumber, question, option_a..d, correct_option, explanation }.
 */
export function parseQuestionText(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\u00a0/g, ' ').trim()).filter(Boolean);
  const qs = [];
  let cur = null;
  let field = null;
  let lastOpt = null;

  const start = (num, txt) => {
    cur = { num, question: txt || '', options: {}, answer: null, explanation: '' };
    qs.push(cur); field = 'question'; lastOpt = null;
  };
  const optCount = () => (cur ? Object.keys(cur.options).length : 0);
  const append = (txt) => {
    if (field === 'question') cur.question = (cur.question + ' ' + txt).trim();
    else if (field === 'option' && lastOpt) cur.options[lastOpt] = (cur.options[lastOpt] + ' ' + txt).trim();
    else if (field === 'explanation') cur.explanation = (cur.explanation + ' ' + txt).trim();
  };
  const setOption = (L, txt) => { cur.options[L] = txt; lastOpt = L; field = 'option'; };

  for (let raw of lines) {
    let li = null;
    if (raw.startsWith(LI)) { const m = raw.match(/^\u0001LI(\d+)\|(.*)$/); li = { depth: +m[1] }; raw = m[2].trim(); if (!raw) continue; }
    let m;

    if ((m = raw.match(RE.explanation)) && cur) { cur.explanation = m[1]; field = 'explanation'; continue; }
    if (cur && !cur.answer && optCount() >= 2 && (m = raw.match(RE.answer))) { cur.answer = parseAnswer(m[1] || m[2]); field = 'answer'; continue; }
    if ((m = raw.match(RE.qStart)) || (m = raw.match(RE.qLabelOnly))) {
      // "1. ..." inside an explanation that hasn't reached a new question is still a new question: numbering wins.
      start(+m[1], m[2]); continue;
    }
    if (cur && !cur.answer && (m = raw.match(RE.optStart))) {
      const parts = splitOptions(raw);
      if (parts && parts.length) { parts.forEach(([L, t]) => setOption(L, t)); continue; }
    }
    if (li) {
      // Word auto-numbered list item without typed numbers/letters.
      if (cur && !cur.answer && field !== 'explanation' && (li.depth > 0 || (cur.question && optCount() < 4))) {
        setOption(OPTIONS[optCount()] || 'D', raw); continue;
      }
      start(qs.length + 1, raw); continue;
    }
    if (!cur || (cur.answer && field !== 'explanation')) { start(qs.length + 1, raw); continue; }
    append(raw);
  }

  const warnings = [];
  const records = qs.map((q, i) => {
    let correct = q.answer?.letter || '';
    if (!correct && q.answer?.text) {
      const hit = OPTIONS.find((L) => q.options[L] && normText(q.options[L]) === normText(q.answer.text));
      correct = hit || q.answer.text;
    }
    const r = { rowNumber: i + 1, question: q.question, correct_option: correct, explanation: q.explanation };
    OPTIONS.forEach((L) => { r[optKey(L)] = q.options[L] || ''; });
    return r;
  });
  if (!records.length) warnings.push('No questions were found. Check that each question follows the format shown above.');
  return { records, warnings };
}

// ---------- text extraction ----------

async function docxToText(buf) {
  const mammoth = (await import('mammoth/mammoth.browser.js')).default;
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const out = [];
  const textOf = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const walk = (el, depth) => {
    for (const node of el.children) {
      const tag = node.tagName.toLowerCase();
      if (tag === 'ol' || tag === 'ul') walk(node, depth + 1);
      else if (tag === 'li') {
        const own = [...node.childNodes].filter((c) => !(c.nodeType === 1 && /^(ol|ul)$/i.test(c.tagName)));
        const t = own.map((c) => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
        // typed numbering inside a list item ("1. ...") is parsed normally; otherwise mark it as an auto-numbered item
        out.push(LI + Math.max(0, depth - 1) + '|' + t);
        [...node.children].filter((c) => /^(ol|ul)$/i.test(c.tagName)).forEach((c) => walk(c, depth + 1));
      } else if (tag === 'table') {
        node.querySelectorAll('tr').forEach((tr) => out.push([...tr.children].map(textOf).filter(Boolean).join(' ')));
      } else {
        // <br> inside a paragraph = a line break the author typed with Shift+Enter
        const parts = node.innerHTML.split(/<br\s*\/?>/i).map((h) => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); });
        out.push(...parts);
      }
    }
  };
  walk(doc.body.firstChild, 0);
  return out.join('\n');
}

async function pdfToText(buf) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerUrl = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise;
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent();
    let line = '', lastY = null;
    for (const it of items) {
      const y = it.transform ? Math.round(it.transform[5]) : lastY;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && line.trim()) { lines.push(line.trim()); line = ''; }
      line += it.str;
      lastY = y;
      if (it.hasEOL) { if (line.trim()) lines.push(line.trim()); line = ''; }
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join('\n').replace(/ {2,}/g, ' ');
}

export const DOC_MAX_BYTES = 10 * 1024 * 1024;
export const fileKind = (f) => (/\.csv$/i.test(f.name) || f.type === 'text/csv' ? 'csv'
  : /\.docx$/i.test(f.name) ? 'docx'
  : /\.pdf$/i.test(f.name) || f.type === 'application/pdf' ? 'pdf'
  : /\.doc$/i.test(f.name) ? 'doc' : null);

export async function extractText(file) {
  const buf = await file.arrayBuffer();
  const kind = fileKind(file);
  if (kind === 'docx') return docxToText(buf);
  if (kind === 'pdf') return pdfToText(buf);
  throw new Error('Unsupported file type.');
}
