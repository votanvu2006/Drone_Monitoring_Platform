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

  return router;
}
