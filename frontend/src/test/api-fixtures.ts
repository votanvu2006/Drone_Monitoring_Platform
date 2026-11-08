import snapshot from '../../../data/frontend.snapshot.json' with { type: 'json' };

export function apiFixture(path: string, poweredCodes = snapshot.fleet.drones.map(drone => drone.code)) {
  const url = new URL(path, 'http://localhost');
  const visible = (code: string) => poweredCodes.includes(code);
  const paginated = <T,>(rows: T[]) => {
    const page = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('pageSize') ?? 100);
    return { data: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  };
  if (url.pathname === '/api/missions') return paginated(snapshot.missions.filter(row => visible(row.droneCode)).map(row => ({
    id: Number(row.id.split('-')[1]), missionCode: row.id, name: row.name, drone: { droneCode: row.droneCode },
    status: row.status,
    waypointCount: row.waypointCount, createdAt: row.createdAt.replace('T', ' ').replace('.000Z', ''),
  })));
  return null;
}

export async function mockApiFetch(input: RequestInfo | URL) {
  const body = apiFixture(String(input));
  return new Response(JSON.stringify(body), { status: body ? 200 : 404, headers: { 'Content-Type': 'application/json' } });
}
