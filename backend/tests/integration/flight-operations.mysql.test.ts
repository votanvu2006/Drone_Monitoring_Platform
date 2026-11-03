import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { assertV2DataPack, createIntegrationDatabase } from './support/database';

const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), '../data/frontend.snapshot.json'), 'utf8'));
const database = createIntegrationDatabase();
const app = createApp(database);

describe('Flight Operations MySQL v2.1.0', () => {
  beforeAll(async () => { await assertV2DataPack(database); });
  afterAll(async () => { await database.end(); });

  it('returns exactly the active snapshot with the correct mission route and progress', async () => {
    const response = await request(app).get('/api/flights/active');
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(snapshot.activeFlights.length);
    expect(response.body.data).toMatchObject(snapshot.activeFlights);
    expect(response.body.data[0]).toMatchObject({ status: 'FLYING', routeProgressPercent: 43 });
  });

  it('returns only real ended flights, excluding blocked preflight missions', async () => {
    const response = await request(app).get('/api/flights/history');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(snapshot.history);
    expect(response.body.data.some((flight: { missionCode: string }) =>
      ['mission-002', 'mission-005'].includes(flight.missionCode))).toBe(false);
  });

  it('loads every detail with telemetry and events belonging to that flight', async () => {
    for (const detail of snapshot.historyDetails) {
      const response = await request(app).get(`/api/flights/${detail.flightCode}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(detail);
    }
    expect((await request(app).get('/api/flights/FLIGHT-015')).status).toBe(404);
    expect((await request(app).get('/api/flights/UNKNOWN')).status).toBe(404);
  });

  it('keeps the paginated flight list and combined filters working with v2.1.0', async () => {
    const first = await request(app).get('/api/flights?pageSize=2');
    const second = await request(app).get('/api/flights?pageSize=2&page=2');
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ total: 5, page: 1, pageSize: 2 });
    expect(second.body.data).toHaveLength(2);
    expect(new Set([...first.body.data, ...second.body.data].map(item => item.flightCode)).size).toBe(4);
    const all = await request(app).get('/api/flights');
    const selected = all.body.data.find((item: { flightCode: string }) => item.flightCode === 'FLIGHT-014');
    const filtered = await request(app).get(`/api/flights?droneId=${selected.drone.id}&missionId=${selected.mission.id}&status=LANDED&result=SUCCESS`);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.data[0].flightCode).toBe('FLIGHT-014');
    expect((await request(app).get('/api/flights?droneId=999999')).body.data).toEqual([]);
  });
});
