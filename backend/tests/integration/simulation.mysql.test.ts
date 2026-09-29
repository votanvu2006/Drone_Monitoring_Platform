import request from 'supertest';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { SimulationEngine, selectScenarioForDrone } from '../../src/modules/simulation';
import {
  assertV2DataPack,
  cleanupMissionFixture,
  createIntegrationDatabase,
  createMissionFixture,
  uniqueIntegrationCode,
  waitFor,
} from './support/database';

interface IdRow extends RowDataPacket {
  id: number;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface DroneSnapshotRow extends RowDataPacket {
  status: 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE' | 'OFFLINE';
  updated_at: Date;
}

interface TelemetryTimeRow extends RowDataPacket {
  sequence_number: number;
  recorded_at: Date;
  battery_percent: number;
}

interface RuntimeStateRow extends RowDataPacket {
  flight_status: string;
  result: string | null;
  mission_status: string;
  drone_status: string;
}

const database = createIntegrationDatabase();
const simulationEngine = new SimulationEngine(database);
const app = createApp(database, simulationEngine);
const missionIds: number[] = [];
let droneSnapshot: DroneSnapshotRow | null = null;

async function telemetryCount(flightId: number): Promise<number> {
  const [rows] = await database.query<CountRow[]>(
    'SELECT COUNT(*) AS total FROM telemetry WHERE flight_id = ?',
    [flightId],
  );
  return Number(rows[0]?.total ?? 0);
}

describe('Simulation MySQL integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(database);
  });

  afterEach(async () => {
    simulationEngine.shutdown();
    for (const missionId of missionIds.splice(0).reverse()) {
      await cleanupMissionFixture(database, missionId);
    }
    if (droneSnapshot) {
      await database.execute(
        'UPDATE drones SET status = ?, updated_at = ? WHERE id = 1',
        [droneSnapshot.status, droneSnapshot.updated_at],
      );
      droneSnapshot = null;
    }
    const [missions] = await database.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM missions WHERE mission_code LIKE 'MSN-SIM-IT-%'",
    );
    const [flights] = await database.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM flights WHERE flight_code LIKE 'FLT-SIM-IT-%'",
    );
    expect(Number(missions[0]?.total ?? 0)).toBe(0);
    expect(Number(flights[0]?.total ?? 0)).toBe(0);
  });

  afterAll(async () => {
    await database.end();
  });

  it('selects the weighted scenario and arm from the persisted Drone 3 pool', async () => {
    const [scenarios] = await database.query<IdRow[]>(
      "SELECT id FROM simulation_scenarios WHERE scenario_code = 'PROPELLER_DAMAGE'",
    );
    const randomValues = [0.75, 0.6];

    const selected = await selectScenarioForDrone(database, 3, () => randomValues.shift() ?? 0);

    expect(selected).toEqual({
      scenarioId: scenarios[0]?.id,
      faultPosition: 'REAR_LEFT',
    });
  });

  it('runs the two-second telemetry loop and stops without writing another sample', async () => {
    const missionId = await createMissionFixture(database, {
      sourceMissionId: 2,
      droneId: 1,
      validationStatus: 'VALID',
      estimatedDurationSec: 30,
      codePrefix: 'MSN-SIM-IT',
    });
    missionIds.push(missionId);
    const [drones] = await database.query<DroneSnapshotRow[]>(
      'SELECT status, updated_at FROM drones WHERE id = 1',
    );
    droneSnapshot = drones[0] ?? null;
    if (!droneSnapshot) throw new Error('Expected seeded Drone 1');

    const weather = await request(app).post(`/api/missions/${missionId}/weather-check`);
    expect(weather.status).toBe(200);
    expect(weather.body.data.recommendation).toBe('SAFE');
    const [scenarios] = await database.query<IdRow[]>(
      "SELECT id FROM simulation_scenarios WHERE scenario_code = 'NORMAL'",
    );
    const scenarioId = scenarios[0]?.id;
    if (!scenarioId) throw new Error('Expected the NORMAL simulation scenario');
    const [insert] = await database.execute<ResultSetHeader>(
      `INSERT INTO flights
       (flight_code, drone_id, mission_id, simulation_scenario_id, fault_position, status,
        result, started_at, ended_at, duration_sec, distance_m, start_battery_percent,
        end_battery_percent, preflight_weather_mode, preflight_weather_recommendation,
        weather_acknowledged_at, termination_reason, created_at, updated_at)
       VALUES (?, 1, ?, ?, NULL, 'READY', NULL, NULL, NULL, 0, 0, NULL, NULL,
        'DEMO', 'SAFE', NULL, NULL, NOW(), NOW())`,
      [uniqueIntegrationCode('FLT-SIM-IT'), missionId, scenarioId],
    );
    const flightId = insert.insertId;

    const start = await request(app).post(`/api/flights/${flightId}/simulation/start`);
    expect(start.status).toBe(202);
    expect(start.body.data).toMatchObject({ flightId, status: 'FLYING', telemetryIntervalMs: 2000 });

    await waitFor(async () => {
      const total = await telemetryCount(flightId);
      return total >= 2 ? total : false;
    });
    const status = await request(app).get(`/api/flights/${flightId}/simulation/status`);
    expect(status.status).toBe(200);
    expect(status.body.data).toMatchObject({
      flight: { id: flightId, status: 'FLYING' },
      timerActive: true,
    });
    expect(status.body.data.latestTelemetry.sequence_number).toBeGreaterThanOrEqual(2);
    expect(status.body.data.latestTelemetry.wind_source).toBe('SIMULATED_WEATHER_PROFILE');

    const [telemetry] = await database.query<TelemetryTimeRow[]>(
      `SELECT sequence_number, recorded_at, battery_percent FROM telemetry
       WHERE flight_id = ? ORDER BY sequence_number LIMIT 2`,
      [flightId],
    );
    expect(telemetry.map((sample) => sample.sequence_number)).toEqual([1, 2]);
    expect(status.body.data.flight.start_battery_percent).toBe(telemetry[0]?.battery_percent);
    const intervalMs = (telemetry[1]?.recorded_at.getTime() ?? 0) - (telemetry[0]?.recorded_at.getTime() ?? 0);
    expect(intervalMs).toBeGreaterThanOrEqual(1_500);
    expect(intervalMs).toBeLessThanOrEqual(5_000);
    const [running] = await database.query<RuntimeStateRow[]>(
      `SELECT f.status AS flight_status, f.result, m.status AS mission_status, d.status AS drone_status
       FROM flights f JOIN missions m ON m.id = f.mission_id JOIN drones d ON d.id = f.drone_id
       WHERE f.id = ?`,
      [flightId],
    );
    expect(running[0]).toMatchObject({
      flight_status: 'FLYING',
      result: null,
      mission_status: 'RUNNING',
      drone_status: 'IN_FLIGHT',
    });

    const stop = await request(app).post(`/api/flights/${flightId}/simulation/stop`);
    expect(stop.status).toBe(200);
    expect(stop.body.data).toEqual({ flightId, status: 'ABORTED' });
    const countAfterStop = await telemetryCount(flightId);
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    expect(await telemetryCount(flightId)).toBe(countAfterStop);

    const [stopped] = await database.query<RuntimeStateRow[]>(
      `SELECT f.status AS flight_status, f.result, m.status AS mission_status, d.status AS drone_status
       FROM flights f JOIN missions m ON m.id = f.mission_id JOIN drones d ON d.id = f.drone_id
       WHERE f.id = ?`,
      [flightId],
    );
    expect(stopped[0]).toMatchObject({
      flight_status: 'ABORTED',
      result: 'FAILED',
      mission_status: 'FAILED',
      drone_status: 'AVAILABLE',
    });
    const [alerts] = await database.query<RowDataPacket[]>(
      `SELECT rule_code, severity, status FROM alerts
       WHERE flight_id = ? AND rule_code = 'MISSION_FAILED'`,
      [flightId],
    );
    expect(alerts).toEqual([
      expect.objectContaining({ severity: 'CRITICAL', status: 'ACTIVE' }),
    ]);
  }, 20_000);
});
