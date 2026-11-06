import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2DataPack,
  createIntegrationDatabase,
} from './support/database';

const integrationDatabase = createIntegrationDatabase();
const app = createApp(integrationDatabase);

describe('Missions MySQL v2.1.0 integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(integrationDatabase);
  });

  afterAll(async () => {
    await integrationDatabase.end();
  });

  it('lists only the five current R5 missions with statuses and waypoint counts', async () => {
    const response = await request(app).get('/api/missions');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 5,
      data: [
        { missionCode: 'mission-001', status: 'READY', waypointCount: 6 },
        { missionCode: 'mission-002', status: 'WARNING', waypointCount: 8 },
        { missionCode: 'mission-003', status: 'READY', waypointCount: 8 },
        { missionCode: 'mission-004', status: 'COMPLETED', waypointCount: 5 },
        { missionCode: 'mission-005', status: 'FAILED', waypointCount: 10 },
      ],
    });
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data.map((mission: { drone: { droneCode: string } }) => (
      mission.drone.droneCode
    ))).toEqual([
      'DRONE-001',
      'DRONE-002',
      'DRONE-003',
      'DRONE-004',
      'DRONE-005',
    ]);
  });

  it('paginates current missions without including history', async () => {
    const response = await request(app)
      .get('/api/missions?page=2&pageSize=2');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 5,
      data: [
        { missionCode: 'mission-003', waypointCount: 8 },
        { missionCode: 'mission-004', waypointCount: 5 },
      ],
    });
  });

  it('filters current missions by drone and R5 status', async () => {
    const response = await request(app)
      .get('/api/missions?droneId=2&status=WARNING');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      total: 1,
      data: [{
        missionCode: 'mission-002',
        status: 'WARNING',
        waypointCount: 8,
        drone: { droneCode: 'DRONE-002' },
      }],
    });

    const ready = await request(app)
      .get('/api/missions?status=READY');

    expect(ready.status).toBe(200);
    expect(ready.body).toMatchObject({
      total: 2,
      data: [
        { missionCode: 'mission-001', status: 'READY' },
        { missionCode: 'mission-003', status: 'READY' },
      ],
    });
  });

  it('reads a current mission detail with its ordered waypoints', async () => {
    const response = await request(app).get('/api/missions/2');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      missionCode: 'mission-002',
      status: 'WARNING',
      drone: { droneCode: 'DRONE-002' },
    });
    expect(response.body.data.waypoints).toHaveLength(8);
    expect(response.body.data.waypoints.map(
      (waypoint: { sequenceNumber: number }) => waypoint.sequenceNumber,
    )).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('keeps historical missions available by detail ID but out of the list', async () => {
    const detail = await request(app).get('/api/missions/10');
    const list = await request(app).get('/api/missions?pageSize=100');

    expect(detail.status).toBe(200);
    expect(detail.body.data).toMatchObject({
      missionCode: 'MISSION-010',
      status: 'COMPLETED',
    });
    expect(detail.body.data.waypoints).toHaveLength(5);

    expect(list.status).toBe(200);
    expect(list.body.total).toBe(5);
    expect(list.body.data.map(
      (mission: { missionCode: string }) => mission.missionCode,
    )).not.toContain('MISSION-010');
  });

  it('returns 404 for an unknown mission', async () => {
    const response = await request(app).get('/api/missions/999999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('MISSION_NOT_FOUND');
  });
});