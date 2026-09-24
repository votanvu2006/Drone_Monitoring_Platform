import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { openApiDocument } from '../src/openapi';

function createTestApp(query: ReturnType<typeof vi.fn>) {
  return createApp({ query } as unknown as Pool);
}

function missionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '7',
    mission_code: 'MSN-007',
    name: 'Riverside Survey',
    assigned_drone_id: '2',
    assigned_drone_code: 'DRONE-002',
    assigned_drone_display_name: 'Drone - 002',
    status: 'READY',
    validation_status: 'VALID',
    progress_percent: 35,
    estimated_distance_m: '1963.16',
    created_at: '2026-07-10 08:00:00',
    ...overrides,
  };
}

function missionDetailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '4',
    mission_code: 'MSN-004',
    name: 'Riverside Survey',
    description: null,
    assigned_drone_id: '1',
    assigned_drone_code: 'DRONE-001',
    assigned_drone_display_name: 'Drone - 001',
    status: 'READY',
    validation_status: 'VALID',
    validation_message: 'Route passed validation.',
    planned_altitude_m: '55.00',
    planned_speed_mps: '6.20',
    estimated_distance_m: '1420.33',
    estimated_duration_sec: 230,
    progress_percent: 0,
    created_at: '2026-07-08 08:00:00',
    updated_at: '2026-09-19 10:00:00',
    ...overrides,
  };
}

function waypointRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '11',
    sequence_number: 1,
    waypoint_type: 'START',
    latitude: '10.7769000',
    longitude: '106.7009000',
    altitude_m: '55.00',
    hold_time_sec: 0,
    ...overrides,
  };
}

describe('Missions list API', () => {
  it('documents the list endpoint, filters, and response schema', () => {
    const operation = openApiDocument.paths['/missions'].get;

    expect(operation.tags).toEqual(['Mission']);
    expect(operation.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'page', in: 'query' }),
      expect.objectContaining({ name: 'pageSize', in: 'query' }),
      expect.objectContaining({ name: 'droneId', in: 'query' }),
      expect.objectContaining({ name: 'status', in: 'query' }),
    ]));
    expect(operation.responses).toHaveProperty('200');
    expect(operation.responses).toHaveProperty('400');
    expect(openApiDocument.components.schemas.MissionListItem).toMatchObject({
      type: 'object',
      properties: {
        status: { enum: ['DRAFT', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
        validationStatus: { enum: ['NOT_CHECKED', 'VALID', 'INVALID'] },
      },
    });
  });

  it('returns stored mission and assigned-drone values with default pagination', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: '1' }], []])
      .mockResolvedValueOnce([[missionRow()], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/missions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{
        id: 7,
        missionCode: 'MSN-007',
        name: 'Riverside Survey',
        drone: { id: 2, droneCode: 'DRONE-002', displayName: 'Drone - 002' },
        status: 'READY',
        validationStatus: 'VALID',
        progressPercent: 35,
        estimatedDistanceM: 1963.16,
        createdAt: '2026-07-10 08:00:00',
      }],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain('SELECT COUNT(*) AS total FROM missions');
    expect(query.mock.calls[1]?.[0]).toContain('INNER JOIN drones d ON d.id = m.drone_id');
    expect(query.mock.calls[1]?.[1]).toEqual([25, 0]);
    expect(query.mock.calls.every(([sql]) => String(sql).trimStart().startsWith('SELECT'))).toBe(true);
  });

  it('applies both filters to the count and paginated list queries', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 3 }], []])
      .mockResolvedValueOnce([[], []]);
    const app = createTestApp(query);

    const response = await request(app)
      .get('/api/missions?page=2&pageSize=2&droneId=2&status=READY');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], page: 2, pageSize: 2, total: 3 });
    expect(query.mock.calls[0]?.[0]).toContain('WHERE m.drone_id = ? AND m.status = ?');
    expect(query.mock.calls[0]?.[1]).toEqual([2, 'READY']);
    expect(query.mock.calls[1]?.[1]).toEqual([2, 'READY', 2, 2]);
  });

  it('returns an empty page and zero total when no missions match', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: '0' }], []])
      .mockResolvedValueOnce([[], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/missions?droneId=5');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], page: 1, pageSize: 25, total: 0 });
  });

  it.each([
    '/api/missions?page=0',
    '/api/missions?page=1.5',
    '/api/missions?page=9007199254740991',
    '/api/missions?pageSize=0',
    '/api/missions?pageSize=101',
    '/api/missions?droneId=0',
    '/api/missions?droneId=not-a-number',
    '/api/missions?status=COMING_SOON',
    '/api/missions?status=READY&status=FAILED',
  ])('rejects invalid query values before querying MySQL: %s', async (url) => {
    const query = vi.fn();
    const app = createTestApp(query);

    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(query).not.toHaveBeenCalled();
  });
});

