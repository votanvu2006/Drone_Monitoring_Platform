import type { ReactNode } from 'react';
import { preflightContext } from './preflight.data';
import { PageHeading, StatusBadge } from '../../components/ui';
import { Icon } from '../../components/Icon';
import { AirspacePanel } from '../../features/airspace/AirspacePanel';

const steps = ['Mission information', 'Drone selection', 'Route and waypoints', 'Preflight review'];

export function PreflightReviewExample({ weather }: { weather?: ReactNode }) {
  return <main className="page-content"><section aria-label="Mission Wizard preflight step">
    <PageHeading eyebrow="MISSIONS / CREATE MISSION" title="Preflight review"
      description="Review the planned route and its preflight status before the next flight."
      accessory={<StatusBadge tone="info">Step 4 of 4</StatusBadge>} />
    <ol className="preflight-steps" aria-label="Mission creation steps">
      {steps.map((step, index) => <li key={step} className={index === 3 ? 'is-current' : 'is-complete'}
        aria-current={index === 3 ? 'step' : undefined}>
        <span className="preflight-step-number">{index < 3 ? <Icon name="check" size={15} /> : 4}</span>
        <span>{step}</span>
      </li>)}
    </ol>
    <div className="context-strip">
      <div><small>Mission</small><strong>{preflightContext.missionName}</strong></div>
      <div><small>Aircraft</small><strong>{preflightContext.droneName}</strong></div>
      <div><small>Planned route</small><strong>Departure → Midpoint → Destination</strong></div>
      <StatusBadge tone="neutral">Aircraft {preflightContext.droneStatus}</StatusBadge>
    </div>
    <div className={'preflight-grid' + (weather ? ' has-weather' : '')} aria-label="Preflight checks">
      <AirspacePanel />
      {weather && <div className="preflight-weather-slot" data-preflight-slot="weather">{weather}</div>}
    </div>
  </section></main>;
}
