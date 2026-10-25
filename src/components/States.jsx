import { Link } from 'react-router-dom';
import { AlertTriangle, Inbox } from 'lucide-react';

export const Loading = ({ label = 'Loading…' }) => (
  <div className="state" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" />{label}</div>
);

export const ErrorState = ({ error, onRetry }) => (
  <div className="state state-error" role="alert">
    <AlertTriangle size={28} aria-hidden="true" />
    <h3>Something went wrong</h3>
    <p>{error?.message || 'Could not load this content.'}</p>
    {onRetry && <button className="btn btn-outline" onClick={onRetry}>Try again</button>}
  </div>
);

export const Empty = ({ title, children, action }) => (
  <div className="state state-empty">
    <Inbox size={30} aria-hidden="true" />
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

export const NotFoundBlock = ({ what = 'page' }) => (
  <div className="container section">
    <Empty title={`This ${what} doesn't exist`} action={<Link className="btn btn-primary" to="/subjects">Browse subjects</Link>}>
      It may have been moved, renamed or unpublished.
    </Empty>
  </div>
);
