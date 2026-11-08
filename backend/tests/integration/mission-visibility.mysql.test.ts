import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { assertV2DataPack, createIntegrationDatabase, powerDroneFixture } from './support/database';

const snapshot = JSON.parse(readFileSync(resolve(process.cwd(), '../data/frontend.snapshot.json'), 'utf8'));
const database = createIntegrationDatabase();
const app = createApp(database);

describe('R5 mission visibility for the Missions–Alerts link', () => {
  beforeAll(async () => { await assertV2DataPack(database); });
  afterAll(async () => { await database.end(); });

  it.each(snapshot.fleet.drones.map((drone: { code: string }) => drone.code))('returns the current mission only for powered-on %s', async code => {
    const restore = await powerDroneFixture(database, [code]);
    try {
      const response = await request(app).get('/api/missions?isCurrent=true&pageSize=1');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ total: 1, page: 1, pageSize: 1 });
      const expected = snapshot.missions.find((mission: { droneCode: string }) => mission.droneCode === code);
      expect(response.body.data[0]).toMatchObject({ missionCode: expected.id, status: expected.status, waypointCount: expected.waypointCount, drone: { droneCode: code } });
      expect((await request(app).get('/api/missions?isCurrent=true&pageSize=1&page=2')).body).toMatchObject({ data: [], total: 1 });
      await database.execute("UPDATE drones SET status = 'OFFLINE' WHERE drone_code = ?", [code]);
      expect((await request(app).get('/api/missions?isCurrent=true')).body).toMatchObject({ data: [], total: 0 });
    } finally { await restore(); }
  });

  it('separates current and historical references and combines R5 status filters', async () => {
    const restore = await powerDroneFixture(database, snapshot.fleet.drones.map((drone: { code: string }) => drone.code));
    try {
      expect((await request(app).get('/api/missions')).body.total).toBe(9);
      expect((await request(app).get('/api/missions?isCurrent=true')).body.total).toBe(5);
      expect((await request(app).get('/api/missions?isCurrent=false')).body.total).toBe(4);
      const warning = await request(app).get('/api/missions?isCurrent=true&droneId=2&status=WARNING');
      expect(warning.body.total).toBe(1);
      expect(warning.body.data[0].missionCode).toBe('mission-002');
      const progress = await request(app).get('/api/missions?isCurrent=true&status=IN_PROGRESS');
      expect(progress.status).toBe(200);
      expect(progress.body).toMatchObject({ data: [], total: 0 });
    } finally { await restore(); }
  });
});
