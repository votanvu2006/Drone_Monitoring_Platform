import { describe, expect, it } from 'vitest';
import { flightDurationSeconds, hasValidPosition } from './liveFlightLogic';

describe('live flight telemetry helpers', () => {
  it('accepts only valid telemetry coordinates for the map', () => {
    expect(hasValidPosition({ position_is_valid: true, latitude: 21, longitude: 105 })).toBe(true);
    expect(hasValidPosition({ position_is_valid: 1, latitude: 21, longitude: 105 })).toBe(true);
    expect(hasValidPosition({ position_is_valid: false, latitude: 21, longitude: 105 })).toBe(false);
    expect(hasValidPosition({ position_is_valid: 0, latitude: 21, longitude: 105 })).toBe(false);
    expect(hasValidPosition({ position_is_valid: 1, latitude: Number.NaN, longitude: 105 })).toBe(false);
  });

  it('uses backend duration for ended flights and wall-clock duration only while active', () => {
    const now = Date.parse('2026-09-29T12:01:00Z');
    expect(flightDurationSeconds({ status: 'LANDED', started_at: '2026-09-29 12:00:00', ended_at: '2026-09-29 12:00:40', duration_sec: 40 }, now)).toBe(40);
    expect(flightDurationSeconds({ status: 'ABORTED', duration_sec: 18 }, now)).toBe(18);
    expect(flightDurationSeconds({ status: 'FLYING', started_at: '2026-09-29 12:00:00', duration_sec: 5 }, now)).toBe(60);
  });
});
