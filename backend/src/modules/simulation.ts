import { Router } from 'express';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';
import { resolveActiveAlerts, upsertActiveAlert, type AlertSeverity } from './alerts';

type FlightStatus = 'READY' | 'FLYING' | 'PAUSED' | 'RETURNING' | 'LANDED' | 'ABORTED';
type FaultPosition = 'FRONT_LEFT' | 'FRONT_RIGHT' | 'REAR_LEFT' | 'REAR_RIGHT';

interface FlightRow extends RowDataPacket {
  id: number;
  drone_id: number;
  mission_id: number;
  simulation_scenario_id: number;
  fault_position: FaultPosition | 'CENTER_REAR' | 'TOP_CENTER' | null;
  status: FlightStatus;
  preflight_weather_recommendation: 'SAFE' | 'CAUTION';
  weather_acknowledged_at: Date | null;
  validation_status: 'NOT_CHECKED' | 'VALID' | 'INVALID';
  estimated_duration_sec: number;
  planned_altitude_m: number | string;
  planned_speed_mps: number | string;
  scenario_code: string;
  expected_result: 'SUCCESS' | 'RETURN_TO_HOME' | 'FAILED';
  fault_start_progress: number | string | null;
  fault_end_progress: number | string | null;
  parameters_json: unknown;
}

interface WaypointRow extends RowDataPacket {
  latitude: number | string;
  longitude: number | string;
  altitude_m: number | string;
}

interface TelemetryRow extends RowDataPacket, TelemetrySample {
  sequence_number: number;
}

interface ScenarioPoolRow extends RowDataPacket {
  simulation_scenario_id: number;
  selection_weight: number;
  affected_position: string;
}

interface WeatherRunRow extends RowDataPacket {
  validation_run_id: string;
}

interface RecommendationRow extends RowDataPacket {
  recommendation: 'SAFE' | 'CAUTION' | 'UNSAFE';
}

interface WeatherWindRow extends RowDataPacket {
  wind_speed_10m_mps: number | string;
  wind_direction_10m_deg: number;
}

interface ComponentRow extends RowDataPacket {
  id: number;
}

export interface SelectedScenario {
  scenarioId: number;
  faultPosition: FaultPosition | null;
}

export interface TelemetrySample {
  latitude: number;
  longitude: number;
  position_source: 'GNSS' | 'LAST_KNOWN' | 'ESTIMATED';
  position_is_valid: boolean;
  transmission_state: 'CONNECTED' | 'DEGRADED' | 'LOST' | 'BUFFERED';
  heartbeat_age_seconds: number;
  altitude_m: number;
  speed_mps: number;
  vertical_speed_mps: number;
  heading_deg: number;
  battery_percent: number;
  battery_voltage_v: number;
  battery_current_a: number;
  battery_temperature_c: number;
  motor_rpm_fl: number;
  motor_rpm_fr: number;
  motor_rpm_rl: number;
  motor_rpm_rr: number;
  motor_temperature_fl_c: number;
  motor_temperature_fr_c: number;
  motor_temperature_rl_c: number;
  motor_temperature_rr_c: number;
  vibration_g: number;
  flight_controller_temperature_c: number;
  gps_quality: 'GOOD' | 'FAIR' | 'POOR' | 'LOST';
  gps_satellites: number;
  signal_percent: number;
  wind_speed_mps: number;
  wind_direction_deg: number;
}

interface RuleState {
  warning: number;
  critical: number;
  recovery: number;
}

interface RuleEvaluation {
  code: string;
  type: string;
  metric: string;
  value: number;
  unit?: string;
  warning?: { active: boolean; threshold: number; samples: number };
  critical: { active: boolean; threshold: number; samples: number };
  recovered: boolean;
  recoverySamples: number;
  manualResolution?: boolean;
}

const ARM_POSITIONS: FaultPosition[] = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT'];
const TELEMETRY_INTERVAL_MS = 2_000;

function positiveInteger(value: unknown, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }
  return parsed;
}

