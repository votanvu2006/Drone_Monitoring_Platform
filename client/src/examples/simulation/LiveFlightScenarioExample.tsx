import { activeFlight, drones, missions } from '../../data/fixtures';
import { PageHeading, StatusBadge } from '../../components/ui';
import { FlightScenarioPanel } from './FlightScenarioPanel';

export function LiveFlightScenarioExample() {
  const mission = missions.find((item) => item.id === activeFlight.missionId)!;
  const drone = drones.find((item) => item.id === activeFlight.droneId)!;
  return <section aria-label="Live Flight workspace">
    <PageHeading eyebrow="OPERATIONS / LIVE FLIGHT" title="Live Flight"
      description="Flight context and predefined scenario event summaries."
      accessory={<StatusBadge tone="success">{activeFlight.status}</StatusBadge>} />
    <div className="context-strip">
      <div><small>Flight</small><strong>{activeFlight.id}</strong></div>
      <div><small>Mission</small><strong>{mission.name}</strong></div>
      <div><small>Aircraft</small><strong>{drone.name}</strong></div>
      <div><small>Elapsed time</small><strong>{activeFlight.elapsed}</strong></div>
    </div>
    <FlightScenarioPanel />
  </section>;
}
