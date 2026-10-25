import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { admin } from '../lib/api.js';
import { useAsync, useToast } from '../lib/hooks.js';
import { parseQuestionCSV, SAMPLE_CSV, CSV_COLUMNS, REQUIRED_COLUMNS, downloadText } from '../lib/csv.js';
import { AdminHead } from './common.jsx';
import { Loading, ErrorState } from '../components/States.jsx';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ImportCSV() {
  const toast = useToast();
  const { data: L, loading, error, reload } = useAsync(async () => {
    const [l, qs] = await Promise.all([admin.lookups(), admin.select('questions')]);
    return { ...l, existing: qs.map((q) => ({ subject_id: q.subject_id, question: q.question })) };
  }, []);
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [view, setView] = useState('all');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [summary, setSummary] = useState(null);
  const inputRef = useRef();

  const onFile = async (f) => {
    setSummary(null); setParsed(null); setFile(f || null);
    if (!f) return;
    if (!/\.csv$/i.test(f.name) && f.type !== 'text/csv') { setParsed({ rows: [], fileErrors: ['Please choose a .csv file.'] }); return; }
    if (f.size > MAX_BYTES) { setParsed({ rows: [], fileErrors: ['File is larger than 5 MB. Split it into smaller files.'] }); return; }
    const text = await f.text();
    setParsed(parseQuestionCSV(text, L));
  };

  const valid = parsed?.rows.filter((r) => r.state === 'valid') || [];
  const invalid = parsed?.rows.filter((r) => r.state === 'invalid') || [];
  const dups = parsed?.rows.filter((r) => r.state === 'duplicate') || [];
  const shown = parsed?.rows.filter((r) => view === 'all' || r.state === view) || [];

  const run = async () => {
    if (busy || !valid.length) return;
    setBusy(true); setProgress([0, valid.length]);
    try {
      const r = await admin.importQuestions(valid, (d, t) => setProgress([d, t]));
      setSummary({ created: r.created.length, failed: [...invalid.map((x) => ({ rowNumber: x.rowNumber, error: x.errors.join(' ') })), ...r.failed], skipped: dups.map((x) => ({ rowNumber: x.rowNumber, error: x.errors.join(' ') })) });
      toast(`Imported ${r.created.length} question${r.created.length === 1 ? '' : 's'}.`);
      setParsed(null); setFile(null); if (inputRef.current) inputRef.current.value = '';
      reload();
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false); setProgress(null);
  };

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <AdminHead title="Bulk import" sub="Add many questions at once from a CSV file. Nothing is saved until you confirm.">
        <button className="btn btn-outline" onClick={() => downloadText('studyveda-sample.csv', SAMPLE_CSV)}><Download size={17} /> Sample CSV</button>
      </AdminHead>

      <section className="card">
        <h2>1. Prepare your file</h2>
        <p className="small">Required columns: <code>{REQUIRED_COLUMNS.join(', ')}</code>. Optional: <code>{CSV_COLUMNS.filter((c) => !REQUIRED_COLUMNS.includes(c)).join(', ')}</code>.</p>
        <ul className="small muted bullets">
          <li><code>subject</code>, <code>topic</code> and <code>exam</code> accept a slug (e.g. <code>aptitude</code>) or the exact name. Topics must already exist under that subject.</li>
          <li><code>correct_option</code> is A, B, C or D. <code>difficulty</code> is easy, medium or hard (default medium). <code>status</code> is draft or published (default draft).</li>
          <li>Separate multiple <code>tags</code> with semicolons. Save the file as UTF-8 CSV so ₹, × and other symbols survive.</li>
        </ul>
      </section>

      <section className="card">
        <h2>2. Upload and check</h2>
        <label className="dropzone">
          <Upload size={22} aria-hidden="true" />
          <span>{file ? file.name : 'Choose a CSV file'}</span>
          <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files[0])} />
        </label>
        {parsed?.fileErrors.length > 0 && <div className="notice err" role="alert">{parsed.fileErrors.map((e, i) => <div key={i}>{e}</div>)}</div>}
        {parsed?.rows.length > 0 && (
          <>
            <div className="import-summary">
              <button className={view === 'all' ? 'on' : ''} onClick={() => setView('all')}>{parsed.rows.length} rows</button>
              <button className={'ok ' + (view === 'valid' ? 'on' : '')} onClick={() => setView('valid')}><CheckCircle2 size={16} /> {valid.length} ready</button>
              <button className={'bad ' + (view === 'invalid' ? 'on' : '')} onClick={() => setView('invalid')}><XCircle size={16} /> {invalid.length} with errors</button>
              <button className={'warn ' + (view === 'duplicate' ? 'on' : '')} onClick={() => setView('duplicate')}><MinusCircle size={16} /> {dups.length} duplicates</button>
            </div>
            <div className="table-wrap tall">
              <table className="table">
                <thead><tr><th>Row</th><th>Question</th><th>Subject / topic</th><th>Answer</th><th>Status</th><th>Check</th></tr></thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.rowNumber} className={'row-' + r.state}>
                      <td className="mono">{r.rowNumber}</td>
                      <td className="q-cell"><span className="clamp-2">{r.data.question || <em className="muted">empty</em>}</span></td>
                      <td className="small">{r.label.subject}{r.label.topic && <div className="muted">{r.label.topic}</div>}</td>
                      <td className="mono">{r.data.correct_option}</td>
                      <td className="small">{r.data.status}</td>
                      <td className="small">{r.state === 'valid' ? <span className="ok-text">Ready</span> : <span className={r.state === 'duplicate' ? 'warn-text' : 'err-text'}>{r.errors.join(' ')}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-actions">
              {progress && <span className="muted small">Importing {progress[0]} / {progress[1]}…</span>}
              <button className="btn btn-primary" disabled={busy || !valid.length} onClick={run}>{busy ? 'Importing…' : `Import ${valid.length} valid question${valid.length === 1 ? '' : 's'}`}</button>
            </div>
            {(invalid.length > 0 || dups.length > 0) && <p className="small muted">Rows with errors and duplicates will be skipped. Fix them in your file and upload again to add them.</p>}
          </>
        )}
      </section>

      {summary && (
        <section className="card" aria-live="polite">
          <h2>Import summary</h2>
          <div className="stat-row">
            <div className="stat ok"><strong>{summary.created}</strong><span>Created</span></div>
            <div className="stat"><strong>{summary.skipped.length}</strong><span>Skipped (duplicates)</span></div>
            <div className="stat bad"><strong>{summary.failed.length}</strong><span>Failed</span></div>
          </div>
          {[...summary.failed, ...summary.skipped].length > 0 && (
            <ul className="small bullets">{[...summary.failed, ...summary.skipped].sort((a, b) => a.rowNumber - b.rowNumber).map((f) => <li key={f.rowNumber}><strong>Row {f.rowNumber}:</strong> {f.error}</li>)}</ul>
          )}
          <Link className="btn btn-outline" to="/admin/questions">View questions</Link>
        </section>
      )}
    </>
  );
}
