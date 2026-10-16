import type { ReactNode } from 'react';
import { AlertTriangle, LoaderCircle, RefreshCw } from 'lucide-react';
import { titleCase } from '../lib/format';

export function PageHeading({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description?: string; action?: ReactNode;
}) {
  return <div className="page-heading">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
    {action && <div className="heading-action">{action}</div>}
  </div>;
}

export function StatusBadge({ value }: { value: string }) {
  const tone = /ACTIVE|FLYING|IN_FLIGHT|AVAILABLE|VALID|SAFE|SUCCESS|RETURNED_SAFELY|LANDED|COMPLETED|CONNECTED|RESOLVED/.test(value)
    ? 'good'
    : /CAUTION|WARNING|READY|PAUSED|DEGRADED|RETURNING|DRAFT|NOT_CHECKED/.test(value)
      ? 'warn'
      : /CRITICAL|UNSAFE|FAILED|ABORTED|OFFLINE|MAINTENANCE|INVALID|LOST/.test(value) ? 'bad' : 'neutral';
  return <span className={`status-badge ${tone}`}><i />{titleCase(value)}</span>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><AlertTriangle size={19} /></div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function LoadingState({ label = 'Loading live data' }: { label?: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={18} />{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="error-state"><AlertTriangle size={18} /><span>{message}</span>{onRetry && <button className="icon-button" onClick={onRetry} aria-label="Retry"><RefreshCw size={15} /></button>}</div>;
}

export function MetricCard({ label, value, unit, icon, detail, tone }: {
  label: string; value: string | number; unit?: string; icon: ReactNode; detail?: string; tone?: string;
}) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone || ''}`}>{icon}</span></div><div className="metric-value">{value}<small>{unit}</small></div>{detail && <div className="metric-detail">{detail}</div>}</article>;
}

export function Panel({ title, eyebrow, action, children, className = '' }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={`panel ${className}`}><div className="panel-heading"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</div>{children}</section>;
}

export function Pagination({ page, pageSize, total, onPage }: {
  page: number; pageSize: number; total: number; onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pagination"><span>{total === 0 ? 'No records' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}</span><div><button className="button secondary small" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span className="page-number">{page} / {pages}</span><button className="button secondary small" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div></div>;
}
