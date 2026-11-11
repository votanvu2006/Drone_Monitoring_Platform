import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import mysql from 'mysql2/promise';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';

// Chỉ chạy cơ chế reset với database demo của dự án.
if (process.env.DB_NAME !== 'drone_monitoring_frontend') {
  throw new Error(
    'Demo reset requires DB_NAME=drone_monitoring_frontend.',
  );
}

const seed = await readFile(
  new URL('../../data/seed.sql', import.meta.url),
  'utf8',
);

// Transaction được quản lý bên dưới để có thể rollback khi reset lỗi.
const seedStatements = seed
  .replace(/^START TRANSACTION;\s*$/gm, '')
  .replace(/^COMMIT;\s*$/gm, '');

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  multipleStatements: true,
});

try {
  const [metadata] = await connection.query(
    'SELECT build_id FROM data_pack_metadata WHERE id = 1',
  );

  if (
    metadata[0]?.build_id !==
    'DRONE-DATA-2.1.0-R6-20261109'
  ) {
    throw new Error('Demo reset requires the R6 data pack.');
  }

  await connection.beginTransaction();

  // Xóa bảng con trước bảng cha để giữ đúng khóa ngoại.
  const tables = [
    'component_findings',
    'flight_events',
    'demo_runs',
    'alerts',
    'alert_rule_catalog',
    'telemetry',
    'flights',
    'weather_checks',
    'weather_demo_profiles',
    'waypoints',
    'missions',
    'simulation_scenarios',
    'drone_components',
    'component_catalog',
    'drones',
    'drone_models',
    'data_pack_metadata',
  ];

  for (const table of tables) {
    await connection.query(`DELETE FROM \`${table}\``);
  }

  await connection.query(seedStatements);
  await connection.query('CALL verify_frontend_demo()');
  await connection.commit();

  console.info('Demo data restored to its initial state.');
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}

// Mã giữ nguyên khi sửa file khiến backend tự tải lại.
// Chỉ chạy lại lệnh npm run dev mới tạo mã khác.
const child = spawn(
  process.execPath,
  ['--import', 'tsx', '--watch', 'src/server.ts'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DEMO_RUN_ID: randomUUID(),
    },
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    child.kill(signal);
  });
}

child.once('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.once('exit', (code) => {
  process.exitCode = code ?? 0;
});