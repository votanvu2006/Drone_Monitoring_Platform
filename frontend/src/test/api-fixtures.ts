import snapshot from '../../../data/frontend.snapshot.json' with { type: 'json' };

export const apiAlertRows = snapshot.alerts.map((alert, index) => ({
  id: index + 1, alert_code: alert.alertCode, title: alert.title, drone_code: alert.droneCode,
  mission_code: alert.missionCode, message: alert.problemDescription, severity: alert.severity,
  source_group: alert.sourceGroup, detected_at: alert.detectedAt, resolution_note: alert.resolutionNote,
  status: 'ACTIVE', flight_id: null,
}));

export function apiFixture(path: string) {
  const url = new URL(path, 'http://localhost');
  if (url.pathname === '/api/flights/active') return { data: snapshot.activeFlights };
  if (url.pathname === '/api/flights/history') return { data: snapshot.history };
  if (url.pathname === '/api/alerts') return { data: apiAlertRows, total: apiAlertRows.length, page: 1, pageSize: 100 };
  const detail = snapshot.historyDetails.find(flight => url.pathname === '/api/flights/' + flight.flightCode);
  return detail ? { data: detail } : null;
}

export async function mockApiFetch(input: RequestInfo | URL) {
  const body = apiFixture(String(input));
  return new Response(JSON.stringify(body), { status: body ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
}
