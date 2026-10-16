import { useCallback, useState } from 'react';
import { ArrowUpRight, Crosshair, MapPin, Plane, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState, PageHeading, Pagination, StatusBadge } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { formatDate } from '../lib/format';
import { api } from '../lib/api';

const pageSize = 10;

export function DronesPage() {
  const [page, setPage] = useState(1);
  const load = useCallback(() => api.drones({ page, pageSize }), [page]);
  const { data, error, loading, refresh } = usePolling(load, 15_000);
  const drones = data?.data ?? [];

  return <>
    <PageHeading eyebrow="FLEET MANAGEMENT" title="Aircraft" description="Identity, availability and last reported position across the fleet." action={<div className="api-source"><span className="pulse" /> LIVE DATA</div>} />
    {error && <ErrorState message={error.message} onRetry={refresh} />}
    {loading && !data ? <LoadingState label="Loading fleet" /> : drones.length ? <>
      <section className="fleet-grid" aria-label="Aircraft fleet">
        {drones.map((drone) => <article className="fleet-card panel" key={drone.id}>
          <div className="fleet-card-top"><span className="fleet-aircraft-icon"><Plane size={20} /></span><StatusBadge value={drone.status} /></div>
          <div className="fleet-card-identity"><span className="eyebrow">AIRCRAFT · {drone.droneCode}</span><h2>{drone.displayName}</h2><p>{drone.model.manufacturer} {drone.model.modelName} · {drone.model.modelCode}</p></div>
          <div className="fleet-card-details">
            <div><MapPin size={14} /><span>Home base</span><b>{drone.homeLocation.label}</b></div>
            <div><Crosshair size={14} /><span>Last position</span><b>{drone.lastKnownLocation ? `${drone.lastKnownLocation.latitude.toFixed(4)}, ${drone.lastKnownLocation.longitude.toFixed(4)}` : 'Not reported'}</b><small>{drone.lastKnownLocation ? `${drone.lastKnownLocation.source.replaceAll('_', ' ')} · ${formatDate(drone.lastKnownLocation.updatedAt)}` : 'Awaiting telemetry'}</small></div>
          </div>
          <div className="fleet-card-footer"><span><Radio size={13} />{drone.isSimulated ? 'Simulation-ready' : 'Physical aircraft'}</span><Link className="button secondary small" to={`/live-flight?droneId=${drone.id}`}>Monitor <ArrowUpRight size={14} /></Link></div>
        </article>)}
      </section>
      {data && <div className="table-panel panel fleet-pagination"><Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPage={setPage} /></div>}
      <div className="subtle-callout"><span className="callout-mark">i</span><span>Aircraft identity and position are live fleet records. Component-level health is not exposed by the current API.</span></div>
    </> : <EmptyState title="No aircraft found" description="The fleet endpoint returned no aircraft." />}
  </>;
}
