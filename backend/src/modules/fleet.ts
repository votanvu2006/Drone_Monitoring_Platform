import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';
import { registerFleetPowerRoute } from './fleet-power';

type DroneStatus = 'AVAILABLE' | 'IN_FLIGHT' | 'MAINTENANCE' | 'OFFLINE';
type LocationSource =
  | 'BROWSER_GEOLOCATION'
  | 'DEVICE_GPS'
  | 'FLIGHT_TELEMETRY'
  | 'HOME_BASE'
  | 'MANUAL'
  | 'UNKNOWN';
type ComponentHealthStatus = 'HEALTHY' | 'WARNING' | 'FAULT' | 'MAINTENANCE';
type FindingSeverity = 'WARNING' | 'FAULT';

interface DroneRow extends RowDataPacket {
  id: number | string;
  drone_code: string;
  display_name: string;
  status: DroneStatus;
  battery_percent: number | string;
  serial_number: string;
  is_simulated: number | boolean;
  model_code: string;
  manufacturer: string;
  model_name: string;
  max_speed_mps: number | string;
  max_flight_time_minutes: number | string;
  home_location_label: string;
  home_latitude: number | string;
  home_longitude: number | string;
  last_known_location_label: string | null;
  last_known_latitude: number | string | null;
  last_known_longitude: number | string | null;
  last_known_altitude_m: number | string | null;
  location_source: LocationSource;
  location_updated_at: Date | string | null;
  active_mission_code: string | null;
}

interface ComponentRow extends RowDataPacket {
  component_code: string;
  component_type: string;
  name: string;
  position: string;
  model: string;
  primary_function: string;
  component_serial_number: string;
  health_status: ComponentHealthStatus;
}

interface FindingRow extends RowDataPacket {
  drone_id: number | string;
  finding_code: string;
  drone_code: string;
  mission_code: string;
  component_code: string;
  severity: FindingSeverity;
  detected_at: string;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

const DRONE_STATUSES: readonly DroneStatus[] = [
  'AVAILABLE',
  'IN_FLIGHT',
  'MAINTENANCE',
  'OFFLINE',
];

const DRONE_COLUMNS = `
  d.id, d.drone_code, d.display_name, d.status, d.battery_percent,
  d.serial_number, d.is_simulated,
  m.model_code, m.manufacturer, m.model_name,
  m.max_speed_mps, m.max_flight_time_minutes,
  d.home_location_label, d.home_latitude, d.home_longitude,
  d.last_known_location_label, d.last_known_latitude,
  d.last_known_longitude, d.last_known_altitude_m,
  d.location_source, d.location_updated_at,
  (
    SELECT current_mission.mission_code
    FROM missions current_mission
    WHERE current_mission.drone_id = d.id
      AND current_mission.is_current = 1
      AND current_mission.status IN ('RUNNING', 'IN_PROGRESS')
    ORDER BY current_mission.id DESC
    LIMIT 1
  ) AS active_mission_code
`;

function positiveInteger(value: unknown, name: string): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }

  return parsed;
}

function homeLocation(row: DroneRow) {
  return {
    label: row.home_location_label,
    latitude: Number(row.home_latitude),
    longitude: Number(row.home_longitude),
  };
}

function lastKnownLocation(row: DroneRow) {
  if (row.last_known_latitude === null || row.last_known_longitude === null) {
    return null;
  }

  return {
    label: row.last_known_location_label,
    latitude: Number(row.last_known_latitude),
    longitude: Number(row.last_known_longitude),
    altitudeM: row.last_known_altitude_m === null
      ? null
      : Number(row.last_known_altitude_m),
    source: row.location_source,
    updatedAt: row.location_updated_at,
  };
}

function toFinding(row: FindingRow) {
  return {
    id: row.finding_code,
    droneCode: row.drone_code,
    missionCode: row.mission_code,
    componentCode: row.component_code,
    severity: row.severity,
    // Demo seed DATETIME values represent UTC. MySQL returns microseconds.
    detectedAt: `${row.detected_at.slice(0, 23)}Z`,
  };
}

function toDroneListItem(row: DroneRow, findings: FindingRow[]) {
  return {
    id: Number(row.id),
    droneCode: row.drone_code,
    displayName: row.display_name,
    status: row.status,
    batteryPercent: Number(row.battery_percent),
    isSimulated: Number(row.is_simulated) === 1,
    model: {
      modelCode: row.model_code,
      manufacturer: row.manufacturer,
      modelName: row.model_name,
    },
    homeLocation: homeLocation(row),
    lastKnownLocation: lastKnownLocation(row),
    activeMission: row.active_mission_code,
    findings: findings.map(toFinding),
  };
}

