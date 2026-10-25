import { Icon } from '../../components/Icon';
import { MetricCard, PageHeading, Panel, StatusBadge } from '../../components/ui';
import { overviewSnapshot } from './overview.data';
import type { OverviewSnapshot } from './overview.data';
import './overview.css';

export function OverviewPage({ snapshot = overviewSnapshot }: { snapshot?: OverviewSnapshot }) {
  const flight = snapshot.activeFlight;
  return <>
    <PageHeading title="Operations overview"
      description="Fleet readiness, mission activity, and the events that need your attention."
      accessory={<StatusBadge tone="neutral">{snapshot.flights.detail}</StatusBadge>} />
    <div className="metric-grid">
      <MetricCard label="Fleet status" value={snapshot.fleet.total} icon="drone" detail={snapshot.fleet.detail} />
      <MetricCard label="Mission status" value={snapshot.missions.total} icon="mission" tone="info" detail={snapshot.missions.detail} />
      <MetricCard label="Active flights" value={snapshot.flights.total} icon="flight" detail={snapshot.flights.detail} />
      <MetricCard label="Open alerts" value={snapshot.alerts.total} icon="alert" tone="warning" detail={snapshot.alertDetail} />
    </div>
    <div className="overview-lower-grid">
      <Panel title="Active flight" eyebrow="FLIGHT SNAPSHOT">
        {flight ? <div className="overview-flight-intro"><Icon name="flight" size={36} />
          <div><StatusBadge tone="info">{flight.status}</StatusBadge><h3>{flight.code}</h3>
            <p>{flight.missionName} · {flight.droneName}</p></div></div>
          : <div className="overview-empty"><Icon name="flight" size={36} /><h3>No active flights</h3>
            <p>There are no flights in progress in this data snapshot.</p></div>}
      </Panel>
      <Panel title="Recent activity" eyebrow="OPERATIONS TIMELINE">
        <ol className="activity-list">
          {snapshot.recentActivity.map(activity => <li key={activity.id}>
            <span className="activity-icon"><Icon name="history" size={17} /></span>
            <div><strong>{activity.title}</strong><p>{activity.detail}</p><time dateTime={activity.isoTime}>{activity.time}</time></div>
          </li>)}
        </ol>
        {snapshot.recentActivity.length === 0 && <p>No recent activity.</p>}
      </Panel>
    </div>
  </>;
}
