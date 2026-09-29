import type {
  Alert, Drone, Flight, FlightZone, Mission, MissionDetail, Page,
  SimulationStatus, Telemetry, WeatherCheck,
} from '../types/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiError('Không kết nối được API. Hãy kiểm tra backend và cấu hình mạng.', 0);
  }

  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const body = payload as { error?: { message?: string; code?: string } } | null;
    throw new ApiError(
      body?.error?.message || `API trả về lỗi ${response.status}.`,
      response.status,
      body?.error?.code,
    );
  }
  return payload as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

function normalizeTelemetry(telemetry: Telemetry): Telemetry {
  return {
    ...telemetry,
    sequence_number: Number(telemetry.sequence_number),
    latitude: Number(telemetry.latitude),
    longitude: Number(telemetry.longitude),
    heartbeat_age_seconds: Number(telemetry.heartbeat_age_seconds),
    altitude_m: Number(telemetry.altitude_m),
    speed_mps: Number(telemetry.speed_mps),
    vertical_speed_mps: Number(telemetry.vertical_speed_mps),
    heading_deg: Number(telemetry.heading_deg),
    battery_percent: Number(telemetry.battery_percent),
    battery_voltage_v: Number(telemetry.battery_voltage_v),
    battery_current_a: Number(telemetry.battery_current_a),
    battery_temperature_c: Number(telemetry.battery_temperature_c),
    gps_satellites: Number(telemetry.gps_satellites),
    signal_percent: Number(telemetry.signal_percent),
    wind_speed_mps: Number(telemetry.wind_speed_mps),
    wind_direction_deg: Number(telemetry.wind_direction_deg),
  };
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  drones: (params: Record<string, string | number | undefined> = {}) => request<Page<Drone>>(`/drones${query(params)}`),
  missions: (params: Record<string, string | number | undefined> = {}) => request<Page<Mission>>(`/missions${query(params)}`),
  mission: async (id: number) => (await request<{ data: MissionDetail }>(`/missions/${id}`)).data,
  validateMission: async (id: number) => (await request<{ data: { missionId: number; validationStatus: 'VALID' | 'INVALID'; message: string; violations: { code: string; message: string }[] } }>(`/missions/${id}/validate`, { method: 'POST' })).data,
  checkWeather: async (id: number) => (await request<{ data: WeatherCheck }>(`/missions/${id}/weather-check`, { method: 'POST' })).data,
  flights: (params: Record<string, string | number | undefined> = {}) => request<Page<Flight>>(`/flights${query(params)}`),
  simulationStatus: async (id: number) => {
    const { data } = await request<{ data: SimulationStatus }>(`/flights/${id}/simulation/status`);
    return { ...data, latestTelemetry: data.latestTelemetry ? normalizeTelemetry(data.latestTelemetry) : null };
  },
  startSimulation: (id: number) => request<{ data: { flightId: number; status: string; telemetryIntervalMs: number } }>(`/flights/${id}/simulation/start`, { method: 'POST' }),
  stopSimulation: (id: number) => request<{ data: { flightId: number; status: string } }>(`/flights/${id}/simulation/stop`, { method: 'POST' }),
  zones: async () => request<{ type: 'FeatureCollection'; features: FlightZone[] }>('/flight-zones'),
  alerts: (params: Record<string, string | number | undefined> = {}) => request<Page<Alert>>(`/alerts${query(params)}`),
  resolveAlert: (id: number, resolutionNote: string, componentHealthStatus?: 'HEALTHY' | 'WARNING' | 'FAULT' | 'MAINTENANCE') => request<{ data: { id: number; status: string; resolutionNote: string } }>(`/alerts/${id}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolutionNote, ...(componentHealthStatus ? { componentHealthStatus } : {}) }),
  }),
};

export async function allFlights(params: Record<string, string | number | undefined> = {}): Promise<Flight[]> {
  const pageSize = 100;
  const firstPage = await api.flights({ ...params, page: 1, pageSize });
  const pageCount = Math.ceil(firstPage.total / pageSize);
  if (pageCount <= 1) return firstPage.data;

  const remainingPages = await Promise.all(Array.from({ length: pageCount - 1 }, (_, index) =>
    api.flights({ ...params, page: index + 2, pageSize }),
  ));
  return [firstPage, ...remainingPages].flatMap((page) => page.data);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}
