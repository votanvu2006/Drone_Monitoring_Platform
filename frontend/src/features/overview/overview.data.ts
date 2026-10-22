import { alertSeeds, droneSeeds, flightSeeds, missionSeeds } from '../../data/seeds';
import { formatSeedTime, toUtcIso } from '../../data/format';

type OverviewSource = {
  drones: readonly typeof droneSeeds[number][];
  missions: readonly typeof missionSeeds[number][];
  flights: readonly typeof flightSeeds[number][];
  alerts: readonly typeof alertSeeds[number][];
};
const seedSource: OverviewSource = { drones: droneSeeds, missions: missionSeeds, flights: flightSeeds, alerts: alertSeeds };
const activeStatuses = new Set(['FLYING', 'PAUSED', 'RETURNING']);

export function buildOverviewSnapshot(source: OverviewSource = seedSource) {
  const activeFlights = source.flights.filter(flight => activeStatuses.has(flight.status));
  const activeAlerts = source.alerts.filter(alert => alert.status === 'ACTIVE');
  const countStatus = (records: readonly { status: string }[], status: string) => records.filter(record => record.status === status).length;
  const recentActivity = [
    ...source.alerts.map(alert => ({
      id: 'alert-' + alert.id, title: alert.alert_code + ' · ' + alert.severity.toLowerCase() + ' alert',
      detail: alert.message, timestamp: alert.detected_at,
    })),
    ...source.flights.filter(flight => flight.ended_at !== null).map(flight => ({
      id: 'flight-' + flight.id, title: flight.flight_code + ' · ' + flight.status.toLowerCase(),
      detail: flight.result ?? 'Flight ended', timestamp: flight.ended_at ?? flight.started_at,
    })),
  ].sort((a,b) => b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id)).slice(0,5)
    .map(event => ({ ...event, time: formatSeedTime(event.timestamp), isoTime: toUtcIso(event.timestamp) }));
  const flight = [...activeFlights].sort((a,b) => b.started_at.localeCompare(a.started_at))[0];
  const mission = source.missions.find(item => item.id === flight?.mission_id);
  const drone = source.drones.find(item => item.id === flight?.drone_id);
  return {
    fleet: { total: source.drones.length, detail: countStatus(source.drones,'AVAILABLE') + ' available · ' + countStatus(source.drones,'IN_FLIGHT') + ' in flight · ' + countStatus(source.drones,'OFFLINE') + ' offline' },
    missions: { total: source.missions.length, detail: countStatus(source.missions,'RUNNING') + ' running · ' + countStatus(source.missions,'READY') + ' ready · ' + countStatus(source.missions,'DRAFT') + ' draft' },
    flights: { total: activeFlights.length, detail: activeFlights.length === 0 ? 'No flights in progress' : activeFlights.length + ' flights in progress' },
    alerts: { total: activeAlerts.length },
    alertDetail: activeAlerts.filter(alert => alert.severity === 'CRITICAL').length + ' critical · ' + activeAlerts.filter(alert => alert.severity === 'WARNING').length + ' warning',
    activeFlight: flight ? { code: flight.flight_code, status: flight.status, missionName: mission?.name ?? 'Mission not recorded', droneName: drone?.display_name ?? 'Aircraft not recorded' } : null,
    recentActivity,
  };
}
export type OverviewSnapshot = ReturnType<typeof buildOverviewSnapshot>;
export const overviewSnapshot = buildOverviewSnapshot();
