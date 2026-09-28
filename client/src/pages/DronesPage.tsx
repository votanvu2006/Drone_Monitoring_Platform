import { useCallback } from 'react';
import { ArrowUpRight, BatteryCharging, Cpu, Crosshair, MapPin, Plane, Radio, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MetricCard, PageHeading, Panel, StatusBadge, ErrorState, LoadingState } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { formatDate } from '../lib/format';
import { api } from '../lib/api';

export function DronesPage() {
  const load = useCallback(() => api.drones({ page: 1, pageSize: 100 }), []);
  const { data, error, loading, refresh } = usePolling(load, 15_000);
  const drone = data?.data[0];

  return <>
    <PageHeading eyebrow="FLEET MANAGEMENT" title="Aircraft" description="Identity, availability and last reported position from the fleet API." action={<div className="api-source"><span className="pulse" /> LIVE DATA</div>} />
    {error && <ErrorState message={error.message} onRetry={refresh} />}
    {loading && !data ? <LoadingState label="Loading aircraft" /> : drone ? <>
      <section className="drone-profile panel"><div className="drone-profile-art"><div className="profile-crosshair" /><div className="profile-ring" /><Plane size={92} strokeWidth={0.8} /></div><div className="drone-profile-copy"><div className="eyebrow">AIRCRAFT ID · {drone.droneCode}</div><div className="profile-title-row"><h2>{drone.displayName}</h2><StatusBadge value={drone.status} /></div><p>{drone.model.manufacturer} {drone.model.modelName} <span>·</span> Model {drone.model.modelCode}</p><div className="profile-tags"><span><Radio size={13} /> {drone.isSimulated ? 'Simulation-ready' : 'Physical aircraft'}</span><span><MapPin size={13} /> {drone.homeLocation.label}</span></div><div className="profile-actions"><Link className="button primary" to="/live-flight">Open live flight <ArrowUpRight size={15} /></Link></div></div><span className="profile-number">01 / AIRCRAFT</span></section>
      <div className="metric-grid drone-metrics"><MetricCard label="OPERATIONAL STATE" value={drone.status.replace('_', ' ')} icon={<Radio size={17} />} tone="green" detail="Reported by fleet API" /><MetricCard label="LAST POSITION" value={drone.lastKnownLocation ? `${drone.lastKnownLocation.latitude.toFixed(4)}, ${drone.lastKnownLocation.longitude.toFixed(4)}` : 'Not reported'} icon={<Crosshair size={17} />} tone="blue" detail={drone.lastKnownLocation ? `${drone.lastKnownLocation.source.replaceAll('_', ' ')} · ${formatDate(drone.lastKnownLocation.updatedAt)}` : `Home base · ${drone.homeLocation.label}`} /><MetricCard label="MODEL" value={drone.model.modelCode} icon={<Cpu size={17} />} tone="amber" detail={`${drone.model.manufacturer} ${drone.model.modelName}`} /><MetricCard label="SIMULATION" value={drone.isSimulated ? 'Enabled' : 'Physical'} icon={<BatteryCharging size={17} />} tone="green" detail="Simulation mode from backend" /></div>
      <Panel title="Airframe overview" eyebrow="HARDWARE PROFILE" className="hardware-panel" action={<span className="coming-soon-label"><Wrench size={13} /> COMPONENT INVENTORY NOT EXPOSED BY API</span>}><div className="hardware-overview"><div className="hardware-diagram"><div className="hardware-center"><Plane size={40} /><span>FLIGHT<br />PLATFORM</span></div>{['NORTH ARM', 'EAST ARM', 'SOUTH ARM', 'WEST ARM'].map((arm, index) => <div className={`hardware-node node-${index + 1}`} key={arm}><i /><span>{arm}</span><small>Telemetry detail unavailable</small></div>)}</div><div className="hardware-callout"><div className="callout-icon"><Wrench size={16} /></div><div><b>Component-level health is not available yet</b><p>This release uses only the endpoints currently exposed by the backend. Hardware inventory and per-component diagnostics are intentionally not simulated in the interface.</p></div></div></div></Panel>
      <div className="location-strip"><MapPin size={15} /><span>Home base</span><b>{drone.homeLocation.label}</b><code>{drone.homeLocation.latitude.toFixed(5)}, {drone.homeLocation.longitude.toFixed(5)}</code></div>
    </> : <div className="empty-page"><Panel title="No aircraft found" eyebrow="FLEET API"><p className="muted">The fleet endpoint returned no aircraft.</p></Panel></div>}
  </>;
}
