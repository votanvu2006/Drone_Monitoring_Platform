import request from 'supertest';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2DataPack,
  createIntegrationDatabase,
  uniqueIntegrationCode,
} from './support/database';

interface AlertOwnerRow extends RowDataPacket {
  flight_id: number;
  mission_id: number;
  component_id: number;
  health_status: 'HEALTHY' | 'WARNING' | 'FAULT' | 'MAINTENANCE';
  last_inspected_at: Date | null;
  updated_at: Date;
}

interface AlertStateRow extends RowDataPacket {
  status: 'ACTIVE' | 'RESOLVED';
  resolution_note: string | null;
  resolved_at: Date | null;
}

const database = createIntegrationDatabase();
const app = createApp(database);
let temporaryAlertId: number | null = null;
let componentSnapshot: AlertOwnerRow | null = null;

describe('Alerts MySQL integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(database);
  });

  afterEach(async () => {
    if (temporaryAlertId !== null) {
      await database.execute('DELETE FROM alerts WHERE id = ?', [temporaryAlertId]);
      temporaryAlertId = null;
    }
    if (componentSnapshot) {
      await database.execute(
        `UPDATE drone_components
         SET health_status = ?, last_inspected_at = ?, updated_at = ? WHERE id = ?`,
        [
          componentSnapshot.health_status,
          componentSnapshot.last_inspected_at,
          componentSnapshot.updated_at,
          componentSnapshot.component_id,
        ],
      );
      componentSnapshot = null;
    }
  });

  afterAll(async () => {
    await database.end();
  });

  it('reads and filters the seeded active alerts', async () => {
    const response = await request(app).get('/api/alerts?status=ACTIVE&pageSize=100');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 100, total: 6 });
    expect(response.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ alert_code: 'ALT-021', status: 'ACTIVE', source: 'ROUTE' }),
      expect.objectContaining({ alert_code: 'ALT-022', status: 'ACTIVE', source: 'ROUTE' }),
    ]));
  });

  it('resolves a manual-inspection alert and persists the component result', async () => {
    const [owners] = await database.query<AlertOwnerRow[]>(
      `SELECT f.id AS flight_id, f.mission_id, dc.id AS component_id, dc.health_status,
       dc.last_inspected_at, dc.updated_at
       FROM flights f
       JOIN drone_components dc ON dc.drone_id = f.drone_id
       JOIN component_catalog c ON c.id = dc.component_catalog_id
       WHERE f.flight_code = 'FLT-010' AND c.component_type = 'PROPELLER'
         AND c.position = f.fault_position LIMIT 1`,
    );
    componentSnapshot = owners[0] ?? null;
    if (!componentSnapshot) throw new Error('Expected the FLT-010 propeller component fixture');

    const [insert] = await database.execute<ResultSetHeader>(
      `INSERT INTO alerts
       (alert_code, flight_id, mission_id, component_id, source, rule_code, severity, type,
        message, metric_name, observed_value, threshold_value, unit, status, detected_at,
        last_observed_at, resolved_at, resolution_note, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'TELEMETRY', 'PROPELLER_DAMAGE_SUSPECTED', 'CRITICAL',
        'PROPELLER_DAMAGE_SUSPECTED', 'Temporary integration alert', 'composite', NULL,
        NULL, NULL, 'ACTIVE', NOW(3), NOW(3), NULL, NULL, NOW(), NOW())`,
      [
        uniqueIntegrationCode('ALT-IT'),
        componentSnapshot.flight_id,
        componentSnapshot.mission_id,
        componentSnapshot.component_id,
      ],
    );
    temporaryAlertId = insert.insertId;

    const response = await request(app)
      .patch(`/api/alerts/${temporaryAlertId}/resolve`)
      .send({ resolutionNote: 'Propeller inspected in MySQL integration test.', componentHealthStatus: 'HEALTHY' });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: temporaryAlertId, status: 'RESOLVED' });
    const [alerts] = await database.query<AlertStateRow[]>(
      'SELECT status, resolution_note, resolved_at FROM alerts WHERE id = ?',
      [temporaryAlertId],
    );
    expect(alerts[0]).toMatchObject({
      status: 'RESOLVED',
      resolution_note: 'Propeller inspected in MySQL integration test.',
    });
    expect(alerts[0]?.resolved_at).toBeInstanceOf(Date);
    const [components] = await database.query<RowDataPacket[]>(
      'SELECT health_status, last_inspected_at FROM drone_components WHERE id = ?',
      [componentSnapshot.component_id],
    );
    expect(components[0]?.health_status).toBe('HEALTHY');
    expect(components[0]?.last_inspected_at).toBeInstanceOf(Date);
  });
});
