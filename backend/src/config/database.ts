import { createPool, type Pool } from 'mysql2/promise';
import type { AppConfig } from './env';

export function createDatabase(config: AppConfig['database']): Pool {
  return createPool({
    host: config.host,
    port: config.port,
    database: config.name,
    user: config.user,
    password: config.password,
    connectionLimit: 10,
  });
}
