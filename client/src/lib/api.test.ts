import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api } from './api';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('API client', () => {
  it('requests paginated fleet data and omits empty query parameters', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [], page: 2, pageSize: 10, total: 0 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.drones({ page: 2, pageSize: 10, status: '' });

    expect(fetchMock).toHaveBeenCalledWith('/api/drones?page=2&pageSize=10', expect.objectContaining({ headers: {} }));
  });

  it('surfaces structured backend errors without losing the error code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: 'WEATHER_BLOCKED', message: 'Weather does not allow launch' } }), { status: 409 })));

    await expect(api.startSimulation(42)).rejects.toMatchObject<ApiError>({
      name: 'ApiError', status: 409, code: 'WEATHER_BLOCKED', message: 'Weather does not allow launch',
    });
  });

  it('sends the alert resolution payload to the real mutation endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: 7, status: 'RESOLVED', resolutionNote: 'Inspected' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.resolveAlert(7, 'Inspected', 'HEALTHY');

    expect(fetchMock).toHaveBeenCalledWith('/api/alerts/7/resolve', expect.objectContaining({
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutionNote: 'Inspected', componentHealthStatus: 'HEALTHY' }),
    }));
  });

  it('converts MySQL DECIMAL telemetry strings into finite numbers for live metrics', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: {
      flight: { id: 12, flight_code: 'FLT-12', status: 'FLYING', result: null, mission_id: 5, drone_id: 1, preflight_weather_recommendation: 'SAFE', weather_acknowledged_at: null, started_at: null, ended_at: null, duration_sec: 0, distance_m: '125.50' },
      latestTelemetry: { sequence_number: 3, recorded_at: '2026-09-28 10:00:00', received_at: null, latitude: '21.02', longitude: '105.85', position_source: 'GNSS', position_is_valid: 1, transmission_state: 'CONNECTED', heartbeat_age_seconds: '0.5', altitude_m: '56.2', speed_mps: '8.4', vertical_speed_mps: '0', heading_deg: '121', battery_percent: '82.5', battery_voltage_v: '16.4', battery_current_a: '4.1', battery_temperature_c: '37.2', gps_quality: 'GOOD', gps_satellites: 16, signal_percent: '95', wind_speed_mps: '4.2', wind_direction_deg: '180' },
      timerActive: true,
    } }), { status: 200 })));

    const status = await api.simulationStatus(12);

    expect(status.latestTelemetry?.battery_percent).toBe(82.5);
    expect(status.latestTelemetry?.altitude_m).toBe(56.2);
    expect(status.latestTelemetry?.latitude).toBe(21.02);
  });

  it('uses a readable message when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(api.health()).rejects.toThrow('Không kết nối được API');
  });
});
