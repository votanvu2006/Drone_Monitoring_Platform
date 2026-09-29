import type { Telemetry } from '../types/api';

export function hasValidPosition(telemetry: Pick<Telemetry, 'position_is_valid' | 'latitude' | 'longitude'>): boolean {
  const validFlag = telemetry.position_is_valid === true || Number(telemetry.position_is_valid) === 1;
  return validFlag && Number.isFinite(Number(telemetry.latitude)) && Number.isFinite(Number(telemetry.longitude));
}

type FlightClock = {
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_sec?: number;
  startedAt?: string | null;
  endedAt?: string | null;
  durationSec?: number;
};

export function flightDurationSeconds(flight: FlightClock | null, now = Date.now()): number {
  if (!flight) return 0;
  const endedAt = flight.ended_at ?? flight.endedAt;
  const recordedDuration = Number(flight.duration_sec ?? flight.durationSec ?? 0);
  if (endedAt || ['LANDED', 'ABORTED'].includes(flight.status)) return Number.isFinite(recordedDuration) ? Math.max(0, recordedDuration) : 0;

  const startedAt = flight.started_at ?? flight.startedAt;
  if (!startedAt) return Number.isFinite(recordedDuration) ? Math.max(0, recordedDuration) : 0;
  const parsedStart = new Date(startedAt.replace(' ', 'T') + (startedAt.includes('Z') ? '' : 'Z')).getTime();
  return Number.isFinite(parsedStart) ? Math.max(0, Math.floor((now - parsedStart) / 1000)) : 0;
}
