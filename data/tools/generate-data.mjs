import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const GENERATOR_PATH = fileURLToPath(import.meta.url);
const GENERATOR_SOURCE = fs.readFileSync(GENERATOR_PATH);
const GENERATOR_DIR = path.dirname(GENERATOR_PATH);
const DEFAULT_OUTPUT_PARENT = path.basename(GENERATOR_DIR) === 'tools' ? path.dirname(path.dirname(GENERATOR_DIR)) : process.cwd();
const ROOT = path.resolve(process.env.DRONE_DATA_OUTPUT_DIR ?? path.join(DEFAULT_OUTPUT_PARENT, 'Drone_Data_Pack_v2.0.0'));
const VERSION = '2.0.0';
const DATA_REVISION = 1;
const BUILD_ID = 'DRONE-DATA-2.0.0-R1-20260919';
const GENERATED_AT = '2026-09-19T10:00:00Z';
const DB_TIME = '2026-09-19 10:00:00';

fs.rmSync(ROOT, { recursive: true, force: true });
for (const dir of [
  '00-overview', '01-schema', '02-fleet', '03-airspace', '04-missions',
  '05-weather', '06-simulation', '07-flight-operations', '08-alerts', '09-backend-guidance', 'database/init', 'tools'
]) fs.mkdirSync(path.join(ROOT, dir), { recursive: true });

const writeText = (relative, value) => fs.writeFileSync(path.join(ROOT, relative), value.trim() + '\n');
const writeJson = (relative, value) => writeText(relative, JSON.stringify(value, null, 2));
const round = (n, d = 2) => Number(n.toFixed(d));
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const pad = (n, len = 3) => String(n).padStart(len, '0');
const mysqlTime = date => date.toISOString().slice(0, 23).replace('T', ' ');
const addSeconds = (date, sec) => new Date(date.getTime() + sec * 1000);
const jsonStable = value => JSON.stringify(value);
const sqlValue = value => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'object') value = jsonStable(value);
  return `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "''")}'`;
};
const sqlInsert = (table, rows, chunkSize = 500) => {
  if (!rows.length) return '';
  const columns = Object.keys(rows[0]);
  const chunks = [];
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    chunks.push(`INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES\n` +
      chunk.map(row => `  (${columns.map(c => sqlValue(row[c])).join(', ')})`).join(',\n') + ';');
  }
  return chunks.join('\n\n') + '\n';
};

