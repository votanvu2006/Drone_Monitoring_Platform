export const operatorProfile = { username: 'operator', initials: 'OP' } as const;

export const drones = [
  { id: 'DRONE-001', name: 'Drone - 001', status: 'IN_FLIGHT' },
  { id: 'DRONE-002', name: 'Drone - 002', status: 'AVAILABLE' },
  { id: 'DRONE-003', name: 'Drone - 003', status: 'AVAILABLE' },
  { id: 'DRONE-004', name: 'Drone - 004', status: 'OFFLINE' },
  { id: 'DRONE-005', name: 'Drone - 005', status: 'AVAILABLE' },
] as const;
export const missions = [
  { id: 'MSN-001', name: 'Riverside inspection', status: 'RUNNING' },
  { id: 'MSN-002', name: 'Campus perimeter survey', status: 'READY' },
  { id: 'MSN-003', name: 'Industrial site mapping', status: 'DRAFT' },
] as const;
export const activeFlight = {
  id: 'FLT-001', missionId: 'MSN-001', droneId: 'DRONE-001',
  status: 'FLYING', progress: 64, elapsed: '08:42', distance: '1.8 km',
};
export const alerts = [
  {
    id: 'ALT-001', title: 'GPS signal lost', severity: 'CRITICAL', status: 'ACTIVE',
    source: 'Simulation', time: '13 Oct 2026, 14:22',
    summary: 'The aircraft lost its GPS fix. The last known position is retained for monitoring.',
    flightId: 'FLT-001', missionId: 'MSN-001', resolutionNote: null,
  },
  {
    id: 'ALT-002', title: 'Wind caution along route', severity: 'WARNING', status: 'ACTIVE',
    source: 'Weather', time: '13 Oct 2026, 14:18',
    summary: 'The midpoint weather example shows stronger wind. Review the preflight weather conditions.',
    flightId: null, missionId: 'MSN-002', resolutionNote: null,
  },
  {
    id: 'ALT-003', title: 'Low battery', severity: 'WARNING', status: 'RESOLVED',
    source: 'Simulation', time: '13 Oct 2026, 13:40',
    summary: 'A previous flight returned safely after reaching the battery warning level.',
    flightId: 'FLT-000', missionId: 'MSN-002',
    resolutionNote: 'Aircraft returned safely. The battery was replaced and inspected.',
  },
  {
    id: 'ALT-004', title: 'Route boundary conflict', severity: 'CRITICAL', status: 'RESOLVED',
    source: 'Airspace', time: '13 Oct 2026, 12:25',
    summary: 'The original route extended beyond the allowed training boundary.',
    flightId: null, missionId: 'MSN-003',
    resolutionNote: 'The route was revised to remain within the allowed boundary.',
  },
] as const;
export const recentActivity = [
  { id: 'activity-1', title: 'GPS incident detected', detail: 'ALT-001 · Riverside inspection', time: '14:22', icon: 'alert' },
  { id: 'activity-2', title: 'Riverside inspection departed', detail: 'FLT-001 · Drone - 001', time: '14:14', icon: 'flight' },
  { id: 'activity-3', title: 'Battery incident resolved', detail: 'ALT-003 · Campus perimeter survey', time: '13:48', icon: 'check' },
] as const;
