import { useCallback } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Bell, CheckCircle2, Clock3, MapPin, Plane, Route, ShieldAlert, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MetricCard, PageHeading, Panel, StatusBadge, EmptyState, ErrorState, LoadingState } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { formatDate, formatDistance } from '../lib/format';
import { allDrones, allFlights, api } from '../lib/api';
import type { Alert, Drone, Flight } from '../types/api';

interface OverviewData { drones: Drone[]; flights: Flight[]; activeFlights: Flight[]; alerts: Alert[]; alertCount: number; criticalAlertCount: number; readyMissionCount: number }

function DroneMark() {
  return <svg className="drone-illustration" viewBox="0 0 560 300" role="img" aria-label="Quadcopter drone illustration">
    <defs><linearGradient id="body" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#c8d5d0" /><stop offset=".55" stopColor="#697b75" /><stop offset="1" stopColor="#27312f" /></linearGradient><radialGradient id="glow"><stop stopColor="#67d9b4" stopOpacity=".26" /><stop offset="1" stopColor="#67d9b4" stopOpacity="0" /></radialGradient></defs>
    <ellipse cx="280" cy="220" rx="215" ry="70" fill="url(#glow)" />
    <g fill="none" stroke="#a7b6b0" strokeWidth="15" strokeLinecap="round"><path d="M260 151 153 91M300 151 407 91M260 165 151 224M300 165 409 224" /></g>
    <g fill="#12191a" stroke="#52625d" strokeWidth="3"><ellipse cx="144" cy="85" rx="52" ry="10" /><ellipse cx="416" cy="85" rx="52" ry="10" /><ellipse cx="142" cy="231" rx="52" ry="10" /><ellipse cx="418" cy="231" rx="52" ry="10" /></g>
    <g fill="#70817b" stroke="#bdc9c4" strokeWidth="2"><circle cx="151" cy="91" r="17" /><circle cx="407" cy="91" r="17" /><circle cx="151" cy="224" r="17" /><circle cx="409" cy="224" r="17" /></g>
    <path d="M233 133Q280 111 327 133L309 190Q280 207 251 190Z" fill="url(#body)" stroke="#d2dcd8" strokeWidth="2" />
    <path d="M254 143Q280 130 306 143L298 173Q280 184 262 173Z" fill="#202a28" /><circle cx="280" cy="168" r="9" fill="#76e0bb" /><path d="M271 197h18v20h-18z" fill="#697b75" /><circle cx="280" cy="219" r="15" fill="#17201e" stroke="#7c8c85" strokeWidth="3" />
    <path d="M246 120 234 108M314 120 326 108" stroke="#76e0bb" strokeWidth="3" opacity=".8" />
  </svg>;
}

