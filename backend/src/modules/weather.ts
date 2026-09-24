import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { ApiError } from '../middleware/error-handler';
import { resolveActiveAlerts, upsertActiveAlert } from './alerts';

type Recommendation = 'SAFE' | 'CAUTION' | 'UNSAFE';

interface RuntimeRow extends RowDataPacket {
  active_mode: 'DEMO' | 'LIVE';
  demo_mode_status: 'AVAILABLE' | 'COMING_SOON' | 'DISABLED';
  live_mode_status: 'AVAILABLE' | 'COMING_SOON' | 'DISABLED';
  snapshot_ttl_minutes: number;
  caution_requires_confirmation: number | boolean;
  demo_banner_text: string;
}

interface ProfileRow extends RowDataPacket {
  profile_code: string;
  name: string;
  recommendation: Recommendation;
  condition_code: number;
  temperature_c: number | string;
  relative_humidity_percent: number;
  wind_speed_10m_mps: number | string;
  wind_speed_80m_mps: number | string;
  wind_direction_10m_deg: number;
  wind_gust_10m_mps: number | string;
  precipitation_mm: number | string;
  rain_mm: number | string;
  visibility_m: number;
  reason: string;
}

interface MissionRow extends RowDataPacket {
  id: number;
  drone_id: number;
  validation_status: 'NOT_CHECKED' | 'VALID' | 'INVALID';
}

interface WaypointRow extends RowDataPacket {
  id: number;
  sequence_number: number;
  latitude: number | string;
  longitude: number | string;
}

export interface WeatherLocation {
  type: 'START' | 'ROUTE_MIDPOINT' | 'DESTINATION';
  latitude: number;
  longitude: number;
  waypointId: number | null;
}

function coordinate(value: unknown, name: string, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

function positiveInteger(value: unknown, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new ApiError(400, 'INVALID_ARGUMENT', `${name} must be a positive integer`);
  }
  return parsed;
}

function publicProfile(profile: ProfileRow): Record<string, unknown> {
  return {
    profileCode: profile.profile_code,
    profileName: profile.name,
    recommendation: profile.recommendation,
    conditionCode: profile.condition_code,
    temperatureC: Number(profile.temperature_c),
    relativeHumidityPercent: profile.relative_humidity_percent,
    windSpeed10mMps: Number(profile.wind_speed_10m_mps),
    windSpeed80mMps: Number(profile.wind_speed_80m_mps),
    windDirection10mDeg: profile.wind_direction_10m_deg,
    windGust10mMps: Number(profile.wind_gust_10m_mps),
    precipitationMm: Number(profile.precipitation_mm),
    rainMm: Number(profile.rain_mm),
    visibilityM: profile.visibility_m,
    reason: profile.reason,
  };
}

async function runtime(connection: Pool | PoolConnection): Promise<RuntimeRow> {
  const [rows] = await connection.query<RuntimeRow[]>('SELECT * FROM weather_runtime_config WHERE id = 1');
  const config = rows[0];
  if (!config) throw new ApiError(503, 'WEATHER_NOT_CONFIGURED', 'Weather runtime is not configured');
  if (config.active_mode === 'LIVE' || config.demo_mode_status !== 'AVAILABLE') {
    throw new ApiError(409, 'WEATHER_MODE_NOT_AVAILABLE', 'The configured weather mode is not available');
  }
  return config;
}

async function demoProfile(connection: Pool | PoolConnection, droneId: number): Promise<ProfileRow> {
  const [rows] = await connection.query<ProfileRow[]>(
    `SELECT p.* FROM drone_weather_demo_assignments a
     JOIN weather_demo_profiles p ON p.id = a.weather_demo_profile_id
     WHERE a.drone_id = ? AND p.is_enabled = TRUE`,
    [droneId],
  );
  if (!rows[0]) throw new ApiError(409, 'WEATHER_PROFILE_NOT_FOUND', 'No enabled demo weather profile is assigned to this drone');
  return rows[0];
}

