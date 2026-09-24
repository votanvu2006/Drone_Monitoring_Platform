import { Router } from 'express';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';
import { resolveActiveAlerts, upsertActiveAlert } from './alerts';

type Position = [number, number];

interface ZoneRow extends RowDataPacket {
  id: number;
  zone_code: string;
  name: string;
  zone_type: 'ALLOWED' | 'RESTRICTED';
  boundary_geojson: unknown;
  min_altitude_m: number | string | null;
  max_altitude_m: number | string | null;
  reason: string | null;
  data_authority: 'DEMO_ONLY' | 'OFFICIAL';
  display_color: string;
}

interface MissionRow extends RowDataPacket {
  id: number;
}

interface WaypointRow extends RowDataPacket {
  id: number;
  sequence_number: number;
  waypoint_type: 'START' | 'INTERMEDIATE' | 'DESTINATION';
  latitude: number | string;
  longitude: number | string;
  altitude_m: number | string;
}

interface PolygonGeometry {
  type: 'Polygon';
  coordinates: Position[][];
}

export interface RouteViolation {
  code: 'INVALID_WAYPOINTS' | 'OUTSIDE_ALLOWED_ZONE' | 'RESTRICTED_ZONE' | 'ALTITUDE_LIMIT';
  message: string;
  zoneCode?: string;
  waypointSequence?: number;
}

function positiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', 'Mission id must be a positive integer');
  }
  return parsed;
}

function geometry(value: unknown): PolygonGeometry {
  const parsed = typeof value === 'string' ? JSON.parse(value) as unknown : value;
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid zone geometry');
  const candidate = parsed as { type?: unknown; coordinates?: unknown };
  if (candidate.type !== 'Polygon' || !Array.isArray(candidate.coordinates)) {
    throw new Error('Only Polygon flight zones are supported');
  }
  return candidate as PolygonGeometry;
}

function orientation(a: Position, b: Position, c: Position): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(point: Position, a: Position, b: Position): boolean {
  const epsilon = 1e-10;
  return Math.abs(orientation(a, b, point)) < epsilon
    && point[0] >= Math.min(a[0], b[0]) - epsilon
    && point[0] <= Math.max(a[0], b[0]) + epsilon
    && point[1] >= Math.min(a[1], b[1]) - epsilon
    && point[1] <= Math.max(a[1], b[1]) + epsilon;
}

export function pointInPolygon(point: Position, polygon: Position[]): boolean {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const a = polygon[previous];
    const b = polygon[current];
    if (!a || !b) continue;
    if (onSegment(point, a, b)) return true;
    const crosses = (a[1] > point[1]) !== (b[1] > point[1])
      && point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0];
    if (crosses) inside = !inside;
  }
  return inside;
}

function segmentsIntersect(a: Position, b: Position, c: Position, d: Position): boolean {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  if (((abC > 0 && abD < 0) || (abC < 0 && abD > 0))
    && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0))) return true;
  return onSegment(c, a, b) || onSegment(d, a, b) || onSegment(a, c, d) || onSegment(b, c, d);
}

function segmentIntersectsPolygon(a: Position, b: Position, polygon: Position[]): boolean {
  if (pointInPolygon(a, polygon) || pointInPolygon(b, polygon)) return true;
  for (let index = 1; index < polygon.length; index += 1) {
    const c = polygon[index - 1];
    const d = polygon[index];
    if (c && d && segmentsIntersect(a, b, c, d)) return true;
  }
  return false;
}

function altitudeOverlaps(a: number, b: number, zone: ZoneRow): boolean {
  const routeMin = Math.min(a, b);
  const routeMax = Math.max(a, b);
  const zoneMin = zone.min_altitude_m === null ? Number.NEGATIVE_INFINITY : Number(zone.min_altitude_m);
  const zoneMax = zone.max_altitude_m === null ? Number.POSITIVE_INFINITY : Number(zone.max_altitude_m);
  return routeMax >= zoneMin && routeMin <= zoneMax;
}

