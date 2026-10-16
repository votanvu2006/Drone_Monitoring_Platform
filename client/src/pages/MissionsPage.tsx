import { useCallback, useState } from 'react';
import { ArrowRight, Clock3, Route, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState, PageHeading, Pagination, StatusBadge } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { formatDate, formatDistance } from '../lib/format';
import { api } from '../lib/api';

const pageSize = 10;

export function MissionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const load = useCallback(() => api.missions({ page, pageSize, ...(status ? { status } : {}) }), [page, status]);
  const { data, error, loading, refresh } = usePolling(load);
  const missions = data?.data.filter((mission) => `${mission.missionCode} ${mission.name} ${mission.drone.displayName}`.toLowerCase().includes(search.toLowerCase())) ?? [];

  return <>
    <PageHeading eyebrow="MISSION CONTROL" title="Missions" description="Review routes, validate airspace and run the available weather check." action={<span className="api-source"><span className="pulse" /> BACKEND RECORDS</span>} />
    <div className="toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search this page…" aria-label="Search missions on this page" /></label><select className="select-field" aria-label="Filter missions by status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All statuses</option>{['DRAFT', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></div>
    {error && <ErrorState message={error.message} onRetry={refresh} />}
    {loading && !data ? <LoadingState label="Loading missions" /> : missions.length ? <div className="table-panel panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>MISSION</th><th>ASSIGNED AIRCRAFT</th><th>STATUS</th><th>ROUTE VALIDATION</th><th>DISTANCE</th><th>CREATED</th><th /></tr></thead><tbody>{missions.map((mission) => <tr key={mission.id}><td><Link className="table-primary" to={`/missions/${mission.id}`}>{mission.missionCode}<small>{mission.name}</small></Link></td><td><span className="table-drone">{mission.drone.displayName}<small>{mission.drone.droneCode}</small></span></td><td><StatusBadge value={mission.status} /></td><td><StatusBadge value={mission.validationStatus} /></td><td><span className="table-number"><Route size={14} />{formatDistance(mission.estimatedDistanceM)}</span></td><td><span className="table-date"><Clock3 size={13} />{formatDate(mission.createdAt)}</span></td><td><Link className="table-open" to={`/missions/${mission.id}`} aria-label={`Open ${mission.missionCode}`}><ArrowRight size={16} /></Link></td></tr>)}</tbody></table></div><Pagination page={data?.page ?? page} pageSize={data?.pageSize ?? pageSize} total={data?.total ?? 0} onPage={setPage} /></div> : <EmptyState title={search ? 'No matching missions' : 'No missions available'} description={search ? 'Try another code or mission name.' : 'The backend has not returned any mission records.'} />}
    <div className="subtle-callout"><span className="callout-mark">i</span><span>Mission creation and route editing are not exposed by the current API. This view works with persisted backend missions only.</span></div>
  </>;
}
