import type { Pool } from 'mysql2/promise';
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
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
    });
  });

  it('rejects malformed JSON without exposing internal details', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_JSON', message: 'Invalid JSON body' },
    });
  });

  it('publishes documentation for the enabled demo routes', async () => {
    const document = await request(app).get('/api/openapi.json');

    expect(document.status).toBe(200);
    expect(document.body.openapi).toBe('3.0.3');

    for (const path of [
      '/drones',
      '/drones/{droneCode}',
      '/drones/{droneCode}/power',
      '/missions',
      '/missions/{missionId}',
      '/flights',
      '/alerts',
      '/alerts/{id}/resolve',
    ]) {
      expect(document.body.paths[path]).toBeDefined();
    }

    for (const path of [
      '/flight-zones',
      '/missions/{id}/validate',
      '/weather/current',
      '/missions/{id}/weather-check',
      '/flights/{id}/simulation/start',
      '/flights/{id}/simulation/stop',
      '/flights/{id}/simulation/status',
    ]) {
      expect(document.body.paths[path]).toBeUndefined();
    }

    const docs = await request(app).get('/api/docs/');
    expect(docs.status).toBe(200);
    expect(docs.type).toContain('html');
  });

  it('does not expose deferred routes when a database is configured', async () => {
    const appWithDatabase = createApp({} as Pool);
    const endpoints = [
      ['get', '/api/flight-zones'],
      ['post', '/api/missions/1/validate'],
      ['get', '/api/weather/current'],
      ['post', '/api/missions/1/weather-check'],
      ['post', '/api/flights/1/simulation/start'],
      ['post', '/api/flights/1/simulation/stop'],
      ['get', '/api/flights/1/simulation/status'],
    ] as const;

    for (const [method, path] of endpoints) {
      const response = await request(appWithDatabase)[method](path);
      expect(response.status, `${method.toUpperCase()} ${path}`).toBe(404);
      expect(response.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'Route not found' },
      });
    }
  });
});