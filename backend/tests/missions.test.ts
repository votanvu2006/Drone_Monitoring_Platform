import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';

function createTestApp(query: ReturnType<typeof vi.fn>) {
  return createApp({ query } as unknown as Pool);
}

function missionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '2',
    mission_code: 'mission-002',
    name: 'Mission 002',
    assigned_drone_id: '2',
    assigned_drone_code: 'DRONE-002',
    assigned_drone_display_name: 'Drone - 002',
    status: 'WARNING',
    validation_status: 'VALID',
    progress_percent: 0,
    estimated_distance_m: '3620.00',
    waypoint_count: '8',
    created_at: '2026-10-21 01:00:00',
    ...overrides,
  };
}

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '10',
    mission_code: 'MISSION-010',
    name: 'Mission 010',
    description: 'Frontend-aligned demonstration mission.',
    assigned_drone_id: '4',
    assigned_drone_code: 'DRONE-004',
    assigned_drone_display_name: 'Drone - 004',
    status: 'COMPLETED',
    validation_status: 'VALID',
    validation_message: 'Demo route',
    planned_altitude_m: '82.00',
    planned_speed_mps: '9.40',
    estimated_distance_m: '3620.00',
    estimated_duration_sec: 1122,
    progress_percent: 100,
    created_at: '2026-10-12 01:00:00',
    updated_at: '2026-10-28 02:00:00',
    ...overrides,
  };
}

function waypointRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '101',
    sequence_number: 1,
    waypoint_type: 'START',
    latitude: '10.7769000',
    longitude: '106.7009000',
    altitude_m: '82.00',
    hold_time_sec: 0,
    ...overrides,
  };
}

describe('Missions list API', () => {
  it('returns current missions with status and waypoint count', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: '1' }], []])
      .mockResolvedValueOnce([[missionRow()], []]);

    const response = await request(createTestApp(query)).get('/api/missions');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{
        id: 2,
        missionCode: 'mission-002',
        name: 'Mission 002',
        drone: {
          id: 2,
          droneCode: 'DRONE-002',
          displayName: 'Drone - 002',
        },
        status: 'WARNING',
        validationStatus: 'VALID',
        progressPercent: 0,
        estimatedDistanceM: 3620,
        waypointCount: 8,
        createdAt: '2026-10-21 01:00:00',
      }],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain(
      'INNER JOIN drones d ON d.id = m.drone_id',
    );
    expect(query.mock.calls[0]?.[0]).toContain("d.status <> 'OFFLINE'");
    expect(query.mock.calls[1]?.[0]).toContain("d.status <> 'OFFLINE'");
    expect(query.mock.calls[0]?.[0]).toContain('WHERE m.is_current = 1');
    expect(query.mock.calls[1]?.[0]).toContain('WHERE m.is_current = 1');
    expect(query.mock.calls[1]?.[0]).toContain(
      'SELECT COUNT(*) FROM waypoints w WHERE w.mission_id = m.id',
    );
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY m.id ASC');
    expect(query.mock.calls[1]?.[1]).toEqual([25, 0]);
  });

  it('applies drone and R5 status filters to both list queries', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([[
        missionRow({
          id: 3,
          mission_code: 'mission-003',
          assigned_drone_id: 3,
          assigned_drone_code: 'DRONE-003',
          status: 'IN_PROGRESS',
        }),
      ], []]);

    const response = await request(createTestApp(query))
      .get('/api/missions?page=2&pageSize=1&droneId=3&status=IN_PROGRESS');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 2,
      pageSize: 1,
      total: 1,
      data: [{ missionCode: 'mission-003', status: 'IN_PROGRESS' }],
    });
    expect(query.mock.calls[0]?.[0]).toContain(
      "WHERE m.is_current = 1 AND d.status <> 'OFFLINE' AND m.drone_id = ? AND m.status = ?",
    );
    expect(query.mock.calls[1]?.[0]).toContain(
      "WHERE m.is_current = 1 AND d.status <> 'OFFLINE' AND m.drone_id = ? AND m.status = ?",
    );
    expect(query.mock.calls[0]?.[1]).toEqual([3, 'IN_PROGRESS']);
    expect(query.mock.calls[1]?.[1]).toEqual([3, 'IN_PROGRESS', 1, 1]);
  });

  it('accepts WARNING as a status filter', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([[missionRow()], []]);

    const response = await request(createTestApp(query))
      .get('/api/missions?status=WARNING');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      missionCode: 'mission-002',
      status: 'WARNING',
      waypointCount: 8,
    });
    expect(query.mock.calls[0]?.[1]).toEqual(['WARNING']);
  });

  it('returns an empty current-mission page', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 0 }], []])
      .mockResolvedValueOnce([[], []]);

    const response = await request(createTestApp(query))
      .get('/api/missions?droneId=99');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      page: 1,
      pageSize: 25,
      total: 0,
    });
    expect(query.mock.calls[0]?.[0]).toContain('m.is_current = 1');
    expect(query.mock.calls[0]?.[0]).toContain("d.status <> 'OFFLINE'");
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
  ])('rejects invalid input before querying MySQL: %s', async (url) => {
    const query = vi.fn();

    const response = await request(createTestApp(query)).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(query).not.toHaveBeenCalled();
  });
});

describe('Mission detail API', () => {
  it('reads a historical mission and ordered waypoints by ID', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[detailRow()], []])
      .mockResolvedValueOnce([[
        waypointRow(),
        waypointRow({
          id: '102',
          sequence_number: 2,
          waypoint_type: 'DESTINATION',
          latitude: '10.7800000',
          longitude: '106.6900000',
          hold_time_sec: 15,
        }),
      ], []]);

    const response = await request(createTestApp(query))
      .get('/api/missions/10');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: 10,
      missionCode: 'MISSION-010',
      status: 'COMPLETED',
      drone: { id: 4, droneCode: 'DRONE-004' },
      waypoints: [
        {
          id: 101,
          sequenceNumber: 1,
          waypointType: 'START',
          latitude: 10.7769,
          longitude: 106.7009,
          altitudeM: 82,
          holdTimeSec: 0,
        },
        {
          id: 102,
          sequenceNumber: 2,
          waypointType: 'DESTINATION',
          latitude: 10.78,
          longitude: 106.69,
          altitudeM: 82,
          holdTimeSec: 15,
        },
      ],
    });
    expect(query.mock.calls[0]?.[0]).not.toContain('is_current');
    expect(query.mock.calls[0]?.[1]).toEqual([10]);
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY sequence_number ASC');
    expect(query.mock.calls[1]?.[1]).toEqual([10]);
  });

  it('returns an empty waypoint list when a mission has no waypoints', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[detailRow()], []])
      .mockResolvedValueOnce([[], []]);

    const response = await request(createTestApp(query))
      .get('/api/missions/10');

    expect(response.status).toBe(200);
    expect(response.body.data.waypoints).toEqual([]);
  });

  it('returns 404 without querying waypoints for a missing mission', async () => {
    const query = vi.fn().mockResolvedValueOnce([[], []]);

    const response = await request(createTestApp(query))
      .get('/api/missions/404');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('MISSION_NOT_FOUND');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each(['0', 'not-a-number', '9007199254740992'])(
    'rejects invalid mission ID %s',
    async (missionId) => {
      const query = vi.fn();

      const response = await request(createTestApp(query))
        .get(`/api/missions/${missionId}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ARGUMENT');
      expect(query).not.toHaveBeenCalled();
    },
  );
});