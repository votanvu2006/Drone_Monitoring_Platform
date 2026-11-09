import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import type { RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { assertV2DataPack, createIntegrationDatabase, powerDroneFixture } from './support/database';

const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), '../data/frontend.snapshot.json'), 'utf8'));
const database = createIntegrationDatabase();
const app = createApp(database);
const droneCodes = snapshot.fleet.drones.map((drone: { code: string }) => drone.code);

describe('Flight Operations MySQL v2.1.0 R6', () => {
  beforeAll(async () => { await assertV2DataPack(database); });
  afterAll(async () => { await database.end(); });

  it('hides offline records on every read without changing the R6 initial state', async () => {
    for (const path of ['/flights', '/flights/active', '/flights/history']) {
      const response = await request(app).get('/api' + path);
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      if ('total' in response.body) expect(response.body.total).toBe(0);
    }
    expect((await request(app).get('/api/flights/FLIGHT-004')).status).toBe(404);
    const [flights] = await database.query<RowDataPacket[]>('SELECT * FROM flights WHERE id = 15');
    expect(flights[0]).toMatchObject({ status: 'READY', started_at: null, ended_at: null, duration_sec: 0, route_progress_percent: 0 });
    for (const table of ['telemetry', 'flight_events']) {
      const [rows] = await database.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${table} WHERE flight_id = 15`);
      expect(Number(rows[0].total)).toBe(0);
    }
    await assertV2DataPack(database);
  });

  it.each(droneCodes)('exposes only the powered-on history for %s and hides it again on power off', async code => {
    const restore = await powerDroneFixture(database, [code]);
    try {
      const response = await request(app).get('/api/flights/history');
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(snapshot.history.filter((row: { droneCode: string }) => row.droneCode === code));
      const all = await request(app).get('/api/flights');
      expect(all.body.total).toBe(code === 'DRONE-003' || code === 'DRONE-004' ? 1 : 0);
      expect(all.body.data.every((row: { drone: { droneCode: string } }) => row.drone.droneCode === code)).toBe(true);
      // Powering on alone does not start the READY flight in a read request.
      expect((await request(app).get('/api/flights/active')).body.data).toEqual([]);
      for (const detail of snapshot.historyDetails) {
        const result = await request(app).get(`/api/flights/${detail.flightCode}`);
        expect(result.status).toBe(detail.droneCode === code ? 200 : 404);
        if (result.status === 200) expect(result.body.data).toEqual(detail);
      }
      await database.execute("UPDATE drones SET status = 'OFFLINE' WHERE drone_code = ?", [code]);
      expect((await request(app).get('/api/flights/history')).body.data).toEqual([]);
      expect((await request(app).get('/api/flights')).body.total).toBe(0);
    } finally { await restore(); }
  });

  it('reads an activated flight from MySQL without inventing telemetry or starting it during GET', async () => {
    const restore = await powerDroneFixture(database, ['DRONE-003']);
    const [flights] = await database.query<RowDataPacket[]>('SELECT status, started_at, route_progress_percent, current_waypoint_index FROM flights WHERE id = 15');
    const [missions] = await database.query<RowDataPacket[]>('SELECT status, progress_percent FROM missions WHERE id = 3');
    try {
      await database.execute("UPDATE drones SET status = 'IN_FLIGHT' WHERE id = 3");
      await database.execute("UPDATE flights SET status = 'FLYING', started_at = '2026-11-07 01:00:00', route_progress_percent = 25, current_waypoint_index = 2 WHERE id = 15");
      await database.execute("UPDATE missions SET status = 'IN_PROGRESS', progress_percent = 25 WHERE id = 3");
      const response = await request(app).get('/api/flights/active');
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({ flightCode: 'FLIGHT-003', missionCode: 'mission-003', droneCode: 'DRONE-003', status: 'FLYING', flightStatus: 'IN_PROGRESS', routeProgressPercent: 25, currentWaypointIndex: 2 });
      expect(response.body.data[0].waypoints).toHaveLength(8);
      expect((await request(app).get('/api/flights/history')).body.data.map((row: { flightCode: string }) => row.flightCode)).toEqual([]);
      expect((await request(app).get('/api/flights/FLIGHT-003')).status).toBe(404);
    } finally {
      const flight = flights[0]; const mission = missions[0];
      await database.execute('UPDATE flights SET status = ?, started_at = ?, route_progress_percent = ?, current_waypoint_index = ? WHERE id = 15', [flight.status, flight.started_at, flight.route_progress_percent, flight.current_waypoint_index]);
      await database.execute('UPDATE missions SET status = ?, progress_percent = ? WHERE id = 3', [mission.status, mission.progress_percent]);
      await restore();
    }
    await assertV2DataPack(database);
  });

  it('paginates the visible set and combines filters with the correct totals', async () => {
    const restore = await powerDroneFixture(database, droneCodes);
    try {
      const first = await request(app).get('/api/flights?pageSize=1');
      const second = await request(app).get('/api/flights?pageSize=1&page=2');
      expect(first.status).toBe(200);
      expect(first.body).toMatchObject({ total: 2, page: 1, pageSize: 1 });
      expect(second.body.data).toHaveLength(1);
      expect(new Set([...first.body.data, ...second.body.data].map(item => item.flightCode)).size).toBe(2);
      const filtered = await request(app).get('/api/flights?droneId=4&missionId=4&status=LANDED&result=SUCCESS');
      expect(filtered.body.total).toBe(1);
      expect(filtered.body.data[0].flightCode).toBe('FLIGHT-004');
      expect((await request(app).get('/api/flights?droneId=999999')).body.data).toEqual([]);
      expect((await request(app).get('/api/flights/UNKNOWN')).status).toBe(404);
    } finally { await restore(); }
  });
});