function parseParameters(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>;
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export async function selectScenarioForDrone(
  database: Pool | PoolConnection,
  droneId: number,
  random: () => number = Math.random,
): Promise<SelectedScenario> {
  const [rows] = await database.query<ScenarioPoolRow[]>(
    `SELECT p.simulation_scenario_id, p.selection_weight, s.affected_position
     FROM drone_scenario_pool p JOIN simulation_scenarios s ON s.id = p.simulation_scenario_id
     WHERE p.drone_id = ? AND p.is_enabled = TRUE AND s.is_enabled = TRUE ORDER BY p.id`,
    [droneId],
  );
  let selected: ScenarioPoolRow | undefined;
  if (rows.length) {
    const total = rows.reduce((sum, row) => sum + Number(row.selection_weight), 0);
    let draw = Math.min(0.999999999, Math.max(0, random())) * total;
    selected = rows.find((row) => {
      draw -= Number(row.selection_weight);
      return draw < 0;
    }) ?? rows.at(-1);
  } else {
    const [normal] = await database.query<ScenarioPoolRow[]>(
      `SELECT id AS simulation_scenario_id, 100 AS selection_weight, affected_position
       FROM simulation_scenarios WHERE scenario_code = 'NORMAL' AND is_enabled = TRUE LIMIT 1`,
    );
    selected = normal[0];
  }
  if (!selected) throw new ApiError(409, 'SIMULATION_SCENARIO_NOT_AVAILABLE', 'No simulation scenario is available');
  const faultPosition = selected.affected_position === 'RUNTIME_SELECTED'
    ? ARM_POSITIONS[Math.min(ARM_POSITIONS.length - 1, Math.floor(Math.max(0, random()) * ARM_POSITIONS.length))] ?? null
    : null;
  return { scenarioId: selected.simulation_scenario_id, faultPosition };
}

function heading(from: WaypointRow, to: WaypointRow): number {
  const lat1 = Number(from.latitude) * Math.PI / 180;
  const lat2 = Number(to.latitude) * Math.PI / 180;
  const deltaLon = (Number(to.longitude) - Number(from.longitude)) * Math.PI / 180;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function routePosition(waypoints: WaypointRow[], progress: number): { latitude: number; longitude: number; altitude: number; heading: number } {
  const bounded = Math.min(100, Math.max(0, progress));
  const scaled = bounded / 100 * Math.max(1, waypoints.length - 1);
  const index = Math.min(waypoints.length - 2, Math.floor(scaled));
  const from = waypoints[index] ?? waypoints[0];
  const to = waypoints[index + 1] ?? from;
  if (!from || !to) throw new ApiError(409, 'ROUTE_NOT_READY', 'Flight route is missing');
  const ratio = Math.min(1, scaled - index);
  return {
    latitude: Number(from.latitude) + (Number(to.latitude) - Number(from.latitude)) * ratio,
    longitude: Number(from.longitude) + (Number(to.longitude) - Number(from.longitude)) * ratio,
    altitude: Number(from.altitude_m) + (Number(to.altitude_m) - Number(from.altitude_m)) * ratio,
    heading: heading(from, to),
  };
}

function affected(progress: number, flight: FlightRow): boolean {
  if (flight.fault_start_progress === null) return false;
  return progress >= Number(flight.fault_start_progress)
    && (flight.fault_end_progress === null || progress <= Number(flight.fault_end_progress));
}

export function generateTelemetry(flight: FlightRow, waypoints: WaypointRow[], sequence: number): TelemetrySample {
  const progress = Math.min(100, sequence * TELEMETRY_INTERVAL_MS / Math.max(1, flight.estimated_duration_sec * 1_000) * 100);
  const routeProgress = flight.status === 'RETURNING'
    ? Math.max(0, Number(flight.fault_start_progress ?? 60) * (1 - (progress - Number(flight.fault_start_progress ?? 60)) / Math.max(1, 100 - Number(flight.fault_start_progress ?? 60))))
    : progress;
  const position = routePosition(waypoints, routeProgress);
  const sample: TelemetrySample = {
    latitude: position.latitude, longitude: position.longitude, position_source: 'GNSS', position_is_valid: true,
    transmission_state: 'CONNECTED', heartbeat_age_seconds: 0, altitude_m: position.altitude,
    speed_mps: Number(flight.planned_speed_mps), vertical_speed_mps: 0, heading_deg: position.heading,
    battery_percent: Math.max(5, Math.round(100 - progress * 0.65)), battery_voltage_v: 16.8 - progress * 0.02,
    battery_current_a: 8.5, battery_temperature_c: 32 + progress * 0.08,
    motor_rpm_fl: 5200, motor_rpm_fr: 5200, motor_rpm_rl: 5200, motor_rpm_rr: 5200,
    motor_temperature_fl_c: 45 + progress * 0.05, motor_temperature_fr_c: 45 + progress * 0.05,
    motor_temperature_rl_c: 45 + progress * 0.05, motor_temperature_rr_c: 45 + progress * 0.05,
    vibration_g: 0.4, flight_controller_temperature_c: 42 + progress * 0.04,
    gps_quality: 'GOOD', gps_satellites: 16, signal_percent: 95,
    wind_speed_mps: 4.2, wind_direction_deg: 180,
  };
  if (!affected(progress, flight)) return sample;
  const phase = Math.min(1, (progress - Number(flight.fault_start_progress ?? 0)) / Math.max(1, 100 - Number(flight.fault_start_progress ?? 0)));
  const parameters = parseParameters(flight.parameters_json);
  switch (flight.scenario_code) {
    case 'LOW_BATTERY': sample.battery_percent = Math.max(Number(parameters.targetEndPercent ?? 8), Math.round(35 - phase * 27)); break;
    case 'BATTERY_VOLTAGE_DROP': sample.battery_voltage_v = 14.2 - phase * 1.5; break;
    case 'BATTERY_OVERHEAT': sample.battery_temperature_c = 48 + phase * 18; break;
    case 'MOTOR_OVERHEAT': setArmMetric(sample, flight.fault_position, 'temperature', 72 + phase * 15); break;
    case 'PROPELLER_DAMAGE':
      setArmMetric(sample, flight.fault_position, 'rpm', 3000 - phase * 500);
      sample.vibration_g = 2.7 + phase * 0.6;
      break;
    case 'GPS_LOSS':
      sample.position_source = 'LAST_KNOWN'; sample.position_is_valid = false; sample.gps_quality = 'LOST'; sample.gps_satellites = 0;
      break;
    case 'SIGNAL_LOSS': sample.signal_percent = 0; sample.transmission_state = 'BUFFERED'; break;
    case 'UNEXPECTED_OFFLINE':
      sample.signal_percent = 0; sample.transmission_state = 'LOST'; sample.heartbeat_age_seconds = Math.max(15, phase * 30);
      break;
  }
  return sample;
}

function setArmMetric(sample: TelemetrySample, position: FlightRow['fault_position'], metric: 'rpm' | 'temperature', value: number): void {
  const selected = ARM_POSITIONS.includes(position as FaultPosition) ? position : 'FRONT_LEFT';
  if (metric === 'rpm') {
    if (selected === 'FRONT_LEFT') sample.motor_rpm_fl = Math.round(value);
    if (selected === 'FRONT_RIGHT') sample.motor_rpm_fr = Math.round(value);
    if (selected === 'REAR_LEFT') sample.motor_rpm_rl = Math.round(value);
    if (selected === 'REAR_RIGHT') sample.motor_rpm_rr = Math.round(value);
  } else {
    if (selected === 'FRONT_LEFT') sample.motor_temperature_fl_c = value;
    if (selected === 'FRONT_RIGHT') sample.motor_temperature_fr_c = value;
    if (selected === 'REAR_LEFT') sample.motor_temperature_rl_c = value;
    if (selected === 'REAR_RIGHT') sample.motor_temperature_rr_c = value;
  }
}

function rpmDeviation(sample: TelemetrySample): number {
  const values = [sample.motor_rpm_fl, sample.motor_rpm_fr, sample.motor_rpm_rl, sample.motor_rpm_rr].sort((a, b) => a - b);
  const median = ((values[1] ?? 0) + (values[2] ?? 0)) / 2;
  return Math.max(...values.map((value) => Math.abs(value - median) / Math.max(1, median) * 100));
}

export function evaluateTelemetry(sample: TelemetrySample): RuleEvaluation[] {
  const motorTemperature = Math.max(sample.motor_temperature_fl_c, sample.motor_temperature_fr_c, sample.motor_temperature_rl_c, sample.motor_temperature_rr_c);
  const deviation = rpmDeviation(sample);
  const numeric = (
    code: string, type: string, metric: string, value: number, warningLimit: number | undefined,
    criticalLimit: number, lowerIsBad: boolean, recoveryLimit: number, recoverySamples: number, unit?: string,
  ): RuleEvaluation => ({
    code, type, metric, value, unit,
    warning: warningLimit === undefined ? undefined : { active: lowerIsBad ? value <= warningLimit : value >= warningLimit, threshold: warningLimit, samples: code.includes('OVERHEAT') ? 5 : 3 },
    critical: { active: lowerIsBad ? value <= criticalLimit : value >= criticalLimit, threshold: criticalLimit, samples: code === 'HEARTBEAT_TIMEOUT' ? 1 : 3 },
    recovered: lowerIsBad ? value > recoveryLimit : value < recoveryLimit,
    recoverySamples,
  });
  return [
    numeric('BATTERY_PERCENT_LOW', 'LOW_BATTERY', 'battery_percent', sample.battery_percent, 20, 10, true, 25, 5, '%'),
    numeric('BATTERY_VOLTAGE_LOW', 'BATTERY_VOLTAGE_LOW', 'battery_voltage_v', sample.battery_voltage_v, 14, 13.2, true, 14.4, 10, 'V'),
    numeric('BATTERY_OVERHEAT', 'BATTERY_OVERHEAT', 'battery_temperature_c', sample.battery_temperature_c, 50, 60, false, 45, 10, 'C'),
    numeric('MOTOR_OVERHEAT', 'MOTOR_OVERHEAT', 'max_motor_temperature_c', motorTemperature, 70, 80, false, 65, 10, 'C'),
    numeric('MOTOR_RPM_ANOMALY', 'MOTOR_RPM_ANOMALY', 'max_motor_rpm_deviation_from_median_percent', deviation, 15, 25, false, 10, 10, '%'),
    numeric('EXCESSIVE_VIBRATION', 'EXCESSIVE_VIBRATION', 'vibration_g', sample.vibration_g, 1.8, 2.5, false, 1.2, 10, 'g'),
    { ...numeric('PROPELLER_DAMAGE_SUSPECTED', 'PROPELLER_DAMAGE_SUSPECTED', 'rpm_deviation_and_vibration', Math.max(deviation, sample.vibration_g), undefined, 1, false, 0, 0), critical: { active: deviation >= 25 && sample.vibration_g >= 2.5, threshold: 1, samples: 3 }, recovered: false, manualResolution: true },
    { code: 'GPS_LOST', type: 'GPS_LOST', metric: 'gps_quality', value: sample.gps_quality === 'LOST' ? 1 : 0, critical: { active: sample.gps_quality === 'LOST', threshold: 1, samples: 3 }, recovered: sample.gps_quality === 'GOOD', recoverySamples: 5 },
    numeric('COMMUNICATION_LOST', 'COMMUNICATION_LOST', 'signal_percent', sample.signal_percent, undefined, 5, true, 30, 5, '%'),
    { ...numeric('HEARTBEAT_TIMEOUT', 'DRONE_OFFLINE', 'heartbeat_age_seconds', sample.heartbeat_age_seconds, undefined, 15, false, 0, 0, 's'), recovered: false, manualResolution: true },
  ];
}

export class SimulationEngine {
  private readonly timers = new Map<number, NodeJS.Timeout>();
  private readonly ruleStates = new Map<string, RuleState>();

  constructor(private readonly database: Pool) {}

  router(): Router {
    const router = Router();
    router.post('/flights/:id/simulation/start', async (request, response, next) => {
      try {
        const flightId = positiveInteger(request.params.id, 'Flight id');
        await this.start(flightId);
        response.status(202).json({ data: { flightId, status: 'FLYING', telemetryIntervalMs: TELEMETRY_INTERVAL_MS } });
      } catch (error) { next(error); }
    });
    router.post('/flights/:id/simulation/stop', async (request, response, next) => {
      try {
        const flightId = positiveInteger(request.params.id, 'Flight id');
        await this.stop(flightId);
        response.json({ data: { flightId, status: 'ABORTED' } });
      } catch (error) { next(error); }
    });
    router.get('/flights/:id/simulation/status', async (request, response, next) => {
      try {
        const flightId = positiveInteger(request.params.id, 'Flight id');
        const [flights] = await this.database.query<RowDataPacket[]>('SELECT * FROM flights WHERE id = ?', [flightId]);
        if (!flights[0]) throw new ApiError(404, 'FLIGHT_NOT_FOUND', 'Flight not found');
        const [telemetry] = await this.database.query<RowDataPacket[]>('SELECT * FROM telemetry WHERE flight_id = ? ORDER BY sequence_number DESC LIMIT 1', [flightId]);
        response.json({ data: { flight: flights[0], latestTelemetry: telemetry[0] ?? null, timerActive: this.timers.has(flightId) } });
      } catch (error) { next(error); }
    });
    return router;
  }

  async resumeActiveFlights(): Promise<void> {
    const [rows] = await this.database.query<RowDataPacket[]>("SELECT id FROM flights WHERE status IN ('FLYING','RETURNING')");
    for (const row of rows) this.schedule(Number(row.id));
  }

  shutdown(): void {
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
  }

  private schedule(flightId: number): void {
    if (this.timers.has(flightId)) return;
    const timer = setInterval(() => {
      void this.tick(flightId).catch((error: unknown) => {
        console.error(`Simulation tick failed for flight ${flightId}`, error);
      });
    }, TELEMETRY_INTERVAL_MS);
    timer.unref();
    this.timers.set(flightId, timer);
  }

  private unschedule(flightId: number): void {
    const timer = this.timers.get(flightId);
    if (timer) clearInterval(timer);
    this.timers.delete(flightId);
  }

  private async start(flightId: number): Promise<void> {
    if (this.timers.has(flightId)) throw new ApiError(409, 'SIMULATION_ALREADY_RUNNING', 'Simulation is already running');
    const connection = await this.database.getConnection();
    try {
      await connection.beginTransaction();
      const flight = await this.loadFlight(connection, flightId, true);
      if (flight.status !== 'READY') throw new ApiError(409, 'FLIGHT_NOT_READY', 'Only a READY flight can start');
      if (flight.validation_status !== 'VALID') throw new ApiError(409, 'ROUTE_NOT_VALID', 'Mission route is not valid');
      const [runs] = await connection.query<WeatherRunRow[]>(
        'SELECT validation_run_id FROM weather_checks WHERE mission_id = ? AND expires_at > NOW() ORDER BY checked_at DESC LIMIT 1',
        [flight.mission_id],
      );
      if (!runs[0]) throw new ApiError(409, 'WEATHER_CHECK_EXPIRED', 'A fresh weather check is required');
      const [weather] = await connection.query<RecommendationRow[]>(
        'SELECT recommendation FROM weather_checks WHERE mission_id = ? AND validation_run_id = ?',
        [flight.mission_id, runs[0].validation_run_id],
      );
      if (weather.length < 3 || weather.some((row) => row.recommendation === 'UNSAFE')) {
        throw new ApiError(409, 'WEATHER_BLOCKED', 'Weather does not allow launch');
      }
      if ((weather.some((row) => row.recommendation === 'CAUTION') || flight.preflight_weather_recommendation === 'CAUTION')
        && !flight.weather_acknowledged_at) {
        throw new ApiError(409, 'WEATHER_ACKNOWLEDGEMENT_REQUIRED', 'Caution weather must be acknowledged');
      }
      const [active] = await connection.query<RowDataPacket[]>(
        "SELECT id FROM flights WHERE drone_id = ? AND id <> ? AND status IN ('FLYING','PAUSED','RETURNING') FOR UPDATE",
        [flight.drone_id, flightId],
      );
      if (active[0]) throw new ApiError(409, 'DRONE_ALREADY_IN_FLIGHT', 'Drone already has an active flight');
      await connection.execute("UPDATE flights SET status = 'FLYING', started_at = COALESCE(started_at, NOW(3)), updated_at = NOW() WHERE id = ?", [flightId]);
      await connection.execute("UPDATE missions SET status = 'RUNNING', updated_at = NOW() WHERE id = ?", [flight.mission_id]);
      await connection.execute("UPDATE drones SET status = 'IN_FLIGHT', updated_at = NOW() WHERE id = ?", [flight.drone_id]);
      await connection.commit();
      this.schedule(flightId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  private async stop(flightId: number): Promise<void> {
    const connection = await this.database.getConnection();
    try {
      await connection.beginTransaction();
      const flight = await this.loadFlight(connection, flightId, true);
      if (!['FLYING', 'PAUSED', 'RETURNING'].includes(flight.status)) throw new ApiError(409, 'FLIGHT_NOT_ACTIVE', 'Flight is not active');
      await this.finish(connection, flight, 'ABORTED', 'FAILED', 'Simulation stopped by operator.');
      await upsertActiveAlert(connection, { flightId, missionId: flight.mission_id, source: 'SYSTEM', ruleCode: 'MISSION_FAILED', severity: 'CRITICAL', type: 'MISSION_FAILED', message: 'Simulation stopped by operator.' });
      await connection.commit();
      this.unschedule(flightId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  private async loadFlight(connection: PoolConnection, flightId: number, lock = false): Promise<FlightRow> {
    const [rows] = await connection.query<FlightRow[]>(
      `SELECT f.*, m.validation_status, m.estimated_duration_sec, m.planned_altitude_m, m.planned_speed_mps,
       s.scenario_code, s.expected_result, s.fault_start_progress, s.fault_end_progress, s.parameters_json
       FROM flights f JOIN missions m ON m.id = f.mission_id
       JOIN simulation_scenarios s ON s.id = f.simulation_scenario_id WHERE f.id = ?${lock ? ' FOR UPDATE' : ''}`,
      [flightId],
    );
    if (!rows[0]) throw new ApiError(404, 'FLIGHT_NOT_FOUND', 'Flight not found');
    return rows[0];
  }

  private async tick(flightId: number): Promise<void> {
    const connection = await this.database.getConnection();
    try {
      await connection.beginTransaction();
      const flight = await this.loadFlight(connection, flightId, true);
      if (!['FLYING', 'RETURNING'].includes(flight.status)) {
        await connection.rollback(); this.unschedule(flightId); return;
      }
      const [latest] = await connection.query<TelemetryRow[]>('SELECT * FROM telemetry WHERE flight_id = ? ORDER BY sequence_number DESC LIMIT 1', [flightId]);
      const sequence = Number(latest[0]?.sequence_number ?? 0) + 1;
      const [waypoints] = await connection.query<WaypointRow[]>('SELECT latitude, longitude, altitude_m FROM waypoints WHERE mission_id = ? ORDER BY sequence_number', [flight.mission_id]);
      const sample = generateTelemetry(flight, waypoints, sequence);
      const [weatherWind] = await connection.query<WeatherWindRow[]>(
        'SELECT wind_speed_10m_mps, wind_direction_10m_deg FROM weather_checks WHERE mission_id = ? ORDER BY checked_at DESC, id DESC LIMIT 1',
        [flight.mission_id],
      );
      if (weatherWind[0]) {
        sample.wind_speed_mps = Number(weatherWind[0].wind_speed_10m_mps);
        sample.wind_direction_deg = weatherWind[0].wind_direction_10m_deg;
      }
      const recordedAt = new Date();
      const receivedAt = sample.transmission_state === 'BUFFERED' ? null : recordedAt;
      await connection.execute(
        `INSERT INTO telemetry (flight_id, sequence_number, recorded_at, received_at, latitude, longitude,
         position_source, position_is_valid, transmission_state, heartbeat_age_seconds, altitude_m, speed_mps,
         vertical_speed_mps, heading_deg, battery_percent, battery_voltage_v, battery_current_a,
         battery_temperature_c, motor_rpm_fl, motor_rpm_fr, motor_rpm_rl, motor_rpm_rr,
         motor_temperature_fl_c, motor_temperature_fr_c, motor_temperature_rl_c, motor_temperature_rr_c,
         vibration_g, flight_controller_temperature_c, gps_quality, gps_satellites, signal_percent,
         wind_speed_mps, wind_direction_deg, wind_source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SIMULATED_WEATHER_PROFILE')`,
        [flightId, sequence, recordedAt, receivedAt, sample.latitude, sample.longitude, sample.position_source,
          sample.position_is_valid, sample.transmission_state, sample.heartbeat_age_seconds, sample.altitude_m,
          sample.speed_mps, sample.vertical_speed_mps, sample.heading_deg, sample.battery_percent,
          sample.battery_voltage_v, sample.battery_current_a, sample.battery_temperature_c, sample.motor_rpm_fl,
          sample.motor_rpm_fr, sample.motor_rpm_rl, sample.motor_rpm_rr, sample.motor_temperature_fl_c,
          sample.motor_temperature_fr_c, sample.motor_temperature_rl_c, sample.motor_temperature_rr_c,
          sample.vibration_g, sample.flight_controller_temperature_c, sample.gps_quality, sample.gps_satellites,
          sample.signal_percent, sample.wind_speed_mps, sample.wind_direction_deg],
      );
      if (sequence === 1) {
        await connection.execute('UPDATE flights SET start_battery_percent = ?, updated_at = NOW() WHERE id = ?', [sample.battery_percent, flightId]);
      }
      if (sample.transmission_state === 'CONNECTED') {
        await connection.execute("UPDATE telemetry SET received_at = NOW(3), transmission_state = 'BUFFERED' WHERE flight_id = ? AND received_at IS NULL", [flightId]);
      }
      const critical = await this.applyRules(connection, flight, sample);
      const progress = Math.min(100, sequence * TELEMETRY_INTERVAL_MS / Math.max(1, flight.estimated_duration_sec * 1_000) * 100);
      await connection.execute('UPDATE missions SET progress_percent = ?, updated_at = NOW() WHERE id = ?', [Math.round(progress), flight.mission_id]);
      if (critical && flight.expected_result === 'FAILED') {
        await this.finish(connection, flight, 'ABORTED', 'FAILED', `${critical} triggered an emergency stop.`);
        await upsertActiveAlert(connection, { flightId, missionId: flight.mission_id, source: 'SYSTEM', ruleCode: 'MISSION_FAILED', severity: 'CRITICAL', type: 'MISSION_FAILED', message: `${critical} caused the flight to fail.` });
      } else if (critical && flight.expected_result === 'RETURN_TO_HOME' && flight.status === 'FLYING') {
        await connection.execute("UPDATE flights SET status = 'RETURNING', termination_reason = ?, updated_at = NOW() WHERE id = ?", [`${critical} triggered return-to-home.`, flightId]);
      } else if (progress >= 100) {
        const returned = flight.status === 'RETURNING' || flight.expected_result === 'RETURN_TO_HOME';
        await this.finish(connection, flight, 'LANDED', returned ? 'RETURNED_SAFELY' : 'SUCCESS', returned ? 'Return-to-home completed.' : 'Route completed.');
      }
      await connection.commit();
      if (critical && flight.expected_result === 'FAILED' || progress >= 100) this.unschedule(flightId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  }

  private async applyRules(connection: PoolConnection, flight: FlightRow, sample: TelemetrySample): Promise<string | null> {
    let criticalRule: string | null = null;
    for (const rule of evaluateTelemetry(sample)) {
      const key = `${flight.id}:${rule.code}`;
      const state = this.ruleStates.get(key) ?? { warning: 0, critical: 0, recovery: 0 };
      state.warning = rule.warning?.active ? state.warning + 1 : 0;
      state.critical = rule.critical.active ? state.critical + 1 : 0;
      state.recovery = rule.recovered ? state.recovery + 1 : 0;
      this.ruleStates.set(key, state);
      let severity: AlertSeverity | null = null;
      let threshold = rule.critical.threshold;
      if (state.critical >= rule.critical.samples) severity = 'CRITICAL';
      else if (rule.warning && state.warning >= rule.warning.samples) { severity = 'WARNING'; threshold = rule.warning.threshold; }
      if (severity) {
        const componentId = await this.componentForRule(connection, flight, rule.code);
        await upsertActiveAlert(connection, {
          flightId: flight.id, missionId: flight.mission_id, componentId, source: rule.code === 'HEARTBEAT_TIMEOUT' ? 'SYSTEM' : 'TELEMETRY',
          ruleCode: rule.code, severity, type: rule.type, message: `${rule.type}: ${rule.metric} observed at ${rule.value.toFixed(2)}${rule.unit ?? ''}.`,
          metricName: rule.metric, observedValue: rule.value, thresholdValue: threshold, unit: rule.unit,
        });
        if (severity === 'CRITICAL') {
          criticalRule ??= rule.code;
          if (componentId) await connection.execute("UPDATE drone_components SET health_status = 'FAULT', updated_at = NOW() WHERE id = ?", [componentId]);
        }
      } else if (!rule.manualResolution && state.recovery >= rule.recoverySamples) {
        await resolveActiveAlerts(connection, { flightId: flight.id }, rule.code, 'Telemetry recovered beyond the hysteresis threshold.');
      }
    }
    return criticalRule;
  }

  private async componentForRule(connection: PoolConnection, flight: FlightRow, ruleCode: string): Promise<number | undefined> {
    let componentType: string | undefined;
    if (ruleCode.startsWith('BATTERY_')) componentType = 'BATTERY';
    if (ruleCode === 'MOTOR_OVERHEAT' || ruleCode === 'MOTOR_RPM_ANOMALY') componentType = 'MOTOR';
    if (ruleCode === 'PROPELLER_DAMAGE_SUSPECTED') componentType = 'PROPELLER';
    if (ruleCode === 'GPS_LOST') componentType = 'GPS';
    if (!componentType) return undefined;
    const values: unknown[] = [flight.drone_id, componentType];
    let positionClause = '';
    if (['MOTOR', 'PROPELLER'].includes(componentType) && flight.fault_position) {
      positionClause = ' AND c.position = ?'; values.push(flight.fault_position);
    }
    const [rows] = await connection.query<ComponentRow[]>(
      `SELECT dc.id FROM drone_components dc JOIN component_catalog c ON c.id = dc.component_catalog_id
       WHERE dc.drone_id = ? AND c.component_type = ?${positionClause} AND dc.installed = TRUE LIMIT 1`,
      values,
    );
    return rows[0]?.id;
  }

  private async finish(connection: PoolConnection, flight: FlightRow, status: 'LANDED' | 'ABORTED', result: 'SUCCESS' | 'RETURNED_SAFELY' | 'FAILED', reason: string): Promise<void> {
    await connection.execute(
      `UPDATE flights SET status = ?, result = ?, ended_at = NOW(3), duration_sec = TIMESTAMPDIFF(SECOND, started_at, NOW(3)),
       end_battery_percent = (SELECT battery_percent FROM telemetry WHERE flight_id = ? ORDER BY sequence_number DESC LIMIT 1),
       termination_reason = ?, updated_at = NOW() WHERE id = ?`,
      [status, result, flight.id, reason, flight.id],
    );
    await connection.execute('UPDATE missions SET status = ?, progress_percent = ?, updated_at = NOW() WHERE id = ?', [result === 'FAILED' ? 'FAILED' : 'COMPLETED', result === 'FAILED' ? 0 : 100, flight.mission_id]);
    await connection.execute("UPDATE drones SET status = 'AVAILABLE', updated_at = NOW() WHERE id = ?", [flight.drone_id]);
  }
}
