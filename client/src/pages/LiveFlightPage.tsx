import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, BatteryCharging, CircleStop, Gauge, Navigation, Play, Radio, ShieldCheck, Signal } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { EmptyState, ErrorState, LoadingState, MetricCard, PageHeading, Pagination, Panel, StatusBadge } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { allDrones, api, errorMessage } from '../lib/api';
import { formatDate, formatDuration } from '../lib/format';
import { flightDurationSeconds, hasValidPosition } from './liveFlightLogic';
import type { Drone, Flight, FlightZone, MissionDetail, SimulationStatus, Telemetry } from '../types/api';

const sessionPageSize = 20;

type ChartMetric = 'battery_percent' | 'speed_mps' | 'altitude_m';
const chartOptions: { key: ChartMetric; label: string; unit: string; color: string }[] = [
  { key: 'battery_percent', label: 'Battery', unit: '%', color: '#76e0bb' },
  { key: 'speed_mps', label: 'Speed', unit: 'm/s', color: '#8ab7ff' },
  { key: 'altitude_m', label: 'Altitude', unit: 'm', color: '#f6c65b' },
];

function TelemetryChart({ samples, metric, onMetric }: { samples: Telemetry[]; metric: ChartMetric; onMetric: (metric: ChartMetric) => void }) {
  const selected = chartOptions.find((option) => option.key === metric) || chartOptions[0]!;
  const values = samples.map((sample) => Number(sample[metric])).filter(Number.isFinite);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const spread = max - min || 1;
  const points = values.map((value, index) => `${values.length <= 1 ? 50 : 12 + index / (values.length - 1) * 376},${93 - ((value - min) / spread) * 72}`).join(' ');
  const current = values.at(-1);
  return <div className="telemetry-chart"><div className="chart-toolbar"><div className="segmented-control">{chartOptions.map((option) => <button key={option.key} className={option.key === metric ? 'selected' : ''} onClick={() => onMetric(option.key)}>{option.label}</button>)}</div><span className="chart-sample-count">{samples.length} LOCAL SAMPLES</span></div>{values.length > 0 ? <><svg viewBox="0 0 400 112" preserveAspectRatio="none" role="img" aria-label={`${selected.label} telemetry trend`}><defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={selected.color} stopOpacity=".25" /><stop offset="1" stopColor={selected.color} stopOpacity="0" /></linearGradient></defs><path d="M12 22H388M12 57H388M12 93H388" className="chart-gridline" /><polygon points={`12,104 ${points} 388,104`} fill="url(#chart-fill)" /><polyline points={points} fill="none" stroke={selected.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />{current != null && <circle cx={values.length <= 1 ? 50 : 388} cy={93 - ((current - min) / spread) * 72} r="4" fill={selected.color} />}</svg><div className="chart-footer"><span>Oldest sample · {formatDate(samples[0]?.recorded_at)}</span><b>{current?.toFixed(1)} {selected.unit}</b><span>Latest sample · {formatDate(samples.at(-1)?.recorded_at)}</span></div></> : <div className="chart-empty"><Activity size={18} />Telemetry trend starts when the simulation reports samples.</div>}<div className="local-data-note">Trend is assembled in this browser from 2-second status polls; older samples are not available from the current API.</div></div>;
}

export function LiveFlightPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawDroneId = Number(searchParams.get('droneId'));
  const selectedDroneId = Number.isSafeInteger(rawDroneId) && rawDroneId > 0 ? rawDroneId : null;
  const [flightsPage, setFlightsPage] = useState(1);
  const loadFlights = useCallback(() => api.flights({ page: flightsPage, pageSize: sessionPageSize, ...(selectedDroneId ? { droneId: selectedDroneId } : {}) }), [flightsPage, selectedDroneId]);
  const flightsResource = usePolling(loadFlights, 15_000);
  const loadDrones = useCallback(async () => ({ data: await allDrones() }), []);
  const dronesResource = usePolling(loadDrones, 60_000);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const selectedFlightId = selectedFlight?.id ?? null;
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [samples, setSamples] = useState<Telemetry[]>([]);
  const [lastValidPosition, setLastValidPosition] = useState<{ flightId: number; latitude: number; longitude: number; heading: number } | null>(null);
  const [metric, setMetric] = useState<ChartMetric>('battery_percent');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const flights = useMemo(() => {
    if (flightsResource.data?.page !== flightsPage) return [];
    return flightsResource.data.data.filter((flight) => selectedDroneId == null || flight.drone.id === selectedDroneId);
  }, [flightsResource.data, flightsPage, selectedDroneId]);
  useEffect(() => {
    if (selectedFlight || !flights.length) return;
    const candidate = flights.find((flight) => ['FLYING', 'PAUSED', 'RETURNING'].includes(flight.status))
      || flights.find((flight) => flight.status === 'READY')
      || flights[0];
    if (candidate) setSelectedFlight(candidate);
  }, [flights, selectedFlight]);
  useEffect(() => {
    if (selectedDroneId != null && selectedFlight && selectedFlight.drone.id !== selectedDroneId) {
      setSelectedFlight(null);
      setFlightsPage(1);
    }
  }, [selectedDroneId, selectedFlight]);

  const loadStatus = useCallback(() => selectedFlightId == null ? Promise.resolve(null) : api.simulationStatus(selectedFlightId), [selectedFlightId]);
  const statusResource = usePolling<SimulationStatus | null>(loadStatus, selectedFlightId == null ? 0 : 2_000);
  const status = statusResource.data?.flight.id === selectedFlightId ? statusResource.data : null;
  const flight = flights.find((item) => item.id === selectedFlightId) ?? selectedFlight;
  const missionId = status?.flight.mission_id ?? flight?.mission.id;
  const loadMission = useCallback(() => missionId == null ? Promise.resolve(null) : api.mission(missionId), [missionId]);
  const missionResource = usePolling<MissionDetail | null>(loadMission);
  const loadZones = useCallback(async () => (await api.zones()).features, []);
  const zonesResource = usePolling<FlightZone[]>(loadZones);

  useEffect(() => { setTrail([]); setSamples([]); setLastValidPosition(null); setActionError(''); setNotice(''); }, [selectedFlightId]);
  useEffect(() => {
    const telemetry = status?.latestTelemetry;
    if (!telemetry) return;
    setSamples((current) => current.at(-1)?.sequence_number === telemetry.sequence_number ? current : [...current, telemetry].slice(-60));
    if (!hasValidPosition(telemetry)) return;
    const point: [number, number] = [telemetry.latitude, telemetry.longitude];
    setTrail((current) => current.at(-1)?.[0] === point[0] && current.at(-1)?.[1] === point[1] ? current : [...current, point].slice(-120));
    if (selectedFlightId != null) setLastValidPosition({ flightId: selectedFlightId, latitude: telemetry.latitude, longitude: telemetry.longitude, heading: telemetry.heading_deg });
  }, [status?.latestTelemetry, selectedFlightId]);

  const visibleFlight = status?.flight ?? null;
  const currentTelemetry = status?.latestTelemetry ?? null;
  const cautionBlocked = visibleFlight?.preflight_weather_recommendation === 'CAUTION' && !visibleFlight.weather_acknowledged_at;
  const unsafe = (visibleFlight?.preflight_weather_recommendation as string | undefined) === 'UNSAFE';
  const canStart = visibleFlight?.status === 'READY' && !cautionBlocked && !unsafe;
  const active = visibleFlight && ['FLYING', 'PAUSED', 'RETURNING'].includes(visibleFlight.status);

  const runSimulationAction = async (action: 'start' | 'stop') => {
    if (selectedFlightId == null) return;
    if (action === 'stop' && !window.confirm('Stop this simulation? The backend will record the flight as aborted.')) return;
    setActionBusy(true); setActionError(''); setNotice('');
    try {
      if (action === 'start') await api.startSimulation(selectedFlightId);
      else await api.stopSimulation(selectedFlightId);
      setNotice(action === 'start' ? 'Simulation start requested. Waiting for live telemetry…' : 'Simulation stopped and recorded by the backend.');
      statusResource.refresh(); flightsResource.refresh();
    } catch (error) { setActionError(errorMessage(error)); }
    finally { setActionBusy(false); }
  };

  const duration = visibleFlight ? flightDurationSeconds(visibleFlight) : flightDurationSeconds(flight);
  const mapPosition = lastValidPosition?.flightId === selectedFlightId ? lastValidPosition : null;

  const changeAircraft = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setFlightsPage(1);
    setSelectedFlight(null);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set('droneId', value);
      else next.delete('droneId');
      return next;
    });
  };
  const chooseFlight = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(event.target.value);
    const choice = flights.find((item) => item.id === id);
    if (choice) setSelectedFlight(choice);
  };

  return <>
    <PageHeading eyebrow="LIVE OPERATIONS" title="Live flight" description="Simulation state and latest telemetry polled directly from the operations API." action={<div className="live-poll"><span className="pulse" /> 2 SEC POLLING</div>} />
    {flightsResource.error && <ErrorState message={flightsResource.error.message} onRetry={flightsResource.refresh} />}
    {flightsResource.loading && !selectedFlightId ? <LoadingState label="Loading flight sessions" /> : !selectedFlightId ? <EmptyState title="No flight sessions found" description={selectedDroneId ? 'This aircraft has no flight attempts to monitor.' : 'Create or seed a flight using the backend workflow. The frontend does not create flight attempts.'} action={<Link className="button secondary" to="/missions">Review missions <ArrowRight size={15} /></Link>} /> : <>
      <section className="live-flight-banner"><div className="live-flight-id"><span className="live-flight-icon"><Navigation size={18} /></span><div><span className="eyebrow">FLIGHT SESSION</span><b>{flight?.flightCode || `Flight #${selectedFlightId}`}</b><small>{flight?.mission.name || `Mission #${missionId || '—'}`} · {flight?.drone.displayName || `Drone #${visibleFlight?.drone_id || '—'}`}</small></div></div><div className="flight-select-wrap"><label htmlFor="aircraft-select">AIRCRAFT</label><select id="aircraft-select" className="select-field" value={selectedDroneId ?? ''} onChange={changeAircraft}><option value="">All aircraft</option>{selectedFlight && !dronesResource.data?.data.some((drone) => drone.id === selectedFlight.drone.id) && <option value={selectedFlight.drone.id}>{selectedFlight.drone.displayName}</option>}{(dronesResource.data?.data ?? []).map((drone: Drone) => <option value={drone.id} key={drone.id}>{drone.displayName}</option>)}</select></div><div className="flight-select-wrap"><label htmlFor="flight-select">MONITOR SESSION</label><select id="flight-select" className="select-field" value={selectedFlightId} onChange={chooseFlight}>{selectedFlight && !flights.some((item) => item.id === selectedFlight.id) && <option value={selectedFlight.id}>{selectedFlight.flightCode} · {selectedFlight.status}</option>}{flights.map((item) => <option value={item.id} key={item.id}>{item.flightCode} · {item.status}</option>)}</select></div><div className="live-flight-state">{visibleFlight && <StatusBadge value={visibleFlight.status} />}<span className="flight-time"><Activity size={14} />{formatDuration(duration)}</span></div><div className="live-flight-actions">{visibleFlight?.status === 'READY' && <button className="button primary" disabled={!canStart || actionBusy} onClick={() => void runSimulationAction('start')}><Play size={15} />{actionBusy ? 'Starting…' : 'Start simulation'}</button>}{active && <button className="button danger" disabled={actionBusy} onClick={() => void runSimulationAction('stop')}><CircleStop size={15} />{actionBusy ? 'Stopping…' : 'Stop simulation'}</button>}{cautionBlocked && <span className="launch-warning">Weather CAUTION · acknowledgement unavailable</span>}{unsafe && <span className="launch-warning">UNSAFE weather blocks launch</span>}</div></section>
      {flightsResource.data?.page === flightsPage && <div className="table-panel panel flight-session-pagination"><Pagination page={flightsPage} pageSize={flightsResource.data.pageSize} total={flightsResource.data.total} onPage={setFlightsPage} /></div>}
      {(actionError || notice || statusResource.error) && <div className={actionError || statusResource.error ? 'inline-error' : 'inline-notice'}>{actionError || statusResource.error?.message || notice}{statusResource.error && <button className="text-button" onClick={statusResource.refresh}>Retry</button>}</div>}
      {cautionBlocked && <div className="caution-banner"><ShieldCheck size={17} /><div><b>Launch is blocked by the backend safety policy.</b><span>The preflight weather recommendation is CAUTION, but this API has no acknowledgement endpoint. The interface will not bypass that requirement.</span></div></div>}
      <div className="live-metrics-grid"><MetricCard label="BATTERY" value={currentTelemetry ? Math.round(currentTelemetry.battery_percent) : '—'} unit="%" icon={<BatteryCharging size={17} />} tone={currentTelemetry && currentTelemetry.battery_percent <= 20 ? 'red' : 'green'} detail={currentTelemetry ? `${currentTelemetry.battery_voltage_v.toFixed(1)} V · ${currentTelemetry.battery_temperature_c.toFixed(0)}°C` : 'Waiting for telemetry'} /><MetricCard label="ALTITUDE" value={currentTelemetry ? currentTelemetry.altitude_m.toFixed(1) : '—'} unit="m" icon={<Navigation size={17} />} tone="blue" detail={currentTelemetry ? `Vertical ${currentTelemetry.vertical_speed_mps.toFixed(1)} m/s` : 'Above ground'} /><MetricCard label="GROUND SPEED" value={currentTelemetry ? currentTelemetry.speed_mps.toFixed(1) : '—'} unit="m/s" icon={<Gauge size={17} />} tone="amber" detail={currentTelemetry ? `Heading ${Math.round(currentTelemetry.heading_deg)}°` : 'No current sample'} /><MetricCard label="LINK & GPS" value={currentTelemetry ? `${Math.round(currentTelemetry.signal_percent)}%` : '—'} icon={<Signal size={17} />} tone={currentTelemetry?.gps_quality === 'LOST' ? 'red' : 'green'} detail={currentTelemetry ? `${currentTelemetry.gps_quality} · ${currentTelemetry.gps_satellites} satellites · ${currentTelemetry.transmission_state}` : 'Awaiting link state'} /></div>
      <div className="live-content-grid"><Panel title="Flight map" eyebrow="LIVE POSITION & AIRSPACE" action={<span className="map-live-tag"><span className="pulse" /> LIVE POSITION</span>} className="live-map-panel">{zonesResource.error && <div className="map-warning">Flight-zone overlay unavailable: {zonesResource.error.message}</div>}<MapView waypoints={missionResource.data && missionResource.data.id === missionId ? missionResource.data.waypoints : []} zones={zonesResource.data || []} trail={trail} current={mapPosition} fitKey={selectedFlightId} /></Panel><Panel title="Telemetry trend" eyebrow="SESSION DATA"><TelemetryChart samples={samples} metric={metric} onMetric={setMetric} /><div className="signal-summary"><div><span>GPS QUALITY</span><b><i className={`signal-dot ${currentTelemetry?.gps_quality === 'LOST' ? 'danger' : ''}`} />{currentTelemetry?.gps_quality || 'NO DATA'}</b></div><div><span>TRANSMISSION</span><b>{currentTelemetry?.transmission_state || 'NO DATA'}</b></div><div><span>LAST RECEIVED</span><b>{formatDate(currentTelemetry?.recorded_at)}</b></div></div></Panel></div>
      {missionResource.error && <div className="subtle-callout"><span className="callout-mark">i</span><span>Mission route unavailable: {missionResource.error.message}. Telemetry remains live.</span></div>}
      <div className="live-data-caption"><Radio size={14} /> Status from <code>/api/flights/{selectedFlightId}/simulation/status</code><span>·</span> {status?.timerActive ? 'Server simulation timer active' : 'No active server timer'}</div>
    </>}
  </>;
}
