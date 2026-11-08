import request from 'supertest';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2DataPack,
  createIntegrationDatabase,
} from './support/database';

interface DroneStatusRow extends RowDataPacket {
  status: string;
}

interface MissionStatusRow extends RowDataPacket {
  status: string;
  progress_percent: number;
}

interface FlightStatusRow extends RowDataPacket {
  status: string;
  route_progress_percent: number;
  started_at: Date | null;
}

const database = createIntegrationDatabase();

describe('Fleet power API with MySQL v2.1.0 R5', () => {
  beforeAll(async () => {
    await assertV2DataPack(database);
  });

  afterAll(async () => {
    await database.end();
  });

  it('persists R5 power scenarios and blocks unsafe shutdowns', async () => {
    const connection = await database.getConnection();

    try {
      await connection.beginTransaction();

      // API requests use savepoints inside this test transaction.
      // The outer rollback restores the original R5 demo data.
      const requestConnection = {
        query: connection.query.bind(connection),
        beginTransaction: async () => {
          await connection.query('SAVEPOINT power_request');
        },
        commit: async () => {
          await connection.query('RELEASE SAVEPOINT power_request');
        },
        rollback: async () => {
          await connection.query('ROLLBACK TO SAVEPOINT power_request');
          await connection.query('RELEASE SAVEPOINT power_request');
        },
        release: () => {},
      } as unknown as PoolConnection;

      const app = createApp({
        query: connection.query.bind(connection),
        getConnection: async () => requestConnection,
      } as unknown as Pool);

      const drone1On = await request(app)
        .patch('/api/drones/DRONE-001/power')
        .send({ isOn: true });

      expect(drone1On.status).toBe(200);
      expect(drone1On.body.data).toMatchObject({
        droneCode: 'DRONE-001',
        status: 'AVAILABLE',
        isActivated: true,
      });

      const drone1Detail = await request(app).get('/api/drones/DRONE-001');
      expect(drone1Detail.body.data).toMatchObject({
        code: 'DRONE-001',
        status: 'AVAILABLE',
        isActivated: true,
      });

      const drone1Off = await request(app)
        .patch('/api/drones/DRONE-001/power')
        .send({ isOn: false });

      expect(drone1Off.status).toBe(200);
      expect(drone1Off.body.data).toMatchObject({
        status: 'OFFLINE',
        isActivated: false,
      });

      const drone2On = await request(app)
        .patch('/api/drones/DRONE-002/power')
        .send({ isOn: true });

      expect(drone2On.status).toBe(200);
      expect(drone2On.body.data).toMatchObject({
        status: 'MAINTENANCE',
        isActivated: true,
      });

      const drone2Off = await request(app)
        .patch('/api/drones/DRONE-002/power')
        .send({ isOn: false });

      expect(drone2Off.status).toBe(409);
      expect(drone2Off.body.error.code).toBe('INVALID_POWER_TRANSITION');

      const drone3On = await request(app)
        .patch('/api/drones/DRONE-003/power')
        .send({ isOn: true });

      expect(drone3On.status).toBe(200);
      expect(drone3On.body.data).toMatchObject({
        status: 'IN_FLIGHT',
        isActivated: true,
      });

      // Verify the same R5 power change is visible through the read APIs.
      const currentMissions = await request(app).get('/api/missions');
      expect(currentMissions.status).toBe(200);
      expect(currentMissions.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            missionCode: 'mission-003',
            status: 'IN_PROGRESS',
          }),
        ]),
      );

      const activeFlights = await request(app).get('/api/flights/active');
      expect(activeFlights.status).toBe(200);
      expect(activeFlights.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            flightCode: 'FLIGHT-015',
            missionCode: 'mission-003',
            droneCode: 'DRONE-003',
            status: 'FLYING',
          }),
        ]),
      );

      const drone2Alerts = await request(app)
        .get('/api/alerts?droneCode=DRONE-002');
      expect(drone2Alerts.status).toBe(200);
      expect(drone2Alerts.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            alert_code: 'DEMO-ALT-002',
            drone_code: 'DRONE-002',
          }),
        ]),
      );

      const [missionRows] = await connection.query<MissionStatusRow[]>(
        'SELECT status, progress_percent FROM missions WHERE mission_code = ?',
        ['mission-003'],
      );
      expect(missionRows[0]).toMatchObject({
        status: 'IN_PROGRESS',
        progress_percent: 20,
      });

      const [flightRows] = await connection.query<FlightStatusRow[]>(
        `SELECT status, route_progress_percent, started_at
         FROM flights WHERE flight_code = ?`,
        ['FLIGHT-015'],
      );
      expect(flightRows[0]).toMatchObject({
        status: 'FLYING',
        route_progress_percent: 20,
      });
      expect(flightRows[0]?.started_at).not.toBeNull();

      const drone3Off = await request(app)
        .patch('/api/drones/DRONE-003/power')
        .send({ isOn: false });

      expect(drone3Off.status).toBe(409);
      expect(drone3Off.body.error.code).toBe('INVALID_POWER_TRANSITION');

      const [drone3Rows] = await connection.query<DroneStatusRow[]>(
        'SELECT status FROM drones WHERE drone_code = ?',
        ['DRONE-003'],
      );
      expect(drone3Rows[0]?.status).toBe('IN_FLIGHT');

      for (const droneCode of ['DRONE-004', 'DRONE-005']) {
        const switchedOn = await request(app)
          .patch(`/api/drones/${droneCode}/power`)
          .send({ isOn: true });

        expect(switchedOn.status).toBe(200);
        expect(switchedOn.body.data).toMatchObject({
          droneCode,
          status: 'AVAILABLE',
          isActivated: true,
        });
      }

      const missing = await request(app)
        .patch('/api/drones/DRONE-999/power')
        .send({ isOn: true });
      expect(missing.status).toBe(404);

      const invalid = await request(app)
        .patch('/api/drones/DRONE-001/power')
        .send({ isOn: 'yes' });
      expect(invalid.status).toBe(400);
    } finally {
      await connection.rollback();
      connection.release();
    }
  });
});