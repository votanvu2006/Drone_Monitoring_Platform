import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2DataPack,
  createIntegrationDatabase,
} from './support/database';

const integrationDatabase = createIntegrationDatabase();
const app = createApp(integrationDatabase);

describe('Fleet MySQL v2.1.0 integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(integrationDatabase);
  });

  afterAll(async () => {
    await integrationDatabase.end();
  });

  it('reads the five R5 drones before power is switched on', async () => {
    const response = await request(app).get('/api/drones');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 5,
    });
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data).toMatchObject([
      { droneCode: 'DRONE-001', status: 'OFFLINE', batteryPercent: 100 },
      { droneCode: 'DRONE-002', status: 'OFFLINE', batteryPercent: 100 },
      {
        droneCode: 'DRONE-003',
        status: 'OFFLINE',
        batteryPercent: 100,
        activeMission: null,
      },
      { droneCode: 'DRONE-004', status: 'OFFLINE', batteryPercent: 100 },
      { droneCode: 'DRONE-005', status: 'OFFLINE', batteryPercent: 100 },
    ]);
    expect(response.body.data[1].findings).toMatchObject([{
      id: 'FINDING-002',
      droneCode: 'DRONE-002',
      componentCode: 'AVX1-MOTOR-FRONT_LEFT',
      severity: 'WARNING',
    }]);
    expect(response.body.data[2].findings).toEqual([]);
  });

  it('filters and paginates the five OFFLINE drones', async () => {
    const response = await request(app)
      .get('/api/drones?status=OFFLINE&page=2&pageSize=2');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [
        { droneCode: 'DRONE-003', status: 'OFFLINE' },
        { droneCode: 'DRONE-004', status: 'OFFLINE' },
      ],
      page: 2,
      pageSize: 2,
      total: 5,
    });
  });

  it('reads DRONE-002 installed components and its own finding', async () => {
    const response = await request(app).get('/api/drones/DRONE-002');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      code: 'DRONE-002',
      status: 'OFFLINE',
      isActivated: false,
      batteryPercent: 100,
      modelCode: 'AV-X1E',
      findings: [{
        id: 'FINDING-002',
        droneCode: 'DRONE-002',
        missionCode: 'mission-002',
        componentCode: 'AVX1-MOTOR-FRONT_LEFT',
        severity: 'WARNING',
        detectedAt: '2026-10-21T06:08:00.000Z',
      }],
    });
    expect(response.body.data.components).toHaveLength(14);
    expect(response.body.data.components).toContainEqual(
      expect.objectContaining({
        code: 'AVX1-MOTOR-FRONT_LEFT',
        serialNumber: 'DRONE-002-AVX1-MOTOR-FRONT_LEFT',
        healthStatus: 'WARNING',
      }),
    );
  });

  it('keeps DRONE-003 offline without borrowing DRONE-002 findings', async () => {
    const response = await request(app).get('/api/drones/DRONE-003');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      code: 'DRONE-003',
      status: 'OFFLINE',
      isActivated: false,
      batteryPercent: 100,
      findings: [],
    });
    expect(response.body.data.components).toHaveLength(14);
  });

  it('returns 404 for a missing drone', async () => {
    const response = await request(app).get('/api/drones/DRONE-999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DRONE_NOT_FOUND');
  });
});