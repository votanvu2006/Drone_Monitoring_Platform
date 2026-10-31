import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';

type FlightStatus = 'READY' | 'FLYING' | 'PAUSED' | 'RETURNING' | 'LANDED' | 'ABORTED';
type FlightResult = 'SUCCESS' | 'RETURNED_SAFELY' | 'FAILED';

interface FlightRow extends RowDataPacket {
  id: number | string;
  flight_code: string;
  status: FlightStatus;
  result: FlightResult | null;
  drone_id: number | string;
  drone_code: string;
  drone_display_name: string;
  mission_id: number | string;
  mission_code: string;
  mission_name: string;
  scenario_code: string;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | string;
  distance_m: number | string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface FlightListItem {
  id: number;
  flightCode: string;
  status: FlightStatus;
  result: FlightResult | null;
  drone: {
    id: number;
    droneCode: string;
    displayName: string;
  };
  mission: {
    id: number;
    missionCode: string;
    name: string;
  };
  scenarioCode: string;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number;
  distanceM: number;
}

const FLIGHT_STATUSES: readonly FlightStatus[] = [
  'READY',
  'FLYING',
  'PAUSED',
  'RETURNING',
  'LANDED',
  'ABORTED',
];

const FLIGHT_RESULTS: readonly FlightResult[] = ['SUCCESS', 'RETURNED_SAFELY', 'FAILED'];

function positiveInteger(value: unknown, name: string): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }

  return parsed;
}

function enumValue<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `Invalid ${name}`);
  }
  return value as T;
}

function toFlightListItem(row: FlightRow): FlightListItem {
  return {
    id: Number(row.id),
    flightCode: row.flight_code,
    status: row.status,
    result: row.result,
    drone: {
      id: Number(row.drone_id),
      droneCode: row.drone_code,
      displayName: row.drone_display_name,
    },
    mission: {
      id: Number(row.mission_id),
      missionCode: row.mission_code,
      name: row.mission_name,
    },
    scenarioCode: row.scenario_code,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationSec: Number(row.duration_sec),
    distanceM: Number(row.distance_m),
  };
}

interface FlightViewRow extends RowDataPacket {
  id: number;
  mission_id: number;
  flight_code: string;
  drone_code: string;
  mission_code: string;
  route_name: string;
  current_waypoint_index: number;
  route_progress_percent: number;
  status: FlightStatus;
  result: FlightResult | null;
  started_at: string | null;
  duration_sec: number;
  distance_m: number | string;
  start_battery_percent: number | null;
  end_battery_percent: number | null;
}

interface WaypointViewRow extends RowDataPacket {
  sequence_number: number;
  waypoint_type: string;
  map_x: number | string | null;
  map_y: number | string | null;
}

const viewSelect = `SELECT f.id, f.mission_id, f.flight_code, d.drone_code, m.mission_code,
  f.route_name, f.current_waypoint_index, f.route_progress_percent, f.status, f.result,
  DATE_FORMAT(f.started_at, '%Y-%m-%d %H:%i:%s.%f') AS started_at,
  f.duration_sec, f.distance_m, f.start_battery_percent, f.end_battery_percent
  FROM flights f JOIN drones d ON d.id = f.drone_id
  JOIN missions m ON m.id = f.mission_id`;

function utcIso(value: string | null): string | null {
  return value === null ? null : new Date(value.replace(' ', 'T') + 'Z').toISOString();
}

function historyRecord(row: FlightViewRow) {
  return {
    flightCode: row.flight_code, droneCode: row.drone_code, missionCode: row.mission_code,
    status: row.result === 'FAILED' ? 'FAILED' : 'COMPLETED',
    startedAt: utcIso(row.started_at), durationSeconds: Number(row.duration_sec),
  };
}

async function routeWaypoints(database: Pool, missionId: number) {
  const [points] = await database.query<WaypointViewRow[]>(
    `SELECT sequence_number, waypoint_type, map_x, map_y FROM waypoints
     WHERE mission_id = ? ORDER BY sequence_number`, [missionId],
  );
  return points.map(point => ({
    code: `WP-${String(point.sequence_number).padStart(2, '0')}`,
    label: point.waypoint_type === 'START' ? 'Launch'
      : point.waypoint_type === 'DESTINATION' ? 'Return'
        : `Waypoint ${String(point.sequence_number).padStart(2, '0')}`,
    x: point.map_x === null ? null : Number(point.map_x),
    y: point.map_y === null ? null : Number(point.map_y),
  }));
}

