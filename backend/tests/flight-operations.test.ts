import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { openApiDocument } from '../src/openapi';

function createTestApp(query: ReturnType<typeof vi.fn>) {
  return createApp({ query } as unknown as Pool);
}

function flightRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '7',
    flight_code: 'FLT-007',
    status: 'LANDED',
    result: 'SUCCESS',
    drone_id: '2',
    drone_code: 'DRONE-002',
    drone_display_name: 'Drone - 002',
    mission_id: '4',
    mission_code: 'MSN-004',
    mission_name: 'Riverside Survey',
    scenario_code: 'NORMAL',
    started_at: '2026-09-24 08:00:00.123000',
    ended_at: '2026-09-24 08:06:00.456000',
    duration_sec: 360,
    distance_m: '1963.16',
    ...overrides,
  };
}

describe('Flight Operations list API', () => {
  it('documents pagination, filters, and the flight list response', () => {
    const operation = openApiDocument.paths['/flights'].get;

    expect(operation.tags).toEqual(['Flight Operations']);
    expect(operation.parameters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'page', in: 'query' }),
      expect.objectContaining({ name: 'pageSize', in: 'query' }),
      expect.objectContaining({ name: 'droneId', in: 'query' }),
      expect.objectContaining({ name: 'missionId', in: 'query' }),
      expect.objectContaining({ name: 'status', in: 'query' }),
      expect.objectContaining({ name: 'result', in: 'query' }),
    ]));
    expect(operation.responses).toHaveProperty('200');
    expect(operation.responses).toHaveProperty('400');
    expect(openApiDocument.components.schemas.FlightListItem).toMatchObject({
      type: 'object',
      properties: {
        status: { enum: ['READY', 'FLYING', 'PAUSED', 'RETURNING', 'LANDED', 'ABORTED'] },
        result: { nullable: true },
        startedAt: { nullable: true },
        endedAt: { nullable: true },
      },
    });
  });

  it('returns stored flight, drone, mission and scenario values with default pagination', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: '1' }], []])
      .mockResolvedValueOnce([[flightRow()], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/flights');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [{
        id: 7,
        flightCode: 'FLT-007',
        status: 'LANDED',
        result: 'SUCCESS',
        drone: { id: 2, droneCode: 'DRONE-002', displayName: 'Drone - 002' },
        mission: { id: 4, missionCode: 'MSN-004', name: 'Riverside Survey' },
        scenarioCode: 'NORMAL',
        startedAt: '2026-09-24 08:00:00.123000',
        endedAt: '2026-09-24 08:06:00.456000',
        durationSec: 360,
        distanceM: 1963.16,
      }],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain('SELECT COUNT(*) AS total FROM flights f');
    expect(query.mock.calls[1]?.[0]).toContain('INNER JOIN simulation_scenarios s');
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY f.created_at DESC, f.id DESC');
    expect(query.mock.calls[1]?.[1]).toEqual([25, 0]);
    expect(query.mock.calls.every(([sql]) => String(sql).trimStart().startsWith('SELECT'))).toBe(true);
  });

  it('applies all filters to both the total count and paginated result', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([[flightRow()], []]);
    const app = createTestApp(query);

    const response = await request(app)
      .get('/api/flights?page=2&pageSize=2&droneId=2&missionId=4&status=LANDED&result=SUCCESS');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 2, pageSize: 2, total: 1 });
    expect(query.mock.calls[0]?.[0]).toContain(
      'WHERE f.drone_id = ? AND f.mission_id = ? AND f.status = ? AND f.result = ?',
    );
    expect(query.mock.calls[0]?.[1]).toEqual([2, 4, 'LANDED', 'SUCCESS']);
    expect(query.mock.calls[1]?.[1]).toEqual([2, 4, 'LANDED', 'SUCCESS', 2, 2]);
  });

  it('preserves nullable result and timestamps for a flight that has not started', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([[
        flightRow({
          status: 'READY',
          result: null,
          started_at: null,
          ended_at: null,
          duration_sec: 0,
          distance_m: '0.00',
        }),
      ], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/flights');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      status: 'READY',
      result: null,
      startedAt: null,
      endedAt: null,
      durationSec: 0,
      distanceM: 0,
    });
  });

  it('returns an empty page and zero total when no flights match', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: '0' }], []])
      .mockResolvedValueOnce([[], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/flights?status=ABORTED');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], page: 1, pageSize: 25, total: 0 });
  });

  it.each([
    '/api/flights?page=0',
    '/api/flights?page=1.5',
    '/api/flights?page=9007199254740991&pageSize=100',
    '/api/flights?pageSize=0',
    '/api/flights?pageSize=101',
    '/api/flights?droneId=0',
    '/api/flights?missionId=not-a-number',
    '/api/flights?status=COMPLETED',
    '/api/flights?status=LANDED&status=ABORTED',
    '/api/flights?result=IN_PROGRESS',
    '/api/flights?result=SUCCESS&result=FAILED',
  ])('rejects invalid query values before querying MySQL: %s', async (url) => {
    const query = vi.fn();
    const app = createTestApp(query);

    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(query).not.toHaveBeenCalled();
  });
});
