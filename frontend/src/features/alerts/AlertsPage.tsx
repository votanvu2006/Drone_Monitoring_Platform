import { useState, type ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { PageHeading, Panel, StatusBadge } from '../../components/ui';
import { alertCounts, alerts, alertsByCode, defaultAlertCode } from './alerts.data';
import type { AlertViewModel } from './alerts.data';
import './alerts.css';

function Severity({ alert }: { alert: AlertViewModel }) {
  return <StatusBadge tone={alert.severity === 'CRITICAL' ? 'danger' : 'warning'}>{alert.severity}</StatusBadge>;
}
function AlertTime({ alert }: { alert: AlertViewModel }) {
  return <time dateTime={alert.detectedTime.iso}>{alert.detectedTime.text}</time>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

export function AlertsPage({ view = 'list', alertCode = defaultAlertCode }: { view?: 'list' | 'detail'; alertCode?: string }) {
  const detail = view === 'detail';
  const selected = alertsByCode.get(alertCode);
  return <>
    <PageHeading title={detail ? 'Alert details' : 'Alerts'}
      description={detail ? 'Incident information and its resolution note.' : 'Operational alerts, ordered by severity and detection time.'}
      accessory={<StatusBadge tone="danger">{alertCounts.critical} critical alert</StatusBadge>} />
    {detail
      ? selected ? <AlertDetail alert={selected} />
        : <Panel title="Alert not found"><p>No alert matches {alertCode}.</p></Panel>
      : <AlertList />}
  </>;
}

export function AlertList() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('all');
  const query = search.trim().toLowerCase();
  const visibleAlerts = alerts.filter(alert =>
    (severity === 'all' || alert.severity === severity)
    && [alert.alertCode, alert.title, alert.droneCode, alert.missionCode, alert.problemDescription]
      .some(value => value.toLowerCase().includes(query)),
  );
  return <>
    <dl className="alert-counts" aria-label="Alert totals">
      <div><dt>Total alerts</dt><dd>{alertCounts.total}</dd></div>
      <div><dt>Critical</dt><dd>{alertCounts.critical}</dd></div>
      <div><dt>Warning</dt><dd>{alertCounts.warning}</dd></div>
    </dl>
    <div className="alert-filters" aria-label="Alert search and filters">
      <div className="field-label"><label htmlFor="alert-search">Search alerts</label>
        <input id="alert-search" className="text-field" type="search" value={search}
          onChange={event => setSearch(event.target.value)} placeholder="Search by code, title, drone, mission or description" /></div>
      <div className="field-label"><label htmlFor="severity-filter">Severity</label>
        <select id="severity-filter" className="text-field" value={severity} onChange={event => setSeverity(event.target.value)}>
          <option value="all">All severities</option><option>CRITICAL</option><option>WARNING</option>
        </select></div>
    </div>
    <Panel title="Alert register" className="alert-register" accessory={<span className="alert-record-count" role="status">{visibleAlerts.length} records</span>}>
      <div className="alert-table-scroll" role="region" aria-label="Alert register table" tabIndex={0}>
        <table className="alert-table">
          <caption className="alert-visually-hidden">Alerts ordered by severity, newest detection and alert code.</caption>
          <colgroup><col className="alert-column-incident" /><col className="alert-column-drone" />
            <col className="alert-column-mission" /><col className="alert-column-problem" />
            <col className="alert-column-severity" /><col className="alert-column-source" /><col className="alert-column-time" /></colgroup>
          <thead><tr><th scope="col">Alert ID/title</th><th scope="col">Drone</th><th scope="col">Mission</th>
            <th scope="col">Problem Description</th><th scope="col">Severity</th><th scope="col">Source</th><th scope="col">Detected Time</th></tr></thead>
          <tbody>{visibleAlerts.map(alert => <tr key={alert.alertCode} data-alert-code={alert.alertCode}>
            <th scope="row" className="alert-incident"><span className="alert-code">{alert.alertCode}</span><strong>{alert.title}</strong></th>
            <td><span className="alert-cell-label" aria-hidden="true">Drone</span>{alert.droneCode}</td>
            <td><span className="alert-cell-label" aria-hidden="true">Mission</span>{alert.missionCode}</td>
            <td className="alert-problem"><span className="alert-cell-label" aria-hidden="true">Problem Description</span>{alert.problemDescription}</td>
            <td><span className="alert-cell-label" aria-hidden="true">Severity</span><Severity alert={alert} /></td>
            <td><span className="alert-cell-label" aria-hidden="true">Source</span>{alert.sourceGroup}</td>
            <td className="alert-time"><span className="alert-cell-label" aria-hidden="true">Detected Time</span><AlertTime alert={alert} /></td>
          </tr>)}</tbody>
        </table>
        {visibleAlerts.length === 0 && <div className="alert-empty-state">
          <h3>No alerts match your search or severity filter.</h3>
          <p>Clear the search or choose All severities to see more alerts.</p>
        </div>}
      </div>
    </Panel>
  </>;
}

export function AlertDetail({ alert }: { alert: AlertViewModel }) {
  return <div className="alert-detail-grid" data-alert-code={alert.alertCode}>
    <div className="alert-detail-column">
      <Panel title="Alert summary" eyebrow={alert.alertCode}>
        <div className="alert-detail-title">
          <span className={'alert-detail-icon tone-' + (alert.severity === 'CRITICAL' ? 'danger' : 'warning')}><Icon name="alert" size={24} /></span>
          <h3>{alert.title}</h3>
        </div>
        <div className="alert-detail-badges"><Severity alert={alert} /></div>
        <p className="alert-summary-text">{alert.problemDescription}</p>
      </Panel>
      <Panel title="Incident information">
        <dl className="alert-metadata alert-metadata-pairs">
          <Field label="Alert code">{alert.alertCode}</Field>
          <Field label="Drone">{alert.droneCode}</Field>
          <Field label="Mission">{alert.missionCode}</Field>
          <Field label="Source">{alert.sourceGroup}</Field>
          <Field label="Detected time"><AlertTime alert={alert} /></Field>
        </dl>
      </Panel>
    </div>
    <Panel title="Resolution note">
      <p className="alert-resolution-note">{alert.resolutionNote ?? 'No resolution note has been recorded.'}</p>
    </Panel>
  </div>;
}