describe('Mission detail API', () => {
  it('documents the detail endpoint and response schema', () => {
    const operation = openApiDocument.paths['/missions/{missionId}'].get;

    expect(operation.tags).toEqual(['Mission']);
    expect(operation.parameters).toEqual([{ $ref: '#/components/parameters/MissionId' }]);
    expect(operation.responses).toHaveProperty('200');
    expect(operation.responses).toHaveProperty('400');
    expect(operation.responses).toHaveProperty('404');
    expect(openApiDocument.components.schemas.MissionDetail.properties.waypoints).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/MissionWaypoint' },
    });
  });

  it('returns stored mission details and waypoints in sequence order', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[missionDetailRow()], []])
      .mockResolvedValueOnce([[
        waypointRow(),
        waypointRow({
          id: '12',
          sequence_number: 2,
          waypoint_type: 'DESTINATION',
          latitude: '10.7800000',
          longitude: '106.6900000',
          altitude_m: '60.00',
          hold_time_sec: 15,
        }),
      ], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/missions/4');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        id: 4,
        missionCode: 'MSN-004',
        name: 'Riverside Survey',
        description: null,
        drone: { id: 1, droneCode: 'DRONE-001', displayName: 'Drone - 001' },
        status: 'READY',
        validationStatus: 'VALID',
        validationMessage: 'Route passed validation.',
        plannedAltitudeM: 55,
        plannedSpeedMps: 6.2,
        estimatedDistanceM: 1420.33,
        estimatedDurationSec: 230,
        progressPercent: 0,
        createdAt: '2026-07-08 08:00:00',
        updatedAt: '2026-09-19 10:00:00',
        waypoints: [
          {
            id: 11,
            sequenceNumber: 1,
            waypointType: 'START',
            latitude: 10.7769,
            longitude: 106.7009,
            altitudeM: 55,
            holdTimeSec: 0,
          },
          {
            id: 12,
            sequenceNumber: 2,
            waypointType: 'DESTINATION',
            latitude: 10.78,
            longitude: 106.69,
            altitudeM: 60,
            holdTimeSec: 15,
          },
        ],
      },
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain('FROM missions m');
    expect(query.mock.calls[0]?.[1]).toEqual([4]);
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY sequence_number ASC');
    expect(query.mock.calls[1]?.[1]).toEqual([4]);
    expect(query.mock.calls.every(([sql]) => String(sql).trimStart().startsWith('SELECT'))).toBe(true);
  });

  it('returns an empty waypoint list when a mission has none', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[missionDetailRow()], []])
      .mockResolvedValueOnce([[], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/missions/4');

    expect(response.status).toBe(200);
    expect(response.body.data.waypoints).toEqual([]);
  });

  it.each(['0', 'not-a-number', '9007199254740992'])('rejects an invalid mission ID: %s', async (missionId) => {
    const query = vi.fn();
    const app = createTestApp(query);

    const response = await request(app).get(`/api/missions/${missionId}`);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(query).not.toHaveBeenCalled();
  });

  it('returns MISSION_NOT_FOUND without querying waypoints when the mission is absent', async () => {
    const query = vi.fn().mockResolvedValueOnce([[], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/missions/404');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('MISSION_NOT_FOUND');
    expect(query).toHaveBeenCalledTimes(1);
  });
});
