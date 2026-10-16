import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, Check, ChevronDown, ShieldCheck } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, PageHeading, Pagination, StatusBadge } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { api, errorMessage } from '../lib/api';
import { formatDate, titleCase } from '../lib/format';
import type { Alert } from '../types/api';

const pageSize = 10;

export function AlertsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('ACTIVE');
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState('');
  const [selected, setSelected] = useState<Alert | null>(null);
  const [note, setNote] = useState('');
  const [componentHealthStatus, setComponentHealthStatus] = useState<'HEALTHY' | 'WARNING' | 'FAULT' | 'MAINTENANCE'>('HEALTHY');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const resolveTriggerRef = useRef<HTMLElement | null>(null);
  const load = useCallback(() => api.alerts({ page, pageSize, ...(status ? { status } : {}), ...(severity ? { severity } : {}), ...(source ? { source } : {}) }), [page, status, severity, source]);
  const { data, error, loading, refresh } = usePolling(load, 15_000);

  const openResolve = (alert: Alert, trigger: HTMLElement) => { resolveTriggerRef.current = trigger; setSelected(alert); setNote(''); setActionError(''); setComponentHealthStatus('HEALTHY'); };
  const resolve = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true); setActionError('');
    try {
      await api.resolveAlert(selected.id, note, selected.rule_code === 'PROPELLER_DAMAGE_SUSPECTED' ? componentHealthStatus : undefined);
      setSelected(null); refresh();
    } catch (reason) { setActionError(errorMessage(reason)); }
    finally { setSaving(false); }
  };

  const changeFilter = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => { setter(event.target.value); setPage(1); };

  useEffect(() => {
    if (!selected) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), textarea:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])') ?? []);
    const closeOnEscapeAndTrapFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSelected(null);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements();
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    };
    const focusTimer = window.setTimeout(() => noteRef.current?.focus(), 0);
    document.addEventListener('keydown', closeOnEscapeAndTrapFocus);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', closeOnEscapeAndTrapFocus);
      window.setTimeout(() => {
        const returnTarget = resolveTriggerRef.current?.isConnected ? resolveTriggerRef.current : previousFocus;
        if (returnTarget?.isConnected) returnTarget.focus();
      }, 0);
    };
  }, [selected]);

  return <>
    <PageHeading eyebrow="SAFETY & EXCEPTIONS" title="Alerts" description="Review alert lifecycle and resolve incidents through the backend workflow." action={<div className="api-source"><span className="pulse" /> REFRESHES EVERY 15 SEC</div>} />
    <div className="alert-summary-strip"><div><span className="alert-summary-icon"><Bell size={17} /></span><div><small>VISIBLE ALERTS</small><b>{data?.total ?? '—'}</b></div></div><div><span className="alert-summary-icon critical"><AlertTriangle size={17} /></span><div><small>CRITICAL ON PAGE</small><b>{data?.data.filter((alert) => alert.severity === 'CRITICAL').length ?? '—'}</b></div></div><div className="summary-hint"><ShieldCheck size={16} /> Resolution updates the alert and, for propeller checks, its component health record.</div></div>
    <div className="toolbar alert-toolbar"><div className="toolbar-title"><b>Alert inbox</b><span>Operational records from MySQL</span></div><div className="filter-group"><select className="select-field" aria-label="Filter alert status" value={status} onChange={changeFilter(setStatus)}><option value="ACTIVE">Active</option><option value="RESOLVED">Resolved</option><option value="">All alerts</option></select><select className="select-field" aria-label="Filter alert severity" value={severity} onChange={changeFilter(setSeverity)}><option value="">All severity</option><option value="CRITICAL">Critical</option><option value="WARNING">Warning</option></select><select className="select-field" aria-label="Filter alert source" value={source} onChange={changeFilter(setSource)}><option value="">All sources</option>{['ROUTE', 'WEATHER', 'TELEMETRY', 'SYSTEM'].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></div></div>
    {error && <ErrorState message={error.message} onRetry={refresh} />}
    {loading && !data ? <LoadingState label="Loading alert inbox" /> : data?.data.length ? <div className="alert-list">{data.data.map((alert) => <article className={`alert-card ${alert.severity === 'CRITICAL' ? 'critical' : ''}`} key={alert.id}><div className={`alert-symbol ${alert.severity === 'CRITICAL' ? 'critical' : 'warning'}`}>{alert.severity === 'CRITICAL' ? <AlertTriangle size={18} /> : <Bell size={18} />}</div><div className="alert-content"><div className="alert-title-row"><h3>{titleCase(alert.type)}</h3><StatusBadge value={alert.severity} /><StatusBadge value={alert.status} /></div><p>{alert.message}</p><div className="alert-meta"><span>{alert.alert_code}</span><span>{titleCase(alert.source)}</span>{alert.flight_id && <span>Flight #{alert.flight_id}</span>}{alert.mission_id && <span>Mission #{alert.mission_id}</span>}<span>Detected {formatDate(alert.detected_at)}</span>{alert.observed_value != null && <span>{alert.metric_name}: {alert.observed_value}{alert.unit || ''}{alert.threshold_value != null ? ` · threshold ${alert.threshold_value}${alert.unit || ''}` : ''}</span>}</div>{alert.status === 'RESOLVED' && alert.resolution_note && <div className="resolution-preview"><Check size={13} />{alert.resolution_note}</div>}</div>{alert.status === 'ACTIVE' && <button className="button secondary small resolve-button" onClick={(event) => openResolve(alert, event.currentTarget)}>Resolve <ChevronDown size={14} /></button>}</article>)}</div> : <EmptyState title={status === 'ACTIVE' ? 'No active alerts' : 'No alerts match these filters'} description="Alerts shown here are read directly from the backend." />}
    {data && <div className="table-panel panel alert-pagination"><Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} /></div>}
    {selected && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section ref={dialogRef} className="resolve-dialog" role="dialog" aria-modal="true" aria-labelledby="resolve-title" aria-describedby="resolve-summary"><div className="dialog-heading"><div><span className="eyebrow">ALERT · {selected.alert_code}</span><h2 id="resolve-title">Resolve incident</h2></div><button className="icon-button" aria-label="Close" onClick={() => setSelected(null)}>×</button></div><div className="dialog-alert-summary" id="resolve-summary"><StatusBadge value={selected.severity} /><b>{titleCase(selected.type)}</b><p>{selected.message}</p></div><form onSubmit={(event) => void resolve(event)}><label className="form-label" htmlFor="resolution-note">Resolution note <span>Required</span></label><textarea ref={noteRef} id="resolution-note" value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Describe the inspection or corrective action taken…" required rows={4} /><div className="field-hint">{note.length}/500 characters</div>{selected.rule_code === 'PROPELLER_DAMAGE_SUSPECTED' && <><label className="form-label" htmlFor="component-health">Propeller inspection result <span>Required by API</span></label><select id="component-health" className="select-field full-width" value={componentHealthStatus} onChange={(event) => setComponentHealthStatus(event.target.value as typeof componentHealthStatus)}><option value="HEALTHY">Healthy</option><option value="WARNING">Warning</option><option value="FAULT">Fault</option><option value="MAINTENANCE">Maintenance</option></select></>}{actionError && <div className="inline-error">{actionError}</div>}<div className="dialog-actions"><button type="button" className="button ghost" onClick={() => setSelected(null)}>Cancel</button><button className="button primary" type="submit" disabled={saving || !note.trim()}><Check size={15} />{saving ? 'Saving…' : 'Resolve alert'}</button></div></form></section></div>}
  </>;
}
