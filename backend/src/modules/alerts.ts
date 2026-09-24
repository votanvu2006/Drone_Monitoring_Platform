import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';

export type AlertSource = 'ROUTE' | 'WEATHER' | 'TELEMETRY' | 'SYSTEM';
export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface AlertObservation {
  flightId?: number;
  missionId?: number;
  componentId?: number;
  source: AlertSource;
  ruleCode: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  metricName?: string;
  observedValue?: number;
  thresholdValue?: number;
  unit?: string;
}

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
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }
  return parsed;
}

function alertCode(): string {
  return `ALT-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`.toUpperCase();
}

export async function upsertActiveAlert(
  connection: PoolConnection,
  observation: AlertObservation,
): Promise<number> {
  if (!observation.flightId && !observation.missionId) {
    throw new Error('An alert must belong to a flight or mission');
  }

  const ownerColumn = observation.flightId ? 'flight_id' : 'mission_id';
  const ownerId = observation.flightId ?? observation.missionId;
  const [existing] = await connection.query<AlertRow[]>(
    `SELECT id, observed_value FROM alerts
     WHERE ${ownerColumn} = ? AND rule_code = ? AND status = 'ACTIVE'
     ORDER BY id DESC LIMIT 1 FOR UPDATE`,
    [ownerId, observation.ruleCode],
  );

  if (existing[0]) {
    const previous = existing[0].observed_value;
    const observed = observation.observedValue;
    const worst = observed === undefined
      ? previous
      : previous === null || observation.severity === 'CRITICAL'
        ? observed
        : Math.max(previous, observed);
    await connection.execute(
      `UPDATE alerts SET severity = ?, message = ?, observed_value = ?,
       last_observed_at = NOW(3), updated_at = NOW() WHERE id = ?`,
      [observation.severity, observation.message, worst, existing[0].id],
    );
    return existing[0].id;
  }

  const [result] = await connection.execute<ResultSetHeader>(
    `INSERT INTO alerts
      (alert_code, flight_id, mission_id, component_id, source, rule_code, severity, type,
       message, metric_name, observed_value, threshold_value, unit, status, detected_at,
       last_observed_at, resolved_at, resolution_note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(3), NOW(3), NULL, NULL, NOW(), NOW())`,
    [
      alertCode(), observation.flightId ?? null, observation.missionId ?? null,
      observation.componentId ?? null, observation.source, observation.ruleCode,
      observation.severity, observation.type, observation.message,
      observation.metricName ?? null, observation.observedValue ?? null,
      observation.thresholdValue ?? null, observation.unit ?? null,
    ],
  );
  return result.insertId;
}

export async function resolveActiveAlerts(
  connection: PoolConnection,
  owner: { flightId?: number; missionId?: number },
  ruleCode: string,
  note: string,
): Promise<number> {
  const ownerColumn = owner.flightId ? 'flight_id' : 'mission_id';
  const ownerId = owner.flightId ?? owner.missionId;
  if (!ownerId) throw new Error('An alert owner is required');
  const [result] = await connection.execute<ResultSetHeader>(
    `UPDATE alerts SET status = 'RESOLVED', resolved_at = NOW(3), resolution_note = ?, updated_at = NOW()
     WHERE ${ownerColumn} = ? AND rule_code = ? AND status = 'ACTIVE'`,
    [note, ownerId, ruleCode],
  );
  return result.affectedRows;
}

export function createAlertsRouter(database: Pool): Router {
  const router = Router();

  router.get('/', async (request, response, next) => {
    try {
      const page = request.query.page === undefined ? 1 : positiveInteger(request.query.page, 'page');
      const pageSize = request.query.pageSize === undefined
        ? 25
        : Math.min(100, positiveInteger(request.query.pageSize, 'pageSize'));
      const clauses: string[] = [];
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
          clauses.push(`${column} = ?`);
          values.push(value);
        }
      }
      for (const [queryName, column] of [['flightId', 'flight_id'], ['missionId', 'mission_id']] as const) {
        if (request.query[queryName] !== undefined) {
          clauses.push(`${column} = ?`);
          values.push(positiveInteger(request.query[queryName], queryName));
        }
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const [countRows] = await database.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM alerts ${where}`,
        values,
      );
      const [rows] = await database.query<AlertRow[]>(
        `SELECT id, alert_code, flight_id, mission_id, component_id, source, rule_code,
         severity, type, message, metric_name, observed_value, threshold_value, unit,
         status, detected_at, last_observed_at, resolved_at, resolution_note
         FROM alerts ${where} ORDER BY detected_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...values, pageSize, (page - 1) * pageSize],
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
