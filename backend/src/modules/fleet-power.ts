import type { Router } from 'express';
import type {
  Pool,
  PoolConnection,
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';

type DroneStatus = 'OFFLINE' | 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE';

interface DroneRow extends RowDataPacket {
  id: number;
  status: DroneStatus;
  battery_percent: number;
}

interface MissionRow extends RowDataPacket {
  id: number;
  status: string;
}

interface ReadyFlightRow extends RowDataPacket {
  id: number;
  mission_id: number;
}

interface ActiveFlightRow extends RowDataPacket {
  id: number;
}

async function updateOne(
  connection: PoolConnection,
  sql: string,
  values: unknown[],
): Promise<void> {
  const [result] = await connection.query<ResultSetHeader>(sql, values);

  if (result.affectedRows !== 1) {
    throw new ApiError(
      409,
      'POWER_STATE_CONFLICT',
      'Drone state changed; reload and try again',
    );
  }
}

export function registerFleetPowerRoute(router: Router, database: Pool): void {
  router.patch('/drones/:droneCode/power', async (request, response, next) => {
    try {
      const droneCode = request.params.droneCode;
      const isOn: unknown = request.body?.isOn;

      if (
        typeof droneCode !== 'string' ||
        !/^[A-Za-z0-9_-]{1,30}$/.test(droneCode) ||
        typeof isOn !== 'boolean'
      ) {
        throw new ApiError(
          400,
          'INVALID_ARGUMENT',
          'Valid drone code and boolean isOn are required',
        );
      }

      const connection = await database.getConnection();

      try {
        await connection.beginTransaction();

        const [droneRows] = await connection.query<DroneRow[]>(
          `SELECT id, status, battery_percent
           FROM drones
           WHERE drone_code = ?
           LIMIT 1 FOR UPDATE`,
          [droneCode],
        );
        const drone = droneRows[0];

        if (!drone) {
          throw new ApiError(404, 'DRONE_NOT_FOUND', 'Drone not found');
        }

        let nextStatus: DroneStatus = drone.status;

        if (!isOn) {
          const [activeFlights] = await connection.query<ActiveFlightRow[]>(
            `SELECT id FROM flights
             WHERE drone_id = ?
               AND status IN ('FLYING', 'PAUSED', 'RETURNING')
             LIMIT 1 FOR UPDATE`,
            [drone.id],
          );

          if (
            drone.status === 'IN_FLIGHT' ||
            drone.status === 'MAINTENANCE' ||
            activeFlights.length > 0
          ) {
            throw new ApiError(
              409,
              'INVALID_POWER_TRANSITION',
              'Cannot switch off a drone in flight or maintenance',
            );
          }

          if (drone.status === 'AVAILABLE') {
            await updateOne(
              connection,
              `UPDATE drones
               SET status = 'OFFLINE', updated_at = UTC_TIMESTAMP()
               WHERE id = ? AND status = 'AVAILABLE'`,
              [drone.id],
            );
          }

          nextStatus = 'OFFLINE';
        } else if (drone.status === 'OFFLINE') {
          const [missionRows] = await connection.query<MissionRow[]>(
            `SELECT id, status FROM missions
             WHERE drone_id = ? AND is_current = 1
             ORDER BY id DESC LIMIT 1 FOR UPDATE`,
            [drone.id],
          );
          const mission = missionRows[0];

          if (mission?.status === 'WARNING') {
            nextStatus = 'MAINTENANCE';
          } else if (mission?.status === 'READY') {
            const [readyFlights] = await connection.query<ReadyFlightRow[]>(
              `SELECT id, mission_id FROM flights
               WHERE drone_id = ? AND mission_id = ? AND status = 'READY'
               ORDER BY id DESC LIMIT 1 FOR UPDATE`,
              [drone.id, mission.id],
            );
            const flight = readyFlights[0];

            if (flight) {
              await updateOne(
                connection,
                `UPDATE missions
                 SET status = 'IN_PROGRESS', progress_percent = 20,
                     updated_at = UTC_TIMESTAMP()
                 WHERE id = ? AND drone_id = ?
                   AND is_current = 1 AND status = 'READY'`,
                [mission.id, drone.id],
              );

              await updateOne(
                connection,
                `UPDATE flights
                 SET status = 'FLYING', started_at = UTC_TIMESTAMP(3),
                     start_battery_percent = ?,
                     route_progress_percent = 20,
                     updated_at = UTC_TIMESTAMP()
                 WHERE id = ? AND drone_id = ? AND mission_id = ?
                   AND status = 'READY'`,
                [drone.battery_percent, flight.id, drone.id, mission.id],
              );

              nextStatus = 'IN_FLIGHT';
            } else {
              nextStatus = 'AVAILABLE';
            }
          } else {
            nextStatus = 'AVAILABLE';
          }

          await updateOne(
            connection,
            `UPDATE drones
             SET status = ?, updated_at = UTC_TIMESTAMP()
             WHERE id = ? AND status = 'OFFLINE'`,
            [nextStatus, drone.id],
          );
        }

        await connection.commit();

        response.json({
          data: {
            droneCode,
            status: nextStatus,
            isActivated: nextStatus !== 'OFFLINE',
          },
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  });
}