const deg = n => n * Math.PI / 180;
function haversine(a, b) {
  const r = 6371000;
  const dLat = deg(b.latitude - a.latitude);
  const dLng = deg(b.longitude - a.longitude);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(deg(a.latitude)) * Math.cos(deg(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(x));
}
function bearing(a, b) {
  const y = Math.sin(deg(b.longitude - a.longitude)) * Math.cos(deg(b.latitude));
  const x = Math.cos(deg(a.latitude)) * Math.sin(deg(b.latitude)) -
    Math.sin(deg(a.latitude)) * Math.cos(deg(b.latitude)) * Math.cos(deg(b.longitude - a.longitude));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function routeDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversine(points[i - 1], points[i]);
  return total;
}
function interpolateDistanceWeighted(points, fraction) {
  const segments = points.slice(1).map((p, i) => haversine(points[i], p));
  const total = segments.reduce((a, b) => a + b, 0);
  let target = clamp(fraction, 0, 1) * total;
  for (let i = 0; i < segments.length; i++) {
    if (target <= segments[i] || i === segments.length - 1) {
      const f = segments[i] === 0 ? 0 : target / segments[i];
      return {
        latitude: points[i].latitude + (points[i + 1].latitude - points[i].latitude) * f,
        longitude: points[i].longitude + (points[i + 1].longitude - points[i].longitude) * f
      };
    }
    target -= segments[i];
  }
  return points.at(-1);
}
function pointInRect(point, rect) {
  return point.longitude >= rect.minLng && point.longitude <= rect.maxLng &&
    point.latitude >= rect.minLat && point.latitude <= rect.maxLat;
}
function pointInPolygon(point, polygon) {
  const ring = polygon.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = ((yi > point.latitude) !== (yj > point.latitude)) &&
      (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
    if (crosses) inside = !inside;
  }
  return inside;
}
function segmentIntersectsRect(a, b, rect) {
  if (pointInRect(a, rect) || pointInRect(b, rect)) return true;
  const edges = [
    [{ longitude: rect.minLng, latitude: rect.minLat }, { longitude: rect.maxLng, latitude: rect.minLat }],
    [{ longitude: rect.maxLng, latitude: rect.minLat }, { longitude: rect.maxLng, latitude: rect.maxLat }],
    [{ longitude: rect.maxLng, latitude: rect.maxLat }, { longitude: rect.minLng, latitude: rect.maxLat }],
    [{ longitude: rect.minLng, latitude: rect.maxLat }, { longitude: rect.minLng, latitude: rect.minLat }]
  ];
  const orient = (p, q, r) => Math.sign((q.longitude - p.longitude) * (r.latitude - p.latitude) - (q.latitude - p.latitude) * (r.longitude - p.longitude));
  return edges.some(([c, d]) => orient(a, b, c) !== orient(a, b, d) && orient(c, d, a) !== orient(c, d, b));
}

const schema = `
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS alert_rule_catalog;
DROP TABLE IF EXISTS telemetry;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS weather_checks;
DROP TABLE IF EXISTS drone_weather_demo_assignments;
DROP TABLE IF EXISTS weather_demo_profiles;
DROP TABLE IF EXISTS weather_runtime_config;
DROP TABLE IF EXISTS waypoints;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS drone_scenario_pool;
DROP TABLE IF EXISTS simulation_scenarios;
DROP TABLE IF EXISTS flight_zones;
DROP TABLE IF EXISTS drone_components;
DROP TABLE IF EXISTS component_catalog;
DROP TABLE IF EXISTS drones;
DROP TABLE IF EXISTS drone_models;
DROP TABLE IF EXISTS data_pack_metadata;

CREATE TABLE data_pack_metadata (
  id TINYINT UNSIGNED PRIMARY KEY,
  pack_name VARCHAR(120) NOT NULL,
  pack_version VARCHAR(20) NOT NULL,
  data_revision SMALLINT UNSIGNED NOT NULL,
  generated_at DATETIME NOT NULL,
  build_id VARCHAR(80) NOT NULL UNIQUE,
  schema_table_count SMALLINT UNSIGNED NOT NULL,
  expected_telemetry_rows INT UNSIGNED NOT NULL,
  notes VARCHAR(500) NOT NULL,
  CONSTRAINT chk_data_pack_metadata_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drone_models (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  model_code VARCHAR(40) NOT NULL UNIQUE,
  manufacturer VARCHAR(100) NOT NULL,
  model_name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NOT NULL,
  image_url VARCHAR(500) NULL,
  max_flight_time_minutes SMALLINT UNSIGNED NOT NULL,
  max_speed_mps DECIMAL(6,2) NOT NULL,
  manufacturer_max_wind_mps DECIMAL(6,2) NOT NULL,
  project_wind_limit_mps DECIMAL(6,2) NOT NULL,
  battery_capacity_mah INT UNSIGNED NOT NULL,
  battery_nominal_voltage_v DECIMAL(5,2) NOT NULL,
  battery_max_voltage_v DECIMAL(5,2) NOT NULL,
  reference_source_url VARCHAR(500) NULL,
  is_simulated_reference BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT chk_drone_model_limits CHECK (
    max_flight_time_minutes > 0
    AND max_speed_mps > 0
    AND project_wind_limit_mps <= manufacturer_max_wind_mps
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drones (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  drone_code VARCHAR(30) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  drone_model_id BIGINT UNSIGNED NOT NULL,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  is_simulated BOOLEAN NOT NULL DEFAULT TRUE,
  status ENUM('AVAILABLE','IN_FLIGHT','MAINTENANCE','OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  home_location_label VARCHAR(180) NOT NULL,
  home_latitude DECIMAL(10,7) NOT NULL,
  home_longitude DECIMAL(10,7) NOT NULL,
  last_known_location_label VARCHAR(180) NULL,
  last_known_latitude DECIMAL(10,7) NULL,
  last_known_longitude DECIMAL(10,7) NULL,
  last_known_altitude_m DECIMAL(7,2) NULL,
  location_source ENUM('BROWSER_GEOLOCATION','DEVICE_GPS','FLIGHT_TELEMETRY','HOME_BASE','MANUAL','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  location_updated_at DATETIME(3) NULL,
  last_seen_at DATETIME(3) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_drone_model FOREIGN KEY (drone_model_id) REFERENCES drone_models(id),
  CONSTRAINT chk_drone_coordinates CHECK (
    home_latitude BETWEEN -90 AND 90 AND home_longitude BETWEEN -180 AND 180
    AND (last_known_latitude IS NULL OR last_known_latitude BETWEEN -90 AND 90)
    AND (last_known_longitude IS NULL OR last_known_longitude BETWEEN -180 AND 180)
    AND ((last_known_latitude IS NULL AND last_known_longitude IS NULL) OR (last_known_latitude IS NOT NULL AND last_known_longitude IS NOT NULL))
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE component_catalog (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  component_code VARCHAR(40) NOT NULL UNIQUE,
  component_type ENUM('FRAME','PROPELLER','MOTOR','BATTERY','FLIGHT_CONTROLLER','GPS','SENSOR','CAMERA') NOT NULL,
  name VARCHAR(120) NOT NULL,
  position ENUM('CENTER','FRONT','FRONT_LEFT','FRONT_RIGHT','REAR_LEFT','REAR_RIGHT','CENTER_REAR','TOP_CENTER','BOTTOM_FRONT') NOT NULL,
  model VARCHAR(120) NOT NULL,
  primary_function VARCHAR(255) NOT NULL,
  display_order SMALLINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT uq_catalog_type_position UNIQUE (component_type, position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drone_components (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  drone_id BIGINT UNSIGNED NOT NULL,
  component_catalog_id BIGINT UNSIGNED NOT NULL,
  component_serial_number VARCHAR(100) NOT NULL UNIQUE,
  health_status ENUM('HEALTHY','WARNING','FAULT','MAINTENANCE') NOT NULL DEFAULT 'HEALTHY',
  installed_at DATE NOT NULL,
  last_inspected_at DATETIME NULL,
  installed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_component_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
  CONSTRAINT fk_component_catalog FOREIGN KEY (component_catalog_id) REFERENCES component_catalog(id),
  CONSTRAINT uq_drone_component_catalog UNIQUE (drone_id, component_catalog_id),
  INDEX idx_component_drone_health (drone_id, health_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE flight_zones (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  zone_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  zone_type ENUM('ALLOWED','RESTRICTED') NOT NULL,
  boundary_geojson JSON NOT NULL,
  min_altitude_m DECIMAL(7,2) NULL,
  max_altitude_m DECIMAL(7,2) NULL,
  reason VARCHAR(500) NULL,
  data_authority ENUM('DEMO_ONLY','OFFICIAL') NOT NULL DEFAULT 'DEMO_ONLY',
  display_color CHAR(7) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT chk_zone_altitude CHECK (min_altitude_m IS NULL OR max_altitude_m IS NULL OR min_altitude_m <= max_altitude_m)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE simulation_scenarios (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  scenario_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category ENUM('NORMAL','POWER','PROPULSION','THERMAL','NAVIGATION','COMMUNICATION') NOT NULL,
  expected_result ENUM('SUCCESS','RETURN_TO_HOME','FAILED') NOT NULL,
  fault_start_progress DECIMAL(5,2) NULL,
  fault_end_progress DECIMAL(5,2) NULL,
  affected_position ENUM('NONE','RUNTIME_SELECTED','FRONT_LEFT','FRONT_RIGHT','REAR_LEFT','REAR_RIGHT','CENTER_REAR','TOP_CENTER') NOT NULL,
  parameters_json JSON NOT NULL,
  description VARCHAR(500) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT chk_scenario_progress CHECK ((fault_start_progress IS NULL AND fault_end_progress IS NULL) OR (fault_start_progress BETWEEN 0 AND 100 AND fault_end_progress BETWEEN fault_start_progress AND 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drone_scenario_pool (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  drone_id BIGINT UNSIGNED NOT NULL,
  simulation_scenario_id BIGINT UNSIGNED NOT NULL,
  selection_weight TINYINT UNSIGNED NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(500) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_scenario_pool_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
  CONSTRAINT fk_scenario_pool_scenario FOREIGN KEY (simulation_scenario_id) REFERENCES simulation_scenarios(id),
  CONSTRAINT uq_drone_scenario_pool UNIQUE (drone_id, simulation_scenario_id),
  CONSTRAINT chk_scenario_weight CHECK (selection_weight BETWEEN 1 AND 100),
  INDEX idx_scenario_pool_drone_enabled (drone_id, is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE missions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mission_code VARCHAR(30) NOT NULL UNIQUE,
  drone_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  status ENUM('DRAFT','READY','RUNNING','COMPLETED','FAILED','CANCELLED') NOT NULL,
  validation_status ENUM('NOT_CHECKED','VALID','INVALID') NOT NULL DEFAULT 'NOT_CHECKED',
  validation_message VARCHAR(500) NULL,
  planned_altitude_m DECIMAL(7,2) NOT NULL,
  planned_speed_mps DECIMAL(6,2) NOT NULL,
  estimated_distance_m DECIMAL(10,2) NOT NULL,
  estimated_duration_sec INT UNSIGNED NOT NULL,
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_mission_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
  CONSTRAINT chk_mission_progress CHECK (progress_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_mission_plan CHECK (planned_altitude_m > 0 AND planned_speed_mps > 0 AND estimated_distance_m >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE waypoints (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mission_id BIGINT UNSIGNED NOT NULL,
  sequence_number SMALLINT UNSIGNED NOT NULL,
  waypoint_type ENUM('START','INTERMEDIATE','DESTINATION') NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude_m DECIMAL(7,2) NOT NULL,
  hold_time_sec SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_waypoint_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  CONSTRAINT uq_waypoint_sequence UNIQUE (mission_id, sequence_number),
  CONSTRAINT chk_waypoint_coordinates CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE weather_runtime_config (
  id TINYINT UNSIGNED PRIMARY KEY,
  active_mode ENUM('LIVE','DEMO') NOT NULL DEFAULT 'DEMO',
  live_provider ENUM('OPEN_METEO') NOT NULL DEFAULT 'OPEN_METEO',
  demo_mode_status ENUM('AVAILABLE','COMING_SOON','DISABLED') NOT NULL DEFAULT 'AVAILABLE',
  live_mode_status ENUM('AVAILABLE','COMING_SOON','DISABLED') NOT NULL DEFAULT 'COMING_SOON',
  snapshot_ttl_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  caution_requires_confirmation BOOLEAN NOT NULL DEFAULT TRUE,
  unsafe_can_be_overridden BOOLEAN NOT NULL DEFAULT FALSE,
  demo_banner_text VARCHAR(180) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT chk_weather_runtime_singleton CHECK (id = 1),
  CONSTRAINT chk_weather_runtime_ttl CHECK (snapshot_ttl_minutes BETWEEN 1 AND 60),
  CONSTRAINT chk_active_weather_mode_available CHECK (
    (active_mode = 'DEMO' AND demo_mode_status = 'AVAILABLE')
    OR (active_mode = 'LIVE' AND live_mode_status = 'AVAILABLE')
  ),
  CONSTRAINT chk_unsafe_not_overridable CHECK (unsafe_can_be_overridden = FALSE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE weather_demo_profiles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  profile_code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  recommendation ENUM('SAFE','CAUTION','UNSAFE') NOT NULL,
  condition_code SMALLINT UNSIGNED NOT NULL,
  temperature_c DECIMAL(5,2) NOT NULL,
  relative_humidity_percent TINYINT UNSIGNED NOT NULL,
  wind_speed_10m_mps DECIMAL(6,2) NOT NULL,
  wind_speed_80m_mps DECIMAL(6,2) NOT NULL,
  wind_direction_10m_deg SMALLINT UNSIGNED NOT NULL,
  wind_gust_10m_mps DECIMAL(6,2) NOT NULL,
  precipitation_mm DECIMAL(7,2) NOT NULL,
  rain_mm DECIMAL(7,2) NOT NULL,
  visibility_m INT UNSIGNED NOT NULL,
  reason VARCHAR(500) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT chk_demo_weather_humidity CHECK (relative_humidity_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_demo_weather_direction CHECK (wind_direction_10m_deg BETWEEN 0 AND 359)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drone_weather_demo_assignments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  drone_id BIGINT UNSIGNED NOT NULL,
  weather_demo_profile_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_demo_weather_assignment_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
  CONSTRAINT fk_demo_weather_assignment_profile FOREIGN KEY (weather_demo_profile_id) REFERENCES weather_demo_profiles(id),
  CONSTRAINT uq_demo_weather_assignment_drone UNIQUE (drone_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE weather_checks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  validation_run_id CHAR(36) NOT NULL,
  mission_id BIGINT UNSIGNED NOT NULL,
  waypoint_id BIGINT UNSIGNED NULL,
  location_type ENUM('START','ROUTE_MIDPOINT','DESTINATION','CURRENT_DRONE_POSITION') NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  source_kind ENUM('OPEN_METEO','SIMULATED_FIXTURE') NOT NULL,
  condition_code SMALLINT UNSIGNED NOT NULL,
  temperature_c DECIMAL(5,2) NULL,
  relative_humidity_percent TINYINT UNSIGNED NULL,
  wind_speed_10m_mps DECIMAL(6,2) NOT NULL,
  wind_speed_80m_mps DECIMAL(6,2) NULL,
  wind_direction_10m_deg SMALLINT UNSIGNED NOT NULL,
  wind_gust_10m_mps DECIMAL(6,2) NULL,
  precipitation_mm DECIMAL(7,2) NOT NULL,
  rain_mm DECIMAL(7,2) NOT NULL,
  visibility_m INT UNSIGNED NULL,
  recommendation ENUM('SAFE','CAUTION','UNSAFE') NOT NULL,
  reason VARCHAR(500) NOT NULL,
  provider_observed_at DATETIME NULL,
  checked_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  raw_response JSON NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_weather_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  CONSTRAINT fk_weather_waypoint FOREIGN KEY (waypoint_id) REFERENCES waypoints(id),
  CONSTRAINT chk_weather_percent CHECK (relative_humidity_percent IS NULL OR relative_humidity_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_weather_direction CHECK (wind_direction_10m_deg BETWEEN 0 AND 359),
  INDEX idx_weather_mission_freshness (mission_id, expires_at),
  INDEX idx_weather_validation_run (validation_run_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE flights (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  flight_code VARCHAR(30) NOT NULL UNIQUE,
  drone_id BIGINT UNSIGNED NOT NULL,
  mission_id BIGINT UNSIGNED NOT NULL,
  simulation_scenario_id BIGINT UNSIGNED NOT NULL,
  fault_position ENUM('FRONT_LEFT','FRONT_RIGHT','REAR_LEFT','REAR_RIGHT','CENTER_REAR','TOP_CENTER') NULL,
  status ENUM('READY','FLYING','PAUSED','RETURNING','LANDED','ABORTED') NOT NULL,
  result ENUM('SUCCESS','RETURNED_SAFELY','FAILED') NULL,
  started_at DATETIME(3) NULL,
  ended_at DATETIME(3) NULL,
  duration_sec INT UNSIGNED NOT NULL DEFAULT 0,
  distance_m DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_battery_percent TINYINT UNSIGNED NULL,
  end_battery_percent TINYINT UNSIGNED NULL,
  preflight_weather_mode ENUM('DEMO','LIVE') NOT NULL,
  preflight_weather_recommendation ENUM('SAFE','CAUTION') NOT NULL,
  weather_acknowledged_at DATETIME(3) NULL,
  termination_reason VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_flight_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
  CONSTRAINT fk_flight_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  CONSTRAINT fk_flight_scenario FOREIGN KEY (simulation_scenario_id) REFERENCES simulation_scenarios(id),
  CONSTRAINT chk_flight_battery CHECK ((start_battery_percent IS NULL OR start_battery_percent BETWEEN 0 AND 100) AND (end_battery_percent IS NULL OR end_battery_percent BETWEEN 0 AND 100)),
  CONSTRAINT chk_flight_time CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at),
  CONSTRAINT chk_flight_weather_ack CHECK (preflight_weather_recommendation = 'SAFE' OR weather_acknowledged_at IS NOT NULL),
  INDEX idx_flight_drone_status (drone_id, status),
  INDEX idx_flight_mission (mission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE telemetry (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  flight_id BIGINT UNSIGNED NOT NULL,
  sequence_number SMALLINT UNSIGNED NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  received_at DATETIME(3) NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  position_source ENUM('GNSS','LAST_KNOWN','ESTIMATED') NOT NULL,
  position_is_valid BOOLEAN NOT NULL,
  transmission_state ENUM('CONNECTED','DEGRADED','LOST','BUFFERED') NOT NULL,
  heartbeat_age_seconds DECIMAL(6,2) NOT NULL,
  altitude_m DECIMAL(7,2) NOT NULL,
  speed_mps DECIMAL(7,2) NOT NULL,
  vertical_speed_mps DECIMAL(6,2) NOT NULL,
  heading_deg DECIMAL(5,2) NOT NULL,
  battery_percent TINYINT UNSIGNED NOT NULL,
  battery_voltage_v DECIMAL(5,2) NOT NULL,
  battery_current_a DECIMAL(6,2) NOT NULL,
  battery_temperature_c DECIMAL(5,2) NOT NULL,
  motor_rpm_fl INT UNSIGNED NOT NULL,
  motor_rpm_fr INT UNSIGNED NOT NULL,
  motor_rpm_rl INT UNSIGNED NOT NULL,
  motor_rpm_rr INT UNSIGNED NOT NULL,
  motor_temperature_fl_c DECIMAL(5,2) NOT NULL,
  motor_temperature_fr_c DECIMAL(5,2) NOT NULL,
  motor_temperature_rl_c DECIMAL(5,2) NOT NULL,
  motor_temperature_rr_c DECIMAL(5,2) NOT NULL,
  vibration_g DECIMAL(6,3) NOT NULL,
  flight_controller_temperature_c DECIMAL(5,2) NOT NULL,
  gps_quality ENUM('GOOD','FAIR','POOR','LOST') NOT NULL,
  gps_satellites TINYINT UNSIGNED NOT NULL,
  signal_percent TINYINT UNSIGNED NOT NULL,
  wind_speed_mps DECIMAL(6,2) NOT NULL,
  wind_direction_deg SMALLINT UNSIGNED NOT NULL,
  wind_source ENUM('SIMULATED_WEATHER_PROFILE','ONBOARD_ESTIMATE') NOT NULL,
  CONSTRAINT fk_telemetry_flight FOREIGN KEY (flight_id) REFERENCES flights(id),
  CONSTRAINT uq_telemetry_flight_time UNIQUE (flight_id, recorded_at),
  CONSTRAINT uq_telemetry_flight_sequence UNIQUE (flight_id, sequence_number),
  CONSTRAINT chk_telemetry_percent CHECK (battery_percent BETWEEN 0 AND 100 AND signal_percent BETWEEN 0 AND 100),
  CONSTRAINT chk_telemetry_coordinates CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180),
  CONSTRAINT chk_telemetry_direction CHECK (heading_deg >= 0 AND heading_deg < 360 AND wind_direction_deg BETWEEN 0 AND 359),
  INDEX idx_telemetry_flight_time (flight_id, recorded_at),
  INDEX idx_telemetry_live_delivery (flight_id, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alert_rule_catalog (
  rule_code VARCHAR(60) PRIMARY KEY,
  alert_type VARCHAR(60) NOT NULL,
  source ENUM('ROUTE','WEATHER','TELEMETRY','SYSTEM') NOT NULL,
  default_severity ENUM('WARNING','CRITICAL') NOT NULL,
  authority ENUM('PROJECT_SIMULATION_POLICY','SYSTEM_LIFECYCLE') NOT NULL,
  description VARCHAR(500) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_alert_rule_type_source (alert_type, source)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE alerts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  alert_code VARCHAR(30) NOT NULL UNIQUE,
  flight_id BIGINT UNSIGNED NULL,
  mission_id BIGINT UNSIGNED NULL,
  component_id BIGINT UNSIGNED NULL,
  source ENUM('ROUTE','WEATHER','TELEMETRY','SYSTEM') NOT NULL,
  rule_code VARCHAR(60) NOT NULL,
  severity ENUM('WARNING','CRITICAL') NOT NULL,
  type VARCHAR(60) NOT NULL,
  message VARCHAR(500) NOT NULL,
  metric_name VARCHAR(80) NULL,
  observed_value DECIMAL(10,3) NULL,
  threshold_value DECIMAL(10,3) NULL,
  unit VARCHAR(20) NULL,
  status ENUM('ACTIVE','RESOLVED') NOT NULL,
  detected_at DATETIME(3) NOT NULL,
  last_observed_at DATETIME(3) NOT NULL,
  resolved_at DATETIME(3) NULL,
  resolution_note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_alert_flight FOREIGN KEY (flight_id) REFERENCES flights(id),
  CONSTRAINT fk_alert_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  CONSTRAINT fk_alert_component FOREIGN KEY (component_id) REFERENCES drone_components(id),
  CONSTRAINT fk_alert_rule FOREIGN KEY (rule_code) REFERENCES alert_rule_catalog(rule_code),
  CONSTRAINT chk_alert_owner CHECK (flight_id IS NOT NULL OR mission_id IS NOT NULL),
  CONSTRAINT chk_alert_resolution CHECK ((status = 'ACTIVE' AND resolved_at IS NULL) OR (status = 'RESOLVED' AND resolved_at IS NOT NULL)),
  INDEX idx_alert_status_time (status, detected_at),
  INDEX idx_alert_flight_rule (flight_id, rule_code, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
`;
writeText('01-schema/schema.sql', schema);

const dataPackMetadata = [{
  id:1,
  pack_name:'Drone Monitoring Platform Data Pack',
  pack_version:VERSION,
  data_revision:DATA_REVISION,
  generated_at:DB_TIME,
  build_id:BUILD_ID,
  schema_table_count:18,
  expected_telemetry_rows:6000,
  notes:'Data Pack v2.0 release with five-drone demo coverage, four-arm propulsion faults, deterministic demo weather and import verification.'
}];
writeJson('01-schema/data-pack-metadata.json', dataPackMetadata[0]);
writeText('01-schema/metadata-seed.sql', sqlInsert('data_pack_metadata', dataPackMetadata));

const droneLocations = [
  ['DRONE-001','Drone - 001','AVX1E-2026-0001'],
  ['DRONE-002','Drone - 002','AVX1E-2026-0002'],
  ['DRONE-003','Drone - 003','AVX1E-2026-0003'],
  ['DRONE-004','Drone - 004','AVX1E-2026-0004'],
  ['DRONE-005','Drone - 005','AVX1E-2026-0005']
];
const droneModels = [{
  id:1,
  model_code:'AV-X1E',
  manufacturer:'AeroVision (fictional)',
  model_name:'AeroVision X1 Enterprise',
  description:'Fictional enterprise camera quadcopter whose high-level envelope references published DJI Mavic 3 Enterprise specifications. It is not a DJI aircraft model.',
  image_url:'/assets/drone/aerovision-x1.png',
  max_flight_time_minutes:45,
  max_speed_mps:15.00,
  manufacturer_max_wind_mps:12.00,
  project_wind_limit_mps:10.00,
  battery_capacity_mah:5000,
  battery_nominal_voltage_v:15.40,
  battery_max_voltage_v:17.60,
  reference_source_url:'https://enterprise.dji.com/mavic-3-enterprise/specs',
  is_simulated_reference:true,
  created_at:'2026-07-01 08:55:00',
  updated_at:DB_TIME
}];
const drones = droneLocations.map((x, i) => ({
  id:i+1, drone_code:x[0], display_name:x[1], drone_model_id:1, serial_number:x[2],
  is_simulated:true, status:'OFFLINE',
  home_location_label:'District 1 Operations Home Base', home_latitude:10.7769000, home_longitude:106.7009000,
  last_known_location_label:null, last_known_latitude:null, last_known_longitude:null, last_known_altitude_m:null,
  location_source:'UNKNOWN', location_updated_at:null, last_seen_at:null,
  created_at:'2026-07-01 09:00:00', updated_at:DB_TIME
}));

const componentSpecs = [
  ['FRAME','Carbon Fiber Frame','CENTER','AV-X1E Carbon Monocoque','Supports and protects aircraft systems'],
  ['PROPELLER','Front Left Propeller','FRONT_LEFT','9453F-class Low-Noise Propeller','Generates lift at the front-left arm'],
  ['PROPELLER','Front Right Propeller','FRONT_RIGHT','9453F-class Low-Noise Propeller','Generates lift at the front-right arm'],
  ['PROPELLER','Rear Left Propeller','REAR_LEFT','9453F-class Low-Noise Propeller','Generates lift at the rear-left arm'],
  ['PROPELLER','Rear Right Propeller','REAR_RIGHT','9453F-class Low-Noise Propeller','Generates lift at the rear-right arm'],
  ['MOTOR','Front Left Motor','FRONT_LEFT','2008-class Brushless Motor','Drives the front-left propeller'],
  ['MOTOR','Front Right Motor','FRONT_RIGHT','2008-class Brushless Motor','Drives the front-right propeller'],
  ['MOTOR','Rear Left Motor','REAR_LEFT','2008-class Brushless Motor','Drives the rear-left propeller'],
  ['MOTOR','Rear Right Motor','REAR_RIGHT','2008-class Brushless Motor','Drives the rear-right propeller'],
  ['BATTERY','Intelligent Flight Battery','CENTER_REAR','4S LiPo 5000 mAh 15.4 V','Supplies and monitors aircraft power'],
  ['FLIGHT_CONTROLLER','Flight Controller','CENTER','AV-FC2','Stabilizes aircraft and executes routes'],
  ['GPS','GNSS Module','TOP_CENTER','Multi-constellation GNSS','Provides positioning and navigation data'],
  ['SENSOR','Vision and IMU Module','BOTTOM_FRONT','AV VisionSense','Supports obstacle awareness and stabilization'],
  ['CAMERA','Monitoring Camera','FRONT','4K 3-Axis Gimbal Camera','Captures stabilized monitoring imagery']
];
const componentCatalog = componentSpecs.map((x, componentIndex) => ({
  id:componentIndex + 1,
  component_code:`AVX1-${x[0]}-${x[2]}`,
  component_type:x[0],
  name:x[1],
  position:x[2],
  model:x[3],
  primary_function:x[4],
  display_order:componentIndex + 1,
  created_at:'2026-07-01 09:00:00',
  updated_at:DB_TIME
}));
const components = drones.flatMap((drone, droneIndex) => componentCatalog.map((catalog) => {
  const isHistoricalFault = drone.id === 3 && catalog.component_type === 'PROPELLER' && catalog.position === 'REAR_RIGHT';
  const isHistoricalWarning = drone.id === 3 && catalog.component_type === 'MOTOR' && catalog.position === 'REAR_RIGHT';
  return {
    id: droneIndex * componentCatalog.length + catalog.id,
    drone_id: drone.id,
    component_catalog_id:catalog.id,
    component_serial_number:`${drone.drone_code}-${catalog.component_code}`,
    health_status: isHistoricalFault ? 'FAULT' : isHistoricalWarning ? 'WARNING' : 'HEALTHY',
    installed_at: '2026-07-01',
    last_inspected_at: isHistoricalFault || isHistoricalWarning ? '2026-09-12 12:00:00' : '2026-09-01 08:00:00',
    installed: true,
    created_at: '2026-07-01 09:05:00',
    updated_at: DB_TIME
  };
}));
writeJson('02-fleet/drone-models.json', droneModels);
writeJson('02-fleet/drones.json', drones);
writeJson('02-fleet/component-catalog.json', componentCatalog);
writeJson('02-fleet/drone-components.json', components);
writeText('02-fleet/seed.sql', [
  sqlInsert('drone_models', droneModels),
  sqlInsert('drones', drones),
  sqlInsert('component_catalog', componentCatalog),
  sqlInsert('drone_components', components)
].join('\n'));

const zoneDefs = [
  ['ZONE-A01','Ho Chi Minh City Urban Demo Boundary','ALLOWED',106.545,106.900,10.675,10.925,'Project operating boundary covering the wider HCMC urban area; not an official administrative boundary or aviation approval.','#22C55E'],
  ['ZONE-R01','Hospital Safety Demo Zone','RESTRICTED',106.694,106.698,10.771,10.775,'Synthetic hospital buffer used to test route rejection.','#EF4444'],
  ['ZONE-R02','Government Facility Demo Zone','RESTRICTED',106.706,106.711,10.779,10.784,'Synthetic government-facility buffer used to test route rejection.','#EF4444'],
  ['ZONE-R03','School Safety Demo Zone','RESTRICTED',106.686,106.690,10.781,10.785,'Synthetic school buffer used to test route rejection.','#F97316'],
  ['ZONE-R04','Temporary Event Demo Zone','RESTRICTED',106.700,106.705,10.764,10.769,'Synthetic temporary-event restriction.','#F97316'],
  ['ZONE-R05','Dense Residential Demo Zone','RESTRICTED',106.713,106.718,10.769,10.774,'Synthetic residential buffer used for route testing.','#EF4444'],
  ['ZONE-R06','Emergency Landing Demo Buffer','RESTRICTED',106.692,106.697,10.787,10.791,'Synthetic emergency landing buffer.','#F97316'],
  ['ZONE-R07','Infrastructure Demo Protection Zone','RESTRICTED',106.703,106.707,10.772,10.776,'Synthetic infrastructure protection buffer.','#EF4444']
];
const allowedUrbanPolygon = { type:'Polygon', coordinates:[[
  [106.545,10.720],
  [106.565,10.685],
  [106.660,10.675],
  [106.760,10.680],
  [106.840,10.720],
  [106.885,10.770],
  [106.900,10.850],
  [106.865,10.905],
  [106.780,10.925],
  [106.690,10.915],
  [106.620,10.900],
  [106.565,10.850],
  [106.545,10.780],
  [106.545,10.720]
]] };
const polygonFromRect = z => ({ type: 'Polygon', coordinates: [[
  [z[3],z[5]],[z[4],z[5]],[z[4],z[6]],[z[3],z[6]],[z[3],z[5]]
]] });
const zones = zoneDefs.map((z, i) => ({
  id: i + 1, zone_code: z[0], name: z[1], zone_type: z[2], boundary_geojson: i===0 ? allowedUrbanPolygon : polygonFromRect(z),
  min_altitude_m: 0, max_altitude_m: 120, reason: z[7], data_authority: 'DEMO_ONLY', display_color: z[8],
  is_active: true, created_at: '2026-07-02 08:00:00', updated_at: DB_TIME
}));
const restrictedRects = zoneDefs.slice(1).map(z => ({ code:z[0], minLng:z[3], maxLng:z[4], minLat:z[5], maxLat:z[6] }));
// Correct indexes for zoneDefs: code,name,type,minLng,maxLng,minLat,maxLat,reason,color.
restrictedRects.length = 0;
for (const z of zoneDefs.slice(1)) restrictedRects.push({ code:z[0], minLng:z[3], maxLng:z[4], minLat:z[5], maxLat:z[6] });
writeJson('03-airspace/flight-zones.geojson', {
  type: 'FeatureCollection',
  features: zones.map(z => ({
    type: 'Feature',
    properties: { id:z.id, zoneCode:z.zone_code, name:z.name, zoneType:z.zone_type, reason:z.reason, dataAuthority:z.data_authority, displayColor:z.display_color },
    geometry: z.boundary_geojson
  }))
});
writeText('03-airspace/seed.sql', sqlInsert('flight_zones', zones));

const scenarioDefs = [
  ['NORMAL','Normal flight','NORMAL','SUCCESS',null,null,'NONE',{},'All simulated health metrics remain within the project normal envelope.'],
  ['LOW_BATTERY','Low battery reserve','POWER','RETURN_TO_HOME',62,100,'CENTER_REAR',{targetEndPercent:8},'Battery reserve drops through warning and critical thresholds, triggering return-to-home.'],
  ['BATTERY_VOLTAGE_DROP','Battery voltage sag','POWER','FAILED',52,100,'CENTER_REAR',{warningV:14.0,criticalV:13.2},'Pack voltage sags abnormally under load even though percentage remains non-zero.'],
  ['BATTERY_OVERHEAT','Battery overheating','THERMAL','RETURN_TO_HOME',45,100,'CENTER_REAR',{warningC:50,criticalC:60},'Battery temperature rises beyond project warning and critical thresholds.'],
  ['MOTOR_OVERHEAT','Motor overheating','THERMAL','RETURN_TO_HOME',42,100,'RUNTIME_SELECTED',{allowedPositions:['FRONT_LEFT','FRONT_RIGHT','REAR_LEFT','REAR_RIGHT'],warningC:70,criticalC:80},'One runtime-selected motor temperature rises abnormally and requires an early return.'],
  ['PROPELLER_DAMAGE','Propeller damage suspected','PROPULSION','FAILED',50,100,'RUNTIME_SELECTED',{allowedPositions:['FRONT_LEFT','FRONT_RIGHT','REAR_LEFT','REAR_RIGHT'],rpmImbalanceWarningPercent:15,rpmImbalanceCriticalPercent:25,vibrationCriticalG:2.5},'A runtime-selected arm develops RPM loss plus excessive vibration and is treated as suspected propeller damage.'],
  ['GPS_LOSS','Temporary GNSS loss','NAVIGATION','RETURN_TO_HOME',48,61,'TOP_CENTER',{lostSamples:20},'GNSS data becomes unavailable, then recovers before landing.'],
  ['SIGNAL_LOSS','Temporary communication loss','COMMUNICATION','RETURN_TO_HOME',55,57,'NONE',{lostSamples:6},'Control-link signal falls to zero for less than the heartbeat-timeout window, then recovers before landing.'],
  ['UNEXPECTED_OFFLINE','Unexpected heartbeat timeout','COMMUNICATION','FAILED',58,100,'NONE',{heartbeatTimeoutSeconds:15},'The backend stops receiving heartbeats while the drone is online or in flight; this is different from a user-requested power-off.']
];
const scenarios = scenarioDefs.map((s, i) => ({
  id:i+1, scenario_code:s[0], name:s[1], category:s[2], expected_result:s[3], fault_start_progress:s[4],
  fault_end_progress:s[5], affected_position:s[6], parameters_json:s[7], description:s[8], is_enabled:true,
  created_at:'2026-07-02 09:00:00', updated_at:DB_TIME
}));
const scenarioId = code => scenarios.find(s=>s.scenario_code===code).id;
const scenarioPoolDefs = [
  [1,'NORMAL',100,'Drone - 001 is the stable baseline and always receives a normal scenario.'],
  [2,'LOW_BATTERY',35,'Drone - 002 power-fault pool: low remaining battery.'],
  [2,'BATTERY_VOLTAGE_DROP',30,'Drone - 002 power-fault pool: critical voltage sag.'],
  [2,'BATTERY_OVERHEAT',35,'Drone - 002 power-fault pool: battery thermal event.'],
  [3,'MOTOR_OVERHEAT',50,'Drone - 003 propulsion pool: choose motor overheating, then independently choose one of four arm positions.'],
  [3,'PROPELLER_DAMAGE',50,'Drone - 003 propulsion pool: choose RPM/vibration-based suspected propeller damage, then independently choose one of four arm positions.'],
  [4,'GPS_LOSS',35,'Drone - 004 connectivity pool: temporary GNSS loss.'],
  [4,'SIGNAL_LOSS',35,'Drone - 004 connectivity pool: temporary control-link loss.'],
  [4,'UNEXPECTED_OFFLINE',30,'Drone - 004 connectivity pool: unexpected heartbeat timeout.']
];
const scenarioPool = scenarioPoolDefs.map((p,i)=>({
  id:i+1, drone_id:p[0], simulation_scenario_id:scenarioId(p[1]), selection_weight:p[2], is_enabled:true,
  description:p[3], created_at:'2026-07-02 09:05:00', updated_at:DB_TIME
}));
writeJson('06-simulation/scenarios.json', scenarios);
writeJson('06-simulation/drone-scenario-pool.json', scenarioPool);
writeText('06-simulation/seed.sql', sqlInsert('simulation_scenarios', scenarios) + '\n' + sqlInsert('drone_scenario_pool', scenarioPool));

const safeTemplates = [
  [[10.7660,106.6835],[10.7670,106.6880],[10.7685,106.6920],[10.7690,106.6970],[10.7700,106.7010]],
  [[10.7760,106.6835],[10.7775,106.6870],[10.7785,106.6910],[10.7795,106.6960],[10.7800,106.7010]],
  [[10.7858,106.6910],[10.7860,106.6990],[10.7862,106.7060],[10.7860,106.7130],[10.7857,106.7180]],
  [[10.7758,106.7120],[10.7770,106.7150],[10.7780,106.7180],[10.7850,106.7185],[10.7880,106.7160]],
  [[10.7630,106.6830],[10.7630,106.6900],[10.7630,106.6980],[10.7630,106.7070],[10.7630,106.7170]],
  [[10.7765,106.6990],[10.7790,106.7020],[10.7830,106.7020],[10.7860,106.7010],[10.7880,106.6990]]
];
const invalidTemplates = {
  3: [[10.7680,106.6910],[10.7725,106.6960],[10.7765,106.7000],[10.7790,106.7020]],
  4: [[10.7760,106.7010],[10.7805,106.7080],[10.7855,106.7130],[10.7880,106.7170]]
};
const missionNames = [
  'Riverside Survey Draft','Campus Perimeter Draft','Hospital Crossing Rejection','Government Zone Rejection',
  'Southern Corridor Validation','Canal Observation','Green Corridor Survey','Bridge Inspection','Park Mapping',
  'Solar Roof Survey','Traffic Observation','Riverbank Patrol','Construction Progress','Vegetation Check',
  'Battery Reserve Exercise','Battery Voltage Fault Exercise','Battery Thermal Exercise','Motor Thermal Exercise',
  'Propulsion Fault Exercise','Navigation and Link Recovery'
];
const missionStates = [
  ['DRAFT','NOT_CHECKED','Route drafted; geometry and weather have not been checked.',0],
  ['DRAFT','VALID','Geometry valid; a fresh check from the active weather mode is required before launch.',0],
  ['DRAFT','INVALID','Route rejected because it intersects ZONE-R01.',0],
  ['DRAFT','INVALID','Route rejected because it intersects ZONE-R02.',0],
  ['READY','VALID','Geometry valid; cached demo weather is expired and must be refreshed before launch.',0],
  ...Array.from({length:10},()=>['COMPLETED','VALID','Mission completed; historical flight data is available.',100]),
  ...Array.from({length:5},()=>['FAILED','VALID','Planning passed, but at least one simulated flight ended early because of an onboard fault.',100])
];
const missions = [];
const waypoints = [];
const missionDroneIds = [1,1,5,5,5,5,5,1,1,1,4,4,1,4,2,2,2,3,3,4];
let waypointId = 1;
for (let i = 1; i <= 20; i++) {
  const count = i % 2 === 0 ? 5 : 4;
  const base = invalidTemplates[i] || safeTemplates[(i - 1) % safeTemplates.length];
  const selected = Array.from({length: count}, (_, j) => {
    const p = interpolateDistanceWeighted(base.map(([latitude, longitude]) => ({latitude, longitude})), j / (count - 1));
    const jitter = invalidTemplates[i] ? 0 : ((i % 3) - 1) * 0.00008;
    return { latitude:round(p.latitude + jitter,7), longitude:round(p.longitude - jitter,7) };
  });
  const altitude = 42 + (i % 5) * 8;
  const speed = 5.5 + (i % 4) * 0.7;
  const distance = routeDistance(selected);
  const holdTotal = (count - 2) * 4;
  const duration = Math.ceil(distance / speed + 55 + holdTotal);
  const state = missionStates[i - 1];
  const created = `2026-${i < 11 ? '07' : '08'}-${pad(3 + (i % 24),2)} 08:00:00`;
  missions.push({
    id:i, mission_code:`MSN-${pad(i)}`, drone_id:missionDroneIds[i-1], name:missionNames[i-1],
    description:`Deterministic demo mission ${i}; coordinates are synthetic project data inside the central HCMC demo boundary.`,
    status:state[0], validation_status:state[1], validation_message:state[2], planned_altitude_m:altitude,
    planned_speed_mps:round(speed,2), estimated_distance_m:round(distance,2), estimated_duration_sec:duration,
    progress_percent:state[3], created_at:created, updated_at:DB_TIME
  });
  selected.forEach((p, j) => waypoints.push({
    id:waypointId++, mission_id:i, sequence_number:j+1,
    waypoint_type:j===0?'START':j===count-1?'DESTINATION':'INTERMEDIATE',
    latitude:p.latitude, longitude:p.longitude, altitude_m:altitude, hold_time_sec:j>0&&j<count-1?4:0, created_at:created
  }));
}
writeJson('04-missions/missions.json', missions);
writeJson('04-missions/waypoints.json', waypoints);
writeText('04-missions/seed.sql', sqlInsert('missions', missions) + '\n' + sqlInsert('waypoints', waypoints));

const weatherRuntimeConfig = [{
  id:1,
  active_mode:'DEMO',
  live_provider:'OPEN_METEO',
  demo_mode_status:'AVAILABLE',
  live_mode_status:'COMING_SOON',
  snapshot_ttl_minutes:10,
  caution_requires_confirmation:true,
  unsafe_can_be_overridden:false,
  demo_banner_text:'DEMO MODE — SIMULATED WEATHER',
  created_at:DB_TIME,
  updated_at:DB_TIME
}];

const weatherDemoProfiles = [
  {
    id:1, profile_code:'DEMO_SAFE', name:'Demo safe weather', recommendation:'SAFE', condition_code:1,
    temperature_c:29.4, relative_humidity_percent:68, wind_speed_10m_mps:4.2, wind_speed_80m_mps:5.8,
    wind_direction_10m_deg:110, wind_gust_10m_mps:6.1, precipitation_mm:0, rain_mm:0, visibility_m:10000,
    reason:'Demo fixture: dry, good visibility, and wind below project caution thresholds.', is_enabled:true,
    created_at:DB_TIME, updated_at:DB_TIME
  },
  {
    id:2, profile_code:'DEMO_CAUTION', name:'Demo caution weather', recommendation:'CAUTION', condition_code:51,
    temperature_c:28.1, relative_humidity_percent:82, wind_speed_10m_mps:8.7, wind_speed_80m_mps:10.2,
    wind_direction_10m_deg:205, wind_gust_10m_mps:10.8, precipitation_mm:0.2, rain_mm:0.2, visibility_m:4200,
    reason:'Demo fixture: light precipitation and wind in the project caution range.', is_enabled:true,
    created_at:DB_TIME, updated_at:DB_TIME
  },
  {
    id:3, profile_code:'DEMO_UNSAFE', name:'Demo unsafe weather', recommendation:'UNSAFE', condition_code:95,
    temperature_c:26.2, relative_humidity_percent:91, wind_speed_10m_mps:11.4, wind_speed_80m_mps:13.2,
    wind_direction_10m_deg:245, wind_gust_10m_mps:15.1, precipitation_mm:2.8, rain_mm:2.8, visibility_m:1400,
    reason:'Demo fixture: thunderstorm code, wind above project limit, and poor visibility.', is_enabled:true,
    created_at:DB_TIME, updated_at:DB_TIME
  }
];

const droneWeatherDemoAssignments = drones.map((drone, index) => ({
  id:index + 1,
  drone_id:drone.id,
  weather_demo_profile_id:drone.id === 5 ? 2 : 1,
  created_at:DB_TIME,
  updated_at:DB_TIME
}));

const weatherRules = {
  version: VERSION,
  policyType: 'PROJECT_SIMULATION_POLICY_NOT_MANUFACTURER_LIMITS',
  disclaimer: 'The weather variables and WMO codes follow the provider contract, but every SAFE/CAUTION/UNSAFE threshold below is an internal project policy—not an aviation authority or manufacturer limit.',
  sourceReferences: [
    {name:'DJI Mavic 3 Enterprise specifications',url:'https://enterprise.dji.com/mavic-3-enterprise/specs',usedFor:'Reference aircraft wind-resistance envelope only (12 m/s published value).'},
    {name:'Open-Meteo forecast API documentation',url:'https://open-meteo.com/en/docs',usedFor:'Weather field names, units, heights and WMO weather-code meanings.'}
  ],
  snapshotTtlMinutes: 10,
  defaultMode: 'DEMO',
  modes: {
    DEMO: { status:'AVAILABLE', sourceKind:'SIMULATED_FIXTURE', behavior:'Use the selected drone demo profile and show a persistent simulated-weather banner.' },
    LIVE: { status:'COMING_SOON', sourceKind:'OPEN_METEO', provider:'OPEN_METEO', behavior:'Prepared integration contract; not selectable in the current project release.' }
  },
  liveProviderRequest: {
    baseUrl:'https://api.open-meteo.com/v1/forecast',
    coordinateParameters:['latitude','longitude'],
    currentFields:['temperature_2m','relative_humidity_2m','precipitation','rain','weather_code','wind_speed_10m','wind_direction_10m','wind_gusts_10m'],
    hourlyFields:['visibility','wind_speed_80m'],
    fixedParameters:{wind_speed_unit:'ms',timezone:'UTC',forecast_days:1}
  },
  samplingLocations: ['START','ROUTE_MIDPOINT','DESTINATION'],
  decisionPrecedence: ['UNSAFE','CAUTION','SAFE'],
  rules: {
    windSpeed10mMps: { safeMax:7.9, cautionFrom:8.0, cautionMax:10.0, unsafeAbove:10.0, authority:'PROJECT_SIMULATION_POLICY', basis:'Keeps the demo decision margin below the reference aircraft published 12 m/s wind-resistance value.' },
    windGust10mMps: { safeMax:9.9, cautionFrom:10.0, cautionMax:12.0, unsafeAbove:12.0, authority:'PROJECT_SIMULATION_POLICY', basis:'Conservative project rule for gusts; not a manufacturer-certified operating limit.' },
    precipitationMmPerHour: { safeMax:0, cautionFrom:0.01, cautionMax:0.5, unsafeAbove:0.5, authority:'PROJECT_SIMULATION_POLICY', basis:'Presentation rule that distinguishes dry, light precipitation, and blocked launch.' },
    visibilityM: { safeMin:5000, cautionMin:2000, unsafeBelow:2000, authority:'PROJECT_SIMULATION_POLICY', basis:'Presentation rule for route visibility; not a legal VLOS determination.' },
    wmoWeatherCodesUnsafe: {values:[65,67,75,82,86,95,96,99], authority:'PROJECT_SIMULATION_POLICY', basis:'Uses provider WMO meanings; unsafe classification is decided by this project.'}
  },
  routeDecision: { invalidRoute:'BLOCK', unsafeWeather:'BLOCK_WITHOUT_OVERRIDE', cautionWeather:'ALLOW_AFTER_USER_CONFIRMATION', safeWeather:'ALLOW' },
  runtimeRule: 'The current project release only allows DEMO mode and generates fresh SIMULATED_FIXTURE snapshots from assigned profiles. LIVE/Open-Meteo remains configured but cannot be selected while marked COMING_SOON.'
};
writeJson('05-weather/weather-policy.json', weatherRules);
const weatherChecks = [];
let weatherId = 1;
for (let group = 0; group < 3; group++) {
  const missionId = 5 + group;
  const route = waypoints.filter(w => w.mission_id === missionId);
  const profile = weatherDemoProfiles[group];
  const validationRunId = crypto.createHash('md5').update(`weather-demo-${group}`).digest('hex').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
  const locations = [
    ['START', route[0], route[0].id],
    ['ROUTE_MIDPOINT', interpolateDistanceWeighted(route,0.5), null],
    ['DESTINATION', route.at(-1), route.at(-1).id]
  ];
  locations.forEach(([type,p,wpId], j) => weatherChecks.push({
    id:weatherId++, validation_run_id:validationRunId, mission_id:missionId, waypoint_id:wpId,
    location_type:type, latitude:round(p.latitude,7), longitude:round(p.longitude,7), source_kind:'SIMULATED_FIXTURE',
    condition_code:profile.condition_code, temperature_c:round(profile.temperature_c + j*0.2,2), relative_humidity_percent:profile.relative_humidity_percent,
    wind_speed_10m_mps:round(profile.wind_speed_10m_mps+j*0.15,2), wind_speed_80m_mps:round(profile.wind_speed_80m_mps+j*0.2,2),
    wind_direction_10m_deg:(profile.wind_direction_10m_deg+j*4)%360, wind_gust_10m_mps:round(profile.wind_gust_10m_mps+j*0.2,2),
    precipitation_mm:profile.precipitation_mm, rain_mm:profile.rain_mm, visibility_m:profile.visibility_m,
    recommendation:profile.recommendation, reason:profile.reason, provider_observed_at:'2026-08-01 01:00:00',
    checked_at:'2026-08-01 01:01:00', expires_at:'2026-08-01 01:11:00',
    raw_response:{fixture:true,note:'Illustrative normalized weather only; not an actual observation.'}, created_at:'2026-08-01 01:01:00'
  }));
}
writeJson('05-weather/weather-runtime-config.json', weatherRuntimeConfig[0]);
writeJson('05-weather/weather-demo-profiles.json', weatherDemoProfiles);
writeJson('05-weather/drone-weather-demo-assignments.json', droneWeatherDemoAssignments);
writeJson('05-weather/expired-demo-weather-checks.json', weatherChecks);
writeText('05-weather/seed.sql', [
  sqlInsert('weather_runtime_config', weatherRuntimeConfig),
  sqlInsert('weather_demo_profiles', weatherDemoProfiles),
  sqlInsert('drone_weather_demo_assignments', droneWeatherDemoAssignments),
  sqlInsert('weather_checks', weatherChecks)
].join('\n'));

const healthRules = {
  version: VERSION,
  disclaimer: 'These thresholds are an internal simulation policy for this course project. They are not DJI limits, maintenance instructions, or real-world flight-safety certification.',
  sourceReferences: [
    {name:'DJI Mavic 3 Enterprise specifications',url:'https://enterprise.dji.com/mavic-3-enterprise/specs',usedFor:'Reference battery capacity, voltage, speed, flight-time and wind-resistance envelope.'},
    {name:'PX4 safety documentation',url:'https://docs.px4.io/main/en/config/safety#battery-failsafes',usedFor:'General concepts such as configurable warning/critical battery actions; not the numeric thresholds in this pack.'}
  ],
  evaluationIntervalSeconds: 2,
  rules: [
    {ruleCode:'BATTERY_PERCENT_LOW',metric:'battery_percent',authority:'PROJECT_SIMULATION_POLICY',basis:'Configurable reserve/failsafe concept; numeric values selected for visible demo behavior.',warning:{operator:'<=',value:20,consecutiveSamples:3},critical:{operator:'<=',value:10,consecutiveSamples:3},recovery:{operator:'>',value:25,consecutiveSamples:5},unit:'%'},
    {ruleCode:'BATTERY_VOLTAGE_LOW',metric:'battery_voltage_v',authority:'PROJECT_SIMULATION_POLICY',basis:'Synthetic four-cell pack voltage-sag scenario; not a DJI service threshold.',warning:{operator:'<=',value:14.0,consecutiveSamples:3},critical:{operator:'<=',value:13.2,consecutiveSamples:3},recovery:{operator:'>',value:14.4,consecutiveSamples:10},unit:'V'},
    {ruleCode:'BATTERY_OVERHEAT',metric:'battery_temperature_c',authority:'PROJECT_SIMULATION_POLICY',basis:'Synthetic thermal scenario for the dashboard.',warning:{operator:'>=',value:50,consecutiveSamples:5},critical:{operator:'>=',value:60,consecutiveSamples:3},recovery:{operator:'<',value:45,consecutiveSamples:10},unit:'°C'},
    {ruleCode:'MOTOR_OVERHEAT',metric:'max_motor_temperature_c',authority:'PROJECT_SIMULATION_POLICY',basis:'Synthetic motor-temperature scenario for the dashboard.',warning:{operator:'>=',value:70,consecutiveSamples:5},critical:{operator:'>=',value:80,consecutiveSamples:3},recovery:{operator:'<',value:65,consecutiveSamples:10},unit:'°C'},
    {ruleCode:'MOTOR_RPM_ANOMALY',metric:'max_motor_rpm_deviation_from_median_percent',authority:'PROJECT_SIMULATION_POLICY',basis:'Relative four-motor comparison chosen for reproducible anomaly detection.',warning:{operator:'>=',value:15,consecutiveSamples:3},critical:{operator:'>=',value:25,consecutiveSamples:3},recovery:{operator:'<',value:10,consecutiveSamples:10},unit:'%'},
    {ruleCode:'EXCESSIVE_VIBRATION',metric:'vibration_g',authority:'PROJECT_SIMULATION_POLICY',basis:'Synthetic vibration signal; not a calibrated airframe limit.',warning:{operator:'>=',value:1.8,consecutiveSamples:3},critical:{operator:'>=',value:2.5,consecutiveSamples:3},recovery:{operator:'<',value:1.2,consecutiveSamples:10},unit:'g'},
    {ruleCode:'PROPELLER_DAMAGE_SUSPECTED',metric:'composite',authority:'PROJECT_SIMULATION_POLICY',basis:'Requires RPM imbalance plus vibration to avoid claiming damage from one signal alone.',critical:{all:['motor RPM deviation >= 25% for 3 samples','vibration_g >= 2.5 for 3 samples']},recovery:{manualInspectionRequired:true}},
    {ruleCode:'GPS_LOST',metric:'gps_quality',authority:'PROJECT_SIMULATION_POLICY',basis:'Consecutive-sample debounce for simulated GNSS loss.',critical:{operator:'=',value:'LOST',consecutiveSamples:3},recovery:{operator:'=',value:'GOOD',consecutiveSamples:5}},
    {ruleCode:'COMMUNICATION_LOST',metric:'signal_percent',authority:'PROJECT_SIMULATION_POLICY',basis:'Synthetic signal-strength scenario distinct from heartbeat timeout.',critical:{operator:'<=',value:5,consecutiveSamples:3},recovery:{operator:'>=',value:30,consecutiveSamples:5},unit:'%'},
    {ruleCode:'HEARTBEAT_TIMEOUT',metric:'heartbeat_age_seconds',authority:'PROJECT_SIMULATION_POLICY',basis:'Backend liveness timeout chosen for the demo runtime.',critical:{operator:'>=',value:15,consecutiveSamples:1},recovery:{manualReconnectRequired:true},unit:'s'}
  ],
  lifecycle: {deduplicationKey:'flight_id + rule_code + ACTIVE',onTrigger:'Create one ACTIVE alert; update last_observed_at and peak observed_value on repeats.',onRecovery:'Set RESOLVED and resolved_at. A manual-inspection rule remains ACTIVE until operator action.'}
};
writeJson('06-simulation/health-alert-rules.json', healthRules);

const flightScenarioCodes = [
  'NORMAL','NORMAL','NORMAL','NORMAL',
  'LOW_BATTERY','BATTERY_VOLTAGE_DROP','BATTERY_OVERHEAT','LOW_BATTERY',
  'MOTOR_OVERHEAT','PROPELLER_DAMAGE','MOTOR_OVERHEAT','PROPELLER_DAMAGE',
  'GPS_LOSS','SIGNAL_LOSS','UNEXPECTED_OFFLINE','GPS_LOSS',
  'NORMAL','NORMAL','NORMAL','NORMAL'
];
const flightFaultPositions = [
  null,null,null,null,
  'CENTER_REAR','CENTER_REAR','CENTER_REAR','CENTER_REAR',
  'FRONT_LEFT','FRONT_RIGHT','REAR_LEFT','REAR_RIGHT',
  'TOP_CENTER',null,null,'TOP_CENTER',
  null,null,null,null
];
const flightMissionIds = [
  8,9,10,13,
  15,16,17,15,
  18,19,18,19,
  11,12,14,20,
  6,6,6,6
];
const flightDroneIds = Array.from({length:20},(_,index)=>Math.floor(index/4)+1);
const armMeta = {
  FRONT_LEFT:{label:'front-left',index:0,rpmField:'motor_rpm_fl',temperatureField:'motor_temperature_fl_c'},
  FRONT_RIGHT:{label:'front-right',index:1,rpmField:'motor_rpm_fr',temperatureField:'motor_temperature_fr_c'},
  REAR_LEFT:{label:'rear-left',index:2,rpmField:'motor_rpm_rl',temperatureField:'motor_temperature_rl_c'},
  REAR_RIGHT:{label:'rear-right',index:3,rpmField:'motor_rpm_rr',temperatureField:'motor_temperature_rr_c'}
};
const flights = [];
const telemetry = [];
const flightEvents = [];
let telemetryId = 1;

function scenarioWindow(code, progress) {
  const sc = scenarios.find(s => s.scenario_code === code);
  if (!sc || sc.fault_start_progress === null) return 0;
  const start = sc.fault_start_progress / 100;
  const end = sc.fault_end_progress / 100;
  if (progress < start || progress > end) return 0;
  return clamp((progress - start) / Math.max(0.01, end - start), 0, 1);
}
function median4(values) {
  const sorted = [...values].sort((a,b)=>a-b);
  return (sorted[1]+sorted[2])/2;
}
for (let i = 1; i <= 20; i++) {
  const missionId = flightMissionIds[i - 1];
  const droneId = flightDroneIds[i - 1];
  const scenarioCode = flightScenarioCodes[i - 1];
  const faultPosition = flightFaultPositions[i - 1];
  const affectedArm = armMeta[faultPosition] ?? null;
  const scenario = scenarios.find(s => s.scenario_code === scenarioCode);
  const route = waypoints.filter(w => w.mission_id === missionId);
  const routeLen = routeDistance(route);
  const start = i === 20
    ? new Date('2026-09-12T11:45:00.000Z')
    : new Date(Date.UTC(2026, i <= 10 ? 6 : 7, 2 + (i % 24), 1 + (i % 7), 0, 0));
  const sampleCount = 300;
  const telemetryDuration = (sampleCount - 1) * 2;
  const duration = telemetryDuration + (scenarioCode === 'UNEXPECTED_OFFLINE' ? 15 : 0);
  const expected = scenario.expected_result;
  const result = expected === 'SUCCESS' ? 'SUCCESS' : expected === 'RETURN_TO_HOME' ? 'RETURNED_SAFELY' : 'FAILED';
  const endBatteryTarget = scenarioCode === 'LOW_BATTERY' ? 8 : 38 - (i % 5) * 3;
  const startBattery = 94 + (i % 4);
  const flightWeatherProfile = weatherDemoProfiles[droneId === 5 ? 1 : 0];
  const positions = [];
  for (let j = 0; j < sampleCount; j++) {
    const t = j / (sampleCount - 1);
    const routeProgress = scenarioCode === 'UNEXPECTED_OFFLINE'
      ? t * 0.62
      : result === 'SUCCESS'
        ? t
        : result === 'RETURNED_SAFELY'
          ? (t <= 0.72 ? t / 0.72 * 0.68 : 0.68 * (1 - (t - 0.72) / 0.28))
          : Math.min(t / 0.72 * 0.68,0.68);
    positions.push(interpolateDistanceWeighted(route, routeProgress));
  }
  let actualDistance = 0;
  for (let j = 1; j < positions.length; j++) actualDistance += haversine(positions[j-1], positions[j]);
  const terminationReason = ({
    LOW_BATTERY:'Returned after battery reserve reached the critical project threshold.',
    BATTERY_VOLTAGE_DROP:'Flight aborted after abnormal battery voltage sag.',
    BATTERY_OVERHEAT:'Returned after battery temperature crossed the critical project threshold.',
    MOTOR_OVERHEAT:`Returned after the ${affectedArm?.label} motor crossed the critical project threshold.`,
    PROPELLER_DAMAGE:`Emergency landing after RPM imbalance and excessive vibration indicated suspected ${affectedArm?.label} propeller damage.`,
    GPS_LOSS:'Returned safely after temporary GNSS loss.',
    SIGNAL_LOSS:'Returned safely after temporary communication loss.',
    UNEXPECTED_OFFLINE:'Flight failed after the backend received no heartbeat for 15 seconds.'
  })[scenarioCode] || null;
  flights.push({
    id:i, flight_code:`FLT-${pad(i)}`, drone_id:droneId, mission_id:missionId, simulation_scenario_id:scenario.id, fault_position:faultPosition,
    status:scenarioCode==='UNEXPECTED_OFFLINE'?'ABORTED':'LANDED', result, started_at:mysqlTime(start), ended_at:mysqlTime(addSeconds(start,duration)), duration_sec:duration,
    distance_m:round(actualDistance,2), start_battery_percent:startBattery, end_battery_percent:endBatteryTarget,
    preflight_weather_mode:'DEMO', preflight_weather_recommendation:flightWeatherProfile.recommendation,
    weather_acknowledged_at:flightWeatherProfile.recommendation==='CAUTION'?mysqlTime(addSeconds(start,-60)):null,
    termination_reason:terminationReason, created_at:mysqlTime(start).slice(0,19), updated_at:mysqlTime(addSeconds(start,duration)).slice(0,19)
  });
  const rows = [];
  let previousAltitude = 0;
  let lastValidPosition = positions[0];
  const signalLossStartIndex = Math.ceil((scenario.fault_start_progress ?? 0) / 100 * (sampleCount - 1));
  const signalRecoveryIndex = Math.min(sampleCount - 1,Math.floor((scenario.fault_end_progress ?? 0) / 100 * (sampleCount - 1)) + 1);
  const signalRecoveryAt = addSeconds(start,signalRecoveryIndex*2);
  for (let j = 0; j < sampleCount; j++) {
    const t = j / (sampleCount - 1);
    const fault = scenarioWindow(scenarioCode,t);
    const positionIsValid = !(scenarioCode === 'GPS_LOSS' && fault > 0);
    const p = positionIsValid ? positions[j] : lastValidPosition;
    if (positionIsValid) lastValidPosition = p;
    const nextIndex = Math.min(j + 1, sampleCount - 1);
    const nextFault = scenarioWindow(scenarioCode,nextIndex/(sampleCount-1));
    const next = scenarioCode === 'GPS_LOSS' && nextFault > 0 ? p : positions[nextIndex];
    const phaseAltitude = scenarioCode === 'UNEXPECTED_OFFLINE'
      ? (t < 0.10 ? route[0].altitude_m * (t / 0.10) : route[0].altitude_m)
      : t < 0.10 ? route[0].altitude_m * (t / 0.10) : t > 0.88 ? route[0].altitude_m * ((1-t)/0.12) : route[0].altitude_m;
    const altitude = Math.max(0, phaseAltitude + (t > 0.10 && t < 0.88 ? Math.sin(j/17)*0.55 : 0));
    const verticalSpeed = j === 0 ? 0 : (altitude - previousAltitude) / 2;
    previousAltitude = altitude;
    const horizontalSpeed = j === sampleCount - 1 ? 0 : haversine(p,next)/2;
    let batteryPercent = Math.round(startBattery - (startBattery-endBatteryTarget) * (t ** 1.04));
    let voltage = 17.05 - 2.55*t - 0.12*Math.sin(j/23);
    let current = 8.5 + horizontalSpeed*0.65 + Math.max(0,verticalSpeed)*0.9 + Math.sin(j/19)*0.6;
    let batteryTemp = 28 + 13*t + Math.sin(j/31)*0.5;
    const rpmBase = 5000 + horizontalSpeed*105 + Math.max(0,verticalSpeed)*75 + Math.sin(j/13)*80;
    let rpms = [rpmBase+35,rpmBase-30,rpmBase+55,rpmBase-45];
    let motorTemps = [34+25*t,33.5+24*t,34.5+24*t,33.8+23.5*t].map((v,k)=>v+Math.sin((j+k*5)/27)*0.6);
    let vibration = 0.42 + 0.12*Math.abs(Math.sin(j/11));
    let gpsQuality = j % 113 === 0 ? 'FAIR' : 'GOOD';
    let satellites = 15 + (j % 4);
    let signal = clamp(Math.round(98 - 28*t - (i%3)*2 + Math.sin(j/22)*3),0,100);
    if (scenarioCode === 'LOW_BATTERY') {
      voltage -= fault*0.55;
      current += fault*2.5;
    }
    if (scenarioCode === 'BATTERY_VOLTAGE_DROP') {
      voltage -= fault*2.25;
      current += fault*4;
    }
    if (scenarioCode === 'BATTERY_OVERHEAT') {
      batteryTemp += fault*25;
      current += fault*3;
    }
    if (scenarioCode === 'MOTOR_OVERHEAT') {
      motorTemps[affectedArm.index] += fault*35;
      rpms[affectedArm.index] += fault*280;
      current += fault*2;
    }
    if (scenarioCode === 'PROPELLER_DAMAGE') {
      rpms[affectedArm.index] *= 1 - fault*0.38;
      const compensationIndex = (affectedArm.index + 1) % 4;
      rpms[compensationIndex] *= 1 + fault*0.08;
      vibration += fault*3.05;
      motorTemps[affectedArm.index] += fault*12;
      current += fault*5;
    }
    if (scenarioCode === 'GPS_LOSS' && fault > 0) {
      gpsQuality = 'LOST'; satellites = 0;
    }
    if (scenarioCode === 'SIGNAL_LOSS' && fault > 0) signal = 0;
    const recordedAt = addSeconds(start,j*2);
    const isBuffered = scenarioCode === 'SIGNAL_LOSS' && fault > 0;
    const receivedAt = isBuffered
      ? addSeconds(signalRecoveryAt,(j-signalLossStartIndex)*0.02)
      : addSeconds(recordedAt,0.12);
    const heartbeatAge = isBuffered ? Math.min(14,(j-signalLossStartIndex+1)*2) : 0;
    const row = {
      id:telemetryId++, flight_id:i, sequence_number:j+1, recorded_at:mysqlTime(recordedAt), received_at:mysqlTime(receivedAt),
      latitude:round(p.latitude,7), longitude:round(p.longitude,7),
      position_source:positionIsValid?'GNSS':'LAST_KNOWN', position_is_valid:positionIsValid,
      transmission_state:isBuffered?'BUFFERED':signal<30?'DEGRADED':'CONNECTED', heartbeat_age_seconds:heartbeatAge,
      altitude_m:round(altitude,2), speed_mps:round(horizontalSpeed,2), vertical_speed_mps:round(verticalSpeed,2),
      heading_deg:round(j===sampleCount-1 ? rows.at(-1)?.heading_deg || 0 : bearing(p,next),2),
      battery_percent:clamp(batteryPercent,0,100), battery_voltage_v:round(Math.max(11.8,voltage),2),
      battery_current_a:round(Math.max(0,current),2), battery_temperature_c:round(batteryTemp,2),
      motor_rpm_fl:Math.max(0,Math.round(rpms[0])), motor_rpm_fr:Math.max(0,Math.round(rpms[1])),
      motor_rpm_rl:Math.max(0,Math.round(rpms[2])), motor_rpm_rr:Math.max(0,Math.round(rpms[3])),
      motor_temperature_fl_c:round(motorTemps[0],2), motor_temperature_fr_c:round(motorTemps[1],2),
      motor_temperature_rl_c:round(motorTemps[2],2), motor_temperature_rr_c:round(motorTemps[3],2),
      vibration_g:round(vibration,3), flight_controller_temperature_c:round(36+16*t+Math.sin(j/29)*0.5,2),
      gps_quality:gpsQuality, gps_satellites:satellites, signal_percent:signal,
      wind_speed_mps:round(flightWeatherProfile.wind_speed_10m_mps+Math.sin(j/33)*0.35,2),
      wind_direction_deg:(flightWeatherProfile.wind_direction_10m_deg+Math.round(Math.sin(j/35)*7)+360)%360,
      wind_source:'SIMULATED_WEATHER_PROFILE'
    };
    rows.push(row);
    telemetry.push(row);
  }
  const findConsecutive = (predicate, required) => {
    let count = 0;
    for (const row of rows) {
      count = predicate(row) ? count + 1 : 0;
      if (count >= required) return row;
    }
    return undefined;
  };
  const findLast = predicate => [...rows].reverse().find(predicate);
  const baseEvent = { flightId:i, droneId, missionId, scenarioCode, faultPosition, affectedArm, start, end:addSeconds(start,duration), rows };
  if (scenarioCode === 'LOW_BATTERY') {
    baseEvent.trigger = findConsecutive(r=>r.battery_percent<=10,3); baseEvent.last = findLast(r=>r.battery_percent<=10);
  } else if (scenarioCode === 'BATTERY_VOLTAGE_DROP') {
    baseEvent.trigger = findConsecutive(r=>r.battery_voltage_v<=13.2,3); baseEvent.last = findLast(r=>r.battery_voltage_v<=13.2);
  } else if (scenarioCode === 'BATTERY_OVERHEAT') {
    baseEvent.trigger = findConsecutive(r=>r.battery_temperature_c>=60,3); baseEvent.last = findLast(r=>r.battery_temperature_c>=60);
  } else if (scenarioCode === 'MOTOR_OVERHEAT') {
    baseEvent.trigger = findConsecutive(r=>r[affectedArm.temperatureField]>=80,3); baseEvent.last = findLast(r=>r[affectedArm.temperatureField]>=80);
  } else if (scenarioCode === 'PROPELLER_DAMAGE') {
    const deviation = r => {
      const values=[r.motor_rpm_fl,r.motor_rpm_fr,r.motor_rpm_rl,r.motor_rpm_rr];
      return Math.abs(r[affectedArm.rpmField]-median4(values))/median4(values)*100;
    };
    const composite = r => {
      return deviation(r)>=25 && r.vibration_g>=2.5;
    };
    baseEvent.rpmWarningTrigger = findConsecutive(r=>deviation(r)>=15,3);
    baseEvent.trigger = findConsecutive(composite,3); baseEvent.last = findLast(composite);
  } else if (scenarioCode === 'GPS_LOSS') {
    baseEvent.trigger = findConsecutive(r=>r.gps_quality==='LOST',3); baseEvent.last = findLast(r=>r.gps_quality==='LOST');
  } else if (scenarioCode === 'SIGNAL_LOSS') {
    baseEvent.trigger = findConsecutive(r=>r.signal_percent<=5,3); baseEvent.last = findLast(r=>r.signal_percent<=5);
  } else if (scenarioCode === 'UNEXPECTED_OFFLINE') {
    const heartbeatTimeoutAt = mysqlTime(addSeconds(start,duration));
    baseEvent.trigger = {...rows.at(-1),recorded_at:heartbeatTimeoutAt};
    baseEvent.last = baseEvent.trigger;
  }
  if (baseEvent.trigger) flightEvents.push(baseEvent);
}
writeJson('07-flight-operations/flights.json', flights);
writeJson('07-flight-operations/telemetry.json', telemetry);
writeText('07-flight-operations/seed.sql', sqlInsert('flights', flights) + '\n' + sqlInsert('telemetry', telemetry));

const alertRuleCatalog = [
  {rule_code:'BATTERY_PERCENT_LOW',alert_type:'LOW_BATTERY',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'Battery percentage remains at or below the critical project threshold for the required consecutive samples.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'BATTERY_VOLTAGE_LOW',alert_type:'BATTERY_VOLTAGE_LOW',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'Battery voltage remains at or below the critical project threshold under simulated load.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'BATTERY_OVERHEAT',alert_type:'BATTERY_OVERHEAT',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'Battery temperature reaches the critical project threshold for consecutive samples.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'MOTOR_OVERHEAT',alert_type:'MOTOR_OVERHEAT',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'At least one motor temperature reaches the critical project threshold for consecutive samples.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'MOTOR_RPM_ANOMALY',alert_type:'MOTOR_RPM_ANOMALY',source:'TELEMETRY',default_severity:'WARNING',authority:'PROJECT_SIMULATION_POLICY',description:'One motor RPM deviates from the four-motor median beyond the configured project threshold.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'EXCESSIVE_VIBRATION',alert_type:'EXCESSIVE_VIBRATION',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'Synthetic airframe vibration exceeds the configured project threshold.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'PROPELLER_DAMAGE_SUSPECTED',alert_type:'PROPELLER_DAMAGE_SUSPECTED',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'Critical RPM imbalance and vibration occur together; operator inspection is required.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'GPS_LOST',alert_type:'GPS_LOST',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'GNSS quality remains LOST for the configured consecutive samples.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'COMMUNICATION_LOST',alert_type:'COMMUNICATION_LOST',source:'TELEMETRY',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'Control-link signal remains at or below the configured project threshold.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'HEARTBEAT_TIMEOUT',alert_type:'DRONE_OFFLINE',source:'SYSTEM',default_severity:'CRITICAL',authority:'SYSTEM_LIFECYCLE',description:'An online or in-flight drone misses the backend heartbeat timeout; deliberate power-off does not trigger this rule.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'MISSION_FAILED',alert_type:'MISSION_FAILED',source:'SYSTEM',default_severity:'CRITICAL',authority:'SYSTEM_LIFECYCLE',description:'A flight attempt ends before route completion because of a critical incident.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'RESTRICTED_FLIGHT_ZONE',alert_type:'RESTRICTED_FLIGHT_ZONE',source:'ROUTE',default_severity:'CRITICAL',authority:'SYSTEM_LIFECYCLE',description:'Route validation intersects an active restricted polygon or violates the allowed operating boundary.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'UNSAFE_WEATHER',alert_type:'UNSAFE_WEATHER',source:'WEATHER',default_severity:'CRITICAL',authority:'PROJECT_SIMULATION_POLICY',description:'The worst route weather sample evaluates to UNSAFE and blocks flight creation.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME},
  {rule_code:'WEATHER_CAUTION',alert_type:'WEATHER_CAUTION',source:'WEATHER',default_severity:'WARNING',authority:'PROJECT_SIMULATION_POLICY',description:'The worst route weather sample evaluates to CAUTION and requires explicit user acknowledgement.',is_enabled:true,created_at:DB_TIME,updated_at:DB_TIME}
];

const alerts = [];
let alertId = 1;
function addAlert(a) {
  const active = a.status === 'ACTIVE';
  alerts.push({
    id:alertId, alert_code:`ALT-${pad(alertId)}`, flight_id:a.flight_id ?? null, mission_id:a.mission_id ?? null,
    component_id:a.component_id ?? null, source:a.source, rule_code:a.rule_code, severity:a.severity, type:a.type,
    message:a.message, metric_name:a.metric_name ?? null, observed_value:a.observed_value ?? null,
    threshold_value:a.threshold_value ?? null, unit:a.unit ?? null, status:a.status,
    detected_at:a.detected_at, last_observed_at:a.last_observed_at ?? a.detected_at,
    resolved_at:active ? null : a.resolved_at, resolution_note:active ? null : a.resolution_note,
    created_at:a.detected_at.slice(0,19), updated_at:(active ? a.last_observed_at ?? a.detected_at : a.resolved_at).slice(0,19)
  });
  alertId++;
}
const componentBy = (droneId,type,position) => {
  const catalogId=componentCatalog.find(c=>c.component_type===type&&c.position===position)?.id;
  return components.find(c=>c.drone_id===droneId&&c.component_catalog_id===catalogId)?.id ?? null;
};
for (const e of flightEvents) {
  const isLatestPropellerIncident = e.flightId === 12 && e.scenarioCode === 'PROPELLER_DAMAGE';
  const resolvedAt = mysqlTime(addSeconds(e.end, 20*60));
  const common = {flight_id:e.flightId, mission_id:e.missionId, source:'TELEMETRY', detected_at:e.trigger.recorded_at, last_observed_at:e.last.recorded_at};
  if (e.scenarioCode === 'LOW_BATTERY') addAlert({...common,component_id:componentBy(e.droneId,'BATTERY','CENTER_REAR'),rule_code:'BATTERY_PERCENT_LOW',severity:'CRITICAL',type:'LOW_BATTERY',message:`Battery reserve reached ${e.trigger.battery_percent}%; return-to-home was initiated.`,metric_name:'battery_percent',observed_value:e.trigger.battery_percent,threshold_value:10,unit:'%',status:'RESOLVED',resolved_at:resolvedAt,resolution_note:'Aircraft landed and the battery pack was replaced.'});
  if (e.scenarioCode === 'BATTERY_VOLTAGE_DROP') addAlert({...common,component_id:componentBy(e.droneId,'BATTERY','CENTER_REAR'),rule_code:'BATTERY_VOLTAGE_LOW',severity:'CRITICAL',type:'BATTERY_VOLTAGE_LOW',message:`Battery pack voltage sagged to ${e.trigger.battery_voltage_v} V under load.`,metric_name:'battery_voltage_v',observed_value:e.trigger.battery_voltage_v,threshold_value:13.2,unit:'V',status:'RESOLVED',resolved_at:resolvedAt,resolution_note:'Aircraft landed; the simulated pack was removed from service.'});
  if (e.scenarioCode === 'BATTERY_OVERHEAT') addAlert({...common,component_id:componentBy(e.droneId,'BATTERY','CENTER_REAR'),rule_code:'BATTERY_OVERHEAT',severity:'CRITICAL',type:'BATTERY_OVERHEAT',message:`Battery temperature reached ${e.trigger.battery_temperature_c} °C.`,metric_name:'battery_temperature_c',observed_value:e.trigger.battery_temperature_c,threshold_value:60,unit:'°C',status:'RESOLVED',resolved_at:resolvedAt,resolution_note:'Aircraft landed and the simulated battery cooled below the recovery threshold.'});
  if (e.scenarioCode === 'MOTOR_OVERHEAT') addAlert({...common,component_id:componentBy(e.droneId,'MOTOR',e.faultPosition),rule_code:'MOTOR_OVERHEAT',severity:'CRITICAL',type:'MOTOR_OVERHEAT',message:`The ${e.affectedArm.label} motor temperature reached ${e.trigger[e.affectedArm.temperatureField]} °C.`,metric_name:e.affectedArm.temperatureField,observed_value:e.trigger[e.affectedArm.temperatureField],threshold_value:80,unit:'°C',status:'RESOLVED',resolved_at:resolvedAt,resolution_note:'Motor cooled after landing and passed the simulated inspection.'});
  if (e.scenarioCode === 'GPS_LOSS') addAlert({...common,component_id:componentBy(e.droneId,'GPS','TOP_CENTER'),rule_code:'GPS_LOST',severity:'CRITICAL',type:'GPS_LOST',message:'GNSS positioning was unavailable for consecutive telemetry samples.',metric_name:'gps_quality',status:'RESOLVED',resolved_at:mysqlTime(addSeconds(new Date(e.last.recorded_at.replace(' ','T')+'Z'),12)),resolution_note:'Five consecutive GOOD samples confirmed recovery.'});
  if (e.scenarioCode === 'SIGNAL_LOSS') addAlert({...common,rule_code:'COMMUNICATION_LOST',severity:'CRITICAL',type:'COMMUNICATION_LOST',message:'Control-link signal remained at or below 5% for consecutive telemetry samples.',metric_name:'signal_percent',observed_value:0,threshold_value:5,unit:'%',status:'RESOLVED',resolved_at:mysqlTime(addSeconds(new Date(e.last.recorded_at.replace(' ','T')+'Z'),12)),resolution_note:'Five consecutive samples above 30% confirmed recovery.'});
  if (e.scenarioCode === 'UNEXPECTED_OFFLINE') addAlert({...common,source:'SYSTEM',rule_code:'HEARTBEAT_TIMEOUT',severity:'CRITICAL',type:'DRONE_OFFLINE',message:'Backend received no drone heartbeat for 15 seconds during an active flight.',metric_name:'heartbeat_age_seconds',observed_value:15,threshold_value:15,unit:'s',status:'RESOLVED',resolved_at:resolvedAt,resolution_note:'Connection was restored during incident review; this was not a user-requested power-off.'});
  if (e.scenarioCode === 'PROPELLER_DAMAGE') {
    const rpmRow=e.rpmWarningTrigger;
    const vals=[rpmRow.motor_rpm_fl,rpmRow.motor_rpm_fr,rpmRow.motor_rpm_rl,rpmRow.motor_rpm_rr];
    const deviation=round(Math.abs(rpmRow[e.affectedArm.rpmField]-median4(vals))/median4(vals)*100,3);
    addAlert({...common,detected_at:rpmRow.recorded_at,component_id:componentBy(e.droneId,'MOTOR',e.faultPosition),rule_code:'MOTOR_RPM_ANOMALY',severity:'WARNING',type:'MOTOR_RPM_ANOMALY',message:`The ${e.affectedArm.label} motor RPM deviated ${deviation}% from the four-motor median; inspect the propulsion system.`,metric_name:`${e.affectedArm.rpmField}_deviation_percent`,observed_value:deviation,threshold_value:15,unit:'%',status:isLatestPropellerIncident?'ACTIVE':'RESOLVED',resolved_at:resolvedAt,resolution_note:'Simulated motor and propeller inspection completed.'});
    addAlert({...common,component_id:componentBy(e.droneId,'PROPELLER',e.faultPosition),rule_code:'EXCESSIVE_VIBRATION',severity:'CRITICAL',type:'EXCESSIVE_VIBRATION',message:`Airframe vibration reached ${e.trigger.vibration_g} g during the ${e.affectedArm.label} propulsion incident.`,metric_name:'vibration_g',observed_value:e.trigger.vibration_g,threshold_value:2.5,unit:'g',status:isLatestPropellerIncident?'ACTIVE':'RESOLVED',resolved_at:resolvedAt,resolution_note:'Simulated damaged propeller was replaced.'});
    addAlert({...common,component_id:componentBy(e.droneId,'PROPELLER',e.faultPosition),rule_code:'PROPELLER_DAMAGE_SUSPECTED',severity:'CRITICAL',type:'PROPELLER_DAMAGE_SUSPECTED',message:`Suspected ${e.affectedArm.label} propeller damage: critical RPM imbalance and vibration occurred together.`,metric_name:'composite_propulsion_fault',status:isLatestPropellerIncident?'ACTIVE':'RESOLVED',resolved_at:resolvedAt,resolution_note:'Manual simulated inspection confirmed replacement and closed the alert.'});
  }
  if (['BATTERY_VOLTAGE_DROP','PROPELLER_DAMAGE','UNEXPECTED_OFFLINE'].includes(e.scenarioCode)) {
    addAlert({flight_id:e.flightId,mission_id:e.missionId,source:'SYSTEM',rule_code:'MISSION_FAILED',severity:'CRITICAL',type:'MISSION_FAILED',message:`Flight ${flights[e.flightId-1].flight_code} ended before completing the route: ${flights[e.flightId-1].termination_reason}`,status:isLatestPropellerIncident?'ACTIVE':'RESOLVED',detected_at:mysqlTime(e.end),last_observed_at:mysqlTime(e.end),resolved_at:isLatestPropellerIncident?null:resolvedAt,resolution_note:'Incident reviewed and historical mission record closed.'});
  }
}
for (const missionId of [3,4]) addAlert({mission_id:missionId,source:'ROUTE',rule_code:'RESTRICTED_FLIGHT_ZONE',severity:'CRITICAL',type:'RESTRICTED_FLIGHT_ZONE',message:missions[missionId-1].validation_message,status:'ACTIVE',detected_at:`2026-09-${pad(6+missionId,2)} 08:30:00.000`,last_observed_at:`2026-09-${pad(6+missionId,2)} 08:30:00.000`});
addAlert({mission_id:7,source:'WEATHER',rule_code:'UNSAFE_WEATHER',severity:'CRITICAL',type:'UNSAFE_WEATHER',message:'Expired demo snapshot represents unsafe thunderstorm, wind and visibility conditions; launch was blocked.',metric_name:'recommendation',status:'RESOLVED',detected_at:'2026-08-01 01:01:00.000',last_observed_at:'2026-08-01 01:01:00.000',resolved_at:'2026-08-01 02:00:00.000',resolution_note:'Demo validation run expired; a fresh check from the active weather mode is required.'});
addAlert({mission_id:6,source:'WEATHER',rule_code:'WEATHER_CAUTION',severity:'WARNING',type:'WEATHER_CAUTION',message:'Expired demo snapshot represents light rain and wind in the project caution range; operator acknowledgement was required.',metric_name:'recommendation',status:'RESOLVED',detected_at:'2026-08-01 01:01:00.000',last_observed_at:'2026-08-01 01:01:00.000',resolved_at:'2026-08-01 01:11:00.000',resolution_note:'Demo snapshot expired; a fresh check from the active weather mode is required.'});
writeJson('08-alerts/alert-rule-catalog.json', alertRuleCatalog);
writeJson('08-alerts/alerts.json', alerts);
writeText('08-alerts/seed.sql', sqlInsert('alert_rule_catalog', alertRuleCatalog) + '\n' + sqlInsert('alerts', alerts));

const fleetOverview = {
  version:VERSION,
  generatedAt:GENERATED_AT,
  purpose:'Derived read model for the Fleet UI. Normalize writes through drone_models, drones, component_catalog and drone_components.',
  drones:drones.map(drone=>({
    id:drone.id,
    drone_code:drone.drone_code,
    display_name:drone.display_name,
    serial_number:drone.serial_number,
    operational_state:{status:drone.status,last_known_latitude:drone.last_known_latitude,last_known_longitude:drone.last_known_longitude,location_source:drone.location_source,last_heartbeat_at:drone.last_heartbeat_at},
    model:droneModels.find(model=>model.id===drone.drone_model_id),
    installed_components:components.filter(component=>component.drone_id===drone.id).map(component=>({
      ...component,
      definition:componentCatalog.find(definition=>definition.id===component.component_catalog_id)
    })),
    runtime_scenario_pool:scenarioPool.filter(item=>item.drone_id===drone.id).map(item=>({
      ...item,
      scenario:scenarios.find(scenario=>scenario.id===item.simulation_scenario_id)
    })),
    demo_weather_profile:weatherDemoProfiles.find(profile=>profile.id===droneWeatherDemoAssignments.find(item=>item.drone_id===drone.id)?.weather_demo_profile_id),
    history_summary:{
      missions:missions.filter(mission=>mission.drone_id===drone.id).length,
      flights:flights.filter(flight=>flight.drone_id===drone.id).length,
      alerts:alerts.filter(alert=>alert.flight_id!==null&&flights.find(flight=>flight.id===alert.flight_id)?.drone_id===drone.id).length
    }
  }))
};
writeJson('02-fleet/fleet-overview.json', fleetOverview);
writeText('02-fleet/README.md', `
# Fleet data layout

This folder separates reusable definitions from operational instances, which keeps the structure clean when the fleet grows.

| File/table | Responsibility | Update pattern |
| --- | --- | --- |
| drone-models.json / drone_models | One reusable aircraft-model specification | Add once when a new hardware model is introduced |
| drones.json / drones | Individual aircraft identity and runtime state | Add one row per physical or simulated aircraft |
| component-catalog.json / component_catalog | The 14 reusable component definitions for this model | Change only when the model configuration changes |
| drone-components.json / drone_components | Installed component instances, serials and health per drone | Add 14 instances for each new drone; maintenance updates happen here |
| fleet-overview.json | Denormalized UI/read model joining all files above | Regenerate; do not use as the write source of truth |
| seed.sql | Importable normalized fleet rows | Run after 01-schema/schema.sql |

## Add Drone - 006 later

1. Add one drones row referencing an existing drone_model_id or first add a new model.
2. Add 14 drone_components rows referencing the existing component_catalog IDs; give every installed instance a unique serial number.
3. Add its weather demo assignment and, if appropriate, a weighted simulation-scenario pool.
4. Add missions first, then flights and telemetry. Never copy foreign-key IDs blindly.
5. Regenerate fleet-overview.json and run data-quality-report.json checks.

All five current drones intentionally boot OFFLINE. Browser/device geolocation is captured only when the user switches a drone ON; seed data therefore does not pretend that an offline drone has a live position.
`);

const tables = {
  data_pack_metadata:dataPackMetadata,
  drone_models:droneModels,
  drones,
  component_catalog:componentCatalog,
  drone_components:components,
  flight_zones:zones,
  simulation_scenarios:scenarios,
  drone_scenario_pool:scenarioPool,
  missions,
  waypoints,
  weather_runtime_config:weatherRuntimeConfig,
  weather_demo_profiles:weatherDemoProfiles,
  drone_weather_demo_assignments:droneWeatherDemoAssignments,
  weather_checks:weatherChecks,
  flights,
  telemetry,
  alert_rule_catalog:alertRuleCatalog,
  alerts
};
const counts = Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.length]));

