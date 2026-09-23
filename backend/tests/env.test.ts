import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/config/env';

const valid = { DB_HOST: '127.0.0.1', DB_NAME: 'drone_monitoring', DB_USER: 'drone_app', DB_PASSWORD: 'secret' };

describe('runtime configuration', () => {
  it('requires database credentials', () => {
    expect(() => readConfig({ ...valid, DB_PASSWORD: '' })).toThrow('DB_PASSWORD');
  });

  it('rejects an invalid port', () => {
    expect(() => readConfig({ ...valid, DB_PORT: 'not-a-number' })).toThrow('DB_PORT');
  });

  it('uses defaults for local ports', () => {
    expect(readConfig(valid)).toMatchObject({ port: 3000, database: { port: 3306 } });
  });
});
