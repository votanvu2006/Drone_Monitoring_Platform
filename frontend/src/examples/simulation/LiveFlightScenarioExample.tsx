import { PageHeading, StatusBadge } from '../../components/ui';
import { FlightScenarioPanel } from '../../features/simulation/FlightScenarioPanel';
import { previewFlightContext } from '../../features/simulation/scenario.data';

export function LiveFlightScenarioExample() {
  const flight = previewFlightContext;
  return <main className="page-content"><section aria-label="Live Flight workspace">
    <PageHeading eyebrow="OPERATIONS / LIVE FLIGHT" title="Live Flight"
      description="Recorded flight context and predefined scenario event summaries."
      accessory={flight && <StatusBadge tone="neutral">{flight.status}</StatusBadge>} />
    {flight ? <div className="context-strip">
      <div><small>Recorded flight</small><strong>{flight.code}</strong></div>
      <div><small>Mission</small><strong>{flight.missionName}</strong></div>
      <div><small>Aircraft</small><strong>{flight.droneName}</strong></div>
      <div><small>Recorded duration</small><strong>{flight.duration}</strong></div>
    </div> : <p>No recorded flight context.</p>}
    <FlightScenarioPanel />
  </section></main>;
}
