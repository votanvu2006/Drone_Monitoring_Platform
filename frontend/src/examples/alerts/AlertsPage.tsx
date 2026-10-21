import type { ExampleProps } from '../../app/examples';
import { alerts } from '../../data/fixtures';
import { Icon } from '../../components/Icon';
import { PageHeading, Panel, StatusBadge } from '../../components/ui';
import './alerts.css';

type AlertExample = typeof alerts[number];
function Severity({ alert }: { alert: AlertExample }) {
  return <StatusBadge tone={alert.severity === 'CRITICAL' ? 'danger' : 'warning'}>{alert.severity}</StatusBadge>;
}
function AlertStatus({ alert }: { alert: AlertExample }) {
  return <StatusBadge tone={alert.status === 'RESOLVED' ? 'success' : 'info'}>{alert.status}</StatusBadge>;
}
export function AlertsPage({ state }: ExampleProps) {
  const detail = state === 'detail-active' || state === 'detail-resolved';
  const selected = state === 'detail-resolved' ? alerts[2] : alerts[0];
  return <>
    <PageHeading eyebrow="OPERATIONS / ALERTS" title={detail ? 'Alert details' : 'Alerts'}
      description={detail ? 'The incident, its operational context, and its resolution record.' : 'Keep operational incidents and their resolution in clear view.'}
      accessory={<StatusBadge tone="warning">{alerts.filter((alert) => alert.status === 'ACTIVE').length} open alerts</StatusBadge>} />
    {detail ? <AlertDetail alert={selected} /> : <AlertList />}
  </>;
}
function AlertList() {
  return <>
    <div className="alert-counts"><span><strong>{alerts.length}</strong> Total alerts</span>
      <span><strong>{alerts.filter((alert) => alert.status === 'ACTIVE').length}</strong> Active</span>
      <span><strong>{alerts.filter((alert) => alert.status === 'RESOLVED').length}</strong> Resolved</span></div>
    <div className="alert-filters" aria-label="Alert search and filters">
      <div className="field-label"><label htmlFor="alert-search">Search alerts</label>
        <input id="alert-search" className="text-field" type="search" value="" placeholder="Search by title or source" readOnly /></div>
      <div className="field-label"><label htmlFor="severity-filter">Severity</label>
        <select id="severity-filter" className="text-field" defaultValue="all" disabled>
          <option value="all">All severities</option><option>CRITICAL</option><option>WARNING</option>
        </select></div>
      <div className="field-label"><label htmlFor="status-filter">Status</label>
        <select id="status-filter" className="text-field" defaultValue="all" disabled>
          <option value="all">All statuses</option><option>ACTIVE</option><option>RESOLVED</option>
        </select></div>
    </div>
    <Panel title="All alerts" eyebrow="INCIDENT REGISTER" accessory={<span className="alert-register-count">{alerts.length} records</span>}>
      <div className="alert-column-labels" aria-hidden="true"><span>Incident</span><span>Severity</span><span>Status</span><span>Source</span><span>Detected</span></div>
      <ul className="alert-records" aria-label="Alert records">
        {alerts.map((alert) => <li key={alert.id}><article className="alert-record" aria-label={alert.title}>
          <div className="alert-record-main"><span className={'alert-record-icon tone-' + (alert.severity === 'CRITICAL' ? 'danger' : 'warning')}>
            <Icon name="alert" size={18} /></span><div><span className="eyebrow">{alert.id}</span>
              <h3>{alert.title}</h3><p>{alert.summary}</p></div></div>
          <div className="alert-cell"><span className="alert-cell-label">Severity</span><Severity alert={alert} /></div>
          <div className="alert-cell"><span className="alert-cell-label">Status</span><AlertStatus alert={alert} /></div>
          <div className="alert-cell"><span className="alert-cell-label">Source</span><span>{alert.source}</span></div>
          <div className="alert-cell alert-time"><span className="alert-cell-label">Detected</span><time>{alert.time} ICT</time></div>
        </article></li>)}
      </ul>
    </Panel>
  </>;
}
export function AlertDetail({ alert }: { alert: AlertExample }) {
  return <div className="alert-detail-grid">
    <div className="alert-detail-story">
      <Panel title="Alert summary" eyebrow={alert.id}>
        <div className="alert-detail-title"><span className={'alert-detail-icon tone-' + (alert.severity === 'CRITICAL' ? 'danger' : 'warning')}>
          <Icon name="alert" size={27} /></span><h3>{alert.title}</h3></div>
        <div className="alert-detail-badges"><Severity alert={alert} /><AlertStatus alert={alert} /></div>
        <p className="alert-summary-text">{alert.summary}</p>
        <div className="alert-context-note"><Icon name="mission" size={17} />
          <span>Related mission <strong>{alert.missionId}</strong>{alert.flightId && <> · Flight <strong>{alert.flightId}</strong></>}</span></div>
      </Panel>
      <Panel title="Resolution note" eyebrow="INCIDENT FOLLOW-UP">
        <div className={'resolution-note' + (alert.resolutionNote ? ' is-resolved' : '')}>
          <Icon name={alert.resolutionNote ? 'check' : 'history'} size={20} />
          <p>{alert.resolutionNote ?? 'No resolution note has been recorded.'}</p>
        </div>
      </Panel>
    </div>
    <Panel title="Incident information" eyebrow="RECORD DETAILS">
      <dl className="alert-metadata">
        <div><dt>Alert ID</dt><dd>{alert.id}</dd></div>
        <div><dt>Severity</dt><dd>{alert.severity}</dd></div>
        <div><dt>Status</dt><dd>{alert.status}</dd></div>
        <div><dt>Source</dt><dd>{alert.source}</dd></div>
        <div><dt>Detected time</dt><dd>{alert.time} ICT</dd></div>
        <div><dt>Mission</dt><dd>{alert.missionId}</dd></div>
        <div><dt>Flight</dt><dd>{alert.flightId ?? 'Not associated with a flight'}</dd></div>
      </dl>
    </Panel>
  </div>;
}
