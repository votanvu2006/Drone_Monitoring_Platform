import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { evaluateTelemetry, generateTelemetry, routePosition, selectScenarioForDrone } from '../src/modules/simulation';

const baseFlight = {
  id: 1,
  drone_id: 3,
  mission_id: 1,
  simulation_scenario_id: 6,
  fault_position: 'REAR_RIGHT',
  status: 'FLYING',
  preflight_weather_recommendation: 'SAFE',
  weather_acknowledged_at: null,
  validation_status: 'VALID',
  estimated_duration_sec: 10,
  planned_altitude_m: 50,
  planned_speed_mps: 12,
  scenario_code: 'PROPELLER_DAMAGE',
  expected_result: 'FAILED',
  fault_start_progress: 50,
  fault_end_progress: 100,
  parameters_json: {},
};

const route = [
  { latitude: 10, longitude: 106, altitude_m: 40 },
  { latitude: 11, longitude: 108, altitude_m: 60 },
];

describe('simulation engine primitives', () => {
  it('selects a weighted scenario and an independent arm', async () => {
    const query = vi.fn().mockResolvedValue([[
      { simulation_scenario_id: 5, selection_weight: 50, affected_position: 'RUNTIME_SELECTED' },
      { simulation_scenario_id: 6, selection_weight: 50, affected_position: 'RUNTIME_SELECTED' },
    ], []]);
    const values = [0.75, 0.6];
    const selected = await selectScenarioForDrone({ query } as unknown as Pool, 3, () => values.shift() ?? 0);
    expect(selected).toEqual({ scenarioId: 6, faultPosition: 'REAR_LEFT' });
  });

  it('interpolates the persisted route', () => {
    expect(routePosition(route as never, 50)).toMatchObject({ latitude: 10.5, longitude: 107, altitude: 50 });
  });

  it('applies a propeller fault to the persisted arm', () => {
    const sample = generateTelemetry(baseFlight as never, route as never, 4);
    expect(sample.motor_rpm_rr).toBeLessThan(3000);
    expect(sample.motor_rpm_fl).toBe(5200);
    expect(sample.vibration_g).toBeGreaterThan(2.5);
    const propellerRule = evaluateTelemetry(sample).find((rule) => rule.code === 'PROPELLER_DAMAGE_SUSPECTED');
    expect(propellerRule?.critical.active).toBe(true);
    expect(propellerRule?.manualResolution).toBe(true);
  });

  it('marks GPS-loss coordinates as last known and invalid', () => {
    const sample = generateTelemetry({ ...baseFlight, scenario_code: 'GPS_LOSS', fault_start_progress: 10 } as never, route as never, 4);
    expect(sample).toMatchObject({ gps_quality: 'LOST', position_source: 'LAST_KNOWN', position_is_valid: false });
  });
});
