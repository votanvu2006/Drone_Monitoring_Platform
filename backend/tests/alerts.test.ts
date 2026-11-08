import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'mysql2/promise';
import { createApp } from '../src/app';

describe('alerts API', () => {
  it('lists alerts with stable pagination metadata', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce([[{ total: 1 }], []])
      .mockResolvedValueOnce([[{ id: 7, status: 'ACTIVE' }], []]);
    const app = createApp({ query } as unknown as Pool);
    const response = await request(app).get('/api/alerts?status=ACTIVE&pageSize=10');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 10, total: 1, data: [{ id: 7 }] });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('validates alert filters before querying the database', async () => {
    const query = vi.fn();
    const app = createApp({ query } as unknown as Pool);
    const response = await request(app).get('/api/alerts?severity=INFO');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_ARGUMENT');
    expect(query).not.toHaveBeenCalled();
  });
});

describe('v2.1.0 alert query validation', () => {
  it.each(['page=1.5', 'pageSize=101', 'page=9007199254740991&pageSize=100',
    'flightId=1&flightId=2', 'droneCode=bad%20code', 'missionCode=x&missionCode=y'])('rejects %s without querying', async queryString => {
      const query = vi.fn();
      const response = await request(createApp({ query } as unknown as Pool)).get('/api/alerts?' + queryString);
      expect(response.status).toBe(400);
      expect(query).not.toHaveBeenCalled();
    });
});
