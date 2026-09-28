import { useCallback, useState } from 'react';
import { ArrowLeft, Check, CloudSun, Compass, Route, ShieldCheck, Wind } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { MapView } from '../components/MapView';
import { EmptyState, ErrorState, LoadingState, MetricCard, PageHeading, Panel, StatusBadge } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { api, errorMessage } from '../lib/api';
import { formatDate, formatDistance, formatDuration } from '../lib/format';
import type { FlightZone, MissionDetail, WeatherCheck } from '../types/api';

export function MissionDetailPage() {
  const { missionId = '' } = useParams();
  const id = Number(missionId);
  const loadMission = useCallback(() => api.mission(id), [id]);
  const loadZones = useCallback(() => api.zones(), []);
  const missionResource = usePolling<MissionDetail>(loadMission);
  const zoneResource = usePolling<FlightZone[]>(async () => (await loadZones()).features);
  const [weather, setWeather] = useState<WeatherCheck | null>(null);
  const [busy, setBusy] = useState<'validate' | 'weather' | null>(null);
  const [actionError, setActionError] = useState('');
  const [validationMessage, setValidationMessage] = useState('');
  const mission = missionResource.data?.id === id ? missionResource.data : null;

  const runValidation = async () => {
    setBusy('validate'); setActionError('');
    try {
      const result = await api.validateMission(id);
      setValidationMessage(result.message);
      missionResource.refresh();
    } catch (error) { setActionError(errorMessage(error)); }
    finally { setBusy(null); }
  };

  const runWeatherCheck = async () => {
    setBusy('weather'); setActionError(''); setWeather(null);
    try { setWeather(await api.checkWeather(id)); }
    catch (error) { setActionError(errorMessage(error)); }
    finally { setBusy(null); }
  };

  if (!Number.isSafeInteger(id) || id < 1) return <EmptyState title="Invalid mission" description="The mission id in this URL is not valid." />;

  return <>
    <Link className="back-link" to="/missions"><ArrowLeft size={15} /> All missions</Link>
    {missionResource.error && <ErrorState message={missionResource.error.message} onRetry={missionResource.refresh} />}
    {missionResource.loading && !mission ? <LoadingState label="Loading mission details" /> : mission && <>
      <PageHeading eyebrow={`MISSION ${mission.missionCode}`} title={mission.name} description={mission.description || 'Mission route and operational readiness.'} action={<StatusBadge value={mission.status} />} />
      <div className="metric-grid mission-metrics"><MetricCard label="ROUTE DISTANCE" value={formatDistance(mission.estimatedDistanceM)} icon={<Route size={17} />} tone="green" detail={`${mission.waypoints.length} route waypoints`} /><MetricCard label="ESTIMATED DURATION" value={formatDuration(mission.estimatedDurationSec)} icon={<Compass size={17} />} tone="blue" detail={`${mission.plannedSpeedMps} m/s planned speed`} /><MetricCard label="PLANNED ALTITUDE" value={mission.plannedAltitudeM} unit="m" icon={<Wind size={17} />} tone="amber" detail="Mission profile" /><MetricCard label="ROUTE VALIDATION" value={mission.validationStatus.replaceAll('_', ' ')} icon={<ShieldCheck size={17} />} tone={mission.validationStatus === 'VALID' ? 'green' : mission.validationStatus === 'INVALID' ? 'red' : 'amber'} detail={mission.validationMessage || 'Airspace validation not run'} /></div>
      <div className="mission-detail-grid"><Panel title="Planned route" eyebrow="AIRSPACE & WAYPOINTS" action={<span className="zone-legend"><i className="legend-route" /> ROUTE <i className="legend-allowed" /> ALLOWED <i className="legend-restricted" /> RESTRICTED</span>}>
        {zoneResource.error && <ErrorState message={`Flight zones unavailable: ${zoneResource.error.message}`} onRetry={zoneResource.refresh} />}
        <MapView waypoints={mission.waypoints} zones={zoneResource.data || []} />
        <div className="waypoint-list">{mission.waypoints.map((point) => <div className="waypoint-row" key={point.id}><span className="waypoint-index">{String(point.sequenceNumber).padStart(2, '0')}</span><span className="waypoint-name"><b>{point.waypointType.replace('_', ' ')}</b><small>{point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}</small></span><span className="waypoint-alt">{point.altitudeM} m</span><span className="waypoint-hold">Hold {point.holdTimeSec}s</span></div>)}</div>
      </Panel><Panel title="Readiness checks" eyebrow="PRE-FLIGHT WORKFLOW"><div className="workflow-list"><div className="workflow-item"><span className="workflow-step">01</span><div><b>Validate route</b><small>Check route coordinates against active allowed and restricted zones.</small>{validationMessage && <p className="workflow-result">{validationMessage}</p>}</div><button className="button secondary small" onClick={() => void runValidation()} disabled={busy !== null}>{busy === 'validate' ? 'Checking…' : 'Run validation'}</button></div><div className="workflow-item"><span className="workflow-step">02</span><div><b>Check demo weather</b><small>Fetch START, MID and DEST snapshots from the assigned weather profile.</small>{weather && <div className="weather-result"><StatusBadge value={weather.recommendation} /><p>{weather.samples[0]?.reason}</p><small>Valid until {formatDate(weather.expiresAt)}</small>{weather.requiresAcknowledgement && <div className="caution-note">CAUTION acknowledgement is required, but the backend currently exposes no acknowledgement endpoint. Launch will remain blocked.</div>}</div>}</div><button className="button secondary small" onClick={() => void runWeatherCheck()} disabled={busy !== null || mission.validationStatus !== 'VALID'}>{busy === 'weather' ? 'Checking…' : 'Check weather'}</button></div><div className="workflow-item"><span className="workflow-step">03</span><div><b>Start simulation</b><small>Flight attempts are created and managed by the backend.</small></div><span className="unavailable-action"><CloudSun size={14} /> No launch action here</span></div></div>{actionError && <div className="inline-error">{actionError}</div>}<div className="workflow-footer"><Check size={14} /> Assigned to {mission.drone.displayName} <span>·</span> updated {formatDate(mission.updatedAt)}</div></Panel></div>
    </>}
  </>;
}
