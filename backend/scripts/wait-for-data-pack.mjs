import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import mysql from 'mysql2/promise';
import { URL } from 'node:url';

const manifest = JSON.parse(
  await readFile(new URL('../../data/manifest.json', import.meta.url), 'utf8'),
);

if (manifest.version !== '2.1.0') {
  throw new Error(`Expected data pack v2.1.0, found ${manifest.version}`);
}

const expectedMetadata = {
  packVersion: manifest.version,
  dataRevision: manifest.dataRevision,
  buildId: manifest.buildId,
};

const expectedCounts = manifest.counts;
const maxAttempts = 60;
const retryDelayMs = 2000;

const pool = mysql.createPool({
  host: globalThis.process.env.DB_HOST ?? '127.0.0.1',
  port: Number(globalThis.process.env.DB_PORT ?? 3307),
  database: globalThis.process.env.DB_NAME ?? 'drone_monitoring_frontend',
  user: globalThis.process.env.DB_USER ?? 'drone_app',
  password: globalThis.process.env.DB_PASSWORD ?? 'drone_app_password',
  connectionLimit: 1,
  connectTimeout: 3000,
});

async function readPackReadiness() {
  const [metadataRows] = await pool.query(
    'SELECT pack_version, data_revision, build_id FROM data_pack_metadata WHERE id = ?',
    [1],
  );
  const metadata = metadataRows[0];

  if (!metadata) {
    return {
      ready: false,
      reason: 'data-pack metadata has not been imported yet',
    };
  }

  const metadataMatches =
    metadata.pack_version === expectedMetadata.packVersion
    && Number(metadata.data_revision) === expectedMetadata.dataRevision
    && metadata.build_id === expectedMetadata.buildId;

  if (!metadataMatches) {
    return {
      ready: false,
      reason: `found data pack ${metadata.build_id}; expected ${expectedMetadata.buildId}`,
    };
  }

  const mismatches = [];

  for (const [table, expected] of Object.entries(expectedCounts)) {
    if (!/^[a-z_]+$/.test(table)) {
      throw new Error(`Invalid table name in data manifest: ${table}`);
    }

    const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    const actual = Number(rows[0]?.total ?? 0);

    if (actual !== expected) {
      mismatches.push(`${table}: ${actual} (expected ${expected})`);
    }
  }

  return mismatches.length === 0
    ? { ready: true, reason: '' }
    : { ready: false, reason: mismatches.join(', ') };
}

function delay(milliseconds) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

let lastReason;

try {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const readiness = await readPackReadiness();

      if (readiness.ready) {
        globalThis.console.log(
          `Data pack ${expectedMetadata.buildId} is fully initialized.`,
        );
        globalThis.process.exitCode = 0;
        break;
      }

      lastReason = readiness.reason;
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }

    if (attempt === maxAttempts) {
      globalThis.console.error(
        `Timed out waiting for data pack ${expectedMetadata.buildId}. Last check: ${lastReason}`,
      );
      globalThis.process.exitCode = 1;
      break;
    }

    if (attempt === 1 || attempt % 10 === 0) {
      globalThis.console.log(
        `Waiting for v2.1.0 MySQL data import (${attempt}/${maxAttempts}): ${lastReason}`,
      );
    }

    await delay(retryDelayMs);
  }
} finally {
  await pool.end();
}