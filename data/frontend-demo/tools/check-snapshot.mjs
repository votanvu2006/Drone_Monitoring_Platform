import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSnapshot } from './build-snapshot.mjs';
const root = new URL('../', import.meta.url);
const tables = JSON.parse(await readFile(new URL('records.json', root), 'utf8'));
const snapshot = JSON.parse(await readFile(new URL('frontend.snapshot.json', root), 'utf8'));
assert.deepEqual(snapshot, buildSnapshot(tables));
assert.equal(snapshot.missions.length, 5);
assert.equal(snapshot.activeFlights.length, 1);
assert.equal(snapshot.history.length, 3);
assert.equal(snapshot.alerts.length, 2);
assert.equal(snapshot.fleet.findings.length, 1);
for (const flight of [...snapshot.activeFlights, ...snapshot.history]) {
  const mission = tables.missions.find(item => item.mission_code === flight.missionCode);
  const drone = tables.drones.find(item => item.drone_code === flight.droneCode);
  assert.equal(Number(mission.drone_id), Number(drone.id));
  assert(![2, 5].includes(Number(mission.id)));
}
for (const detail of snapshot.historyDetails) {
  const record = snapshot.history.find(item => item.flightCode === detail.flightCode);
  assert(record);
  assert(detail.events.length >= 2);
  assert.equal((Date.parse(detail.events.at(-1).occurredAt) - Date.parse(detail.startedAt)) / 1000, detail.durationSeconds);
}
assert.equal(snapshot.activeFlights[0].missionCode, 'mission-003');
assert.equal(snapshot.details.find(item => item.code === 'DRONE-002').findings[0].componentCode,
  snapshot.fleet.findings[0].componentCode);
for (const table of Object.values(tables)) assert(Array.isArray(table));
const flyingDrone = tables.drones.find(item => Number(item.id) === 3);
const lastDelivered = tables.telemetry.filter(item => Number(item.flight_id) === 15).sort((a, b) => Number(a.sequence_number) - Number(b.sequence_number)).at(-1);
assert.equal(Number(flyingDrone.last_known_latitude), Number(lastDelivered.latitude));
assert.equal(Number(flyingDrone.last_known_longitude), Number(lastDelivered.longitude));
assert.equal(Number(flyingDrone.last_known_altitude_m), Number(lastDelivered.altitude_m));
console.log('PASS: frontend snapshot, mission/flight ownership, preflight exclusion and complete history details.');