function routeDistance(a: WaypointRow, b: WaypointRow): number {
  const lat1 = Number(a.latitude) * Math.PI / 180;
  const lat2 = Number(b.latitude) * Math.PI / 180;
  const deltaLat = lat2 - lat1;
  const deltaLon = (Number(b.longitude) - Number(a.longitude)) * Math.PI / 180;
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function weatherLocations(waypoints: WaypointRow[]): WeatherLocation[] {
  const start = waypoints[0];
  const destination = waypoints.at(-1);
  if (!start || !destination || waypoints.length < 2) {
    throw new ApiError(409, 'ROUTE_NOT_READY', 'Mission requires at least two waypoints');
  }
  const distances = waypoints.slice(1).map((waypoint, index) => routeDistance(waypoints[index]!, waypoint));
  const half = distances.reduce((sum, distance) => sum + distance, 0) / 2;
  let covered = 0;
  let midpoint = { latitude: Number(start.latitude), longitude: Number(start.longitude) };
  for (let index = 0; index < distances.length; index += 1) {
    const distance = distances[index] ?? 0;
    if (covered + distance >= half) {
      const from = waypoints[index]!;
      const to = waypoints[index + 1]!;
      const ratio = distance === 0 ? 0 : (half - covered) / distance;
      midpoint = {
        latitude: Number(from.latitude) + (Number(to.latitude) - Number(from.latitude)) * ratio,
        longitude: Number(from.longitude) + (Number(to.longitude) - Number(from.longitude)) * ratio,
      };
      break;
    }
    covered += distance;
  }
  return [
    { type: 'START', latitude: Number(start.latitude), longitude: Number(start.longitude), waypointId: start.id },
    { type: 'ROUTE_MIDPOINT', ...midpoint, waypointId: null },
    { type: 'DESTINATION', latitude: Number(destination.latitude), longitude: Number(destination.longitude), waypointId: destination.id },
  ];
}

export function worstRecommendation(values: Recommendation[]): Recommendation {
  if (values.includes('UNSAFE')) return 'UNSAFE';
  if (values.includes('CAUTION')) return 'CAUTION';
  return 'SAFE';
}

export function createWeatherRouter(database: Pool): Router {
  const router = Router();

  router.get('/weather/current', async (request, response, next) => {
    try {
      const latitude = coordinate(request.query.lat, 'lat', -90, 90);
      const longitude = coordinate(request.query.lng, 'lng', -180, 180);
      const droneId = positiveInteger(request.query.droneId, 'droneId');
      const config = await runtime(database);
      const profile = await demoProfile(database, droneId);
      response.json({
        data: {
          mode: 'DEMO', sourceKind: 'SIMULATED_FIXTURE', latitude, longitude,
          banner: config.demo_banner_text, ...publicProfile(profile),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/missions/:id/weather-check', async (request, response, next) => {
    const connection = await database.getConnection();
    try {
      const missionId = positiveInteger(request.params.id, 'Mission id');
      await connection.beginTransaction();
      const config = await runtime(connection);
      const [missions] = await connection.query<MissionRow[]>(
        'SELECT id, drone_id, validation_status FROM missions WHERE id = ? FOR UPDATE',
        [missionId],
      );
      const mission = missions[0];
      if (!mission) throw new ApiError(404, 'MISSION_NOT_FOUND', 'Mission not found');
      if (mission.validation_status !== 'VALID') {
        throw new ApiError(409, 'ROUTE_NOT_VALID', 'Airspace validation must pass before checking weather');
      }
      const [waypoints] = await connection.query<WaypointRow[]>(
        'SELECT id, sequence_number, latitude, longitude FROM waypoints WHERE mission_id = ? ORDER BY sequence_number',
        [missionId],
      );
      const profile = await demoProfile(connection, mission.drone_id);
      const locations = weatherLocations(waypoints);
      const validationRunId = randomUUID();
      const checkedAt = new Date();
      const expiresAt = new Date(checkedAt.getTime() + Number(config.snapshot_ttl_minutes) * 60_000);
      for (const location of locations) {
        await connection.execute(
          `INSERT INTO weather_checks
           (validation_run_id, mission_id, waypoint_id, location_type, latitude, longitude,
            source_kind, condition_code, temperature_c, relative_humidity_percent,
            wind_speed_10m_mps, wind_speed_80m_mps, wind_direction_10m_deg, wind_gust_10m_mps,
            precipitation_mm, rain_mm, visibility_m, recommendation, reason, provider_observed_at,
            checked_at, expires_at, raw_response, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'SIMULATED_FIXTURE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NOW())`,
          [
            validationRunId, missionId, location.waypointId, location.type, location.latitude, location.longitude,
            profile.condition_code, profile.temperature_c, profile.relative_humidity_percent,
            profile.wind_speed_10m_mps, profile.wind_speed_80m_mps, profile.wind_direction_10m_deg,
            profile.wind_gust_10m_mps, profile.precipitation_mm, profile.rain_mm, profile.visibility_m,
            profile.recommendation, profile.reason, checkedAt, expiresAt,
            JSON.stringify({ mode: 'DEMO', profileCode: profile.profile_code }),
          ],
        );
      }
      const recommendation = worstRecommendation(locations.map(() => profile.recommendation));
      if (recommendation === 'UNSAFE') {
        await upsertActiveAlert(connection, {
          missionId, source: 'WEATHER', ruleCode: 'UNSAFE_WEATHER', severity: 'CRITICAL',
          type: 'UNSAFE_WEATHER', message: profile.reason, metricName: 'recommendation',
        });
        await resolveActiveAlerts(connection, { missionId }, 'WEATHER_CAUTION', 'A newer weather check is unsafe.');
      } else if (recommendation === 'CAUTION') {
        await upsertActiveAlert(connection, {
          missionId, source: 'WEATHER', ruleCode: 'WEATHER_CAUTION', severity: 'WARNING',
          type: 'WEATHER_CAUTION', message: profile.reason, metricName: 'recommendation',
        });
        await resolveActiveAlerts(connection, { missionId }, 'UNSAFE_WEATHER', 'Weather improved to caution.');
      } else {
        await resolveActiveAlerts(connection, { missionId }, 'WEATHER_CAUTION', 'Weather is safe.');
        await resolveActiveAlerts(connection, { missionId }, 'UNSAFE_WEATHER', 'Weather is safe.');
      }
      await connection.commit();
      response.json({
        data: {
          validationRunId, missionId, mode: 'DEMO', sourceKind: 'SIMULATED_FIXTURE',
          recommendation, requiresAcknowledgement: recommendation === 'CAUTION' && Boolean(config.caution_requires_confirmation),
          launchAllowed: recommendation !== 'UNSAFE', checkedAt, expiresAt,
          samples: locations.map((location) => ({ ...location, ...publicProfile(profile) })),
        },
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  });

  return router;
}
