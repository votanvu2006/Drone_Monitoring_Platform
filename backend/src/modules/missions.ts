import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';

type MissionStatus = 'DRAFT' | 'READY' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
type ValidationStatus = 'NOT_CHECKED' | 'VALID' | 'INVALID';

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

export function createMissionsRouter(database: Pool): Router {
  const router = Router();

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
