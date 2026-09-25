import 'dotenv/config';
import type { RowDataPacket } from 'mysql2/promise';
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

export const integrationDatabase = createDatabase(readConfig(process.env).database);

export async function assertV2FleetDataPack(): Promise<void> {
  const [metadataRows] = await integrationDatabase.query<DataPackMetadataRow[]>(
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

  const [countRows] = await integrationDatabase.query<CountRow[]>(
    'SELECT COUNT(*) AS total FROM drones',
  );
  const droneCount = Number(countRows[0]?.total ?? 0);

  if (droneCount !== 5) {
    throw new Error(`Expected 5 seeded drones, found ${droneCount}; verify the configured MySQL database.`);
  }
}

export async function closeIntegrationDatabase(): Promise<void> {
  await integrationDatabase.end();
}
