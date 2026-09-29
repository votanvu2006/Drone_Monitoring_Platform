import request from 'supertest';
import type { RowDataPacket } from 'mysql2/promise';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2DataPack,
  cleanupMissionFixture,
  createIntegrationDatabase,
  createMissionFixture,
} from './support/database';

interface MissionStateRow extends RowDataPacket {
  validation_status: 'NOT_CHECKED' | 'VALID' | 'INVALID';
  validation_message: string | null;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

const database = createIntegrationDatabase();
const app = createApp(database);
const missionIds: number[] = [];

describe('Airspace MySQL integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(database);
  });

  afterEach(async () => {
    for (const missionId of missionIds.splice(0).reverse()) {
      await cleanupMissionFixture(database, missionId);
    }
    const [rows] = await database.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM missions WHERE mission_code LIKE 'MSN-AIR-IT-%'",
    );
    expect(Number(rows[0]?.total ?? 0)).toBe(0);
  });

  afterAll(async () => {
    await database.end();
  });

  it('returns all active data-pack flight zones as GeoJSON', async () => {
    const response = await request(app).get('/api/flight-zones');

    expect(response.status).toBe(200);
    expect(response.body.type).toBe('FeatureCollection');
    expect(response.body.features).toHaveLength(8);
    expect(response.body.features).toEqual(expect.arrayContaining([
      expect.objectContaining({ properties: expect.objectContaining({ zoneCode: 'ZONE-A01', zoneType: 'ALLOWED' }) }),
      expect.objectContaining({ properties: expect.objectContaining({ zoneCode: 'ZONE-R01', zoneType: 'RESTRICTED' }) }),
    ]));
  });

  it('persists a valid route decision without creating a route alert', async () => {
    const missionId = await createMissionFixture(database, {
      sourceMissionId: 2,
      validationStatus: 'NOT_CHECKED',
      codePrefix: 'MSN-AIR-IT',
    });
    missionIds.push(missionId);

    const response = await request(app).post(`/api/missions/${missionId}/validate`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ missionId, validationStatus: 'VALID', violations: [] });
    const [missions] = await database.query<MissionStateRow[]>(
      'SELECT validation_status, validation_message FROM missions WHERE id = ?',
      [missionId],
    );
    expect(missions[0]?.validation_status).toBe('VALID');
    expect(missions[0]?.validation_message).toContain('inside the allowed airspace');
    const [alerts] = await database.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM alerts
       WHERE mission_id = ? AND rule_code = 'RESTRICTED_FLIGHT_ZONE' AND status = 'ACTIVE'`,
      [missionId],
    );
    expect(Number(alerts[0]?.total ?? 0)).toBe(0);
  });

  it('persists an invalid route decision and its active route alert', async () => {
    const missionId = await createMissionFixture(database, {
      sourceMissionId: 3,
      validationStatus: 'NOT_CHECKED',
      codePrefix: 'MSN-AIR-IT',
    });
    missionIds.push(missionId);

    const response = await request(app).post(`/api/missions/${missionId}/validate`);

    expect(response.status).toBe(200);
    expect(response.body.data.missionId).toBe(missionId);
    expect(response.body.data.validationStatus).toBe('INVALID');
    expect(response.body.data.violations.length).toBeGreaterThan(0);
    const [missions] = await database.query<MissionStateRow[]>(
      'SELECT validation_status, validation_message FROM missions WHERE id = ?',
      [missionId],
    );
    expect(missions[0]?.validation_status).toBe('INVALID');
    const [alerts] = await database.query<RowDataPacket[]>(
      `SELECT source, rule_code, severity, status FROM alerts
       WHERE mission_id = ? AND rule_code = 'RESTRICTED_FLIGHT_ZONE'`,
      [missionId],
    );
    expect(alerts).toEqual([
      expect.objectContaining({ source: 'ROUTE', severity: 'CRITICAL', status: 'ACTIVE' }),
    ]);
  });
});
