import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSnapshot } from './build-snapshot.mjs';

const root = new URL('../', import.meta.url);
const tables = JSON.parse(await readFile(new URL('records.json', root), 'utf8'));
const snapshot = JSON.parse(
  await readFile(new URL('frontend.snapshot.json', root), 'utf8'),
);

assert.deepEqual(snapshot, buildSnapshot(tables));
assert.equal(snapshot.metadata.buildId, 'DRONE-DATA-2.1.0-R6-20261109');
assert.equal(snapshot.missions.length, 5);
assert.equal(snapshot.activeFlights.length, 0);
assert.equal(snapshot.history.length, 1);
assert.equal(snapshot.historyDetails.length, 1);
assert.equal(snapshot.alerts.length, 3);

assert.deepEqual(snapshot.history.map((flight) => flight.flightCode), [
  'FLIGHT-004',
]);
assert.deepEqual(snapshot.history[0], {
  flightCode: 'FLIGHT-004',
  droneCode: 'DRONE-004',
  missionCode: 'mission-004',
  status: 'COMPLETED',
  startedAt: '2026-10-12T03:05:00.000Z',
  durationSeconds: 945,
});

const completed = snapshot.historyDetails[0];
assert.equal(completed.flightCode, 'FLIGHT-004');
assert.equal(completed.telemetry.averageSpeedMps, 3.17);
assert.deepEqual(completed.events.map((event) => event.title), [
  'Flight started',
  'Route completed',
]);

assert.equal(snapshot.fleet.findings.length, 1);
assert.equal(snapshot.fleet.drones.filter((drone) => drone.status === 'OFFLINE').length, 5);
assert.equal(snapshot.details.find((drone) => drone.code === 'DRONE-003').isActivated, false);

for (const flight of [...snapshot.activeFlights, ...snapshot.history]) {
  const mission = tables.missions.find(
    (item) => item.mission_code === flight.missionCode,
  );
  const drone = tables.drones.find(
    (item) => item.drone_code === flight.droneCode,
  );
  assert(mission);
  assert(drone);
  assert.equal(Number(mission.drone_id), Number(drone.id));
  assert.notEqual(Number(mission.id), 5);
}

assert.equal(tables.missions.find((item) => item.mission_code === 'mission-003').status, 'READY');
assert.equal(tables.flights.find((item) => item.flight_code === 'FLIGHT-003').status, 'READY');
assert.equal(tables.flights.find((item) => item.flight_code === 'FLIGHT-003').mission_id, 3);
assert.equal(tables.flights.find((item) => item.flight_code === 'FLIGHT-004').mission_id, 4);
assert.equal(tables.flights.some((item) => [1, 2, 5].includes(Number(item.drone_id))), false);
assert.equal(tables.telemetry.some((item) => Number(item.flight_id) === 15), false);
assert.equal(tables.flight_events.some((item) => Number(item.flight_id) === 15), false);

for (const table of Object.values(tables)) assert(Array.isArray(table));
console.log('PASS: R6 snapshot, current mission links, active-flight seed and completed history.');