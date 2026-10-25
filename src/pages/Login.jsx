import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useMeta } from '../lib/hooks.js';
import { LogoMark } from '../components/Logo.jsx';
import { IS_DEMO } from '../lib/config.js';

export default function Login() {
  useMeta('Sign in', 'Sign in to StudyVeda to save your results and bookmarks.', { noindex: true });
  const auth = useAuth();
  const nav = useNavigate();
  const from = useLocation().state?.from || '/progress';
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  if (auth.user && mode !== 'done') return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setMsg(null);
    try {
      if (mode === 'signin') { await auth.signIn(email.trim(), password); nav(from, { replace: true }); }
      else if (mode === 'signup') {
        const r = await auth.signUp(email.trim(), password);
        setMsg({ ok: true, text: r?.session ? 'Account created. You are signed in.' : 'Account created. Check your email for a confirmation link, then sign in.' });
        setMode('signin');
      } else { await auth.resetPassword(email.trim()); setMsg({ ok: true, text: 'If that email has an account, a reset link is on its way.' }); }
    } catch (err) { setMsg({ ok: false, text: err.message }); }
    setBusy(false);
  };

  return (
    <div className="container section auth-wrap">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <LogoMark size={44} />
        <h1>{mode === 'signup' ? 'Create your account' : mode === 'reset' ? 'Reset password' : 'Sign in to StudyVeda'}</h1>
        <p className="muted small">Save your results, track progress and bookmark questions. Administrators sign in here too.</p>
        {IS_DEMO && <div className="notice">Accounts are switched off in demo mode because no database is connected. Practice still works and results save on this device.</div>}
        <label className="field"><span>Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={IS_DEMO} /></label>
        {mode !== 'reset' && (
          <label className="field"><span>Password</span>
            <input className="input" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={IS_DEMO} />
            {mode === 'signup' && <small className="muted">At least 8 characters.</small>}</label>
        )}
        {msg && <div className={msg.ok ? 'notice ok' : 'notice err'} role="alert">{msg.text}</div>}
        <button className="btn btn-primary btn-block" disabled={busy || IS_DEMO || !email || (mode !== 'reset' && password.length < (mode === 'signup' ? 8 : 1))}>
          {busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}
        </button>
        <div className="auth-links small">
          {mode !== 'signin' && <button type="button" className="linkish" onClick={() => setMode('signin')}>Back to sign in</button>}
          {mode === 'signin' && <><button type="button" className="linkish" onClick={() => setMode('signup')}>Create an account</button><button type="button" className="linkish" onClick={() => setMode('reset')}>Forgot password?</button></>}
        </div>
        <p className="small muted">New accounts are student accounts. Administrator access can only be granted from the database. <Link to="/">Back to home</Link></p>
      </form>
    </div>
  );
}
