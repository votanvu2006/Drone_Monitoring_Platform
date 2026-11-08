import snapshot from '../../../data/frontend.snapshot.json' with { type: 'json' };
import type { LiveFlightSnapshot } from '../features/flight-operations/live/liveFlight.types';

// R5 starts with no active flights. This fixture represents DRONE-003
// after its demo power scenario has been activated.
export const activatedFlight: LiveFlightSnapshot = {
  flightCode: 'FLIGHT-015',
  missionCode: 'mission-003',
  droneCode: 'DRONE-003',
  flightStatus: 'IN_PROGRESS',
  routeName: 'Activated demo route',
  currentWaypointIndex: 2,
  routeProgressPercent: 25,
  waypoints: snapshot.historyDetails
    .find((row) => row.flightCode === 'FLIGHT-014')!
    .waypoints.map((point, index) => ({
      ...point,
      label: index === 0 ? 'Launch' : `Waypoint ${index + 1}`,
    })),
};

export const apiAlertRows = snapshot.alerts.map((alert, index) => ({
  id: index + 1,
  alert_code: alert.alertCode,
  title: alert.title,
  drone_code: alert.droneCode,
  mission_code: alert.missionCode,
  message: alert.problemDescription,
  severity: alert.severity,
  source_group: alert.sourceGroup,
  detected_at: alert.detectedAt,
  resolution_note: alert.resolutionNote,
  status: 'ACTIVE',
  flight_id: null,
}));

export function apiFixture(
  path: string,
  poweredCodes = snapshot.fleet.drones.map((drone) => drone.code),
) {
  const url = new URL(path, 'http://localhost');
  const visible = (code: string) => poweredCodes.includes(code);

  const paginated = <T,>(rows: T[]) => {
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 100);

    return {
      data: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    };
  };

  if (url.pathname === '/api/drones') {
    return paginated(
      snapshot.fleet.drones.map((drone) => ({
        droneCode: drone.code,
        status: visible(drone.code)
          ? drone.code === 'DRONE-003'
            ? 'IN_FLIGHT'
            : drone.code === 'DRONE-002'
              ? 'MAINTENANCE'
              : 'AVAILABLE'
          : 'OFFLINE',
        batteryPercent: 100,
        model: { modelName: drone.modelName },
        homeLocation: { label: drone.homeBase },
        lastKnownLocation: { label: drone.lastKnownLocation },
        activeMission:
          visible(drone.code) && drone.code === 'DRONE-003'
            ? 'mission-003'
            : drone.activeMission,
        findings: snapshot.fleet.findings.filter(
          (finding) => finding.droneCode === drone.code,
        ),
      })),
    );
  }

  if (url.pathname.startsWith('/api/drones/')) {
    const droneCode = decodeURIComponent(
      url.pathname.slice('/api/drones/'.length),
    );
    const detail = snapshot.details.find(
      (drone) => drone.code === droneCode,
    );

    return detail
      ? {
          data: {
            ...detail,
            status: visible(droneCode)
              ? droneCode === 'DRONE-003'
                ? 'IN_FLIGHT'
                : droneCode === 'DRONE-002'
                  ? 'MAINTENANCE'
                  : 'AVAILABLE'
              : 'OFFLINE',
            isActivated: visible(droneCode),
            batteryPercent: 100,
          },
        }
      : null;
  }

  if (url.pathname === '/api/flights/active') {
    return {
      data: visible('DRONE-003') ? [activatedFlight] : [],
    };
  }

  if (url.pathname === '/api/flights/history') {
    return {
      data: snapshot.history.filter((row) => visible(row.droneCode)),
    };
  }

  if (url.pathname === '/api/missions') {
    return paginated(
      snapshot.missions
        .filter((row) => visible(row.droneCode))
        .map((row) => ({
          id: Number(row.id.split('-')[1]),
          missionCode: row.id,
          name: row.name,
          drone: { droneCode: row.droneCode },
          status:
            row.droneCode === 'DRONE-003'
              ? 'IN_PROGRESS'
              : row.status,
          waypointCount: row.waypointCount,
          createdAt: row.createdAt
            .replace('T', ' ')
            .replace('.000Z', ''),
        })),
    );
  }

  if (url.pathname === '/api/alerts') {
    return paginated(
      apiAlertRows.filter(
        (row) =>
          visible(row.drone_code) &&
          (!url.searchParams.has('droneCode') ||
            row.drone_code === url.searchParams.get('droneCode')) &&
          (!url.searchParams.has('missionCode') ||
            row.mission_code === url.searchParams.get('missionCode')),
      ),
    );
  }

  const flightDetail = snapshot.historyDetails.find(
    (flight) =>
      url.pathname === `/api/flights/${flight.flightCode}` &&
      visible(flight.droneCode),
  );

  return flightDetail ? { data: flightDetail } : null;
}

export async function mockApiFetch(input: RequestInfo | URL) {
  const body = apiFixture(String(input));

  return new Response(JSON.stringify(body), {
    status: body ? 200 : 404,
    headers: { 'Content-Type': 'application/json' },
  });
}