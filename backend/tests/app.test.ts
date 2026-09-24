import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';

describe('API boundary', () => {
  const app = createApp();

  it('exposes a health response', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a stable code for unknown routes', async () => {
    const response = await request(app).get('/api/unknown');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  it('rejects malformed JSON without exposing internal details', async () => {
    const response = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: { code: 'INVALID_JSON', message: 'Invalid JSON body' } });
  });

  it('publishes interactive API documentation', async () => {
    const document = await request(app).get('/api/openapi.json');
    expect(document.status).toBe(200);
    expect(document.body.openapi).toBe('3.0.3');
    expect(document.body.paths['/drones']).toBeDefined();
    expect(document.body.paths['/missions']).toBeDefined();
    expect(document.body.paths['/missions/{missionId}']).toBeDefined();
    expect(document.body.paths['/flights/{id}/simulation/start']).toBeDefined();

    const docs = await request(app).get('/api/docs/');
    expect(docs.status).toBe(200);
    expect(docs.type).toContain('html');
  });
});
