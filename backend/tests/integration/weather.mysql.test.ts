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

interface WeatherCheckRow extends RowDataPacket {
  validation_run_id: string;
  location_type: 'START' | 'ROUTE_MIDPOINT' | 'DESTINATION';
  source_kind: 'SIMULATED_FIXTURE';
  recommendation: 'SAFE' | 'CAUTION' | 'UNSAFE';
  ttl_seconds: number | string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

const database = createIntegrationDatabase();
const app = createApp(database);
const missionIds: number[] = [];

describe('Weather MySQL integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(database);
  });

  afterEach(async () => {
    for (const missionId of missionIds.splice(0).reverse()) {
      await cleanupMissionFixture(database, missionId);
    }
    const [rows] = await database.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM missions WHERE mission_code LIKE 'MSN-WEA-IT-%'",
    );
    expect(Number(rows[0]?.total ?? 0)).toBe(0);
  });

  afterAll(async () => {
    await database.end();
  });

  it('serves the assigned DEMO profile from MySQL', async () => {
    const response = await request(app).get('/api/weather/current?lat=10.7769&lng=106.7009&droneId=1');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      mode: 'DEMO',
      sourceKind: 'SIMULATED_FIXTURE',
      profileCode: 'DEMO_SAFE',
      recommendation: 'SAFE',
    });
  });

  it('persists one fresh SAFE validation run for START, midpoint and destination', async () => {
    const missionId = await createMissionFixture(database, {
      sourceMissionId: 2,
      validationStatus: 'VALID',
      codePrefix: 'MSN-WEA-IT',
    });
    missionIds.push(missionId);

    const response = await request(app).post(`/api/missions/${missionId}/weather-check`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      missionId,
      mode: 'DEMO',
      recommendation: 'SAFE',
      requiresAcknowledgement: false,
      launchAllowed: true,
    });
    expect(response.body.data.samples).toHaveLength(3);
    const validationRunId = response.body.data.validationRunId as string;
    const [checks] = await database.query<WeatherCheckRow[]>(
      `SELECT validation_run_id, location_type, source_kind, recommendation,
       TIMESTAMPDIFF(SECOND, checked_at, expires_at) AS ttl_seconds
       FROM weather_checks WHERE mission_id = ? ORDER BY id`,
      [missionId],
    );
    expect(checks).toHaveLength(3);
    expect(checks.map((check) => check.location_type)).toEqual(['START', 'ROUTE_MIDPOINT', 'DESTINATION']);
    expect(checks.every((check) => check.validation_run_id === validationRunId)).toBe(true);
    expect(checks.every((check) => check.source_kind === 'SIMULATED_FIXTURE')).toBe(true);
    expect(checks.every((check) => check.recommendation === 'SAFE')).toBe(true);
    expect(checks.every((check) => Number(check.ttl_seconds) === 600)).toBe(true);
    const [alerts] = await database.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM alerts
       WHERE mission_id = ? AND rule_code IN ('WEATHER_CAUTION', 'UNSAFE_WEATHER') AND status = 'ACTIVE'`,
      [missionId],
    );
    expect(Number(alerts[0]?.total ?? 0)).toBe(0);
  });

  it('persists CAUTION snapshots and creates the acknowledgement alert', async () => {
    const missionId = await createMissionFixture(database, {
      sourceMissionId: 5,
      validationStatus: 'VALID',
      codePrefix: 'MSN-WEA-IT',
    });
    missionIds.push(missionId);

    const response = await request(app).post(`/api/missions/${missionId}/weather-check`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      missionId,
      recommendation: 'CAUTION',
      requiresAcknowledgement: true,
      launchAllowed: true,
    });
    const [checks] = await database.query<WeatherCheckRow[]>(
      `SELECT validation_run_id, location_type, source_kind, recommendation,
       TIMESTAMPDIFF(SECOND, checked_at, expires_at) AS ttl_seconds
       FROM weather_checks WHERE mission_id = ? ORDER BY id`,
      [missionId],
    );
    expect(checks).toHaveLength(3);
    expect(checks.every((check) => check.recommendation === 'CAUTION')).toBe(true);
    const [alerts] = await database.query<RowDataPacket[]>(
      `SELECT source, rule_code, severity, status FROM alerts
       WHERE mission_id = ? AND rule_code = 'WEATHER_CAUTION'`,
      [missionId],
    );
    expect(alerts).toEqual([
      expect.objectContaining({ source: 'WEATHER', severity: 'WARNING', status: 'ACTIVE' }),
    ]);
  });
});
