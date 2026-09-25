import 'dotenv/config';
import mysql from 'mysql2/promise';

const expectedMetadata = {
  packVersion: '2.0.0',
  dataRevision: 1,
  buildId: 'DRONE-DATA-2.0.0-R1-20260919',
};

const expectedCounts = {
  drones: 5,
  drone_components: 70,
  flight_zones: 8,
  simulation_scenarios: 9,
  missions: 20,
  waypoints: 90,
  flights: 20,
  telemetry: 6000,
  alerts: 24,
};

const maxAttempts = 60;
const retryDelayMs = 2000;

const pool = mysql.createPool({
  host: globalThis.process.env.DB_HOST ?? '127.0.0.1',
  port: Number(globalThis.process.env.DB_PORT ?? 3306),
  database: globalThis.process.env.DB_NAME ?? 'drone_monitoring',
  user: globalThis.process.env.DB_USER ?? 'drone_app',
  password: globalThis.process.env.DB_PASSWORD ?? 'drone_app_password',
  connectionLimit: 1,
  connectTimeout: 3000,
});

const countQuery = `
  SELECT
    (SELECT COUNT(*) FROM drones) AS drones,
    (SELECT COUNT(*) FROM drone_components) AS drone_components,
    (SELECT COUNT(*) FROM flight_zones) AS flight_zones,
    (SELECT COUNT(*) FROM simulation_scenarios) AS simulation_scenarios,
    (SELECT COUNT(*) FROM missions) AS missions,
    (SELECT COUNT(*) FROM waypoints) AS waypoints,
    (SELECT COUNT(*) FROM flights) AS flights,
    (SELECT COUNT(*) FROM telemetry) AS telemetry,
    (SELECT COUNT(*) FROM alerts) AS alerts
`;

async function readPackReadiness() {
  const [metadataRows] = await pool.query(
    'SELECT pack_version, data_revision, build_id FROM data_pack_metadata WHERE id = ?',
    [1],
  );
  const metadata = metadataRows[0];

  if (!metadata) {
    return { ready: false, reason: 'data-pack metadata has not been imported yet' };
  }

  const metadataMatches = metadata.pack_version === expectedMetadata.packVersion
    && Number(metadata.data_revision) === expectedMetadata.dataRevision
    && metadata.build_id === expectedMetadata.buildId;

  if (!metadataMatches) {
    return {
      ready: false,
      reason: `found data pack ${metadata.build_id}; expected ${expectedMetadata.buildId}`,
    };
  }

  const [countRows] = await pool.query(countQuery);
  const actualCounts = countRows[0];
  const mismatches = Object.entries(expectedCounts)
    .filter(([table, expected]) => Number(actualCounts[table]) !== expected)
    .map(([table, expected]) => `${table}: ${actualCounts[table]} (expected ${expected})`);

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
        globalThis.console.log(`Data pack ${expectedMetadata.buildId} is fully initialized.`);
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
      globalThis.console.log(`Waiting for v2.0.0 MySQL data import (${attempt}/${maxAttempts}): ${lastReason}`);
    }

    await delay(retryDelayMs);
  }
} finally {
  await pool.end();
}
