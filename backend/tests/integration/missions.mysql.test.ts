import request from 'supertest';
import type { RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2DataPack,
  cleanupMissionFixture,
  createIntegrationDatabase,
  createMissionFixture,
} from './support/database';

const MISSION_STATUSES = [
  'DRAFT',
  'READY',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
] as const;

type MissionStatus = (typeof MISSION_STATUSES)[number];

interface SeedMissionRow extends RowDataPacket {
  id: number | string;
  drone_id: number | string;
}

interface DroneIdRow extends RowDataPacket {
  id: number | string;
}

interface MissionStatusRow extends RowDataPacket {
  status: MissionStatus;
}

interface NextMissionIdRow extends RowDataPacket {
  next_id: number | string;
}

interface MissionListItem {
  id: number;
  missionCode: string;
  name: string;
  drone: {
    id: number;
    droneCode: string;
    displayName: string;
  };
  status: MissionStatus;
  validationStatus: string;
  progressPercent: number;
  estimatedDistanceM: number;
  createdAt: string;
}

interface MissionListResponse {
  data: MissionListItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface MissionWaypoint {
  sequenceNumber: number;
  waypointType: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  holdTimeSec: number;
}

interface MissionDetailResponse {
  data: {
    id: number;
    status: MissionStatus;
    validationStatus: string;
    drone: {
      id: number;
      droneCode: string;
      displayName: string;
    };
    waypoints: MissionWaypoint[];
  };
}

const integrationDatabase = createIntegrationDatabase();
const app = createApp(integrationDatabase);

let sourceMissionId = 0;
let fixtureMissionId = 0;
let fixtureDroneId = 0;
let fixtureStatus: MissionStatus = 'DRAFT';
let missingMissionId = 0;

async function getMissionList(path: string): Promise<MissionListResponse> {
  const response = await request(app).get(path);

  expect(response.status).toBe(200);
  return response.body as MissionListResponse;
}

describe('Missions MySQL integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(integrationDatabase);

    const [sourceRows] = await integrationDatabase.query<SeedMissionRow[]>(
      `SELECT m.id, m.drone_id
       FROM missions AS m
       WHERE EXISTS (
         SELECT 1 FROM waypoints AS w WHERE w.mission_id = m.id
       )
       ORDER BY m.id ASC
       LIMIT 1`,
    );
    const sourceMission = sourceRows[0];

    if (!sourceMission) {
      throw new Error('Expected a seeded mission with waypoints in Data Pack v2.0.0.');
    }

    sourceMissionId = Number(sourceMission.id);

    const [droneRows] = await integrationDatabase.query<DroneIdRow[]>(
      'SELECT id FROM drones WHERE id <> ? ORDER BY id ASC LIMIT 1',
      [sourceMission.drone_id],
    );
    const alternateDrone = droneRows[0];

    if (!alternateDrone) {
      throw new Error('Expected a second seeded drone for the integration fixture.');
    }

    fixtureDroneId = Number(alternateDrone.id);

    const [statusRows] = await integrationDatabase.query<MissionStatusRow[]>(
      'SELECT DISTINCT status FROM missions',
    );
    const seededStatuses = new Set(statusRows.map(({ status }) => status));
    fixtureStatus = MISSION_STATUSES.find(
      (status) => !seededStatuses.has(status),
    ) ?? 'DRAFT';

    fixtureMissionId = await createMissionFixture(integrationDatabase, {
      sourceMissionId,
      droneId: fixtureDroneId,
    });

    await integrationDatabase.execute(
      'UPDATE missions SET status = ? WHERE id = ?',
      [fixtureStatus, fixtureMissionId],
    );

    const [nextIdRows] = await integrationDatabase.query<NextMissionIdRow[]>(
      'SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM missions',
    );
    const nextIdRow = nextIdRows[0];

    if (!nextIdRow) {
      throw new Error('Could not determine an unused mission ID.');
    }

    missingMissionId = Number(nextIdRow.next_id);
  });

  afterAll(async () => {
    try {
      if (fixtureMissionId > 0) {
        await cleanupMissionFixture(integrationDatabase, fixtureMissionId);
      }
    } finally {
      await integrationDatabase.end();
    }
  });

  it('lists seeded missions in stable order and returns the requested page windows', async () => {
    const allMissions = await getMissionList('/api/missions?page=1&pageSize=100');

    expect(allMissions).toMatchObject({ page: 1, pageSize: 100, total: 21 });
    expect(allMissions.data).toHaveLength(21);

    const expectedOrder = [...allMissions.data]
      .sort((left, right) => (
        right.createdAt.localeCompare(left.createdAt) || right.id - left.id
      ))
      .map(({ id }) => id);

    expect(allMissions.data.map(({ id }) => id)).toEqual(expectedOrder);

    const firstPage = await getMissionList('/api/missions?page=1&pageSize=7');
    const secondPage = await getMissionList('/api/missions?page=2&pageSize=7');

    expect(firstPage).toMatchObject({ page: 1, pageSize: 7, total: 21 });
    expect(secondPage).toMatchObject({ page: 2, pageSize: 7, total: 21 });
    expect(firstPage.data.map(({ id }) => id)).toEqual(
      allMissions.data.slice(0, 7).map(({ id }) => id),
    );
    expect(secondPage.data.map(({ id }) => id)).toEqual(
      allMissions.data.slice(7, 14).map(({ id }) => id),
    );
  });

  it('applies drone and status filters, including when combined', async () => {
    const allMissions = await getMissionList('/api/missions?page=1&pageSize=100');

    const expectedForDrone = allMissions.data.filter(
      ({ drone }) => drone.id === fixtureDroneId,
    );
    const byDrone = await getMissionList(
      `/api/missions?droneId=${fixtureDroneId}&page=1&pageSize=100`,
    );

    expect(byDrone.total).toBe(expectedForDrone.length);
    expect(byDrone.data.map(({ id }) => id)).toEqual(
      expectedForDrone.map(({ id }) => id),
    );
    expect(byDrone.data.map(({ id }) => id)).toContain(fixtureMissionId);

    const expectedForStatus = allMissions.data.filter(
      ({ status }) => status === fixtureStatus,
    );
    const byStatus = await getMissionList(
      `/api/missions?status=${fixtureStatus}&page=1&pageSize=100`,
    );

    expect(byStatus.total).toBe(expectedForStatus.length);
    expect(byStatus.data.map(({ id }) => id)).toEqual(
      expectedForStatus.map(({ id }) => id),
    );
    expect(byStatus.data.map(({ id }) => id)).toContain(fixtureMissionId);

    const expectedForBoth = allMissions.data.filter(
      ({ drone, status }) => drone.id === fixtureDroneId && status === fixtureStatus,
    );
    const byBoth = await getMissionList(
      `/api/missions?droneId=${fixtureDroneId}&status=${fixtureStatus}&page=1&pageSize=100`,
    );

    expect(byBoth.total).toBe(expectedForBoth.length);
    expect(byBoth.data.map(({ id }) => id)).toEqual(
      expectedForBoth.map(({ id }) => id),
    );
  });

  it('returns mission detail with its waypoints in sequence order', async () => {
    const sourceResponse = await request(app).get(`/api/missions/${sourceMissionId}`);
    expect(sourceResponse.status).toBe(200);
    const sourceDetail = sourceResponse.body as MissionDetailResponse;

    const fixtureResponse = await request(app).get(`/api/missions/${fixtureMissionId}`);
    expect(fixtureResponse.status).toBe(200);
    const fixtureDetail = fixtureResponse.body as MissionDetailResponse;

    expect(fixtureDetail.data).toMatchObject({
      id: fixtureMissionId,
      status: fixtureStatus,
      validationStatus: 'NOT_CHECKED',
      drone: { id: fixtureDroneId },
    });
    expect(fixtureDetail.data.waypoints.length).toBeGreaterThan(0);

    const sequenceNumbers = fixtureDetail.data.waypoints.map(
      ({ sequenceNumber }) => sequenceNumber,
    );
    expect(sequenceNumbers).toEqual(
      [...sequenceNumbers].sort((left, right) => left - right),
    );

    const waypointData = (waypoint: MissionWaypoint) => ({
      sequenceNumber: waypoint.sequenceNumber,
      waypointType: waypoint.waypointType,
      latitude: waypoint.latitude,
      longitude: waypoint.longitude,
      altitudeM: waypoint.altitudeM,
      holdTimeSec: waypoint.holdTimeSec,
    });

    expect(fixtureDetail.data.waypoints.map(waypointData)).toEqual(
      sourceDetail.data.waypoints.map(waypointData),
    );
  });

  it('returns 404 for a mission that does not exist', async () => {
    const response = await request(app).get(`/api/missions/${missingMissionId}`);

    expect(response.status).toBe(404);
  });
});