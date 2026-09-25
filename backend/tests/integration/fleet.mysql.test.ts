import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2FleetDataPack,
  closeIntegrationDatabase,
  integrationDatabase,
} from './support/database';

const app = createApp(integrationDatabase);

describe('Fleet MySQL integration', () => {
  beforeAll(async () => {
    await assertV2FleetDataPack();
  });

  afterAll(async () => {
    await closeIntegrationDatabase();
  });

  it('reads the v2.0.0 seeded drones through the paginated API', async () => {
    const response = await request(app).get('/api/drones');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 25, total: 5 });
    expect(response.body.data).toHaveLength(5);
    expect(response.body.data).toMatchObject([
      { droneCode: 'DRONE-001', status: 'OFFLINE' },
      { droneCode: 'DRONE-002', status: 'OFFLINE' },
      { droneCode: 'DRONE-003', status: 'OFFLINE' },
      { droneCode: 'DRONE-004', status: 'OFFLINE' },
      { droneCode: 'DRONE-005', status: 'OFFLINE' },
    ]);
  });

  it('applies the status filter and page window against MySQL', async () => {
    const response = await request(app).get('/api/drones?status=OFFLINE&page=2&pageSize=2');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      data: [
        { droneCode: 'DRONE-003', status: 'OFFLINE' },
        { droneCode: 'DRONE-004', status: 'OFFLINE' },
      ],
      page: 2,
      pageSize: 2,
      total: 5,
    });
  });
});