export function OverviewPage() {
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).format(new Date()).toUpperCase();
  const load = useCallback(async (): Promise<OverviewData> => {
    const [drones, recentFlights, activeFlightPages, alerts, criticalAlerts, readyMissions] = await Promise.all([
      allDrones(),
      api.flights({ page: 1, pageSize: 4 }),
      Promise.all((['FLYING', 'PAUSED', 'RETURNING'] as const).map((status) => allFlights({ status }))),
      api.alerts({ status: 'ACTIVE', page: 1, pageSize: 5 }),
      api.alerts({ status: 'ACTIVE', severity: 'CRITICAL', page: 1, pageSize: 1 }),
      api.missions({ status: 'READY', page: 1, pageSize: 1 }),
    ]);
    const activeFlights = activeFlightPages.flat().sort((left, right) => (right.startedAt || '').localeCompare(left.startedAt || '') || right.id - left.id);
    return { drones, flights: recentFlights.data, activeFlights, alerts: alerts.data, alertCount: alerts.total, criticalAlertCount: criticalAlerts.total, readyMissionCount: readyMissions.total };
  }, []);
  const { data, error, loading, refresh } = usePolling(load, 15_000);
  const drones = data?.drones ?? [];
  const availableAircraft = drones.filter((drone) => drone.status === 'AVAILABLE').length;
  const aircraftInFlight = drones.filter((drone) => drone.status === 'IN_FLIGHT').length;
  const unavailableAircraft = drones.filter((drone) => ['MAINTENANCE', 'OFFLINE'].includes(drone.status)).length;
  const activeFlight = data?.activeFlights[0];
  const availableMissions = data?.readyMissionCount ?? 0;
  const criticalAlerts = data?.criticalAlertCount ?? 0;

  return <>
    <PageHeading eyebrow={today} title="Welcome back, operator" description="Your flight operations at a glance." action={<div className="refresh-caption"><span className="pulse" /> Syncs every 15 seconds</div>} />
    {error && <ErrorState message={error.message} onRetry={refresh} />}
    {loading && !data ? <LoadingState label="Connecting to fleet API" /> : <>
      <section className="hero-panel">
        <div className="hero-copy"><div className="hero-kicker"><span className="hero-kicker-line" /> YOUR FLEET · LIVE OVERVIEW</div><h2>Fleet overview<br /><em>operations, in focus.</em></h2><p>{drones.length} aircraft · {availableAircraft} available · {aircraftInFlight} in flight · {unavailableAircraft} maintenance or offline</p><div className="hero-actions"><Link className="button primary" to="/drones">View fleet <ArrowRight size={16} /></Link><Link className="button ghost" to="/live-flight">Open live flight <ArrowUpRight size={15} /></Link></div><div className="hero-status"><span className="demo-chip">LIVE FLEET STATUS</span></div></div>
        <div className="hero-art"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="hero-coordinate">FLEET<br />{drones.length} AIRCRAFT</div><DroneMark /><div className="art-tag"><span className="pulse" /> FLEET API CONNECTED</div></div>
        <div className="hero-index">Nº {String(drones.length).padStart(3, '0')} <span>AIRCRAFT</span></div>
      </section>
      <div className="metric-grid overview-metrics">
        <MetricCard label="AIRCRAFT IN FLEET" value={drones.length} icon={<Plane size={17} />} tone="green" detail={`${availableAircraft} available · ${aircraftInFlight} in flight · ${unavailableAircraft} maintenance/offline`} />
        <MetricCard label="ACTIVE FLIGHT" value={activeFlight?.flightCode || 'None'} icon={<Wind size={17} />} tone="blue" detail={activeFlight ? activeFlight.status : 'No active simulation'} />
        <MetricCard label="READY MISSIONS" value={availableMissions} icon={<Route size={17} />} tone="amber" detail="Validated missions" />
        <MetricCard label="ACTIVE ALERTS" value={data?.alertCount ?? '—'} icon={<ShieldAlert size={17} />} tone={criticalAlerts ? 'red' : 'green'} detail={criticalAlerts ? `${criticalAlerts} critical · review now` : 'No critical alerts'} />
      </div>
      <div className="overview-lower-grid">
        <Panel title="Recent flights" eyebrow="FLIGHT OPERATIONS" action={<Link className="text-link" to="/flight-history">View history <ArrowRight size={14} /></Link>}>
          {data?.flights.length ? <div className="compact-list">{data.flights.slice(0, 4).map((flight) => <Link to="/flight-history" className="compact-row" key={flight.id}><span className="list-icon"><Plane size={16} /></span><span className="compact-main"><b>{flight.flightCode}</b><small>{flight.mission.name} · {formatDate(flight.startedAt || flight.endedAt)}</small></span><span className="compact-meta"><StatusBadge value={flight.result || flight.status} /><small>{formatDistance(flight.distanceM)}</small></span><ArrowRight size={15} className="row-arrow" /></Link>)}</div> : <EmptyState title="No flight records yet" description="Flights created by the backend will appear here." />}
        </Panel>
        <Panel title="Attention required" eyebrow="ACTIVE ALERTS" action={<Link className="text-link" to="/alerts">Open inbox <ArrowRight size={14} /></Link>}>
          {data?.alerts.length ? <div className="compact-list">{data.alerts.slice(0, 4).map((alert) => <Link to="/alerts" className="compact-row alert-row" key={alert.id}><span className={`list-icon ${alert.severity === 'CRITICAL' ? 'danger' : 'warning'}`}><Bell size={16} /></span><span className="compact-main"><b>{alert.type.replaceAll('_', ' ')}</b><small>{alert.message}</small></span><StatusBadge value={alert.severity} /><ArrowRight size={15} className="row-arrow" /></Link>)}</div> : <div className="clear-state"><span><CheckCircle2 size={18} /></span><div><b>All clear</b><small>No active alerts from the API.</small></div></div>}
        </Panel>
      </div>
      <div className="overview-note"><MapPin size={14} /><span>Operations overview is built from live backend data.</span><span className="note-divider" /><Clock3 size={14} /><span>Last sync updates automatically.</span><ArrowDownRight className="note-arrow" size={16} /></div>
    </>}
  </>;
}
