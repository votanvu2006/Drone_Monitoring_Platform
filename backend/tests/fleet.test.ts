import request from 'supertest';
import type { Pool } from 'mysql2/promise';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';

function createTestApp(query: ReturnType<typeof vi.fn>) {
  return createApp({ query } as unknown as Pool);
}

function droneRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    drone_code: 'DRONE-001',
    display_name: 'Drone - 001',
    status: 'OFFLINE',
    battery_percent: 100,
    serial_number: 'AVX1E-2026-0001',
    is_simulated: 1,
    model_code: 'AV-X1E',
    manufacturer: 'AeroVision (fictional)',
    model_name: 'AeroVision X1 Enterprise',
    max_speed_mps: '15.00',
    max_flight_time_minutes: 45,
    home_location_label: 'District 1 Operations Home Base',
    home_latitude: '10.7769000',
    home_longitude: '106.7009000',
    last_known_location_label: 'Demo operating location',
    last_known_latitude: '10.7769000',
    last_known_longitude: '106.7009000',
    last_known_altitude_m: '0.00',
    location_source: 'MANUAL',
    location_updated_at: null,
    active_mission_code: null,
    ...overrides,
  };
}

function componentRow() {
  return {
    component_code: 'AVX1-MOTOR-FRONT_LEFT',
    component_type: 'MOTOR',
    name: 'Front Left Motor',
    position: 'FRONT_LEFT',
    model: '2008-class Brushless Motor',
    primary_function: 'Drives the front-left propeller',
    component_serial_number: 'DRONE-002-AVX1-MOTOR-FRONT_LEFT',
    health_status: 'WARNING',
  };
}

function findingRow() {
  return {
    drone_id: 2,
    finding_code: 'FINDING-002',
    drone_code: 'DRONE-002',
    mission_code: 'mission-002',
    component_code: 'AVX1-MOTOR-FRONT_LEFT',
    severity: 'WARNING',
    detected_at: '2026-10-21T06:08:00.000000',
  };
}

describe('Fleet read APIs', () => {
  it('returns the paginated list with model, location and battery data', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: '1' }], []])
      .mockResolvedValueOnce([[droneRow()], []])
      .mockResolvedValueOnce([[], []]);

    const response = await request(createTestApp(query)).get('/api/drones');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 25,
      total: 1,
      data: [{
        id: 1,
        droneCode: 'DRONE-001',
        displayName: 'Drone - 001',
        status: 'OFFLINE',
        batteryPercent: 100,
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
        activeMission: null,
        findings: [],
      }],
    });
    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1]?.[1]).toEqual([25, 0]);
    expect(query.mock.calls[2]?.[1]).toEqual([1]);
  });

  it('filters with the qualified drone status and applies pagination', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 4 }], []])
      .mockResolvedValueOnce([[droneRow({ id: 4, drone_code: 'DRONE-004' })], []])
      .mockResolvedValueOnce([[], []]);

    const response = await request(createTestApp(query))
      .get('/api/drones?page=2&pageSize=2&status=OFFLINE');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 4,
      data: [{ droneCode: 'DRONE-004', status: 'OFFLINE' }],
    });
    expect(query.mock.calls[0]?.[0]).toContain('WHERE d.status = ?');
    expect(query.mock.calls[0]?.[1]).toEqual(['OFFLINE']);
    expect(query.mock.calls[1]?.[1]).toEqual(['OFFLINE', 2, 2]);
  });

  it('returns the current mission and only findings owned by each listed drone', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 2 }], []])
      .mockResolvedValueOnce([[
        droneRow({ id: 2, drone_code: 'DRONE-002' }),
        droneRow({
          id: 3,
          drone_code: 'DRONE-003',
          status: 'IN_FLIGHT',
          active_mission_code: 'mission-003',
        }),
      ], []])
      .mockResolvedValueOnce([[findingRow()], []]);

    const response = await request(createTestApp(query)).get('/api/drones');

    expect(response.status).toBe(200);
    expect(response.body.data[0].findings).toEqual([{
      id: 'FINDING-002',
      droneCode: 'DRONE-002',
      missionCode: 'mission-002',
      componentCode: 'AVX1-MOTOR-FRONT_LEFT',
      severity: 'WARNING',
      detectedAt: '2026-10-21T06:08:00.000Z',
    }]);
    expect(response.body.data[1]).toMatchObject({
      droneCode: 'DRONE-003',
      status: 'IN_FLIGHT',
      activeMission: 'mission-003',
      findings: [],
    });
    expect(query.mock.calls[2]?.[1]).toEqual([2, 3]);
  });

  it('returns an empty list without querying findings', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 0 }], []])
      .mockResolvedValueOnce([[], []]);

    const response = await request(createTestApp(query))
      .get('/api/drones?status=MAINTENANCE');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [],
      page: 1,
      pageSize: 25,
      total: 0,
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('returns drone detail with installed components and findings', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[
        droneRow({ id: 2, drone_code: 'DRONE-002' }),
      ], []])
      .mockResolvedValueOnce([[componentRow()], []])
      .mockResolvedValueOnce([[findingRow()], []]);

    const response = await request(createTestApp(query))
      .get('/api/drones/DRONE-002');

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      code: 'DRONE-002',
      status: 'OFFLINE',
      isActivated: false,
      batteryPercent: 100,
      serialNumber: 'AVX1E-2026-0001',
      manufacturer: 'AeroVision (fictional)',
      modelName: 'AeroVision X1 Enterprise',
      modelCode: 'AV-X1E',
      maxSpeedMps: 15,
      maxFlightTimeMinutes: 45,
      components: [{
        code: 'AVX1-MOTOR-FRONT_LEFT',
        type: 'MOTOR',
        position: 'FRONT_LEFT',
        healthStatus: 'WARNING',
      }],
      findings: [{
        id: 'FINDING-002',
        droneCode: 'DRONE-002',
        componentCode: 'AVX1-MOTOR-FRONT_LEFT',
      }],
    });
    expect(query.mock.calls[1]?.[1]).toEqual([2]);
    expect(query.mock.calls[2]?.[1]).toEqual([2]);
  });

  it('returns 404 for an unknown drone code', async () => {
    const query = vi.fn().mockResolvedValueOnce([[], []]);

    const response = await request(createTestApp(query))
      .get('/api/drones/DRONE-999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DRONE_NOT_FOUND');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it.each([
    '/api/drones?page=0',
    '/api/drones?pageSize=101',
    '/api/drones?status=COMING_SOON',
    '/api/drones/invalid.code',
  ])('rejects invalid input before querying MySQL: %s', async (url) => {
    const query = vi.fn();

    const response = await request(createTestApp(query)).get(url);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(query).not.toHaveBeenCalled();
  });
});