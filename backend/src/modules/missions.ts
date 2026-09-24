import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';

type MissionStatus = 'DRAFT' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type ValidationStatus = 'NOT_CHECKED' | 'VALID' | 'INVALID';
type WaypointType = 'START' | 'INTERMEDIATE' | 'DESTINATION';

interface MissionListRow extends RowDataPacket {
  id: number | string;
  mission_code: string;
  name: string;
  assigned_drone_id: number | string;
  assigned_drone_code: string;
  assigned_drone_display_name: string;
  status: MissionStatus;
  validation_status: ValidationStatus;
  progress_percent: number | string;
  estimated_distance_m: number | string;
  created_at: string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface MissionDetailRow extends RowDataPacket {
  id: number | string;
  mission_code: string;
  name: string;
  description: string | null;
  assigned_drone_id: number | string;
  assigned_drone_code: string;
  assigned_drone_display_name: string;
  status: MissionStatus;
  validation_status: ValidationStatus;
  validation_message: string | null;
  planned_altitude_m: number | string;
  planned_speed_mps: number | string;
  estimated_distance_m: number | string;
  estimated_duration_sec: number | string;
  progress_percent: number | string;
  created_at: string;
  updated_at: string;
}

interface WaypointRow extends RowDataPacket {
  id: number | string;
  sequence_number: number | string;
  waypoint_type: WaypointType;
  latitude: number | string;
  longitude: number | string;
  altitude_m: number | string;
  hold_time_sec: number | string;
}

interface MissionListItem {
  id: number;
  missionCode: string;
  name: string;
  drone: {
    id: number;
    droneCode: string;
    displayName: string;
  };
  status: MissionStatus;
  validationStatus: ValidationStatus;
  progressPercent: number;
  estimatedDistanceM: number;
  createdAt: string;
}

interface MissionWaypoint {
  id: number;
  sequenceNumber: number;
  waypointType: WaypointType;
  latitude: number;
  longitude: number;
  altitudeM: number;
  holdTimeSec: number;
}

interface MissionDetail {
  id: number;
  missionCode: string;
  name: string;
  description: string | null;
  drone: {
    id: number;
    droneCode: string;
    displayName: string;
  };
  status: MissionStatus;
  validationStatus: ValidationStatus;
  validationMessage: string | null;
  plannedAltitudeM: number;
  plannedSpeedMps: number;
  estimatedDistanceM: number;
  estimatedDurationSec: number;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  waypoints: MissionWaypoint[];
}

const MISSION_STATUSES: readonly MissionStatus[] = [
  'DRAFT',
  'READY',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
];

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

function toMissionListItem(row: MissionListRow): MissionListItem {
  return {
    id: Number(row.id),
    missionCode: row.mission_code,
    name: row.name,
    drone: {
      id: Number(row.assigned_drone_id),
      droneCode: row.assigned_drone_code,
      displayName: row.assigned_drone_display_name,
    },
    status: row.status,
    validationStatus: row.validation_status,
    progressPercent: Number(row.progress_percent),
    estimatedDistanceM: Number(row.estimated_distance_m),
    createdAt: row.created_at,
  };
}

function toMissionDetail(row: MissionDetailRow, waypoints: WaypointRow[]): MissionDetail {
  return {
    id: Number(row.id),
    missionCode: row.mission_code,
    name: row.name,
    description: row.description,
    drone: {
      id: Number(row.assigned_drone_id),
      droneCode: row.assigned_drone_code,
      displayName: row.assigned_drone_display_name,
    },
    status: row.status,
    validationStatus: row.validation_status,
    validationMessage: row.validation_message,
    plannedAltitudeM: Number(row.planned_altitude_m),
    plannedSpeedMps: Number(row.planned_speed_mps),
    estimatedDistanceM: Number(row.estimated_distance_m),
    estimatedDurationSec: Number(row.estimated_duration_sec),
    progressPercent: Number(row.progress_percent),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    waypoints: waypoints.map((waypoint) => ({
      id: Number(waypoint.id),
      sequenceNumber: Number(waypoint.sequence_number),
      waypointType: waypoint.waypoint_type,
      latitude: Number(waypoint.latitude),
      longitude: Number(waypoint.longitude),
      altitudeM: Number(waypoint.altitude_m),
      holdTimeSec: Number(waypoint.hold_time_sec),
    })),
  };
}

export function createMissionsRouter(database: Pool): Router {
  const router = Router();

  router.get('/missions/:missionId', async (request, response, next) => {
    try {
      const missionId = positiveInteger(request.params.missionId, 'missionId');
      const [missionRows] = await database.query<MissionDetailRow[]>(
        `SELECT m.id, m.mission_code, m.name, m.description,
         d.id AS assigned_drone_id, d.drone_code AS assigned_drone_code,
         d.display_name AS assigned_drone_display_name, m.status, m.validation_status,
         m.validation_message, m.planned_altitude_m, m.planned_speed_mps,
         m.estimated_distance_m, m.estimated_duration_sec, m.progress_percent,
         DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') AS created_at,
         DATE_FORMAT(m.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at
         FROM missions m
         INNER JOIN drones d ON d.id = m.drone_id
         WHERE m.id = ?`,
        [missionId],
      );
      const mission = missionRows[0];
      if (!mission) {
        throw new ApiError(404, 'MISSION_NOT_FOUND', 'Mission not found');
      }

      const [waypoints] = await database.query<WaypointRow[]>(
        `SELECT id, sequence_number, waypoint_type, latitude, longitude,
         altitude_m, hold_time_sec
         FROM waypoints
         WHERE mission_id = ?
         ORDER BY sequence_number ASC`,
        [missionId],
      );

      response.json({ data: toMissionDetail(mission, waypoints) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/missions', async (request, response, next) => {
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
        clauses.push('m.drone_id = ?');
        values.push(positiveInteger(request.query.droneId, 'droneId'));
      }

      const status = request.query.status;
      if (status !== undefined) {
        if (typeof status !== 'string' || !MISSION_STATUSES.includes(status as MissionStatus)) {
          throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid status');
        }
        clauses.push('m.status = ?');
        values.push(status);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const [countRows] = await database.query<CountRow[]>(
        `SELECT COUNT(*) AS total FROM missions m ${where}`,
        values,
      );
      const [rows] = await database.query<MissionListRow[]>(
        `SELECT m.id, m.mission_code, m.name,
         d.id AS assigned_drone_id, d.drone_code AS assigned_drone_code,
         d.display_name AS assigned_drone_display_name, m.status, m.validation_status,
         m.progress_percent, m.estimated_distance_m,
         DATE_FORMAT(m.created_at, '%Y-%m-%d %H:%i:%s') AS created_at
         FROM missions m
         INNER JOIN drones d ON d.id = m.drone_id
         ${where}
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset],
      );

      response.json({
        data: rows.map(toMissionListItem),
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
