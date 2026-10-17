import { activeFlight, alerts, drones, missions, recentActivity } from '../../data/fixtures';
import { Icon } from '../../components/Icon';
import { MetricCard, PageHeading, Panel, StatusBadge } from '../../components/ui';
import './overview.css';

export function OverviewPage() {
  const aircraft = drones.find((drone) => drone.id === activeFlight.droneId)!;
  const mission = missions.find((item) => item.id === activeFlight.missionId)!;
  const openAlerts = alerts.filter((alert) => alert.status === 'ACTIVE');
  const available = drones.filter((drone) => drone.status === 'AVAILABLE').length;
  return <>
    <PageHeading eyebrow="OPERATIONS / OVERVIEW" title="Operations overview"
      description="Fleet readiness, mission activity, and the events that need your attention."
      accessory={<StatusBadge tone="success">1 flight in progress</StatusBadge>} />
    <div className="overview-snapshot"><span>WORKSPACE SNAPSHOT</span><span>13 Oct 2026 · 14:24 ICT</span></div>
    <div className="metric-grid">
      <MetricCard label="Fleet status" value={drones.length} icon="drone"
        detail={available + ' available · 1 in flight · 1 offline'} />
      <MetricCard label="Mission status" value={missions.length} icon="mission" tone="info"
        detail="1 running · 1 ready · 1 draft" />
      <MetricCard label="Active flights" value={1} icon="flight" detail={aircraft.name + ' airborne'} />
      <MetricCard label="Open alerts" value={openAlerts.length} icon="alert" tone="warning"
        detail="1 critical · 1 warning" />
    </div>
    <div className="overview-lower-grid">
      <Panel title="Active flight" eyebrow="IN PROGRESS" accessory={<StatusBadge tone="success">{activeFlight.status}</StatusBadge>}>
        <div className="overview-flight-intro"><span className="overview-aircraft"><Icon name="drone" size={48} /></span>
          <div><span className="eyebrow">{activeFlight.id} · {aircraft.name}</span>
            <h3>{mission.name}</h3><p>Assigned mission {mission.id}</p></div></div>
        <dl className="overview-flight-stats">
          <div><dt>Elapsed time</dt><dd>{activeFlight.elapsed}</dd></div>
          <div><dt>Distance covered</dt><dd>{activeFlight.distance}</dd></div>
          <div><dt>Mission progress</dt><dd>{activeFlight.progress}%</dd></div>
        </dl>
        <div className="overview-progress" role="img" aria-label={'Mission progress: ' + activeFlight.progress + '%'}>
          <span style={{ width: activeFlight.progress + '%' }} />
        </div>
        <div className="overview-flight-footer"><span>Departure confirmed</span><span>Route in progress</span></div>
      </Panel>
      <Panel title="Recent activity" eyebrow="OPERATIONS TIMELINE">
        <ol className="activity-list">
          {recentActivity.map((activity) => <li key={activity.id}>
            <span className="activity-icon"><Icon name={activity.icon} size={17} /></span>
            <div><strong>{activity.title}</strong><p>{activity.detail}</p></div><time>{activity.time}</time>
          </li>)}
        </ol>
        <div className="overview-activity-footer"><Icon name="history" size={15} /> Latest workspace events</div>
      </Panel>
    </div>
  </>;
}
