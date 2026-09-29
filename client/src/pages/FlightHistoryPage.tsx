import { useCallback, useMemo, useState } from 'react';
import { Clock3, Download, Plane, Route, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, PageHeading, Pagination, StatusBadge } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { allDrones, allFlights } from '../lib/api';
import { formatDate, formatDistance, formatDuration, titleCase } from '../lib/format';
import type { Flight } from '../types/api';

const pageSize = 10;
const completedStatuses = ['LANDED', 'ABORTED'] as const;

export function FlightHistoryPage() {
  const [filter, setFilter] = useState('');
  const [droneId, setDroneId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryKey = `${droneId}:${filter}`;
  const loadDrones = useCallback(async () => ({ data: await allDrones() }), []);
  const dronesResource = usePolling(loadDrones, 60_000);
  const load = useCallback(async () => {
    const result = filter ? { result: filter } : {};
    const aircraft = droneId ? { droneId: Number(droneId) } : {};
    const pages = await Promise.all(completedStatuses.map((status) => allFlights({ status, ...result, ...aircraft })));
    return { queryKey, flights: pages.flat().sort((left, right) => (right.endedAt || '').localeCompare(left.endedAt || '') || right.id - left.id) };
  }, [filter, droneId, queryKey]);
  const historyResource = usePolling<{ queryKey: string; flights: Flight[] }>(load, 30_000);
  const data = historyResource.data?.queryKey === queryKey ? historyResource.data.flights : null;
  const { error, loading, refresh } = historyResource;
  const flights = useMemo(() => (data ?? []).filter((flight) => `${flight.flightCode} ${flight.mission.name} ${flight.drone.displayName} ${flight.scenarioCode}`.toLowerCase().includes(search.toLowerCase())), [data, search]);
  const pageCount = Math.max(1, Math.ceil(flights.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleFlights = flights.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalDistance = flights.reduce((total, flight) => total + flight.distanceM, 0);
  const totalDuration = flights.reduce((total, flight) => total + flight.durationSec, 0);

  const changeSearch = (value: string) => { setSearch(value); setPage(1); };
  const changeFilter = (event: React.ChangeEvent<HTMLSelectElement>) => { setFilter(event.target.value); setPage(1); };
  const changeDrone = (event: React.ChangeEvent<HTMLSelectElement>) => { setDroneId(event.target.value); setPage(1); };

  return <>
    <PageHeading eyebrow="FLIGHT RECORDS" title="Flight history" description="Completed and aborted flight attempts recorded by the backend." action={<div className="history-total"><span>FLIGHTS IN VIEW</span><b>{flights.length}</b></div>} />
    <div className="history-summary"><div><span className="history-icon"><Plane size={16} /></span><div><small>FLIGHTS IN VIEW</small><b>{flights.length}</b></div></div><div><span className="history-icon"><Route size={16} /></span><div><small>ROUTE DISTANCE</small><b>{formatDistance(totalDistance)}</b></div></div><div><span className="history-icon"><Clock3 size={16} /></span><div><small>FLIGHT TIME</small><b>{formatDuration(totalDuration)}</b></div></div></div>
    <div className="toolbar history-toolbar">
      <label className="search-field"><Search size={16} /><input value={search} onChange={(event) => changeSearch(event.target.value)} placeholder="Search flight, mission or scenario…" aria-label="Search flight history" /></label>
      <select className="select-field" aria-label="Filter flight result" value={filter} onChange={changeFilter}><option value="">All results</option><option value="SUCCESS">Success</option><option value="RETURNED_SAFELY">Returned safely</option><option value="FAILED">Failed</option></select>
      <select className="select-field" aria-label="Filter flights by aircraft" value={droneId} onChange={changeDrone}><option value="">All aircraft</option>{(dronesResource.data?.data ?? []).map((drone) => <option value={drone.id} key={drone.id}>{drone.displayName} · {drone.droneCode}</option>)}</select>
    </div>
    {dronesResource.error && <ErrorState message={`Aircraft filter unavailable: ${dronesResource.error.message}`} onRetry={dronesResource.refresh} />}
    {error && <ErrorState message={error.message} onRetry={refresh} />}
    {loading && !data ? <LoadingState label="Loading complete flight history" /> : visibleFlights.length ? <div className="history-table panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>FLIGHT / SCENARIO</th><th>MISSION</th><th>RESULT</th><th>DISTANCE</th><th>DURATION</th><th>STARTED</th><th>ENDED</th></tr></thead><tbody>{visibleFlights.map((flight) => <FlightRow key={flight.id} flight={flight} />)}</tbody></table></div><div className="history-footnote"><Download size={14} /> Showing {visibleFlights.length} of {flights.length} matching completed flights across all backend pages. Detailed replay and export are not available in this API version.</div><Pagination page={currentPage} pageSize={pageSize} total={flights.length} onPage={setPage} /></div> : loading ? <LoadingState label="Loading complete flight history" /> : <EmptyState title="No flight history found" description={search ? 'Try a different search term, aircraft or result filter.' : 'Flight attempts appear here after they are created by the backend.'} />}
    <div className="subtle-callout"><span className="callout-mark">i</span><span>Flight details, telemetry replay and CSV export are not exposed by the current backend API; this page does not invent historical data.</span></div>
  </>;
}

function FlightRow({ flight }: { flight: Flight }) {
  return <tr><td><span className="table-primary static">{flight.flightCode}<small>{titleCase(flight.scenarioCode)}</small></span></td><td><span className="table-primary static">{flight.mission.name}<small>{flight.mission.missionCode} · {flight.drone.displayName}</small></span></td><td><StatusBadge value={flight.result || flight.status} /></td><td><span className="table-number"><Route size={14} />{formatDistance(flight.distanceM)}</span></td><td>{formatDuration(flight.durationSec)}</td><td>{formatDate(flight.startedAt)}</td><td>{formatDate(flight.endedAt)}</td></tr>;
}