async function readFindings(database: Pool, droneIds: number[]): Promise<FindingRow[]> {
  if (droneIds.length === 0) {
    return [];
  }

  const placeholders = droneIds.map(() => '?').join(', ');
  const [rows] = await database.query<FindingRow[]>(
    `SELECT f.drone_id, f.finding_code, d.drone_code,
       mission.mission_code, catalog.component_code, f.severity,
       DATE_FORMAT(f.detected_at, '%Y-%m-%dT%H:%i:%s.%f') AS detected_at
     FROM component_findings f
     INNER JOIN drones d ON d.id = f.drone_id
     INNER JOIN missions mission
       ON mission.id = f.mission_id AND mission.drone_id = f.drone_id
     INNER JOIN drone_components component
       ON component.id = f.component_id AND component.drone_id = f.drone_id
     INNER JOIN component_catalog catalog ON catalog.id = component.component_catalog_id
     WHERE f.drone_id IN (${placeholders})
     ORDER BY f.detected_at DESC, f.id DESC`,
    droneIds,
  );

  return rows;
}

export function createFleetRouter(database: Pool): Router {
  const router = Router();
  registerFleetPowerRoute(router, database);

  router.get('/drones', async (request, response, next) => {
    try {
      const page = request.query.page === undefined
        ? 1
        : positiveInteger(request.query.page, 'page');
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

      const values: unknown[] = [];
      let where = '';
      const status = request.query.status;

      if (status !== undefined) {
        if (typeof status !== 'string' || !DRONE_STATUSES.includes(status as DroneStatus)) {
          throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid status');
        }

        where = 'WHERE d.status = ?';
        values.push(status);
      }

      const [countRows] = await database.query<CountRow[]>(
        `SELECT COUNT(*) AS total FROM drones d ${where}`,
        values,
      );
      const [rows] = await database.query<DroneRow[]>(
        `SELECT ${DRONE_COLUMNS}
         FROM drones d
         INNER JOIN drone_models m ON m.id = d.drone_model_id
         ${where}
         ORDER BY d.drone_code ASC
         LIMIT ? OFFSET ?`,
        [...values, pageSize, offset],
      );

      const findings = await readFindings(
        database,
        rows.map((row) => Number(row.id)),
      );

      response.json({
        data: rows.map((row) => toDroneListItem(
          row,
          findings.filter((finding) => Number(finding.drone_id) === Number(row.id)),
        )),
        page,
        pageSize,
        total: Number(countRows[0]?.total ?? 0),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/drones/:droneCode', async (request, response, next) => {
    try {
      const droneCode = request.params.droneCode;
      if (
        typeof droneCode !== 'string'
        || !/^[A-Za-z0-9_-]{1,30}$/.test(droneCode)
      ) {
        throw new ApiError(400, 'INVALID_ARGUMENT', 'Invalid drone code');
      }

      const [droneRows] = await database.query<DroneRow[]>(
        `SELECT ${DRONE_COLUMNS}
         FROM drones d
         INNER JOIN drone_models m ON m.id = d.drone_model_id
         WHERE d.drone_code = ?`,
        [droneCode],
      );
      const drone = droneRows[0];

      if (!drone) {
        throw new ApiError(404, 'DRONE_NOT_FOUND', 'Drone not found');
      }

      const [componentRows] = await database.query<ComponentRow[]>(
        `SELECT catalog.component_code, catalog.component_type,
           catalog.name, catalog.position, catalog.model,
           catalog.primary_function, component.component_serial_number,
           component.health_status
         FROM drone_components component
         INNER JOIN component_catalog catalog
           ON catalog.id = component.component_catalog_id
         WHERE component.drone_id = ? AND component.installed = 1
         ORDER BY catalog.display_order ASC, component.id ASC`,
        [drone.id],
      );
      const findings = await readFindings(database, [Number(drone.id)]);

      response.json({
        data: {
          code: drone.drone_code,
          status: drone.status,
          // The write behavior of the Power switch belongs to #90.
          isActivated: drone.status !== 'OFFLINE',
          batteryPercent: Number(drone.battery_percent),
          serialNumber: drone.serial_number,
          manufacturer: drone.manufacturer,
          modelName: drone.model_name,
          modelCode: drone.model_code,
          maxSpeedMps: Number(drone.max_speed_mps),
          maxFlightTimeMinutes: Number(drone.max_flight_time_minutes),
          components: componentRows.map((component) => ({
            code: component.component_code,
            type: component.component_type,
            name: component.name,
            position: component.position,
            model: component.model,
            primaryFunction: component.primary_function,
            serialNumber: component.component_serial_number,
            healthStatus: component.health_status,
          })),
          findings: findings.map(toFinding),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}