const validation = {version:VERSION, generatedAt:GENERATED_AT, checks:[], statistics:{}};
const check = (name, passed, details) => validation.checks.push({name,passed,details});
check('Data pack identity is a valid singleton', dataPackMetadata.length===1&&dataPackMetadata[0].id===1&&dataPackMetadata[0].pack_version===VERSION&&dataPackMetadata[0].data_revision===DATA_REVISION&&dataPackMetadata[0].build_id===BUILD_ID, `build=${BUILD_ID}`);
check('Metadata declares the complete schema and telemetry size', dataPackMetadata[0].schema_table_count===Object.keys(tables).length&&dataPackMetadata[0].expected_telemetry_rows===telemetry.length, `${Object.keys(tables).length} tables; ${telemetry.length} telemetry rows`);
check('Schema defines each simulation_scenarios column once', (schema.match(/category ENUM\('NORMAL'/g)??[]).length===1, 'prevents duplicate-column import failure');
check('Legacy left-only propulsion scenario codes are absent', scenarios.every(s=>!['MOTOR_OVERHEAT_FL','PROPELLER_DAMAGE_FL'].includes(s.scenario_code)), 'generic scenario plus flights.fault_position is required');
check('Exactly five drones', drones.length===5, `count=${drones.length}`);
check('All drones boot offline with no fabricated current position', drones.every(d=>d.status==='OFFLINE'&&d.last_known_latitude===null&&d.last_known_longitude===null&&d.location_source==='UNKNOWN'), 'location is populated only when a drone is switched on');
check('New drone rows default to OFFLINE at database level', schema.includes("status ENUM('AVAILABLE','IN_FLIGHT','MAINTENANCE','OFFLINE') NOT NULL DEFAULT 'OFFLINE'"), 'omitting status cannot accidentally make a newly registered drone available');
check('Drone display names follow the required sequence', drones.every((d,i)=>d.display_name===`Drone - ${pad(i+1)}`), 'Drone - 001 through Drone - 005');
check('Each drone has the same 14-component quadcopter configuration', drones.every(d=>{
  const owned=components.filter(c=>c.drone_id===d.id);
  const catalogs=owned.map(c=>componentCatalog.find(def=>def.id===c.component_catalog_id));
  return owned.length===14&&catalogs.filter(c=>c?.component_type==='MOTOR').length===4&&catalogs.filter(c=>c?.component_type==='PROPELLER').length===4;
}), 'one 14-definition catalog × 5 drones = 70 installed component instances');
check('All foreign keys resolve', drones.every(d=>droneModels.some(m=>m.id===d.drone_model_id))&&components.every(c=>drones.some(d=>d.id===c.drone_id)&&componentCatalog.some(def=>def.id===c.component_catalog_id))&&telemetry.every(t=>flights.some(f=>f.id===t.flight_id))&&flights.every(f=>missions.some(m=>m.id===f.mission_id)&&scenarios.some(s=>s.id===f.simulation_scenario_id))&&scenarioPool.every(p=>drones.some(d=>d.id===p.drone_id)&&scenarios.some(s=>s.id===p.simulation_scenario_id))&&droneWeatherDemoAssignments.every(a=>drones.some(d=>d.id===a.drone_id)&&weatherDemoProfiles.some(p=>p.id===a.weather_demo_profile_id))&&alerts.every(a=>(a.flight_id===null||flights.some(f=>f.id===a.flight_id))&&(a.mission_id===null||missions.some(m=>m.id===a.mission_id))&&(a.component_id===null||components.some(c=>c.id===a.component_id))&&alertRuleCatalog.some(r=>r.rule_code===a.rule_code)), 'models/drones/catalog/components/missions/flights/telemetry/scenarios/weather/alerts');
check('Every alert matches its catalog definition', alerts.every(a=>{const rule=alertRuleCatalog.find(r=>r.rule_code===a.rule_code);return rule?.alert_type===a.type&&rule?.source===a.source&&rule?.default_severity===a.severity;}), 'rule_code controls type, source and default severity');
check('Runtime scenario weights total 100 for Drone - 001 through Drone - 004', [1,2,3,4].every(droneId=>scenarioPool.filter(p=>p.drone_id===droneId&&p.is_enabled).reduce((sum,p)=>sum+p.selection_weight,0)===100), 'Drone 001 normal; Drone 002 power; Drone 003 propulsion; Drone 004 connectivity');
check('Drone - 005 has no random in-flight fault pool', scenarioPool.every(p=>p.drone_id!==5), 'route and weather are evaluated before flight creation; an approved launch uses NORMAL');
check('Historical flights are evenly distributed across all five drones', drones.every(d=>flights.filter(f=>f.drone_id===d.id).length===4), '5 drones × 4 flights = 20');
check('Every flight belongs to the same drone as its mission', flights.every(f=>missions.find(m=>m.id===f.mission_id)?.drone_id===f.drone_id), 'mission and flight ownership match');
check('Historical flight scenarios follow each drone assignment', flights.every(f=>{
  const code=scenarios.find(s=>s.id===f.simulation_scenario_id)?.scenario_code;
  const allowed={1:['NORMAL'],2:['LOW_BATTERY','BATTERY_VOLTAGE_DROP','BATTERY_OVERHEAT'],3:['MOTOR_OVERHEAT','PROPELLER_DAMAGE'],4:['GPS_LOSS','SIGNAL_LOSS','UNEXPECTED_OFFLINE'],5:['NORMAL']};
  return allowed[f.drone_id]?.includes(code);
}), 'Drone 001 normal; 002 power; 003 propulsion; 004 navigation/communication; 005 normal after pre-flight approval');
check('Every flight fault position agrees with its scenario contract', flights.every(f=>{const scenario=scenarios.find(s=>s.id===f.simulation_scenario_id);const expected=scenario.affected_position==='NONE'?null:scenario.affected_position==='RUNTIME_SELECTED'?f.fault_position:scenario.affected_position;return f.fault_position===expected;}), 'fixed-position scenarios inherit their position; runtime-selected scenarios persist the chosen arm; normal/link scenarios remain null');
check('Flight alerts reference components owned by the same drone', alerts.filter(a=>a.flight_id!==null&&a.component_id!==null).every(a=>{
  const flight=flights.find(f=>f.id===a.flight_id);
  const component=components.find(c=>c.id===a.component_id);
  return flight?.drone_id===component?.drone_id;
}), 'battery, motor, propeller and GPS alerts resolve to the correct aircraft component');
check('Exactly 300 ordered telemetry rows per flight', flights.every(f=>telemetry.filter(t=>t.flight_id===f.id).length===300), '20 × 300 = 6,000');
check('Telemetry sequence numbers are complete for every flight', flights.every(f=>telemetry.filter(t=>t.flight_id===f.id).every((t,index)=>t.sequence_number===index+1)), 'sequence 1 through 300 per flight');
check('Telemetry timestamps within flight intervals', flights.every(f=>telemetry.filter(t=>t.flight_id===f.id).every(t=>t.recorded_at>=f.started_at&&t.recorded_at<=f.ended_at)), 'inclusive interval check');
check('GPS-loss samples expose only last-known positions', flights.filter(f=>scenarios.find(s=>s.id===f.simulation_scenario_id)?.scenario_code==='GPS_LOSS').every(f=>telemetry.filter(t=>t.flight_id===f.id&&t.gps_quality==='LOST').every(t=>t.position_is_valid===false&&t.position_source==='LAST_KNOWN')), 'Follow Drone must freeze while GNSS is unavailable');
check('Signal-loss samples are buffered without causing heartbeat timeout', flights.filter(f=>scenarios.find(s=>s.id===f.simulation_scenario_id)?.scenario_code==='SIGNAL_LOSS').every(f=>telemetry.filter(t=>t.flight_id===f.id&&t.signal_percent<=5).every(t=>t.transmission_state==='BUFFERED'&&t.received_at>t.recorded_at&&t.heartbeat_age_seconds<15)), 'history can replay buffered rows; live map waits for recovery');
check('Unexpected-offline flight ends after a telemetry gap', flights.filter(f=>scenarios.find(s=>s.id===f.simulation_scenario_id)?.scenario_code==='UNEXPECTED_OFFLINE').every(f=>{const last=telemetry.filter(t=>t.flight_id===f.id).at(-1);return f.status==='ABORTED'&&(new Date(f.ended_at.replace(' ','T')+'Z')-new Date(last.recorded_at.replace(' ','T')+'Z'))/1000>=15;}), 'last known position remains on the map');
check('Drone - 003 historical flights cover every propulsion arm', JSON.stringify(flights.filter(f=>f.drone_id===3).map(f=>f.fault_position).sort())===JSON.stringify(['FRONT_LEFT','FRONT_RIGHT','REAR_LEFT','REAR_RIGHT'].sort()), 'seed coverage is deterministic while runtime position selection remains random');
check('Drone - 003 runtime scenarios select their arm per flight', scenarios.filter(s=>['MOTOR_OVERHEAT','PROPELLER_DAMAGE'].includes(s.scenario_code)).every(s=>s.affected_position==='RUNTIME_SELECTED'&&s.parameters_json.allowedPositions.length===4), 'scenario template and flight fault position are separated');
check('Propulsion alerts point to the flight-selected arm', alerts.filter(a=>a.flight_id!==null&&['MOTOR_OVERHEAT','MOTOR_RPM_ANOMALY','EXCESSIVE_VIBRATION','PROPELLER_DAMAGE_SUSPECTED'].includes(a.type)).every(a=>{const flight=flights.find(f=>f.id===a.flight_id);const component=components.find(c=>c.id===a.component_id);const definition=componentCatalog.find(c=>c.id===component?.component_catalog_id);return flight?.drone_id===3&&definition?.position===flight?.fault_position;}), 'telemetry channel, alert component and fault_position agree');
check('Failed hardware flights stop away from home instead of simulating return-to-home', flights.filter(f=>['BATTERY_VOLTAGE_DROP','PROPELLER_DAMAGE'].includes(scenarios.find(s=>s.id===f.simulation_scenario_id)?.scenario_code)).every(f=>{const rows=telemetry.filter(t=>t.flight_id===f.id);return haversine(rows[0],rows.at(-1))>100;}), 'emergency landing position is retained');
check('Drone - 005 flights record acknowledged CAUTION weather', flights.filter(f=>f.drone_id===5).every(f=>f.preflight_weather_mode==='DEMO'&&f.preflight_weather_recommendation==='CAUTION'&&f.weather_acknowledged_at!==null), 'unsafe and restricted missions do not create flights');
check('Blocked Drone - 005 missions have no flight or telemetry', [3,4,7].every(missionId=>!flights.some(f=>f.mission_id===missionId)), 'restricted missions 3/4 and unsafe-weather mission 7 stop before take-off');
check('Alert lifecycle consistency', alerts.every(a=>(a.status==='ACTIVE'&&a.resolved_at===null)||(a.status==='RESOLVED'&&a.resolved_at!==null)), 'ACTIVE has no resolved_at; RESOLVED has resolved_at');
check('All seeded mission waypoints remain inside the expanded HCMC urban boundary', waypoints.every(w=>pointInPolygon(w,allowedUrbanPolygon)), '20 mission routes remain in ZONE-A01');
check('No safe mission intersects restricted rectangles', missions.filter(m=>m.validation_status==='VALID').every(m=>{const pts=waypoints.filter(w=>w.mission_id===m.id);return !restrictedRects.some(r=>pts.slice(1).some((p,i)=>segmentIntersectsRect(pts[i],p,r)));}), 'geometry test on all route segments');
check('Invalid missions intersect a restricted rectangle', missions.filter(m=>m.validation_status==='INVALID').every(m=>{const pts=waypoints.filter(w=>w.mission_id===m.id);return restrictedRects.some(r=>pts.slice(1).some((p,i)=>segmentIntersectsRect(pts[i],p,r)));}), 'geometry rejection fixtures');
check('Weather fixtures are expired and clearly labeled', weatherChecks.every(w=>w.source_kind==='SIMULATED_FIXTURE'&&w.expires_at<'2026-09-12 00:00:00'), 'cannot be reused for current take-off');
check('Demo weather is the only available project mode', weatherRuntimeConfig.length===1&&weatherRuntimeConfig[0].active_mode==='DEMO'&&weatherRuntimeConfig[0].demo_mode_status==='AVAILABLE', 'current project uses deterministic simulated weather');
check('Live Open-Meteo mode is prepared but marked coming soon', weatherRuntimeConfig[0].live_provider==='OPEN_METEO'&&weatherRuntimeConfig[0].live_mode_status==='COMING_SOON', 'UI must not allow LIVE selection yet');
check('Demo weather covers every drone deterministically', droneWeatherDemoAssignments.length===5&&drones.every(d=>droneWeatherDemoAssignments.filter(a=>a.drone_id===d.id).length===1), 'Drone 001–004 SAFE; Drone 005 CAUTION');
check('Demo weather assignment matches presentation plan', [1,2,3,4].every(id=>droneWeatherDemoAssignments.find(a=>a.drone_id===id)?.weather_demo_profile_id===1)&&droneWeatherDemoAssignments.find(a=>a.drone_id===5)?.weather_demo_profile_id===2, 'SAFE for Drone 001–004 and CAUTION for Drone 005');
check('Unsafe demo weather exists but cannot be overridden', weatherDemoProfiles.some(p=>p.profile_code==='DEMO_UNSAFE'&&p.recommendation==='UNSAFE')&&weatherRuntimeConfig[0].unsafe_can_be_overridden===false&&!droneWeatherDemoAssignments.some(a=>a.weather_demo_profile_id===3), 'reserved for blocked mission/history testing');
check('Every non-normal scenario used by historical flights produces an alert', scenarios.filter(s=>s.scenario_code!=='NORMAL'&&flights.some(f=>f.simulation_scenario_id===s.id)).every(s=>{const flightIds=flights.filter(f=>f.simulation_scenario_id===s.id).map(f=>f.id);return alerts.some(a=>flightIds.includes(a.flight_id));}), 'includes UNEXPECTED_OFFLINE heartbeat coverage');
check('Latest Drone - 003 propeller fault remains linked to its components', alerts.some(a=>a.flight_id===12&&a.type==='PROPELLER_DAMAGE_SUSPECTED'&&a.status==='ACTIVE')&&components.find(c=>c.id===componentBy(3,'PROPELLER','REAR_RIGHT')).health_status==='FAULT'&&components.find(c=>c.id===componentBy(3,'MOTOR','REAR_RIGHT')).health_status==='WARNING', 'rear-right propeller FAULT and motor WARNING; drone power state remains independently OFFLINE');
validation.statistics = {
  buildId:BUILD_ID,
  dataRevision:DATA_REVISION,
  counts,
  activeAlerts:alerts.filter(a=>a.status==='ACTIVE').length,
  resolvedAlerts:alerts.filter(a=>a.status==='RESOLVED').length,
  successfulFlights:flights.filter(f=>f.result==='SUCCESS').length,
  returnedSafelyFlights:flights.filter(f=>f.result==='RETURNED_SAFELY').length,
  failedFlights:flights.filter(f=>f.result==='FAILED').length,
  telemetryIntervalSeconds:2,
  minTelemetryTime:telemetry[0].recorded_at,
  maxTelemetryTime:telemetry.at(-1).recorded_at
};
validation.passed = validation.checks.every(c=>c.passed);
writeJson('data-quality-report.json', validation);

writeText('00-overview/FINAL_DATA_AUDIT.md', `
# Final data audit — v${VERSION}

Build: ${BUILD_ID}  
Automated result: **${validation.passed ? 'PASS' : 'FAIL'}** (${validation.checks.filter(c=>c.passed).length}/${validation.checks.length} checks)  
Scope: deterministic project/demo fixtures prepared for backend integration. This is not certified flight, airspace, weather or maintenance data.

## Table-by-table contract

| Table | Rows | Purpose | Data basis | Backend use and key link |
| --- | ---: | --- | --- | --- |
| data_pack_metadata | ${counts.data_pack_metadata} | Identifies the installed release | Release metadata | Query first; no business FK |
| drone_models | ${counts.drone_models} | Shared aircraft reference envelope | Public DJI reference adapted to a fictional simulated model | drones.drone_model_id |
| drones | ${counts.drones} | Fleet identities and power/location state | Project fixture | All five boot OFFLINE; runtime ON captures authorized geolocation |
| component_catalog | ${counts.component_catalog} | Reusable 14-part quadcopter layout | Project domain model | Four motors, four propellers and six shared systems |
| drone_components | ${counts.drone_components} | Installed serialized parts and health | Synthetic fixture | 14 rows per drone; alerts may point to a part |
| flight_zones | ${counts.flight_zones} | One allowed HCMC demo boundary and seven restrictions | Synthetic demo geometry | Route gate; never treat as official airspace |
| simulation_scenarios | ${counts.simulation_scenarios} | Reusable normal/fault recipes | Project simulation policy | Selected at flight creation; propulsion arm stays generic here |
| drone_scenario_pool | ${counts.drone_scenario_pool} | Weighted per-drone runtime choices | Approved demo design | Drone 001–004 weights total 100; Drone 005 has no fault pool |
| missions | ${counts.missions} | Route plans and validation lifecycle | Synthetic fixture | One mission may have multiple flight attempts |
| waypoints | ${counts.waypoints} | Ordered route geometry | Synthetic fixture | mission_id plus sequence_number |
| weather_runtime_config | ${counts.weather_runtime_config} | Selects DEMO now and LIVE later | Project policy | DEMO available; Open-Meteo LIVE marked COMING_SOON |
| weather_demo_profiles | ${counts.weather_demo_profiles} | Deterministic SAFE/CAUTION/UNSAFE values | Synthetic fixture evaluated by project thresholds | Avoids presentation failure caused by real weather |
| drone_weather_demo_assignments | ${counts.drone_weather_demo_assignments} | Maps each drone to a demo profile | Approved demo design | Drone 001–004 SAFE; Drone 005 CAUTION |
| weather_checks | ${counts.weather_checks} | Example route snapshots | Expired synthetic fixture | Must be regenerated for submitted coordinates; never authorizes current launch |
| flights | ${counts.flights} | Historical mission attempts | Synthetic fixture | Four per drone; stores scenario and concrete fault_position |
| telemetry | ${counts.telemetry} | Position, power, propulsion, health and link samples | Physically plausible synthetic time series | 300 rows per flight at two-second intervals |
| alert_rule_catalog | ${counts.alert_rule_catalog} | Stable incident definitions | Project simulation/lifecycle policy | Drives type, source and default severity |
| alerts | ${counts.alerts} | Historical incident lifecycles | Derived from seeded scenarios/telemetry and preflight gates | Links mission/flight and optionally installed component |

## Cross-table decisions verified

- Fleet: exactly five drones named Drone - 001 through Drone - 005; every one starts OFFLINE without a fabricated current position.
- Hardware: every drone owns the same 14 components. Drone - 003 history covers FRONT_LEFT, FRONT_RIGHT, REAR_LEFT and REAR_RIGHT; telemetry channel, alert component and flight.fault_position agree.
- Operations: twenty missions, ninety waypoints, twenty flights and exactly 6,000 telemetry samples remain relationally consistent.
- Drone roles: 001 normal; 002 battery/power; 003 motor/propeller; 004 GPS/signal/unexpected offline; 005 route/weather preflight gate.
- Weather: CAUTION requires acknowledgement, UNSAFE blocks, restricted/outside-boundary routes block before flight creation. LIVE/Open-Meteo is prepared but unavailable in this release.
- Live map: moves only on delivered valid positions; GPS/heartbeat loss freezes the last-known marker; buffered samples belong to history.
- Demo coverage: seeded history guarantees visible examples; runtime weighted selection may remain random without risking an empty presentation.

## Known boundaries

- Thresholds are deliberate project simulation policy, not manufacturer-certified limits.
- Flight-zone polygons are presentation fixtures and cannot be used for legal flight authorization.
- Telemetry wind is visually consistent with demo weather but does not apply wind-vector drift physics.
- A future production release must enable and test live weather, ingest real aircraft telemetry, use authoritative airspace sources and add operational safety controls.

## Import acceptance signature

After import, data_pack_metadata must return version **${VERSION}**, revision **${DATA_REVISION}**, build **${BUILD_ID}**; telemetry must return **6,000** rows; legacy MOTOR_OVERHEAT_FL and PROPELLER_DAMAGE_FL scenario rows must return **0**.
`);

const context = `
# Domain Context

| Term | Meaning in this project |
| --- | --- |
| Data pack identity | The singleton release signature stored in MySQL so developers can prove which pack and revision were imported. |
| Drone model | A reusable aircraft specification shared by multiple fleet instances. |
| Drone | One simulated aircraft instance with its own identity and operational state. |
| Component definition | A reusable description of a component type and position in the model configuration. |
| Installed component | A serialized component instance owned by one drone, with its own health and maintenance state. |
| Home location | The drone's fixed operational base. It does not move when the drone travels. |
| Last-known location | The newest coordinates reported for a drone. While the drone is OFFLINE this may be absent or stale; the UI may call it “current location” only while the drone is online and the snapshot is fresh. |
| Power switch | The user action that changes an OFFLINE simulated drone to AVAILABLE and captures the browser's current geolocation as the drone's starting position. |
| Mission | A planned route and its planning/validation lifecycle. It is not a flight attempt. |
| Flight | One execution attempt of a mission. A mission can have retries and therefore multiple flights. |
| Waypoint | An ordered route coordinate belonging to exactly one mission. |
| Telemetry sample | One timestamped flight observation containing position, energy, propulsion, environment and link-health values. |
| Position validity | Whether a telemetry coordinate is a current GNSS position or only the retained last-known position. |
| Transmission state | Whether a telemetry sample arrived live, arrived after degradation, was buffered, or was not delivered. |
| Flight zone | Demo-only GeoJSON used to exercise route validation. It is not official airspace data. |
| Weather check | A short-lived snapshot for a specific route location and validation run. New coordinates require a new backend API call. |
| Weather mode | The source context for a weather check. DEMO is available in the current project; LIVE/Open-Meteo is a planned mode marked Coming Soon. |
| Demo weather profile | A reusable simulated weather condition used only when Weather mode is DEMO. |
| Simulation scenario | A reusable normal or fault recipe that changes telemetry or connectivity during a flight. |
| Fault position | The concrete component position selected for one flight from a scenario template that supports runtime position selection. |
| Scenario pool | The weighted set of in-flight fault scenarios for Drone - 001 through Drone - 004. Drone - 005 instead receives a normal flight only after route and weather approval. |
| Alert rule | A catalog definition connecting a stable rule code to an alert type, source, severity and meaning. |
| Alert | A lifecycle event produced by a rule; repeated bad samples update one ACTIVE alert instead of creating duplicates. |
| Component health | Current maintenance state. It changes only after an incident or explicit inspection, not on every telemetry sample. |
`;
writeText('CONTEXT.md', context);

writeText('00-overview/PACKAGE_LAYOUT.md', `
# Package layout

| Folder | Contents | Primary consumer |
| --- | --- | --- |
| 00-overview | Final audit, dictionary, relationships, scenario matrix and runtime invariants | Entire team |
| 01-schema | MySQL tables, release metadata, constraints and indexes | Backend/database |
| 02-fleet | Models, five drones, component definitions and installed components | Fleet and maintenance UI |
| 03-airspace | One allowed HCMC demo boundary and seven restricted demo polygons | Mission validation/map |
| 04-missions | Twenty mission plans and ninety ordered waypoints | Mission planner |
| 05-weather | Runtime mode, deterministic profiles, assignments, policy and expired examples | Pre-flight service |
| 06-simulation | Nine fault recipes, per-drone weighted pools and health rules | Simulator/alert engine |
| 07-flight-operations | Twenty attempts and 6,000 telemetry samples | Live Flight/history |
| 08-alerts | Extensible rule catalog and twenty-four alert instances | Alert center |
| 09-backend-guidance | Processing flows and import/reset instructions | Backend developer |
| database | Docker auto-import plus post-import verification SQL | Local development/database |

JSON files are convenient fixtures and API examples. SQL files are the normalized import source. fleet-overview.json is a derived UI view, not a writable master record.
`);

writeText('00-overview/DATA_DICTIONARY.md', `
# Data dictionary

## Release identity

| Entity | Primary key | Important fields | Meaning |
| --- | --- | --- | --- |
| data_pack_metadata | id | pack_version, data_revision, build_id, expected_telemetry_rows | Singleton proof of the imported release; query this before debugging seed contents |

## Fleet

| Entity | Primary key | Important fields | Meaning |
| --- | --- | --- | --- |
| drone_models | id | model_code, manufacturer_reference, maximum values | Reusable reference specification |
| drones | id | drone_code, display_name, status, last_known_*, location_source | One aircraft instance; all five boot OFFLINE without fake live coordinates |
| component_catalog | id | component_code, component_type, position | The shared 14-part quadcopter configuration |
| drone_components | id | drone_id, component_catalog_id, serial_number, health_status | Per-drone installed part and maintenance health |

## Planning and environment

| Entity | Primary key | Important fields | Meaning |
| --- | --- | --- | --- |
| flight_zones | id | zone_type, geometry, is_active | Synthetic demo boundary/restrictions; not official airspace |
| missions | id | drone_id, status, validation_status, planned_distance_m | Route plan, not an execution |
| waypoints | id | mission_id, sequence_number, latitude, longitude, altitude_m | Ordered mission geometry |
| weather_runtime_config | id | active_mode, demo_mode_status, live_mode_status | DEMO available; LIVE/Open-Meteo Coming Soon |
| weather_demo_profiles | id | recommendation and normalized measurements | Reusable SAFE/CAUTION/UNSAFE fixtures |
| drone_weather_demo_assignments | id | drone_id, weather_demo_profile_id | Deterministic demo mapping |
| weather_checks | id | validation_run_id, mission_id, location_type, expires_at | Short-lived route snapshots; seeded examples are expired |

## Runtime and incidents

| Entity | Primary key | Important fields | Meaning |
| --- | --- | --- | --- |
| simulation_scenarios | id | scenario_code, fault window, effect configuration | Reusable flight behavior recipe |
| drone_scenario_pool | id | drone_id, simulation_scenario_id, selection_weight | Runtime random pool; enabled weights total 100 per Drone 001–004 |
| flights | id | mission_id, drone_id, scenario_id, fault_position, result, weather decision | One mission execution attempt; propulsion position belongs to the attempt, not the reusable scenario |
| telemetry | id | flight_id, sequence_number, recorded_at, received_at | Two-second flight observations; 300 per seeded flight |
| alert_rule_catalog | rule_code | alert_type, source, severity, authority | Extensible rule/type registry; avoids a rigid alert-type enum |
| alerts | id | rule_code, owner IDs, metric, threshold, lifecycle times | One incident lifecycle, not one row per bad sample |

## Live-map fields

| Field | Interpretation |
| --- | --- |
| recorded_at | Time the simulated aircraft produced the sample |
| received_at | Time the backend received it; use this to decide what can be shown live |
| position_is_valid | false means do not move the marker to that row |
| position_source | GNSS, LAST_KNOWN or ESTIMATED |
| transmission_state | CONNECTED, DEGRADED, LOST or BUFFERED |
| heartbeat_age_seconds | Backend liveness indicator, distinct from signal percentage |
| wind_source | Provenance of the telemetry wind field |
`);

writeText('00-overview/RELATIONSHIPS.md', `
# Relationships

\`\`\`mermaid
erDiagram
  DRONE_MODELS ||--o{ DRONES : describes
  DRONES ||--o{ DRONE_COMPONENTS : owns
  COMPONENT_CATALOG ||--o{ DRONE_COMPONENTS : defines
  DRONES ||--o{ MISSIONS : plans
  MISSIONS ||--|{ WAYPOINTS : contains
  MISSIONS ||--o{ FLIGHTS : attempted_as
  SIMULATION_SCENARIOS ||--o{ FLIGHTS : drives
  FLIGHTS ||--|{ TELEMETRY : emits
  ALERT_RULE_CATALOG ||--o{ ALERTS : classifies
  FLIGHTS ||--o{ ALERTS : produces
\`\`\`

- A route or weather alert can belong to a mission before any flight exists.
- A telemetry alert may optionally point to the affected installed component.
- One mission may be retried, so it can own multiple flights.
- Only one active flight per drone should be enforced transactionally by the backend.
`);

writeText('00-overview/SCENARIO_MATRIX.md', `
# Presentation scenario matrix

| Drone | Runtime random pool | Demo weather | Seed history demonstrates | Expected outcome |
| --- | --- | --- | --- | --- |
| Drone - 001 | NORMAL 100% | SAFE | Successful baseline | SUCCESS |
| Drone - 002 | Low battery 35%; voltage drop 30%; battery overheat 35% | SAFE | Battery reserve, voltage and thermal faults | Return safely or fail by scenario |
| Drone - 003 | Motor overheat 50%; propeller damage 50%; then choose one of four arms | SAFE | Four flights cover front-left, front-right, rear-left and rear-right | Return or abort; latest rear-right part fault remains active |
| Drone - 004 | GPS loss 35%; signal loss 35%; unexpected offline 30% | SAFE | Frozen last-known marker, buffered link recovery and heartbeat timeout | Return safely or abort |
| Drone - 005 | No random in-flight fault | CAUTION | User weather confirmation followed by normal flight | Launch only after acknowledgement |

Restricted-route and UNSAFE-weather cases are pre-flight blocks: they create no flight and no telemetry. DEMO_UNSAFE remains available as a dedicated blocked-launch fixture. Historical seed rows guarantee that all important UI errors remain visible even when future runtime selection is random.
`);

writeText('00-overview/RUNTIME_INVARIANTS.md', `
# Runtime invariants

- OFFLINE is a normal power state. DRONE_OFFLINE is an incident only when an online/in-flight drone unexpectedly misses its heartbeat.
- Switching a drone ON changes it to AVAILABLE and captures an authorized device/browser location; seed data does not contain a fabricated current location.
- Route validation runs before weather. Outside the allowed demo boundary or intersecting an active restricted polygon always blocks launch.
- A VALID mission only means route geometry passed. Weather still must be fresh and evaluated immediately before flight creation.
- Weather checks expire after ten minutes. CAUTION requires explicit acknowledgement; UNSAFE cannot be overridden.
- DEMO weather is visibly simulated. LIVE/Open-Meteo must remain disabled while its status is COMING_SOON and must never silently fall back to DEMO.
- The Live Map moves only from delivered, valid positions. GPS loss or heartbeat loss freezes the marker at the last-known coordinate.
- Buffered telemetry belongs in history after receipt; it must not be rendered retroactively as if it were the current live position.
- Drone - 003 first selects a propulsion scenario and then independently selects one of four arm positions. Telemetry, alerts and component health must all reference that same flight fault_position.
- Suspected propeller damage requires manual inspection. Metric recovery alone does not restore component health.
`);

writeText('00-overview/REQUIREMENTS_TRACEABILITY.md', `
# Requirements traceability

This matrix records the approved decisions that the generated data must continue to satisfy.

| Approved requirement | Implemented by | Validation/evidence |
| --- | --- | --- |
| Five drones named Drone - 001 through Drone - 005 | drones | Exact name-sequence check |
| Every drone boots OFFLINE with no fabricated live coordinate | drones; schema default | OFFLINE/location-null check |
| ON captures authorized current geolocation and changes to AVAILABLE | runtime guidance; location_source fields | Runtime invariant |
| Every drone owns the same 14-component configuration | component_catalog; drone_components | 14 × 5 = 70 check |
| HCMC urban demo boundary plus seven restricted polygons | flight_zones | Waypoint and intersection checks |
| Outside allowed or intersecting restricted always blocks | mission validation guidance | Invalid route fixtures create no flight |
| Mission and waypoint structures remain stable | missions; waypoints | 20 missions and 90 ordered waypoints |
| Drone 001 normal baseline | drone_scenario_pool | NORMAL 100% |
| Drone 002 battery/power faults | scenario pool; telemetry; alerts | Low battery, voltage sag and overheat history |
| Drone 003 propulsion faults with random four-arm position | generic scenarios; flights.fault_position | Seed covers all four arms and alert/component matching |
| Drone 004 GPS, signal and unexpected heartbeat loss | scenarios; telemetry; alerts | Last-known, buffer and timeout checks |
| Drone 005 route/weather gate before flight | missions; weather config/checks; alerts | Restricted/UNSAFE create no flight; CAUTION is acknowledged |
| Random runtime selection plus guaranteed presentation coverage | scenario pool plus historical seed flights | Pool weights and scenario coverage checks |
| DEMO weather available; Open-Meteo Coming Soon | weather_runtime_config | Mode-status checks |
| Drone 001–004 SAFE and Drone 005 CAUTION in demo | demo assignments | Deterministic assignment check |
| CAUTION requires confirmation; UNSAFE cannot be overridden | flights constraint; runtime config | Weather acknowledgement and block checks |
| Live Map follows delivered valid telemetry | telemetry delivery/position fields | GPS freeze and signal-buffer checks |
| Weather does not physically divert the MVP route | simulator guidance | Wind provenance only |
| Alert thresholds are project policy, not certified limits | health-alert-rules; weather-policy; SOURCES | Authority/disclaimer fields |
`);

writeText('09-backend-guidance/mission-weather-flow.md', `
# Mission weather flow

## Mode selection

Read the singleton weather_runtime_config row before validating weather. The current project seeds active_mode = DEMO, demo_mode_status = AVAILABLE, and live_mode_status = COMING_SOON.

The UI exposes DEMO as the usable option. It may display LIVE — Open-Meteo as a disabled option with a Coming Soon badge, but the backend must reject attempts to activate a mode whose status is not AVAILABLE.

The UI must show the configured “DEMO MODE — SIMULATED WEATHER” banner while DEMO is active. Every stored result still records source_kind, so simulated and real snapshots cannot be confused.

## Shared route flow

1. Frontend sends the selected drone, A/B coordinates, and optional intermediate waypoints.
2. Backend validates coordinate ranges, waypoint order, the allowed demo boundary, and intersections with active restricted polygons.
3. Backend samples START, ROUTE_MIDPOINT, and DESTINATION. For a longer future route, add intermediate samples.
4. Normalize the samples under one UUID validation_run_id, apply weather-policy.json, and store snapshots with expires_at = checked_at + 10 minutes.
5. Use the worst sampled result: UNSAFE blocks launch without override; CAUTION requires explicit user confirmation; SAFE allows launch.

## LIVE mode — Coming Soon

The request contract is prepared for future development, but this mode is disabled in the current project. When implemented, call Open-Meteo from Express, never from the browser as the source of truth. Request current temperature_2m, relative_humidity_2m, precipitation, rain, weather_code, wind_speed_10m, wind_direction_10m and wind_gusts_10m; request hourly visibility and wind_speed_80m when required by the project policy. Set wind_speed_unit=ms and timezone=UTC.

Example endpoint:

GET https://api.open-meteo.com/v1/forecast?latitude=10.7769&longitude=106.7009&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=visibility,wind_speed_80m&wind_speed_unit=ms&timezone=UTC&forecast_days=1

Future LIVE snapshots use source_kind = OPEN_METEO. Immediately before take-off, refresh expired snapshots. If the provider is unavailable, report weather unavailable and block take-off; never silently fall back to DEMO.

## DEMO mode — presentation path

Load the selected drone's assignment and its enabled weather_demo_profile. Generate fresh weather_checks for the actual submitted route coordinates with source_kind = SIMULATED_FIXTURE and the profile values:

- Drone - 001 through Drone - 004: DEMO_SAFE.
- Drone - 005: DEMO_CAUTION, so the warning-and-confirmation flow is always visible.
- DEMO_UNSAFE remains available for a dedicated blocked-mission/history test and is not assigned by default.

The nine pre-seeded weather rows remain expired historical UI/test fixtures. Do not reuse them for current authorization. Historical telemetry wind is also simulated and is never a substitute for a pre-flight weather check.
`);

writeText('09-backend-guidance/simulation-and-alert-engine.md', `
# Simulation and alert engine

## Runtime loop

Every two seconds, load the selected scenario, compute the next route position, generate internally consistent flight/energy/health fields, save one telemetry row, then evaluate health-alert-rules.json in the same logical cycle.

At flight creation, randomly select from the enabled weighted pool for that drone and persist the chosen simulation_scenario_id on the flight. Drone - 001 always selects NORMAL; Drone - 002 selects a power fault; Drone - 003 selects a propulsion/thermal fault; Drone - 004 selects a navigation/communication fault. Drone - 005 has no random in-flight fault pool: route and weather are evaluated first, and a launch accepted after CAUTION uses NORMAL.

For Drone - 003, scenario selection and component-position selection are separate. After selecting MOTOR_OVERHEAT or PROPELLER_DAMAGE, choose FRONT_LEFT, FRONT_RIGHT, REAR_LEFT or REAR_RIGHT with equal probability and persist it as flights.fault_position. Use that one value to select the telemetry RPM/temperature channel, alert component_id and final component-health update. Do not encode a permanent arm in the reusable scenario code.

Random runtime selection is not the mechanism that guarantees demo coverage. Historical seed flights must contain at least one example of every enabled fault so Alerts and Flight History always show the complete catalog even if future random draws repeat. The four Drone - 003 seed flights deliberately cover front-left, front-right, rear-left and rear-right once each.

For each rule, count consecutive bad samples. When the count reaches the threshold, upsert by (flight_id, rule_code, ACTIVE): create one alert or update its last_observed_at and worst observed value. Do not create a new row every two seconds.

Recovery uses a separate threshold and more consecutive samples (hysteresis) to prevent alert flicker. PROPELLER_DAMAGE_SUSPECTED is manual-resolution-only. When a critical flight fault fires, change flight state to RETURNING or ABORTED, record the reason, and end with RETURNED_SAFELY or FAILED.

## Correct interpretation of simulated hardware data

- Motor RPM is a plausible synthetic signal for dashboard behavior; it is not reverse-engineered DJI telemetry.
- An RPM difference alone does not prove a broken propeller. This package emits “suspected damage” only when critical RPM imbalance and excessive vibration coexist.
- Battery percent and voltage are different signals. A voltage-sag scenario can be critical before percent reaches zero.
- Temperature alerts require consecutive samples; one spike should not generate an incident.
- Historical Flight 12 leaves Drone - 003's rear-right propeller in FAULT and its rear-right motor in WARNING. Earlier seed flights exercise the other three arms. All five drone power states still boot OFFLINE because power state and component health are independent.

## Live Flight map contract

Query telemetry by received_at, not only recorded_at. At playback time T, the frontend may consume only rows whose received_at <= T.

- Move the marker only when position_is_valid = true and position_source = GNSS or ESTIMATED.
- During GPS loss, retain the previous coordinate and label it Last known location. Do not follow changing coordinates from an invalid row.
- During SIGNAL_LOSS, rows marked BUFFERED arrive after recovery. Store/replay them in history, but do not jump the live marker through old points as though they were current.
- During UNEXPECTED_OFFLINE, the stream ends and heartbeat_age_seconds reaches the backend timeout. Freeze the marker and show DRONE_OFFLINE.
- FAILED hardware flights stop at their final emergency coordinate. RETURNED_SAFELY flights follow the generated return segment back toward the start.
- Follow Drone is therefore a camera behavior around the newest delivered valid coordinate; it does not calculate a route and it does not depend on having every HCMC coordinate in advance.

The telemetry wind fields are derived from the assigned simulated weather profile for visual consistency. This MVP does not implement wind-vector physics or coordinate drift; route position changes come from the scenario engine only.
`);

writeText('09-backend-guidance/import-and-reset.md', `
# Clean import and verification

## Recommended isolated Docker import

docker compose up -d

This release uses container drone-monitoring-mysql-v20 and volume drone_mysql_v20_data. They are deliberately different from v1.0, so an old initialized volume cannot suppress the new init script.

## Manual MySQL import

mysql -u root -p < all-data.sql

The script drops and recreates every pack-owned table inside drone_monitoring, then seeds v2.0.0. Back up any data you need before running it.

## Mandatory acceptance check

mysql -u root -p drone_monitoring < database/verify-import.sql

The first result must be version 2.0.0, revision 1 and build DRONE-DATA-2.0.0-R1-20260919. The verification summary must report five drones, seventy installed components, twenty missions, ninety waypoints, twenty flights, 6,000 telemetry rows and twenty-four alerts. legacy_left_only_scenarios must be zero.

If MySQL still shows MOTOR_OVERHEAT_FL or PROPELLER_DAMAGE_FL, the application is connected to another server/database or a separate backend migration/seed is re-inserting old rows. Run SELECT DATABASE(), @@hostname, @@port together with the metadata query before changing data again.

## Development reset

docker compose down -v
docker compose up -d

The first command deletes only this Compose project's named development volume. It is destructive to that local demo database, so do not use it for data you need to retain.
`);

writeText('09-backend-guidance/id-and-code-generation.md', `
# ID and display-code generation

Numeric id columns are internal primary keys generated by MySQL AUTO_INCREMENT. Users never enter or predict them. Readable codes are generated by the backend and protected by UNIQUE constraints.

Recommended runtime formats:

- Mission: MSN-YYYYMMDD-000021
- Flight: FLT-YYYYMMDD-000035
- Alert: ALT-YYYYMMDD-000108

Create the row transactionally, read MySQL insertId, format the public code from that id, update the row and return both values. Never use SELECT MAX(id) + 1 because concurrent requests can produce duplicates. The short MSN-001, FLT-001 and ALT-001 codes in this pack are deterministic historical fixtures, not a requirement for runtime code generation.

validation_run_id is different: generate a UUID before inserting the START, ROUTE_MIDPOINT and DESTINATION weather snapshots so one validation run can group all samples.
`);

writeText('CHANGELOG.md', `
# Changelog

## v2.0.0 — expanded data release (2026-09-19)

- Added a queryable data_pack_metadata release signature and unique build ID to expose stale imports immediately.
- Added database/verify-import.sql and a clean-import checklist with explicit expected results.
- Added a final per-table audit covering ownership, source classification, backend role and row counts.
- Assigned a new Docker container and named volume so v1.0 data cannot be silently reused.
- Rechecked the five-drone scenario contract, all four propulsion arms, weather gating, telemetry and alert/component links.

- Preserved five OFFLINE drones, 14 components per drone, expanded HCMC demo boundary, mission/waypoint data, weather modes, 20 flights, 6,000 telemetry rows and the agreed alert coverage.
- Changed the database default for a newly inserted drone from AVAILABLE to OFFLINE.
- Replaced FRONT_LEFT-specific propulsion scenarios with reusable MOTOR_OVERHEAT and PROPELLER_DAMAGE templates.
- Added flights.fault_position so a flight records the selected arm independently from the scenario template.
- Updated Drone - 003 seed history to cover all four arms and made telemetry channels, alerts and component health follow the selected arm.
- Added requirements traceability and backend guidance for ID/display-code generation.
`);

const sources = `
# Sources and modeling notes

- DJI Mavic 3 Enterprise official specifications: https://enterprise.dji.com/mavic-3-enterprise/specs
  - Used only for the fictional drone's high-level reference envelope: 45-minute published no-wind maximum flight time, 15 m/s normal-mode maximum speed, 12 m/s published wind resistance, 5000 mAh / 15.4 V / 17.6 V / 4S battery values.
- Open-Meteo forecast API documentation: https://open-meteo.com/en/docs
  - Defines the runtime weather fields, units, WMO codes, and available 10 m / 80 m wind variables.
- PX4 safety documentation: https://docs.px4.io/main/en/config/safety#battery-failsafes
  - Used only for the general idea that battery failsafe levels and actions are configurable. This pack does not copy PX4 numeric settings.
- Leaflet reference: https://leafletjs.com/reference.html
- OpenStreetMap tile usage policy: https://operations.osmfoundation.org/policies/tiles/

## Evidence classification

| Classification | Included data |
| --- | --- |
| Source-backed reference | Reference aircraft envelope and battery specifications; Open-Meteo field names, units and WMO meanings; general configurable failsafe concept |
| Project simulation policy | All SAFE/CAUTION/UNSAFE decisions and every battery, voltage, temperature, RPM, vibration, signal, heartbeat and recovery threshold |
| Synthetic fixture | All routes, zones, weather values, telemetry, faults, alerts, mission history and component serial numbers |

The dataset is designed for a reliable project demonstration. It is not official airspace data, real observation history, maintenance guidance, legal flight authorization or safety certification.
`;
writeText('SOURCES.md', sources);

const manifest = {
  packageName:'Drone Monitoring Platform Data Pack', version:VERSION, dataRevision:DATA_REVISION, buildId:BUILD_ID, generatedAt:GENERATED_AT,
  compatibility:{database:'MySQL 8.0+',coordinateConvention:{columns:'latitude, longitude',geojson:'longitude, latitude'},telemetryIntervalSeconds:2},
  counts, importOrder:['01-schema/schema.sql','01-schema/metadata-seed.sql','02-fleet/seed.sql','03-airspace/seed.sql','06-simulation/seed.sql','04-missions/seed.sql','05-weather/seed.sql','07-flight-operations/seed.sql','08-alerts/seed.sql'],
  importantNotes:['All five drones boot OFFLINE and receive a starting position only when switched ON.','Drone - 003 propulsion scenario and four-arm position are selected separately; historical seeds cover all four arms.','DEMO weather is available for the current project; LIVE/Open-Meteo is configured but marked COMING_SOON.','Weather seed rows are expired SIMULATED_FIXTURE records.','Flight zones are DEMO_ONLY.','Health thresholds are project simulation policy.'],
  validationPassed:validation.passed
};
writeJson('manifest.json', manifest);

const countTableRows = Object.entries(counts).map(([k,v])=>`| ${k} | ${v.toLocaleString('en-US')} |`).join('\n');
writeText('README.md', `
# Drone Monitoring Platform — Data Pack v${VERSION}

This is a deterministic MySQL data pack for a five-drone dashboard. Each drone owns the same 14-component hardware configuration. The 20 historical flights are distributed evenly across the fleet while respecting each drone's assigned scenario category.

Release identity: **${BUILD_ID}**. After every import, query data_pack_metadata before inspecting any scenario or component row. This makes an old database/volume immediately visible.

## Included data

| Entity | Rows |
| --- | ---: |
${countTableRows}

## What is improved

- Mission distance is calculated from waypoint geometry using Haversine distance.
- Telemetry follows route distance, uses exact two-second timestamps, and matches flight start/end times.
- Four motor RPM and temperature channels, battery voltage/current/temperature, vibration, flight-controller temperature, vertical speed, GPS and signal are included.
- Nine reusable scenarios cover normal flight, power, thermal, propulsion, navigation, communication and unexpected heartbeat loss.
- Weighted scenario pools keep runtime selection random inside each drone's assigned fault category.
- Drone - 003 independently selects one of four arm positions after selecting its propulsion scenario; seeded history covers every arm and persists the choice on the flight.
- Historical flights are split evenly at four per drone: Drone 001 normal, Drone 002 power faults, Drone 003 propulsion faults, Drone 004 navigation/communication faults, and Drone 005 normal after route/weather approval.
- Alerts are derived from the actual simulated telemetry event window and include affected component, metric, observed value, threshold and lifecycle.
- DEMO is the available weather mode for this project and provides deterministic SAFE, CAUTION, and UNSAFE profiles.
- LIVE/Open-Meteo has a prepared request contract but is disabled and labeled Coming Soon.
- Drone - 001 through Drone - 004 use DEMO_SAFE; Drone - 005 uses DEMO_CAUTION. DEMO_UNSAFE is reserved for a blocked-launch test.
- Seeded historical weather checks are explicitly expired and cannot authorize a current take-off.
- Wind stored in historical telemetry is simulated and is never used as the source of truth for a new mission's take-off decision.
- Data-quality checks verify foreign keys, route geometry, telemetry counts/times, scenario alert coverage and current state.

## Fastest import

docker compose up -d

Or run mysql -u root -p < all-data.sql. Then run mysql -u root -p drone_monitoring < database/verify-import.sql. Both methods target a local database named drone_monitoring.

Read 00-overview/FINAL_DATA_AUDIT.md, CONTEXT.md, and 09-backend-guidance/import-and-reset.md first. The package is project/demo data, not an operational aviation system.
`);

writeText('.env.example', `MYSQL_ROOT_PASSWORD=drone_root_password\nMYSQL_DATABASE=drone_monitoring\nMYSQL_USER=drone_app\nMYSQL_PASSWORD=drone_app_password`);
writeText('docker-compose.yml', `
services:
  mysql:
    image: mysql:8.4
    container_name: drone-monitoring-mysql-v20
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD:-drone_root_password}
      MYSQL_DATABASE: \${MYSQL_DATABASE:-drone_monitoring}
      MYSQL_USER: \${MYSQL_USER:-drone_app}
      MYSQL_PASSWORD: \${MYSQL_PASSWORD:-drone_app_password}
    ports:
      - "3306:3306"
    volumes:
      - drone_mysql_v20_data:/var/lib/mysql
      - ./database/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p$\${MYSQL_ROOT_PASSWORD}"]
      interval: 5s
      timeout: 5s
      retries: 20
volumes:
  drone_mysql_v20_data:
`);

fs.writeFileSync(path.join(ROOT, 'tools/generate-data.mjs'), GENERATOR_SOURCE);
writeText('tools/README.md', `
# Regenerating the pack

The generator is dependency-free and requires Node.js 20 or newer. It recreates the entire versioned package deterministically, so edit the generator rather than hand-editing thousands of linked rows.

From the directory containing Drone_Data_Pack_v2.0.0:

\`\`\`bash
node Drone_Data_Pack_v2.0.0/tools/generate-data.mjs
\`\`\`

To write to a separate review directory:

\`\`\`bash
DRONE_DATA_OUTPUT_DIR=/absolute/path/to/output node Drone_Data_Pack_v2.0.0/tools/generate-data.mjs
\`\`\`

The target directory is replaced during regeneration. Commit or copy intentional manual edits first. After generation, confirm data-quality-report.json has passed = true and run sha256sum -c checksums.sha256 inside the output directory.
`);

const seedOrder = [
  sqlInsert('data_pack_metadata',dataPackMetadata), sqlInsert('drone_models',droneModels), sqlInsert('drones',drones), sqlInsert('component_catalog',componentCatalog), sqlInsert('drone_components',components), sqlInsert('flight_zones',zones),
  sqlInsert('simulation_scenarios',scenarios), sqlInsert('drone_scenario_pool',scenarioPool), sqlInsert('missions',missions), sqlInsert('waypoints',waypoints),
  sqlInsert('weather_runtime_config',weatherRuntimeConfig), sqlInsert('weather_demo_profiles',weatherDemoProfiles),
  sqlInsert('drone_weather_demo_assignments',droneWeatherDemoAssignments), sqlInsert('weather_checks',weatherChecks),
  sqlInsert('flights',flights), sqlInsert('telemetry',telemetry), sqlInsert('alert_rule_catalog',alertRuleCatalog), sqlInsert('alerts',alerts)
].join('\n');
const allData = `CREATE DATABASE IF NOT EXISTS drone_monitoring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\nUSE drone_monitoring;\n\n${schema}\n${seedOrder}`;
writeText('all-data.sql', allData);
writeText('database/init/00-all-data.sql', allData);

writeText('database/verify-import.sql', `
USE drone_monitoring;

-- 1. Release fingerprint: must be exactly v2.0.0 / revision 1 / the build below.
SELECT pack_name, pack_version, data_revision, build_id, generated_at,
       schema_table_count, expected_telemetry_rows
FROM data_pack_metadata
WHERE id = 1;

-- 2. Connection identity: use this when Workbench/backend appears to show another database.
SELECT DATABASE() AS selected_database, @@hostname AS mysql_host, @@port AS mysql_port;

-- 3. Expected row signature.
SELECT 'drones' AS entity, COUNT(*) AS actual_rows, 5 AS expected_rows FROM drones
UNION ALL SELECT 'drone_components', COUNT(*), 70 FROM drone_components
UNION ALL SELECT 'flight_zones', COUNT(*), 8 FROM flight_zones
UNION ALL SELECT 'simulation_scenarios', COUNT(*), 9 FROM simulation_scenarios
UNION ALL SELECT 'missions', COUNT(*), 20 FROM missions
UNION ALL SELECT 'waypoints', COUNT(*), 90 FROM waypoints
UNION ALL SELECT 'flights', COUNT(*), 20 FROM flights
UNION ALL SELECT 'telemetry', COUNT(*), 6000 FROM telemetry
UNION ALL SELECT 'alerts', COUNT(*), 24 FROM alerts;

-- 4. Stale-data sentinels. Both values must be 0.
SELECT COUNT(*) AS legacy_left_only_scenarios
FROM simulation_scenarios
WHERE scenario_code IN ('MOTOR_OVERHEAT_FL', 'PROPELLER_DAMAGE_FL');

SELECT COUNT(*) AS non_offline_seed_drones
FROM drones
WHERE status <> 'OFFLINE';

-- 5. Current propulsion model: reusable scenario plus concrete arm per flight.
SELECT s.scenario_code, s.affected_position AS scenario_position,
       f.flight_code, f.fault_position
FROM flights f
JOIN simulation_scenarios s ON s.id = f.simulation_scenario_id
WHERE f.drone_id = 3
ORDER BY f.id;

-- 6. Confirm the new flights column exists.
SHOW COLUMNS FROM flights LIKE 'fault_position';

-- 7. Drone - 003 must demonstrate all four arms exactly once in seeded history.
SELECT fault_position, COUNT(*) AS seeded_flights
FROM flights
WHERE drone_id = 3
GROUP BY fault_position
ORDER BY fault_position;

-- 8. Drone - 005 approved flights must record CAUTION acknowledgement.
SELECT flight_code, preflight_weather_recommendation,
       weather_acknowledged_at
FROM flights
WHERE drone_id = 5
ORDER BY id;
`);

const checksumLines = fs.readdirSync(ROOT,{recursive:true})
  .filter(relative => fs.statSync(path.join(ROOT,relative)).isFile() && relative !== 'checksums.sha256')
  .sort()
  .map(relative => `${crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,relative))).digest('hex')}  ${relative}`);
writeText('checksums.sha256', checksumLines.join('\n'));

if (!validation.passed) {
  console.error(JSON.stringify(validation,null,2));
  process.exit(1);
}
console.log(JSON.stringify({root:ROOT,version:VERSION,counts,alertsByStatus:{active:alerts.filter(a=>a.status==='ACTIVE').length,resolved:alerts.filter(a=>a.status==='RESOLVED').length},validationPassed:true},null,2));
