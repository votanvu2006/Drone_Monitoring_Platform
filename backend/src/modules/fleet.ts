import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';

type DroneStatus = 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE' | 'OFFLINE';
type LocationSource = 'BROWSER_GEOLOCATION' | 'DEVICE_GPS' | 'FLIGHT_TELEMETRY' | 'HOME_BASE' | 'MANUAL' | 'UNKNOWN';

interface DroneListRow extends RowDataPacket {
  id: number | string;
  drone_code: string;
  display_name: string;
  status: DroneStatus;
  is_simulated: number | boolean;
  model_code: string;
  manufacturer: string;
  model_name: string;
  home_location_label: string;
  home_latitude: number | string;
  home_longitude: number | string;
  last_known_location_label: string | null;
  last_known_latitude: number | string | null;
  last_known_longitude: number | string | null;
  last_known_altitude_m: number | string | null;
  location_source: LocationSource;
  location_updated_at: Date | string | null;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface HomeLocation {
  label: string;
  latitude: number;
  longitude: number;
}

interface LastKnownLocation {
  label: string | null;
  latitude: number;
  longitude: number;
  altitudeM: number | null;
  source: LocationSource;
  updatedAt: Date | string | null;
}

interface DroneListItem {
  id: number;
  droneCode: string;
  displayName: string;
  status: DroneStatus;
  isSimulated: boolean;
  model: {
    modelCode: string;
    manufacturer: string;
    modelName: string;
  };
  homeLocation: HomeLocation;
  lastKnownLocation: LastKnownLocation | null;
}

const DRONE_STATUSES: readonly DroneStatus[] = [
  'AVAILABLE',
  'IN_FLIGHT',
  'MAINTENANCE',
  'OFFLINE',
];

function positiveInteger(value: unknown, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', name + ' must be a positive integer');
  }
  return parsed;
}

function homeLocation(row: DroneListRow): HomeLocation {
  return {
    label: row.home_location_label,
    latitude: Number(row.home_latitude),
    longitude: Number(row.home_longitude),
  };
}

function lastKnownLocation(row: DroneListRow): LastKnownLocation | null {
  if (row.last_known_latitude === null || row.last_known_longitude === null) {
    return null;
  }

  return {
    label: row.last_known_location_label,
    latitude: Number(row.last_known_latitude),
    longitude: Number(row.last_known_longitude),
    altitudeM: row.last_known_altitude_m === null ? null : Number(row.last_known_altitude_m),
    source: row.location_source,
    updatedAt: row.location_updated_at,
  };
}

function toDroneListItem(row: DroneListRow): DroneListItem {
  return {
    id: Number(row.id),
    droneCode: row.drone_code,
    displayName: row.display_name,
    status: row.status,
    isSimulated: Number(row.is_simulated) === 1,
    model: {
      modelCode: row.model_code,
      manufacturer: row.manufacturer,
      modelName: row.model_name,
    },
    homeLocation: homeLocation(row),
    lastKnownLocation: lastKnownLocation(row),
  };
}

export function createFleetRouter(database: Pool): Router {
  const router = Router();

  router.get('/drones', async (request, response, next) => {
    try {
      const page = request.query.page === undefined ? 1 : positiveInteger(request.query.page, 'page');
      const pageSize = request.query.pageSize === undefined
        ? 25
        : positiveInteger(request.query.pageSize, 'pageSize');
      if (pageSize > 100) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'pageSize must not exceed 100');
      }

      const offset = (page - 1) * pageSize;
      if (!Number.isSafeInteger(offset)) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'page is too large');
      }

      const clauses: string[] = [];
      const values: unknown[] = [];
      const status = request.query.status;
      if (status !== undefined) {
        if (typeof status !== 'string' || !DRONE_STATUSES.includes(status as DroneStatus)) {
          throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid status');
        }
        clauses.push('status = ?');
        values.push(status);
      }

      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      const [countRows] = await database.query<CountRow[]>(
        'SELECT COUNT(*) AS total FROM drones' + where,
        values,
      );
      const [rows] = await database.query<DroneListRow[]>(
        [
          'SELECT d.id, d.drone_code, d.display_name, d.status, d.is_simulated,',
          'm.model_code, m.manufacturer, m.model_name,',
          'd.home_location_label, d.home_latitude, d.home_longitude,',
          'd.last_known_location_label, d.last_known_latitude, d.last_known_longitude,',
          'd.last_known_altitude_m, d.location_source, d.location_updated_at',
          'FROM drones d',
          'INNER JOIN drone_models m ON m.id = d.drone_model_id',
          clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
          'ORDER BY d.drone_code ASC',
          'LIMIT ? OFFSET ?',
        ].filter(Boolean).join(' '),
        [...values, pageSize, offset],
      );

      response.json({
        data: rows.map(toDroneListItem),
        page,
        pageSize,
        total: Number(countRows[0]?.total ?? 0),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
