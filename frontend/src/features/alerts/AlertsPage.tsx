import type { ReactNode } from 'react';
import { Icon } from '../../components/Icon';
import { PageHeading, Panel, StatusBadge } from '../../components/ui';
import {
  alertCounts, alerts, alertsByCode,
} from './alerts.data';
import type { AlertViewModel } from './alerts.data';
import './alerts.css';

function Severity({ alert }: { alert: AlertViewModel }) {
  return <StatusBadge tone={alert.severity === 'CRITICAL' ? 'danger' : 'warning'}>{alert.severity}</StatusBadge>;
}
function AlertStatus({ alert }: { alert: AlertViewModel }) {
  return <StatusBadge tone={alert.status === 'RESOLVED' ? 'success' : 'info'}>{alert.status}</StatusBadge>;
}
function AlertTime({ value }: { value: AlertViewModel['times']['detected'] }) {
  return value === null ? <>Not recorded</> : <time dateTime={value.iso}>{value.text}</time>;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}
function missingRelation(id: number | null, entity: string) {
  return id === null ? 'No associated ' + entity : 'Record unavailable (ID ' + id + ')';
}

export function AlertsPage({ view = 'list', alertCode = 'ALT-014' }: { view?: 'list' | 'detail'; alertCode?: string }) {
  const detail = view === 'detail';
  const selectedCode = alertCode;
  const selected = alertsByCode.get(selectedCode);
  return <>
    <PageHeading eyebrow="OPERATIONS / ALERTS" title={detail ? 'Alert details' : 'Alerts'}
      description={detail ? 'Incident information and its recorded resolution.' : 'Operational incidents, ordered by severity and status.'}
      accessory={<StatusBadge tone="warning">{alertCounts.active} active alerts</StatusBadge>} />
    {detail
      ? selected ? <AlertDetail alert={selected} />
        : <Panel title="Alert not found"><p>No alert matches {selectedCode}.</p></Panel>
      : <AlertList />}
  </>;
}

export function AlertList() {
  return <>
    <dl className="alert-counts" aria-label="Alert totals">
      <div><dt>Total alerts</dt><dd>{alertCounts.total}</dd></div>
      <div><dt>Active</dt><dd>{alertCounts.active}</dd></div>
      <div><dt>Resolved</dt><dd>{alertCounts.resolved}</dd></div>
    </dl>
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
    <Panel title="All alerts" className="alert-register" accessory={<span className="alert-record-count">{alertCounts.total} records</span>}>
      <div className="alert-table-scroll" role="region" aria-label="Alert register" tabIndex={0}>
        <table className="alert-table">
          <caption className="alert-visually-hidden">All 24 alerts, ordered by severity, active status, newest detection and record ID.</caption>
          <thead><tr><th scope="col">Incident</th><th scope="col">Severity</th>
            <th scope="col">Status</th><th scope="col">Source</th><th scope="col">Detected</th></tr></thead>
          <tbody>{alerts.map(alert => <tr key={alert.id} data-alert-code={alert.alert_code}>
            <th scope="row" className="alert-incident">
              <span className="alert-code">{alert.alert_code}</span>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
              <span className="alert-context">{alert.contextLabel}</span>
            </th>
            <td><span className="alert-cell-label" aria-hidden="true">Severity</span><Severity alert={alert} /></td>
            <td><span className="alert-cell-label" aria-hidden="true">Status</span><AlertStatus alert={alert} /></td>
            <td><span className="alert-cell-label" aria-hidden="true">Source</span>{alert.sourceGroup}</td>
            <td className="alert-time"><span className="alert-cell-label" aria-hidden="true">Detected</span><AlertTime value={alert.times.detected} /></td>
          </tr>)}</tbody>
        </table>
      </div>
    </Panel>
  </>;
}

export function AlertDetail({ alert }: { alert: AlertViewModel }) {
  return <div className="alert-detail-grid" data-alert-code={alert.alert_code}>
    <div className="alert-detail-column">
      <Panel title="Alert summary" eyebrow={alert.alert_code}>
        <div className="alert-detail-title">
          <span className={'alert-detail-icon tone-' + (alert.severity === 'CRITICAL' ? 'danger' : 'warning')}><Icon name="alert" size={24} /></span>
          <h3>{alert.title}</h3>
        </div>
        <div className="alert-detail-badges"><Severity alert={alert} /><AlertStatus alert={alert} /></div>
        <p className="alert-summary-text">{alert.message}</p>
      </Panel>
      <Panel title="Related records">
        <dl className="alert-metadata alert-metadata-pairs">
          <Field label="Drone">{alert.drone ? <>{alert.drone.display_name}<small>{alert.drone.drone_code} · ID {alert.drone.id}</small></> : 'Not recorded'}</Field>
          <Field label="Mission">{alert.mission ? <>{alert.mission.mission_code}<small>{alert.mission.name} · ID {alert.mission_id}</small></> : missingRelation(alert.mission_id, 'mission')}</Field>
          <Field label="Flight">{alert.flight ? <>{alert.flight.flight_code}<small>ID {alert.flight_id}</small></> : missingRelation(alert.flight_id, 'flight')}</Field>
          <Field label="Component">{alert.component ? <>{alert.component.name}<small>{alert.component.component_code} · ID {alert.component_id}</small></> : missingRelation(alert.component_id, 'component')}</Field>
          <Field label="Component position">{alert.componentPositionLabel}</Field>
          <Field label="Component serial number">{alert.component?.installation.component_serial_number ?? 'Not recorded'}</Field>
        </dl>
      </Panel>
      <Panel title="Measurements">
        <dl className="alert-metadata alert-metadata-pairs">
          <Field label="Metric">{alert.metric_name ?? 'Not recorded'}</Field>
          <Field label="Observed value">{alert.observedText}</Field>
          <Field label="Threshold value">{alert.thresholdText}</Field>
          <Field label="Unit">{alert.unit ?? 'Not recorded'}</Field>
        </dl>
      </Panel>
    </div>
    <div className="alert-detail-column">
      <Panel title="Incident information">
        <dl className="alert-metadata alert-metadata-pairs">
          <Field label="Alert code">{alert.alert_code}</Field>
          <Field label="Record ID">{alert.id}</Field>
          <Field label="Source">{alert.sourceGroup}</Field>
          <Field label="Detection source">{alert.source}</Field>
          <Field label="Rule code">{alert.rule_code}</Field>
          <Field label="Alert type">{alert.type}</Field>
        </dl>
      </Panel>
      <Panel title="Lifecycle">
        <dl className="alert-metadata">
          <Field label="Detected time"><AlertTime value={alert.times.detected} /></Field>
          <Field label="Last observed"><AlertTime value={alert.times.lastObserved} /></Field>
          <Field label="Resolved time"><AlertTime value={alert.times.resolved} /></Field>
          <Field label="Created time"><AlertTime value={alert.times.created} /></Field>
          <Field label="Updated time"><AlertTime value={alert.times.updated} /></Field>
        </dl>
      </Panel>
      <Panel title="Resolution note">
        <p className={'alert-resolution-note' + (alert.status === 'RESOLVED' ? ' is-resolved' : '')}>
          {alert.resolution_note ?? 'No resolution note has been recorded.'}
        </p>
      </Panel>
    </div>
  </div>;
}
