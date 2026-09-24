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
