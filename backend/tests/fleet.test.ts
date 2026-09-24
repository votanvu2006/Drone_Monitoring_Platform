import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { openApiDocument } from '../src/openapi';

function createTestApp(query: ReturnType<typeof vi.fn>) {
  return createApp({ query } as unknown as Pool);
}

function droneRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    drone_code: 'DRONE-001',
    display_name: 'Drone - 001',
    status: 'OFFLINE',
    is_simulated: 1,
    model_code: 'AV-X1E',
    manufacturer: 'AeroVision (fictional)',
    model_name: 'AeroVision X1 Enterprise',
    home_location_label: 'District 1 Operations Home Base',
    home_latitude: '10.7769000',
    home_longitude: '106.7009000',
    last_known_location_label: null,
    last_known_latitude: null,
    last_known_longitude: null,
    last_known_altitude_m: null,
    location_source: 'UNKNOWN',
    location_updated_at: null,
    ...overrides,
  };
}

describe('Fleet drone list API', () => {
  it('publishes the drone list endpoint in OpenAPI', () => {
    expect(openApiDocument.paths['/drones']).toBeDefined();
    expect(openApiDocument.components.schemas.LastKnownLocation).toMatchObject({
      type: 'object',
      nullable: true,
    });
    expect(openApiDocument.components.schemas.DroneListItem.properties.lastKnownLocation).toEqual({
      $ref: '#/components/schemas/LastKnownLocation',
    });
  });

  it('returns a paginated list with model and home location data', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: '1' }], []])
      .mockResolvedValueOnce([[droneRow()], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/drones');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [{
        id: 1,
        droneCode: 'DRONE-001',
        displayName: 'Drone - 001',
        status: 'OFFLINE',
        isSimulated: true,
        model: {
          modelCode: 'AV-X1E',
          manufacturer: 'AeroVision (fictional)',
          modelName: 'AeroVision X1 Enterprise',
        },
        homeLocation: {
          label: 'District 1 Operations Home Base',
          latitude: 10.7769,
          longitude: 106.7009,
        },
        lastKnownLocation: null,
      }],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[1]).toEqual([25, 0]);
  });

  it('filters by status and applies the requested page window', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 3 }], []])
      .mockResolvedValueOnce([[], []]);
    const app = createTestApp(query);

    const response = await request(app)
      .get('/api/drones?page=2&pageSize=2&status=AVAILABLE');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [], page: 2, pageSize: 2, total: 3 });
    expect(query.mock.calls[0]?.[0]).toContain('WHERE status = ?');
    expect(query.mock.calls[0]?.[1]).toEqual(['AVAILABLE']);
    expect(query.mock.calls[1]?.[1]).toEqual(['AVAILABLE', 2, 2]);
  });

  it('includes last-known position separately with its source and timestamp', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([[
        droneRow({
          status: 'AVAILABLE',
          last_known_location_label: 'Demo launch site',
          last_known_latitude: '10.7800000',
          last_known_longitude: '106.6900000',
          last_known_altitude_m: '24.50',
          location_source: 'BROWSER_GEOLOCATION',
          location_updated_at: new Date('2026-09-24T10:00:00.000Z'),
        }),
      ], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/drones');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      homeLocation: { latitude: 10.7769, longitude: 106.7009 },
      lastKnownLocation: {
        label: 'Demo launch site',
        latitude: 10.78,
        longitude: 106.69,
        altitudeM: 24.5,
        source: 'BROWSER_GEOLOCATION',
        updatedAt: '2026-09-24T10:00:00.000Z',
      },
    });
  });

  it('returns an empty page when no drones match', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 0 }], []])
      .mockResolvedValueOnce([[], []]);
    const app = createTestApp(query);

    const response = await request(app).get('/api/drones?status=MAINTENANCE');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ data: [], page: 1, pageSize: 25, total: 0 });
  });

  it.each([
    '/api/drones?page=0',
    '/api/drones?pageSize=101',
    '/api/drones?status=COMING_SOON',
  ])('rejects invalid filters before querying MySQL: %s', async (url) => {
    const query = vi.fn();
    const app = createTestApp(query);

    const response = await request(app).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(query).not.toHaveBeenCalled();
  });
});
