import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
export function StatusBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={'status-badge tone-' + tone}><span className="badge-dot" />{children}</span>;
}
export function Panel({ title, eyebrow, accessory, children, className = '' }: {
  title: string; eyebrow?: string; accessory?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={'panel ' + className} aria-label={title}>
    <div className="panel-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2></div>{accessory}</div><div className="panel-body">{children}</div>
  </section>;
}
export function PageHeading({ eyebrow, title, description, accessory }: {
  eyebrow: string; title: string; description: string; accessory?: ReactNode;
}) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span>
    <h1>{title}</h1><p>{description}</p></div>{accessory}</div>;
}
export function MetricCard({ label, value, detail, icon, tone = 'success' }: {
  label: string; value: string | number; detail: string; icon: IconName; tone?: Tone;
}) {
  return <section className="metric-card" aria-label={label}><div className="metric-label">
    <span>{label}</span><span className={'metric-icon tone-' + tone}><Icon name={icon} /></span>
  </div><strong className="metric-value">{value}</strong><p>{detail}</p></section>;
}
export function StaticButton({ children, secondary = false }: { children: ReactNode; secondary?: boolean }) {
  return <button type="button" aria-disabled="true" className={'button' + (secondary ? ' secondary' : '')}>
    {children}</button>;
}
