import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';

type AlertSource = 'ROUTE' | 'WEATHER' | 'TELEMETRY' | 'SYSTEM';
type AlertSeverity = 'WARNING' | 'CRITICAL';

interface AlertRow extends RowDataPacket {
  id: number;
  alert_code: string;
  flight_id: number | null;
  mission_id: number | null;
  component_id: number | null;
  source: AlertSource;
  rule_code: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  metric_name: string | null;
  observed_value: number | null;
  threshold_value: number | null;
  unit: string | null;
  status: 'ACTIVE' | 'RESOLVED';
  detected_at: Date;
  last_observed_at: Date;
  resolved_at: Date | null;
  resolution_note: string | null;
}

function positiveInteger(value: unknown, name: string): number {
  const parsed = Number(value);
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }
  return parsed;
}

export function createAlertsRouter(database: Pool): Router {
  const router = Router();

  router.get('/', async (request, response, next) => {
    try {
      const page = request.query.page === undefined ? 1 : positiveInteger(request.query.page, 'page');
      const pageSize = request.query.pageSize === undefined
        ? 25
        : positiveInteger(request.query.pageSize, 'pageSize');
      const offset = (page - 1) * pageSize;
      if (pageSize > 100 || !Number.isSafeInteger(offset)) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid pagination');
      }
      const clauses: string[] = ["d.status <> 'OFFLINE'"];
      const values: unknown[] = [];
      for (const [queryName, column, allowed] of [
        ['status', 'status', ['ACTIVE', 'RESOLVED']],
        ['severity', 'severity', ['WARNING', 'CRITICAL']],
        ['source', 'source', ['ROUTE', 'WEATHER', 'TELEMETRY', 'SYSTEM']],
      ] as const) {
        const value = request.query[queryName];
        if (value !== undefined) {
          if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
            throw new ApiError(400, 'INVALID_ARGUMENT', `Invalid ${queryName}`);
          }
          clauses.push(`a.${column} = ?`);
          values.push(value);
        }
      }
      for (const [queryName, column] of [['flightId', 'flight_id'], ['missionId', 'mission_id']] as const) {
        if (request.query[queryName] !== undefined) {
          clauses.push(`a.${column} = ?`);
          values.push(positiveInteger(request.query[queryName], queryName));
        }
      }
      for (const [queryName, column] of [['droneCode', 'd.drone_code'], ['missionCode', 'm.mission_code']] as const) {
        const value = request.query[queryName];
        if (value !== undefined) {
          if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,30}$/.test(value)) {
            throw new ApiError(400, 'INVALID_ARGUMENT', `Invalid ${queryName}`);
          }
          clauses.push(`${column} = ?`);
          values.push(value);
        }
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      // A blocked preflight alert has a mission and no flight. Resolve its owner via the mission.
      const joins = `FROM alerts a LEFT JOIN flights f ON f.id = a.flight_id
        LEFT JOIN missions m ON m.id = COALESCE(a.mission_id, f.mission_id)
        LEFT JOIN drone_components dc ON dc.id = a.component_id
        LEFT JOIN drones d ON d.id = COALESCE(m.drone_id, f.drone_id, dc.drone_id)
        LEFT JOIN component_catalog c ON c.id = dc.component_catalog_id`;
      const [countRows] = await database.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total ${joins} ${where}`, values,
      );
      const [rows] = await database.query<AlertRow[]>(
        `SELECT a.*, d.drone_code, m.mission_code, c.component_code,
         DATE_FORMAT(a.detected_at, '%Y-%m-%d %H:%i:%s.%f') AS detected_at,
         DATE_FORMAT(a.last_observed_at, '%Y-%m-%d %H:%i:%s.%f') AS last_observed_at,
         DATE_FORMAT(a.resolved_at, '%Y-%m-%d %H:%i:%s.%f') AS resolved_at
         ${joins} ${where}
         ORDER BY CASE a.severity WHEN 'CRITICAL' THEN 0 ELSE 1 END, a.detected_at DESC, a.alert_code
         LIMIT ? OFFSET ?`, [...values, pageSize, offset],
      );
      response.json({ data: rows, page, pageSize, total: Number(countRows[0]?.total ?? 0) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id/resolve', async (request, response, next) => {
    const connection = await database.getConnection();
    try {
      const id = positiveInteger(request.params.id, 'id');
      const note = typeof request.body?.resolutionNote === 'string'
        ? request.body.resolutionNote.trim()
        : '';
      const componentHealthStatus = request.body?.componentHealthStatus;
      if (!note) throw new ApiError(400, 'INVALID_ARGUMENT', 'resolutionNote is required');
      if (note.length > 500) throw new ApiError(400, 'INVALID_ARGUMENT', 'resolutionNote is too long');
      if (componentHealthStatus !== undefined
        && !['HEALTHY', 'WARNING', 'FAULT', 'MAINTENANCE'].includes(componentHealthStatus)) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid componentHealthStatus');
      }

      await connection.beginTransaction();
      const [rows] = await connection.query<AlertRow[]>(
        'SELECT * FROM alerts WHERE id = ? FOR UPDATE',
        [id],
      );
      const alert = rows[0];
      if (!alert) throw new ApiError(404, 'ALERT_NOT_FOUND', 'Alert not found');
      if (alert.status === 'RESOLVED') throw new ApiError(409, 'ALERT_ALREADY_RESOLVED', 'Alert is already resolved');
      if (alert.rule_code === 'PROPELLER_DAMAGE_SUSPECTED' && !componentHealthStatus) {
        throw new ApiError(400, 'INSPECTION_RESULT_REQUIRED', 'componentHealthStatus is required for propeller inspection');
      }
      if (componentHealthStatus && alert.component_id) {
        await connection.execute(
          'UPDATE drone_components SET health_status = ?, last_inspected_at = NOW(), updated_at = NOW() WHERE id = ?',
          [componentHealthStatus, alert.component_id],
        );
      }
      await connection.execute(
        `UPDATE alerts SET status = 'RESOLVED', resolved_at = NOW(3), resolution_note = ?, updated_at = NOW()
         WHERE id = ?`,
        [note, id],
      );
      await connection.commit();
      response.json({ data: { id, status: 'RESOLVED', resolutionNote: note } });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  return router;
}
