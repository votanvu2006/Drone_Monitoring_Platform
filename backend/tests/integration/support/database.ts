import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { createDatabase } from '../../../src/config/database';
import { readConfig } from '../../../src/config/env';

const expectedBuildId = 'DRONE-DATA-2.0.0-R1-20260919';

interface DataPackMetadataRow extends RowDataPacket {
  pack_version: string;
  data_revision: number | string;
  build_id: string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

export type MissionValidationStatus = 'NOT_CHECKED' | 'VALID' | 'INVALID';

export function createIntegrationDatabase(): Pool {
  return createDatabase(readConfig(process.env).database);
}

export async function assertV2DataPack(database: Pool): Promise<void> {
  const [metadataRows] = await database.query<DataPackMetadataRow[]>(
    'SELECT pack_version, data_revision, build_id FROM data_pack_metadata WHERE id = ?',
    [1],
  );
  const metadata = metadataRows[0];

  if (
    metadata?.pack_version !== '2.0.0'
    || Number(metadata.data_revision) !== 1
    || metadata.build_id !== expectedBuildId
  ) {
    throw new Error(`Expected data pack ${expectedBuildId}; verify the configured MySQL database.`);
  }

  const expectedCounts: Array<[string, number]> = [
    ['drones', 5],
    ['flight_zones', 8],
    ['missions', 20],
    ['flights', 20],
    ['telemetry', 6000],
    ['alerts', 24],
  ];
  for (const [table, expected] of expectedCounts) {
    const [countRows] = await database.query<CountRow[]>(`SELECT COUNT(*) AS total FROM ${table}`);
    const actual = Number(countRows[0]?.total ?? 0);
    if (actual !== expected) {
      throw new Error(`Expected ${expected} rows in ${table}, found ${actual}; verify the configured MySQL database.`);
    }
  }
}

export function uniqueIntegrationCode(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`.toUpperCase().slice(0, 30);
}

export async function createMissionFixture(
  database: Pool,
  options: {
    sourceMissionId: number;
    droneId?: number;
    validationStatus?: MissionValidationStatus;
    estimatedDurationSec?: number;
    codePrefix?: string;
  },
): Promise<number> {
  const missionCode = uniqueIntegrationCode(options.codePrefix ?? 'MSN-IT');
  const [result] = await database.execute<ResultSetHeader>(
    `INSERT INTO missions
      (mission_code, drone_id, name, description, status, validation_status, validation_message,
       planned_altitude_m, planned_speed_mps, estimated_distance_m, estimated_duration_sec,
       progress_percent, created_at, updated_at)
     SELECT ?, COALESCE(?, drone_id), CONCAT(name, ' integration test'),
       'Temporary MySQL integration fixture', 'DRAFT', ?, NULL, planned_altitude_m,
       planned_speed_mps, estimated_distance_m, COALESCE(?, estimated_duration_sec), 0, NOW(), NOW()
     FROM missions WHERE id = ?`,
    [
      missionCode,
      options.droneId ?? null,
      options.validationStatus ?? 'NOT_CHECKED',
      options.estimatedDurationSec ?? null,
      options.sourceMissionId,
    ],
  );
  if (!result.insertId) throw new Error(`Could not copy source mission ${options.sourceMissionId}`);
  await database.execute(
    `INSERT INTO waypoints
      (mission_id, sequence_number, waypoint_type, latitude, longitude, altitude_m, hold_time_sec, created_at)
     SELECT ?, sequence_number, waypoint_type, latitude, longitude, altitude_m, hold_time_sec, NOW()
     FROM waypoints WHERE mission_id = ? ORDER BY sequence_number`,
    [result.insertId, options.sourceMissionId],
  );
  return result.insertId;
}

export async function cleanupMissionFixture(database: Pool, missionId: number): Promise<void> {
  await database.execute('DELETE FROM alerts WHERE mission_id = ?', [missionId]);
  await database.execute(
    'DELETE t FROM telemetry t JOIN flights f ON f.id = t.flight_id WHERE f.mission_id = ?',
    [missionId],
  );
  await database.execute('DELETE FROM flights WHERE mission_id = ?', [missionId]);
  await database.execute('DELETE FROM weather_checks WHERE mission_id = ?', [missionId]);
  await database.execute('DELETE FROM waypoints WHERE mission_id = ?', [missionId]);
  await database.execute('DELETE FROM missions WHERE id = ?', [missionId]);
}

export async function waitFor<T>(
  probe: () => Promise<T | null | undefined | false>,
  timeoutMs = 12_000,
  intervalMs = 200,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await probe();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Condition was not met within ${timeoutMs} ms`);
}
