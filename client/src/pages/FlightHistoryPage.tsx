import { useCallback, useMemo, useState } from 'react';
import { Clock3, Download, Plane, Route, Search } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, PageHeading, StatusBadge } from '../components/ui';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { formatDate, formatDistance, formatDuration, titleCase } from '../lib/format';
import type { Flight } from '../types/api';

export function FlightHistoryPage() {
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const load = useCallback(() => api.flights({ page: 1, pageSize: 100, ...(filter ? { result: filter } : {}) }), [filter]);
  const { data, error, loading, refresh } = usePolling(load, 30_000);
  const flights = useMemo(() => (data?.data ?? []).filter((flight) => ['LANDED', 'ABORTED'].includes(flight.status)).filter((flight) => `${flight.flightCode} ${flight.mission.name} ${flight.drone.displayName} ${flight.scenarioCode}`.toLowerCase().includes(search.toLowerCase())), [data, search]);
  const totalDistance = flights.reduce((total, flight) => total + flight.distanceM, 0);
  const totalDuration = flights.reduce((total, flight) => total + flight.durationSec, 0);

  return <>
    <PageHeading eyebrow="FLIGHT RECORDS" title="Flight history" description="Completed and aborted flight attempts recorded by the backend." action={<div className="history-total"><span>VISIBLE RECORDS</span><b>{flights.length}</b></div>} />
    <div className="history-summary"><div><span className="history-icon"><Plane size={16} /></span><div><small>FLIGHTS IN VIEW</small><b>{flights.length}</b></div></div><div><span className="history-icon"><Route size={16} /></span><div><small>ROUTE DISTANCE</small><b>{formatDistance(totalDistance)}</b></div></div><div><span className="history-icon"><Clock3 size={16} /></span><div><small>FLIGHT TIME</small><b>{formatDuration(totalDuration)}</b></div></div></div>
    <div className="toolbar history-toolbar"><label className="search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search flight, mission or scenario…" aria-label="Search flight history" /></label><select className="select-field" aria-label="Filter flight result" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All results</option><option value="SUCCESS">Success</option><option value="RETURNED_SAFELY">Returned safely</option><option value="FAILED">Failed</option></select></div>
    {error && <ErrorState message={error.message} onRetry={refresh} />}
    {loading && !data ? <LoadingState label="Loading flight history" /> : flights.length ? <div className="history-table panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>FLIGHT / SCENARIO</th><th>MISSION</th><th>RESULT</th><th>DISTANCE</th><th>DURATION</th><th>STARTED</th><th>ENDED</th></tr></thead><tbody>{flights.map((flight) => <FlightRow key={flight.id} flight={flight} />)}</tbody></table></div><div className="history-footnote"><Download size={14} /> Showing the latest {data?.data.length || 0} records returned by <code>/api/flights</code>. Detailed replay and export are not available in this API version.</div></div> : <EmptyState title="No flight history found" description={search ? 'Try a different search term or result filter.' : 'Flight attempts appear here after they are created by the backend.'} />}
    <div className="subtle-callout"><span className="callout-mark">i</span><span>Flight details, telemetry replay and CSV export are not exposed by the current backend API; this page does not invent historical data.</span></div>
  </>;
}

function FlightRow({ flight }: { flight: Flight }) {
  return <tr><td><span className="table-primary static">{flight.flightCode}<small>{titleCase(flight.scenarioCode)}</small></span></td><td><span className="table-primary static">{flight.mission.name}<small>{flight.mission.missionCode} · {flight.drone.displayName}</small></span></td><td><StatusBadge value={flight.result || flight.status} /></td><td><span className="table-number"><Route size={14} />{formatDistance(flight.distanceM)}</span></td><td>{formatDuration(flight.durationSec)}</td><td>{formatDate(flight.startedAt)}</td><td>{formatDate(flight.endedAt)}</td></tr>;
}
