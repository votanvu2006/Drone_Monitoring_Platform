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
