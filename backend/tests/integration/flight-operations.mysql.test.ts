import request from 'supertest';
import type { RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import {
  assertV2DataPack,
  createIntegrationDatabase,
} from './support/database';

interface FlightReferenceRow extends RowDataPacket {
  id: number | string;
  flight_code: string;
  status: string;
  result: string | null;
  drone_id: number | string;
  drone_code: string;
  drone_display_name: string;
  mission_id: number | string;
  mission_code: string;
  mission_name: string;
  scenario_code: string;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | string;
  distance_m: number | string;
}

interface FlightCodeRow extends RowDataPacket {
  flight_code: string;
}

const integrationDatabase = createIntegrationDatabase();
const app = createApp(integrationDatabase);

describe('Flight Operations MySQL integration', () => {
  beforeAll(async () => {
    await assertV2DataPack(integrationDatabase);
  });

  afterAll(async () => {
    await integrationDatabase.end();
  });

  it('returns seeded flights with their joined drone, mission, and scenario data', async () => {
    const response = await request(app).get('/api/flights');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, pageSize: 25, total: 20 });
    expect(response.body.data).toHaveLength(20);

    const [referenceRows] = await integrationDatabase.query<FlightReferenceRow[]>(
      `SELECT f.id, f.flight_code, f.status, f.result,
       d.id AS drone_id, d.drone_code, d.display_name AS drone_display_name,
       m.id AS mission_id, m.mission_code, m.name AS mission_name,
       s.scenario_code,
       DATE_FORMAT(f.started_at, '%Y-%m-%d %H:%i:%s.%f') AS started_at,
       DATE_FORMAT(f.ended_at, '%Y-%m-%d %H:%i:%s.%f') AS ended_at,
       f.duration_sec, f.distance_m
       FROM flights f
       INNER JOIN drones d ON d.id = f.drone_id
       INNER JOIN missions m ON m.id = f.mission_id
       INNER JOIN simulation_scenarios s ON s.id = f.simulation_scenario_id
       WHERE f.flight_code = ?`,
      ['FLT-001'],
    );

    expect(referenceRows).toHaveLength(1);
    const expected = referenceRows[0];
    if (!expected) throw new Error('Expected seeded flight FLT-001');

    const actual = response.body.data.find(
      (flight: { flightCode: string }) => flight.flightCode === expected.flight_code,
    );

    expect(actual).toEqual({
      id: Number(expected.id),
      flightCode: expected.flight_code,
      status: expected.status,
      result: expected.result,
      drone: {
        id: Number(expected.drone_id),
        droneCode: expected.drone_code,
        displayName: expected.drone_display_name,
      },
      mission: {
        id: Number(expected.mission_id),
        missionCode: expected.mission_code,
        name: expected.mission_name,
      },
      scenarioCode: expected.scenario_code,
      startedAt: expected.started_at,
      endedAt: expected.ended_at,
      durationSec: Number(expected.duration_sec),
      distanceM: Number(expected.distance_m),
    });
  });

  it('applies pagination in the same order as MySQL', async () => {
    const pageSize = 3;
    const firstPage = await request(app).get(`/api/flights?page=1&pageSize=${pageSize}`);
    const secondPage = await request(app).get(`/api/flights?page=2&pageSize=${pageSize}`);

    expect(firstPage.status).toBe(200);
    expect(secondPage.status).toBe(200);
    expect(firstPage.body).toMatchObject({ page: 1, pageSize, total: 20 });
    expect(secondPage.body).toMatchObject({ page: 2, pageSize, total: 20 });
    expect(firstPage.body.data).toHaveLength(pageSize);
    expect(secondPage.body.data).toHaveLength(pageSize);

    const [expectedFirstPage] = await integrationDatabase.query<FlightCodeRow[]>(
      `SELECT flight_code FROM flights
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, 0],
    );
    const [expectedSecondPage] = await integrationDatabase.query<FlightCodeRow[]>(
      `SELECT flight_code FROM flights
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`,
      [pageSize, pageSize],
    );

    expect(firstPage.body.data.map((flight: { flightCode: string }) => flight.flightCode))
      .toEqual(expectedFirstPage.map((flight) => flight.flight_code));
    expect(secondPage.body.data.map((flight: { flightCode: string }) => flight.flightCode))
      .toEqual(expectedSecondPage.map((flight) => flight.flight_code));
  });

  it('applies combined drone, mission, status, and result filters against MySQL', async () => {
    const response = await request(app)
      .get('/api/flights?droneId=1&missionId=8&status=LANDED&result=SUCCESS');

    const [expectedRows] = await integrationDatabase.query<FlightCodeRow[]>(
      `SELECT f.flight_code
       FROM flights f
       WHERE f.drone_id = ?
         AND f.mission_id = ?
         AND f.status = ?
         AND f.result = ?
       ORDER BY f.created_at DESC, f.id DESC`,
      [1, 8, 'LANDED', 'SUCCESS'],
    );
    const expectedCodes = expectedRows.map((flight) => flight.flight_code);

    expect(response.status).toBe(200);
    expect(expectedCodes).toContain('FLT-001');
    expect(response.body).toMatchObject({
      page: 1,
      pageSize: 25,
      total: expectedCodes.length,
    });
    expect(response.body.data.map((flight: { flightCode: string }) => flight.flightCode))
      .toEqual(expectedCodes);
  });

  it('returns an empty page when no seeded flight matches', async () => {
    const response = await request(app).get('/api/flights?droneId=999999');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      page: 1,
      pageSize: 25,
      total: 0,
    });
  });
});