export function validateRoute(waypoints: WaypointRow[], zones: ZoneRow[]): RouteViolation[] {
  const violations: RouteViolation[] = [];
  if (waypoints.length < 2
    || waypoints[0]?.waypoint_type !== 'START'
    || waypoints.at(-1)?.waypoint_type !== 'DESTINATION'
    || waypoints.some((waypoint, index) => waypoint.sequence_number !== index + 1)) {
    return [{ code: 'INVALID_WAYPOINTS', message: 'Route requires ordered START and DESTINATION waypoints' }];
  }

  const allowed = zones.filter((zone) => zone.zone_type === 'ALLOWED');
  const restricted = zones.filter((zone) => zone.zone_type === 'RESTRICTED');
  for (const waypoint of waypoints) {
    const point: Position = [Number(waypoint.longitude), Number(waypoint.latitude)];
    const altitude = Number(waypoint.altitude_m);
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]) || !Number.isFinite(altitude)
      || point[0] < -180 || point[0] > 180 || point[1] < -90 || point[1] > 90 || altitude < 0) {
      violations.push({ code: 'INVALID_WAYPOINTS', message: 'Waypoint coordinates or altitude are invalid', waypointSequence: waypoint.sequence_number });
      continue;
    }
    const containingAllowed = allowed.find((zone) => pointInPolygon(point, geometry(zone.boundary_geojson).coordinates[0] ?? []));
    if (!containingAllowed) {
      violations.push({ code: 'OUTSIDE_ALLOWED_ZONE', message: 'Waypoint is outside every active allowed zone', waypointSequence: waypoint.sequence_number });
    } else if (!altitudeOverlaps(altitude, altitude, containingAllowed)) {
      violations.push({ code: 'ALTITUDE_LIMIT', message: `Waypoint altitude violates ${containingAllowed.zone_code}`, zoneCode: containingAllowed.zone_code, waypointSequence: waypoint.sequence_number });
    }
  }

  for (let index = 1; index < waypoints.length; index += 1) {
    const previous = waypoints[index - 1];
    const current = waypoints[index];
    if (!previous || !current) continue;
    const a: Position = [Number(previous.longitude), Number(previous.latitude)];
    const b: Position = [Number(current.longitude), Number(current.latitude)];
    for (const zone of restricted) {
      if (altitudeOverlaps(Number(previous.altitude_m), Number(current.altitude_m), zone)
        && segmentIntersectsPolygon(a, b, geometry(zone.boundary_geojson).coordinates[0] ?? [])) {
        violations.push({ code: 'RESTRICTED_ZONE', message: `Route intersects ${zone.zone_code}`, zoneCode: zone.zone_code });
      }
    }
  }
  return violations;
}

export function createAirspaceRouter(database: Pool): Router {
  const router = Router();

  router.get('/flight-zones', async (_request, response, next) => {
    try {
      const [rows] = await database.query<ZoneRow[]>(
        `SELECT id, zone_code, name, zone_type, boundary_geojson, min_altitude_m,
         max_altitude_m, reason, data_authority, display_color
         FROM flight_zones WHERE is_active = TRUE ORDER BY id`,
      );
      response.json({
        type: 'FeatureCollection',
        features: rows.map((zone) => ({
          type: 'Feature',
          properties: {
            id: zone.id, zoneCode: zone.zone_code, name: zone.name, zoneType: zone.zone_type,
            minAltitudeM: zone.min_altitude_m === null ? null : Number(zone.min_altitude_m),
            maxAltitudeM: zone.max_altitude_m === null ? null : Number(zone.max_altitude_m),
            reason: zone.reason, dataAuthority: zone.data_authority, displayColor: zone.display_color,
          },
          geometry: geometry(zone.boundary_geojson),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/missions/:id/validate', async (request, response, next) => {
    const connection = await database.getConnection();
    try {
      const missionId = positiveInteger(request.params.id);
      await connection.beginTransaction();
      const [missions] = await connection.query<MissionRow[]>('SELECT id FROM missions WHERE id = ? FOR UPDATE', [missionId]);
      if (!missions[0]) throw new ApiError(404, 'MISSION_NOT_FOUND', 'Mission not found');
      const [waypoints] = await connection.query<WaypointRow[]>(
        `SELECT id, sequence_number, waypoint_type, latitude, longitude, altitude_m
         FROM waypoints WHERE mission_id = ? ORDER BY sequence_number`,
        [missionId],
      );
      const [zones] = await connection.query<ZoneRow[]>('SELECT * FROM flight_zones WHERE is_active = TRUE ORDER BY id');
      const violations = validateRoute(waypoints, zones);
      const validationStatus = violations.length ? 'INVALID' : 'VALID';
      const message = violations.length
        ? violations.map((violation) => violation.message).join('; ').slice(0, 500)
        : 'Route is inside the allowed airspace and avoids restricted zones.';
      await connection.execute(
        'UPDATE missions SET validation_status = ?, validation_message = ?, updated_at = NOW() WHERE id = ?',
        [validationStatus, message, missionId],
      );
      if (violations.length) {
        await upsertActiveAlert(connection, {
          missionId, source: 'ROUTE', ruleCode: 'RESTRICTED_FLIGHT_ZONE', severity: 'CRITICAL',
          type: 'RESTRICTED_FLIGHT_ZONE', message,
        });
      } else {
        await resolveActiveAlerts(connection, { missionId }, 'RESTRICTED_FLIGHT_ZONE', 'Route passed a new airspace validation.');
      }
      await connection.commit();
      response.json({ data: { missionId, validationStatus, message, violations } });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  return router;
}