export function createFlightOperationsRouter(database: Pool): Router {
  const router = Router();

  router.get('/flights', async (request, response, next) => {
    try {
      const page = request.query.page === undefined ? 1 : positiveInteger(request.query.page, 'page');
      const pageSize = request.query.pageSize === undefined
        ? 25
        : positiveInteger(request.query.pageSize, 'pageSize');
      if (pageSize > 100) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'pageSize must not exceed 100');
      }

      const offset = (page - 1) * pageSize;
      if (!Number.isSafeInteger(offset)) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'page is too large');
      }

      const clauses: string[] = [];
      const values: unknown[] = [];
      if (request.query.droneId !== undefined) {
        clauses.push('f.drone_id = ?');
        values.push(positiveInteger(request.query.droneId, 'droneId'));
      }
      if (request.query.missionId !== undefined) {
        clauses.push('f.mission_id = ?');
        values.push(positiveInteger(request.query.missionId, 'missionId'));
      }
      if (request.query.status !== undefined) {
        clauses.push('f.status = ?');
        values.push(enumValue(request.query.status, FLIGHT_STATUSES, 'status'));
      }
      if (request.query.result !== undefined) {
        clauses.push('f.result = ?');
        values.push(enumValue(request.query.result, FLIGHT_RESULTS, 'result'));
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const [countRows] = await database.query<CountRow[]>(
        `SELECT COUNT(*) AS total FROM flights f ${where}`,
        values,
      );
      const [rows] = await database.query<FlightRow[]>(
        `SELECT f.id, f.flight_code, f.status, f.result,
         d.id AS drone_id, d.drone_code, d.display_name AS drone_display_name,
         m.id AS mission_id, m.mission_code, m.name AS mission_name,
         s.scenario_code,
         DATE_FORMAT(f.started_at, '%Y-%m-%d %H:%i:%s.%f') AS started_at,
         DATE_FORMAT(f.ended_at, '%Y-%m-%d %H:%i:%s.%f') AS ended_at,
         f.duration_sec, f.distance_m
         FROM flights f
         INNER JOIN drones d ON d.id = f.drone_id
         INNER JOIN missions m ON m.id = f.mission_id
         INNER JOIN simulation_scenarios s ON s.id = f.simulation_scenario_id
         ${where}
         ORDER BY f.created_at DESC, f.id DESC
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset],
      );

      response.json({
        data: rows.map(toFlightListItem),
        page,
        pageSize,
        total: Number(countRows[0]?.total ?? 0),
      });
    } catch (error) {
      next(error);
    }
  });


  router.get('/flights/active', async (_request, response, next) => {
    try {
      const [rows] = await database.query<FlightViewRow[]>(
        `${viewSelect} WHERE f.status IN ('FLYING', 'PAUSED', 'RETURNING')
         ORDER BY f.started_at DESC, f.id DESC`,
      );
      const data = await Promise.all(rows.map(async row => ({
        flightCode: row.flight_code, missionCode: row.mission_code, droneCode: row.drone_code,
        flightStatus: 'IN_PROGRESS', status: row.status, routeName: row.route_name,
        currentWaypointIndex: Number(row.current_waypoint_index),
        routeProgressPercent: Number(row.route_progress_percent),
        waypoints: await routeWaypoints(database, row.mission_id),
      })));
      response.json({ data });
    } catch (error) { next(error); }
  });

  router.get('/flights/history', async (_request, response, next) => {
    try {
      const [rows] = await database.query<FlightViewRow[]>(
        `${viewSelect} WHERE f.ended_at IS NOT NULL AND f.result IS NOT NULL
         ORDER BY f.started_at DESC, f.id DESC`,
      );
      response.json({ data: rows.map(historyRecord) });
    } catch (error) { next(error); }
  });

  router.get('/flights/:flightCode', async (request, response, next) => {
    try {
      const code = request.params.flightCode;
      if (typeof code !== 'string' || !/^[a-zA-Z0-9-]{1,30}$/.test(code)) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid flight code');
      }
      const [rows] = await database.query<FlightViewRow[]>(
        `${viewSelect} WHERE f.flight_code = ? AND f.ended_at IS NOT NULL AND f.result IS NOT NULL`, [code],
      );
      const row = rows[0];
      if (!row) throw new ApiError(404, 'FLIGHT_NOT_FOUND', 'Flight record not found');
      const waypoints = await routeWaypoints(database, row.mission_id);
      const [telemetry] = await database.query<RowDataPacket[]>(
        `SELECT MAX(altitude_m) AS max_altitude, ROUND(AVG(speed_mps), 2) AS average_speed
         FROM telemetry WHERE flight_id = ?`, [row.id],
      );
      const [events] = await database.query<RowDataPacket[]>(
        `SELECT event_code, DATE_FORMAT(occurred_at, '%Y-%m-%d %H:%i:%s.%f') AS occurred_at,
         title, description, severity FROM flight_events WHERE flight_id = ?
         ORDER BY occurred_at, id`, [row.id],
      );
      const summary = telemetry[0];
      response.json({ data: {
        ...historyRecord(row), routeName: row.route_name,
        waypoints: waypoints.map(({ code, x, y }) => ({ code, x, y })),
        telemetry: {
          startBatteryPercent: row.start_battery_percent, endBatteryPercent: row.end_battery_percent,
          maxAltitudeMeters: summary?.max_altitude == null ? null : Number(summary.max_altitude),
          averageSpeedMps: summary?.average_speed == null ? null : Number(summary.average_speed),
          distanceMeters: Number(row.distance_m),
        },
        events: events.map(event => ({ id: event.event_code, occurredAt: utcIso(event.occurred_at),
          title: event.title, description: event.description, severity: event.severity })),
      } });
    } catch (error) { next(error); }
  });

  return router;
}
