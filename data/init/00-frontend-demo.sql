SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS component_findings;
DROP TABLE IF EXISTS flight_events;
DROP TABLE IF EXISTS demo_runs;

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS alert_rule_catalog;
DROP TABLE IF EXISTS telemetry;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS weather_checks;
DROP TABLE IF EXISTS weather_demo_profiles;
DROP TABLE IF EXISTS waypoints;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS simulation_scenarios;
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
  battery_percent TINYINT UNSIGNED NOT NULL DEFAULT 100 CHECK (battery_percent BETWEEN 0 AND 100),
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


CREATE TABLE missions (
  preflight_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT chk_blocked_mission CHECK (NOT preflight_blocked OR (status IN ('WARNING','FAILED') AND progress_percent=0)),
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mission_code VARCHAR(30) NOT NULL UNIQUE,
  drone_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  status ENUM('DRAFT','READY','RUNNING','WARNING','IN_PROGRESS','COMPLETED','FAILED','CANCELLED') NOT NULL,
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
  map_x DECIMAL(7,2) NULL,
  map_y DECIMAL(7,2) NULL,
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
  route_name VARCHAR(150) NOT NULL DEFAULT 'Demo route',
  current_waypoint_index SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  route_progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0 CHECK (route_progress_percent BETWEEN 0 AND 100),
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
  title VARCHAR(150) NOT NULL DEFAULT 'Incident',
  source_group ENUM('Components','Weather') NULL,
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


CREATE TABLE demo_runs (
 id TINYINT UNSIGNED PRIMARY KEY CHECK (id=1), run_code VARCHAR(80) NOT NULL,
 selected_fault VARCHAR(60) NOT NULL, component_id BIGINT UNSIGNED NOT NULL,
 detected_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
 FOREIGN KEY (component_id) REFERENCES drone_components(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE flight_events (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, flight_id BIGINT UNSIGNED NOT NULL,
 event_code VARCHAR(80) UNIQUE NOT NULL, occurred_at DATETIME(3) NOT NULL,
 title VARCHAR(150) NOT NULL, description VARCHAR(500) NOT NULL,
 severity ENUM('INFO','WARNING','ERROR') NOT NULL,
 FOREIGN KEY (flight_id) REFERENCES flights(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE component_findings (
 id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT, finding_code VARCHAR(80) UNIQUE NOT NULL,
 drone_id BIGINT UNSIGNED NOT NULL, mission_id BIGINT UNSIGNED NOT NULL,
 component_id BIGINT UNSIGNED NOT NULL, alert_id BIGINT UNSIGNED NOT NULL UNIQUE,
 run_id TINYINT UNSIGNED NOT NULL, severity ENUM('WARNING','FAULT') NOT NULL,
 detected_at DATETIME(3) NOT NULL,
 FOREIGN KEY (drone_id) REFERENCES drones(id), FOREIGN KEY (mission_id) REFERENCES missions(id),
 FOREIGN KEY (component_id) REFERENCES drone_components(id), FOREIGN KEY (alert_id) REFERENCES alerts(id),
 FOREIGN KEY (run_id) REFERENCES demo_runs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE missions ADD UNIQUE KEY uq_mission_drone (id,drone_id);
ALTER TABLE drone_components ADD UNIQUE KEY uq_installed_drone (id,drone_id);
ALTER TABLE flights ADD CONSTRAINT fk_flight_owner FOREIGN KEY (mission_id,drone_id) REFERENCES missions(id,drone_id);
ALTER TABLE component_findings ADD CONSTRAINT fk_finding_mission_owner FOREIGN KEY (mission_id,drone_id) REFERENCES missions(id,drone_id);
ALTER TABLE component_findings ADD CONSTRAINT fk_finding_component_owner FOREIGN KEY (component_id,drone_id) REFERENCES drone_components(id,drone_id);

SET NAMES utf8mb4;
SET time_zone = '+00:00';
START TRANSACTION;
INSERT INTO `data_pack_metadata` (`id`,`pack_name`,`pack_version`,`data_revision`,`generated_at`,`build_id`,`schema_table_count`,`expected_telemetry_rows`,`notes`) VALUES
(1,'Drone Monitoring Platform Frontend Demo','2.1.0',4,'2026-10-30 00:00:00','DRONE-DATA-2.1.0-R4-20261030',17,30,'Frontend-aligned v2.1.0 demonstration data, revision 4.');
INSERT INTO `drone_models` (`id`,`model_code`,`manufacturer`,`model_name`,`description`,`image_url`,`max_flight_time_minutes`,`max_speed_mps`,`manufacturer_max_wind_mps`,`project_wind_limit_mps`,`battery_capacity_mah`,`battery_nominal_voltage_v`,`battery_max_voltage_v`,`reference_source_url`,`is_simulated_reference`,`created_at`,`updated_at`) VALUES
(1,'AV-X1E','AeroVision (fictional)','AeroVision X1 Enterprise','Fictional enterprise camera quadcopter whose high-level envelope references published DJI Mavic 3 Enterprise specifications. It is not a DJI aircraft model.',NULL,45,15,12,10,5000,15.4,17.6,'https://enterprise.dji.com/mavic-3-enterprise/specs',1,'2026-07-01 08:55:00','2026-09-19 10:00:00');
INSERT INTO `drones` (`id`,`drone_code`,`display_name`,`drone_model_id`,`serial_number`,`is_simulated`,`status`,`home_location_label`,`home_latitude`,`home_longitude`,`last_known_location_label`,`last_known_latitude`,`last_known_longitude`,`last_known_altitude_m`,`location_source`,`location_updated_at`,`last_seen_at`,`created_at`,`updated_at`,`battery_percent`) VALUES
(1,'DRONE-001','Drone - 001',1,'AVX1E-2026-0001',1,'OFFLINE','District 1 Operations Home Base',10.7769,106.7009,'Demo operating location',10.7769,106.7009,0,'MANUAL','2026-10-28 02:00:00','2026-10-28 02:00:00','2026-07-01 09:00:00','2026-10-28 02:00:00',100),
(2,'DRONE-002','Drone - 002',1,'AVX1E-2026-0002',1,'OFFLINE','District 1 Operations Home Base',10.7769,106.7009,'Demo operating location',10.7769,106.7009,0,'MANUAL','2026-10-28 02:00:00','2026-10-28 02:00:00','2026-07-01 09:00:00','2026-10-28 02:00:00',100),
(3,'DRONE-003','Drone - 003',1,'AVX1E-2026-0003',1,'IN_FLIGHT','District 1 Operations Home Base',10.7769,106.7009,'WP-04 demo position',10.77858,106.70386,82,'FLIGHT_TELEMETRY','2026-10-28 02:00:00','2026-10-28 02:00:00','2026-07-01 09:00:00','2026-10-28 02:00:00',100),
(4,'DRONE-004','Drone - 004',1,'AVX1E-2026-0004',1,'OFFLINE','District 1 Operations Home Base',10.7769,106.7009,'Demo operating location',10.7769,106.7009,0,'MANUAL','2026-10-28 02:00:00','2026-10-28 02:00:00','2026-07-01 09:00:00','2026-10-28 02:00:00',100),
(5,'DRONE-005','Drone - 005',1,'AVX1E-2026-0005',1,'OFFLINE','District 1 Operations Home Base',10.7769,106.7009,'Demo operating location',10.7769,106.7009,0,'MANUAL','2026-10-28 02:00:00','2026-10-28 02:00:00','2026-07-01 09:00:00','2026-10-28 02:00:00',100);
INSERT INTO `component_catalog` (`id`,`component_code`,`component_type`,`name`,`position`,`model`,`primary_function`,`display_order`,`created_at`,`updated_at`) VALUES
(1,'AVX1-FRAME-CENTER','FRAME','Carbon Fiber Frame','CENTER','AV-X1E Carbon Monocoque','Supports and protects aircraft systems',1,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(2,'AVX1-PROPELLER-FRONT_LEFT','PROPELLER','Front Left Propeller','FRONT_LEFT','9453F-class Low-Noise Propeller','Generates lift at the front-left arm',2,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(3,'AVX1-PROPELLER-FRONT_RIGHT','PROPELLER','Front Right Propeller','FRONT_RIGHT','9453F-class Low-Noise Propeller','Generates lift at the front-right arm',3,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(4,'AVX1-PROPELLER-REAR_LEFT','PROPELLER','Rear Left Propeller','REAR_LEFT','9453F-class Low-Noise Propeller','Generates lift at the rear-left arm',4,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(5,'AVX1-PROPELLER-REAR_RIGHT','PROPELLER','Rear Right Propeller','REAR_RIGHT','9453F-class Low-Noise Propeller','Generates lift at the rear-right arm',5,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(6,'AVX1-MOTOR-FRONT_LEFT','MOTOR','Front Left Motor','FRONT_LEFT','2008-class Brushless Motor','Drives the front-left propeller',6,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(7,'AVX1-MOTOR-FRONT_RIGHT','MOTOR','Front Right Motor','FRONT_RIGHT','2008-class Brushless Motor','Drives the front-right propeller',7,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(8,'AVX1-MOTOR-REAR_LEFT','MOTOR','Rear Left Motor','REAR_LEFT','2008-class Brushless Motor','Drives the rear-left propeller',8,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(9,'AVX1-MOTOR-REAR_RIGHT','MOTOR','Rear Right Motor','REAR_RIGHT','2008-class Brushless Motor','Drives the rear-right propeller',9,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(10,'AVX1-BATTERY-CENTER_REAR','BATTERY','Intelligent Flight Battery','CENTER_REAR','4S LiPo 5000 mAh 15.4 V','Supplies and monitors aircraft power',10,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(11,'AVX1-FLIGHT_CONTROLLER-CENTER','FLIGHT_CONTROLLER','Flight Controller','CENTER','AV-FC2','Stabilizes aircraft and executes routes',11,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(12,'AVX1-GPS-TOP_CENTER','GPS','GNSS Module','TOP_CENTER','Multi-constellation GNSS','Provides positioning and navigation data',12,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(13,'AVX1-SENSOR-BOTTOM_FRONT','SENSOR','Vision and IMU Module','BOTTOM_FRONT','AV VisionSense','Supports obstacle awareness and stabilization',13,'2026-07-01 09:00:00','2026-09-19 10:00:00'),
(14,'AVX1-CAMERA-FRONT','CAMERA','Monitoring Camera','FRONT','4K 3-Axis Gimbal Camera','Captures stabilized monitoring imagery',14,'2026-07-01 09:00:00','2026-09-19 10:00:00');
INSERT INTO `drone_components` (`id`,`drone_id`,`component_catalog_id`,`component_serial_number`,`health_status`,`installed_at`,`last_inspected_at`,`installed`,`created_at`,`updated_at`) VALUES
(1,1,1,'DRONE-001-AVX1-FRAME-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(2,1,2,'DRONE-001-AVX1-PROPELLER-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(3,1,3,'DRONE-001-AVX1-PROPELLER-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(4,1,4,'DRONE-001-AVX1-PROPELLER-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(5,1,5,'DRONE-001-AVX1-PROPELLER-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(6,1,6,'DRONE-001-AVX1-MOTOR-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(7,1,7,'DRONE-001-AVX1-MOTOR-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(8,1,8,'DRONE-001-AVX1-MOTOR-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(9,1,9,'DRONE-001-AVX1-MOTOR-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(10,1,10,'DRONE-001-AVX1-BATTERY-CENTER_REAR','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(11,1,11,'DRONE-001-AVX1-FLIGHT_CONTROLLER-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(12,1,12,'DRONE-001-AVX1-GPS-TOP_CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(13,1,13,'DRONE-001-AVX1-SENSOR-BOTTOM_FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(14,1,14,'DRONE-001-AVX1-CAMERA-FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(15,2,1,'DRONE-002-AVX1-FRAME-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(16,2,2,'DRONE-002-AVX1-PROPELLER-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(17,2,3,'DRONE-002-AVX1-PROPELLER-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(18,2,4,'DRONE-002-AVX1-PROPELLER-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(19,2,5,'DRONE-002-AVX1-PROPELLER-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(20,2,6,'DRONE-002-AVX1-MOTOR-FRONT_LEFT','WARNING','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(21,2,7,'DRONE-002-AVX1-MOTOR-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(22,2,8,'DRONE-002-AVX1-MOTOR-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(23,2,9,'DRONE-002-AVX1-MOTOR-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(24,2,10,'DRONE-002-AVX1-BATTERY-CENTER_REAR','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(25,2,11,'DRONE-002-AVX1-FLIGHT_CONTROLLER-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(26,2,12,'DRONE-002-AVX1-GPS-TOP_CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(27,2,13,'DRONE-002-AVX1-SENSOR-BOTTOM_FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(28,2,14,'DRONE-002-AVX1-CAMERA-FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(29,3,1,'DRONE-003-AVX1-FRAME-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(30,3,2,'DRONE-003-AVX1-PROPELLER-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(31,3,3,'DRONE-003-AVX1-PROPELLER-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(32,3,4,'DRONE-003-AVX1-PROPELLER-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(33,3,5,'DRONE-003-AVX1-PROPELLER-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-12 12:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(34,3,6,'DRONE-003-AVX1-MOTOR-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(35,3,7,'DRONE-003-AVX1-MOTOR-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(36,3,8,'DRONE-003-AVX1-MOTOR-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(37,3,9,'DRONE-003-AVX1-MOTOR-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-12 12:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(38,3,10,'DRONE-003-AVX1-BATTERY-CENTER_REAR','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(39,3,11,'DRONE-003-AVX1-FLIGHT_CONTROLLER-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(40,3,12,'DRONE-003-AVX1-GPS-TOP_CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(41,3,13,'DRONE-003-AVX1-SENSOR-BOTTOM_FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(42,3,14,'DRONE-003-AVX1-CAMERA-FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(43,4,1,'DRONE-004-AVX1-FRAME-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(44,4,2,'DRONE-004-AVX1-PROPELLER-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(45,4,3,'DRONE-004-AVX1-PROPELLER-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(46,4,4,'DRONE-004-AVX1-PROPELLER-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(47,4,5,'DRONE-004-AVX1-PROPELLER-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(48,4,6,'DRONE-004-AVX1-MOTOR-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(49,4,7,'DRONE-004-AVX1-MOTOR-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(50,4,8,'DRONE-004-AVX1-MOTOR-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(51,4,9,'DRONE-004-AVX1-MOTOR-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(52,4,10,'DRONE-004-AVX1-BATTERY-CENTER_REAR','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(53,4,11,'DRONE-004-AVX1-FLIGHT_CONTROLLER-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(54,4,12,'DRONE-004-AVX1-GPS-TOP_CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(55,4,13,'DRONE-004-AVX1-SENSOR-BOTTOM_FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(56,4,14,'DRONE-004-AVX1-CAMERA-FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(57,5,1,'DRONE-005-AVX1-FRAME-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(58,5,2,'DRONE-005-AVX1-PROPELLER-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(59,5,3,'DRONE-005-AVX1-PROPELLER-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(60,5,4,'DRONE-005-AVX1-PROPELLER-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(61,5,5,'DRONE-005-AVX1-PROPELLER-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(62,5,6,'DRONE-005-AVX1-MOTOR-FRONT_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(63,5,7,'DRONE-005-AVX1-MOTOR-FRONT_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(64,5,8,'DRONE-005-AVX1-MOTOR-REAR_LEFT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(65,5,9,'DRONE-005-AVX1-MOTOR-REAR_RIGHT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(66,5,10,'DRONE-005-AVX1-BATTERY-CENTER_REAR','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(67,5,11,'DRONE-005-AVX1-FLIGHT_CONTROLLER-CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(68,5,12,'DRONE-005-AVX1-GPS-TOP_CENTER','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(69,5,13,'DRONE-005-AVX1-SENSOR-BOTTOM_FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00'),
(70,5,14,'DRONE-005-AVX1-CAMERA-FRONT','HEALTHY','2026-07-01','2026-09-01 08:00:00',1,'2026-07-01 09:05:00','2026-10-28 02:00:00');
INSERT INTO `simulation_scenarios` (`id`,`scenario_code`,`name`,`category`,`expected_result`,`fault_start_progress`,`fault_end_progress`,`affected_position`,`parameters_json`,`description`,`is_enabled`,`created_at`,`updated_at`) VALUES
(1,'NORMAL','Normal flight','NORMAL','SUCCESS',NULL,NULL,'NONE','{}','All simulated health metrics remain within the project normal envelope.',1,'2026-07-02 09:00:00','2026-09-19 10:00:00');
INSERT INTO `missions` (`id`,`mission_code`,`drone_id`,`name`,`description`,`status`,`validation_status`,`validation_message`,`planned_altitude_m`,`planned_speed_mps`,`estimated_distance_m`,`estimated_duration_sec`,`progress_percent`,`is_current`,`created_at`,`updated_at`,`preflight_blocked`) VALUES
(1,'mission-001',1,'Mission 001','Frontend-aligned demonstration mission.','READY','VALID','Demo route',82,9.4,3620,1122,0,1,'2026-10-21 02:00:00','2026-10-28 02:00:00',0),
(2,'mission-002',2,'Mission 002','Frontend-aligned demonstration mission.','WARNING','VALID','Component issue before takeoff',82,9.4,3620,1122,0,1,'2026-10-21 01:00:00','2026-10-28 02:00:00',1),
(3,'mission-003',3,'Mission 003','Frontend-aligned demonstration mission.','IN_PROGRESS','VALID','Demo route',82,9.4,3620,1122,43,1,'2026-10-20 01:00:00','2026-10-28 02:00:00',0),
(4,'mission-004',4,'Mission 004','Frontend-aligned demonstration mission.','COMPLETED','VALID','Demo route',82,9.4,3620,1122,100,1,'2026-10-12 01:00:00','2026-10-28 02:00:00',0),
(5,'mission-005',5,'Mission 005','Frontend-aligned demonstration mission.','FAILED','VALID','Unsafe weather blocked takeoff',82,9.4,3620,1122,0,1,'2026-10-19 01:00:00','2026-10-28 02:00:00',1),
(10,'MISSION-010',4,'Mission 010','Frontend-aligned demonstration mission.','COMPLETED','VALID','Demo route',82,9.4,3620,1122,100,0,'2026-10-12 01:00:00','2026-10-28 02:00:00',0),
(11,'MISSION-011',3,'Mission 011','Frontend-aligned demonstration mission.','COMPLETED','VALID','Demo route',82,9.4,3620,1122,100,0,'2026-10-13 08:00:00','2026-10-28 02:00:00',0),
(12,'MISSION-012',5,'Mission 012','Frontend-aligned demonstration mission.','FAILED','VALID','Historical flight attempt',82,9.4,1450,496,60,0,'2026-10-14 01:00:00','2026-10-28 02:00:00',0),
(14,'MISSION-014',1,'Mission 014','Frontend-aligned demonstration mission.','COMPLETED','VALID','Demo route',82,9.4,3620,1122,100,0,'2026-10-16 01:00:00','2026-10-28 02:00:00',0);
INSERT INTO `waypoints` (`id`,`mission_id`,`sequence_number`,`waypoint_type`,`latitude`,`longitude`,`altitude_m`,`hold_time_sec`,`map_x`,`map_y`,`created_at`) VALUES
(1,1,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-21 02:00:00'),
(2,1,2,'INTERMEDIATE',10.777508,106.70226,82,0,25,40.4,'2026-10-21 02:00:00'),
(3,1,3,'INTERMEDIATE',10.778116,106.70362,82,0,42,32.8,'2026-10-21 02:00:00'),
(4,1,4,'INTERMEDIATE',10.778724,106.70498,82,0,59,25.2,'2026-10-21 02:00:00'),
(5,1,5,'INTERMEDIATE',10.779332,106.70634,82,0,76,17.6,'2026-10-21 02:00:00'),
(6,1,6,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-21 02:00:00'),
(7,2,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-21 01:00:00'),
(8,2,2,'INTERMEDIATE',10.77762,106.70194,82,0,21,39,'2026-10-21 01:00:00'),
(9,2,3,'INTERMEDIATE',10.7769,106.7029,82,0,33,48,'2026-10-21 01:00:00'),
(10,2,4,'INTERMEDIATE',10.77858,106.70386,82,0,45,27,'2026-10-21 01:00:00'),
(11,2,5,'INTERMEDIATE',10.77802,106.70498,82,0,59,34,'2026-10-21 01:00:00'),
(12,2,6,'INTERMEDIATE',10.77954,106.70586,82,0,70,15,'2026-10-21 01:00:00'),
(13,2,7,'INTERMEDIATE',10.77882,106.7069,82,0,83,24,'2026-10-21 01:00:00'),
(14,2,8,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-21 01:00:00'),
(15,3,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-20 01:00:00'),
(16,3,2,'INTERMEDIATE',10.77762,106.70194,82,0,21,39,'2026-10-20 01:00:00'),
(17,3,3,'INTERMEDIATE',10.7769,106.7029,82,0,33,48,'2026-10-20 01:00:00'),
(18,3,4,'INTERMEDIATE',10.77858,106.70386,82,0,45,27,'2026-10-20 01:00:00'),
(19,3,5,'INTERMEDIATE',10.77802,106.70498,82,0,59,34,'2026-10-20 01:00:00'),
(20,3,6,'INTERMEDIATE',10.77954,106.70586,82,0,70,15,'2026-10-20 01:00:00'),
(21,3,7,'INTERMEDIATE',10.77882,106.7069,82,0,83,24,'2026-10-20 01:00:00'),
(22,3,8,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-20 01:00:00'),
(23,4,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-12 01:00:00'),
(24,4,2,'INTERMEDIATE',10.77766,106.7026,82,0,29.25,38.5,'2026-10-12 01:00:00'),
(25,4,3,'INTERMEDIATE',10.77842,106.7043,82,0,50.5,29,'2026-10-12 01:00:00'),
(26,4,4,'INTERMEDIATE',10.77918,106.706,82,0,71.75,19.5,'2026-10-12 01:00:00'),
(27,4,5,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-12 01:00:00'),
(28,5,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-19 01:00:00'),
(29,5,2,'INTERMEDIATE',10.7772378,106.7016556,82,0,17.44,43.78,'2026-10-19 01:00:00'),
(30,5,3,'INTERMEDIATE',10.7775756,106.7024111,82,0,26.89,39.56,'2026-10-19 01:00:00'),
(31,5,4,'INTERMEDIATE',10.7779133,106.7031667,82,0,36.33,35.33,'2026-10-19 01:00:00'),
(32,5,5,'INTERMEDIATE',10.7782511,106.7039222,82,0,45.78,31.11,'2026-10-19 01:00:00'),
(33,5,6,'INTERMEDIATE',10.7785889,106.7046778,82,0,55.22,26.89,'2026-10-19 01:00:00'),
(34,5,7,'INTERMEDIATE',10.7789267,106.7054333,82,0,64.67,22.67,'2026-10-19 01:00:00'),
(35,5,8,'INTERMEDIATE',10.7792644,106.7061889,82,0,74.11,18.44,'2026-10-19 01:00:00'),
(36,5,9,'INTERMEDIATE',10.7796022,106.7069444,82,0,83.56,14.22,'2026-10-19 01:00:00'),
(37,5,10,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-19 01:00:00'),
(38,11,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-13 08:00:00'),
(39,11,2,'INTERMEDIATE',10.77762,106.70194,82,0,21,39,'2026-10-13 08:00:00'),
(40,11,3,'INTERMEDIATE',10.7769,106.7029,82,0,33,48,'2026-10-13 08:00:00'),
(41,11,4,'INTERMEDIATE',10.77858,106.70386,82,0,45,27,'2026-10-13 08:00:00'),
(42,11,5,'INTERMEDIATE',10.77802,106.70498,82,0,59,34,'2026-10-13 08:00:00'),
(43,11,6,'INTERMEDIATE',10.77954,106.70586,82,0,70,15,'2026-10-13 08:00:00'),
(44,11,7,'INTERMEDIATE',10.77882,106.7069,82,0,83,24,'2026-10-13 08:00:00'),
(45,11,8,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-13 08:00:00'),
(46,14,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-16 01:00:00'),
(47,14,2,'INTERMEDIATE',10.77762,106.70194,82,0,21,39,'2026-10-16 01:00:00'),
(48,14,3,'INTERMEDIATE',10.7769,106.7029,82,0,33,48,'2026-10-16 01:00:00'),
(49,14,4,'INTERMEDIATE',10.77858,106.70386,82,0,45,27,'2026-10-16 01:00:00'),
(50,14,5,'INTERMEDIATE',10.77802,106.70498,82,0,59,34,'2026-10-16 01:00:00'),
(51,14,6,'INTERMEDIATE',10.77954,106.70586,82,0,70,15,'2026-10-16 01:00:00'),
(52,14,7,'INTERMEDIATE',10.77882,106.7069,82,0,83,24,'2026-10-16 01:00:00'),
(53,14,8,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-16 01:00:00'),
(54,10,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-12 01:00:00'),
(55,10,2,'INTERMEDIATE',10.77766,106.7026,82,0,29.25,38.5,'2026-10-12 01:00:00'),
(56,10,3,'INTERMEDIATE',10.77842,106.7043,82,0,50.5,29,'2026-10-12 01:00:00'),
(57,10,4,'INTERMEDIATE',10.77918,106.706,82,0,71.75,19.5,'2026-10-12 01:00:00'),
(58,10,5,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-12 01:00:00'),
(59,12,1,'START',10.7769,106.7009,82,0,8,48,'2026-10-14 01:00:00'),
(60,12,2,'INTERMEDIATE',10.77762,106.70194,82,0,21,39,'2026-10-14 01:00:00'),
(61,12,3,'INTERMEDIATE',10.7769,106.7029,82,0,33,48,'2026-10-14 01:00:00'),
(62,12,4,'INTERMEDIATE',10.77858,106.70386,82,0,45,27,'2026-10-14 01:00:00'),
(63,12,5,'INTERMEDIATE',10.77802,106.70498,82,0,59,34,'2026-10-14 01:00:00'),
(64,12,6,'INTERMEDIATE',10.77954,106.70586,82,0,70,15,'2026-10-14 01:00:00'),
(65,12,7,'INTERMEDIATE',10.77882,106.7069,82,0,83,24,'2026-10-14 01:00:00'),
(66,12,8,'DESTINATION',10.77994,106.7077,82,0,93,10,'2026-10-14 01:00:00');
INSERT INTO `weather_demo_profiles` (`id`,`profile_code`,`name`,`recommendation`,`condition_code`,`temperature_c`,`relative_humidity_percent`,`wind_speed_10m_mps`,`wind_speed_80m_mps`,`wind_direction_10m_deg`,`wind_gust_10m_mps`,`precipitation_mm`,`rain_mm`,`visibility_m`,`reason`,`is_enabled`,`created_at`,`updated_at`) VALUES
(1,'DEMO_SAFE','Demo safe weather','SAFE',1,29.4,68,4.2,5.8,110,6.1,0,0,10000,'Demo fixture: dry, good visibility, and wind below project caution thresholds.',1,'2026-09-19 10:00:00','2026-09-19 10:00:00'),
(2,'DEMO_CAUTION','Demo caution weather','CAUTION',51,28.1,82,8.7,10.2,205,10.8,0.2,0.2,4200,'Demo fixture: light precipitation and wind in the project caution range.',1,'2026-09-19 10:00:00','2026-09-19 10:00:00'),
(3,'DEMO_UNSAFE','Demo unsafe weather','UNSAFE',95,26.2,91,11.4,13.2,245,15.1,2.8,2.8,1400,'Demo fixture: thunderstorm code, wind above project limit, and poor visibility.',1,'2026-09-19 10:00:00','2026-09-19 10:00:00');
INSERT INTO `weather_checks` (`id`,`validation_run_id`,`mission_id`,`waypoint_id`,`location_type`,`latitude`,`longitude`,`source_kind`,`condition_code`,`temperature_c`,`relative_humidity_percent`,`wind_speed_10m_mps`,`wind_speed_80m_mps`,`wind_direction_10m_deg`,`wind_gust_10m_mps`,`precipitation_mm`,`rain_mm`,`visibility_m`,`recommendation`,`reason`,`provider_observed_at`,`checked_at`,`expires_at`,`raw_response`,`created_at`) VALUES
(1,'00000000-0000-0000-0000-000000000005',5,NULL,'START',10.7769,106.7009,'SIMULATED_FIXTURE',95,26.2,91,11.4,13.2,245,15.1,2.8,2.8,1400,'UNSAFE','Strong wind and poor visibility prevented takeoff.','2026-10-19 06:10:00','2026-10-19 06:10:00','2026-10-19 06:20:00',NULL,'2026-10-19 06:10:00');
INSERT INTO `flights` (`id`,`flight_code`,`drone_id`,`mission_id`,`simulation_scenario_id`,`fault_position`,`status`,`result`,`started_at`,`ended_at`,`duration_sec`,`distance_m`,`start_battery_percent`,`end_battery_percent`,`preflight_weather_mode`,`preflight_weather_recommendation`,`weather_acknowledged_at`,`termination_reason`,`route_name`,`current_waypoint_index`,`route_progress_percent`,`created_at`,`updated_at`) VALUES
(10,'FLIGHT-010',4,10,1,NULL,'LANDED','SUCCESS','2026-10-12 03:05:00','2026-10-12 03:20:45',945,3000,100,70,'DEMO','SAFE',NULL,NULL,'Completed Demo Route',4,100,'2026-10-12 03:05:00','2026-10-28 02:00:00'),
(11,'FLIGHT-011',3,11,1,NULL,'LANDED','SUCCESS','2026-10-13 09:10:00','2026-10-13 09:33:00',1380,4600,100,65,'DEMO','SAFE',NULL,NULL,'Completed Demo Route',7,100,'2026-10-13 09:10:00','2026-10-28 02:00:00'),
(12,'FLIGHT-012',5,12,1,NULL,'ABORTED','FAILED','2026-10-14 01:55:00','2026-10-14 02:03:16',496,1450,100,82,'DEMO','SAFE',NULL,'Historical flight ended before route completion','Historical Demo Route',4,60,'2026-10-14 01:55:00','2026-10-28 02:00:00'),
(14,'FLIGHT-014',1,14,1,NULL,'LANDED','SUCCESS','2026-10-16 02:15:00','2026-10-16 02:33:42',1122,3620,100,62,'DEMO','SAFE',NULL,NULL,'North Perimeter Survey',7,100,'2026-10-16 02:15:00','2026-10-28 02:00:00'),
(15,'FLIGHT-015',3,3,1,NULL,'FLYING',NULL,'2026-10-28 01:55:00',NULL,300,1551.43,100,NULL,'DEMO','SAFE',NULL,NULL,'North Perimeter Survey',3,43,'2026-10-28 01:55:00','2026-10-28 02:00:00');
INSERT INTO `telemetry` (`id`,`flight_id`,`sequence_number`,`recorded_at`,`received_at`,`latitude`,`longitude`,`position_source`,`position_is_valid`,`transmission_state`,`heartbeat_age_seconds`,`altitude_m`,`speed_mps`,`vertical_speed_mps`,`heading_deg`,`battery_percent`,`battery_voltage_v`,`battery_current_a`,`battery_temperature_c`,`motor_rpm_fl`,`motor_rpm_fr`,`motor_rpm_rl`,`motor_rpm_rr`,`motor_temperature_fl_c`,`motor_temperature_fr_c`,`motor_temperature_rl_c`,`motor_temperature_rr_c`,`vibration_g`,`flight_controller_temperature_c`,`gps_quality`,`gps_satellites`,`signal_percent`,`wind_speed_mps`,`wind_direction_deg`,`wind_source`) VALUES
(1,14,1,'2026-10-16 02:15:00','2026-10-16 02:15:00',10.7769,106.7009,'GNSS',1,'CONNECTED',0,82,9.4,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(2,14,2,'2026-10-16 02:17:40','2026-10-16 02:17:40',10.77762,106.70194,'GNSS',1,'CONNECTED',0,82,9.4,0,110,95,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(3,14,3,'2026-10-16 02:20:21','2026-10-16 02:20:21',10.7769,106.7029,'GNSS',1,'CONNECTED',0,82,9.4,0,110,89,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(4,14,4,'2026-10-16 02:23:01','2026-10-16 02:23:01',10.77858,106.70386,'GNSS',1,'CONNECTED',0,82,9.4,0,110,84,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(5,14,5,'2026-10-16 02:25:41','2026-10-16 02:25:41',10.77802,106.70498,'GNSS',1,'CONNECTED',0,82,9.4,0,110,78,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(6,14,6,'2026-10-16 02:28:21','2026-10-16 02:28:21',10.77954,106.70586,'GNSS',1,'CONNECTED',0,82,9.4,0,110,73,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(7,14,7,'2026-10-16 02:31:02','2026-10-16 02:31:02',10.77882,106.7069,'GNSS',1,'CONNECTED',0,82,9.4,0,110,67,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(8,14,8,'2026-10-16 02:33:42','2026-10-16 02:33:42',10.77994,106.7077,'GNSS',1,'CONNECTED',0,82,9.4,0,110,62,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(9,11,1,'2026-10-13 09:10:00','2026-10-13 09:10:00',10.7769,106.7009,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(10,11,2,'2026-10-13 09:13:17','2026-10-13 09:13:17',10.77762,106.70194,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,95,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(11,11,3,'2026-10-13 09:16:34','2026-10-13 09:16:34',10.7769,106.7029,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,90,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(12,11,4,'2026-10-13 09:19:51','2026-10-13 09:19:51',10.77858,106.70386,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,85,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(13,11,5,'2026-10-13 09:23:09','2026-10-13 09:23:09',10.77802,106.70498,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,80,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(14,11,6,'2026-10-13 09:26:26','2026-10-13 09:26:26',10.77954,106.70586,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,75,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(15,11,7,'2026-10-13 09:29:43','2026-10-13 09:29:43',10.77882,106.7069,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,70,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(16,11,8,'2026-10-13 09:33:00','2026-10-13 09:33:00',10.77994,106.7077,'GNSS',1,'CONNECTED',0,82,3.3333,0,110,65,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(17,10,1,'2026-10-12 03:05:00','2026-10-12 03:05:00',10.7769,106.7009,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(18,10,2,'2026-10-12 03:08:56','2026-10-12 03:08:56',10.77766,106.7026,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,92,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(19,10,3,'2026-10-12 03:12:52','2026-10-12 03:12:52',10.77842,106.7043,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,85,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(20,10,4,'2026-10-12 03:16:49','2026-10-12 03:16:49',10.77918,106.706,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,78,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(21,10,5,'2026-10-12 03:20:45','2026-10-12 03:20:45',10.77994,106.7077,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,70,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(22,15,1,'2026-10-28 01:55:00','2026-10-28 01:55:00',10.7769,106.7009,'GNSS',1,'CONNECTED',0,82,5.1714,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(23,15,2,'2026-10-28 01:56:40','2026-10-28 01:56:40',10.77762,106.70194,'GNSS',1,'CONNECTED',0,82,5.1714,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(24,15,3,'2026-10-28 01:58:20','2026-10-28 01:58:20',10.7769,106.7029,'GNSS',1,'CONNECTED',0,82,5.1714,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(25,15,4,'2026-10-28 02:00:00','2026-10-28 02:00:00',10.77858,106.70386,'GNSS',1,'CONNECTED',0,82,5.1714,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(26,12,1,'2026-10-14 01:55:00','2026-10-14 01:55:00',10.7769,106.7009,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,100,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(27,12,2,'2026-10-14 01:57:04','2026-10-14 01:57:04',10.77766,106.7026,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,96,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(28,12,3,'2026-10-14 01:59:08','2026-10-14 01:59:08',10.77842,106.7043,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,91,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(29,12,4,'2026-10-14 02:01:12','2026-10-14 02:01:12',10.77918,106.706,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,86,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE'),
(30,12,5,'2026-10-14 02:03:16','2026-10-14 02:03:16',10.77994,106.7077,'GNSS',1,'CONNECTED',0,82,3.1746,0,110,82,16.8,4,35,5000,5000,5000,5000,45,45,45,45,0.3,42,'GOOD',16,100,4.2,110,'SIMULATED_WEATHER_PROFILE');
INSERT INTO `alert_rule_catalog` (`rule_code`,`alert_type`,`source`,`default_severity`,`authority`,`description`,`is_enabled`,`created_at`,`updated_at`) VALUES
('MOTOR_OVERHEAT','MOTOR_OVERHEAT','TELEMETRY','WARNING','PROJECT_SIMULATION_POLICY','Motor temperature >= 70 C',1,'2026-10-28 02:00:00','2026-10-28 02:00:00'),
('PROPELLER_DAMAGE_SUSPECTED','PROPELLER_DAMAGE_SUSPECTED','TELEMETRY','CRITICAL','PROJECT_SIMULATION_POLICY','RPM imbalance and excessive vibration',1,'2026-10-28 02:00:00','2026-10-28 02:00:00'),
('GPS_LOST','GPS_LOST','TELEMETRY','CRITICAL','PROJECT_SIMULATION_POLICY','GNSS signal lost',1,'2026-10-28 02:00:00','2026-10-28 02:00:00'),
('UNSAFE_WEATHER','UNSAFE_WEATHER','WEATHER','CRITICAL','PROJECT_SIMULATION_POLICY','Unsafe weather before takeoff',1,'2026-10-28 02:00:00','2026-10-28 02:00:00'),
('LOW_BATTERY','LOW_BATTERY','TELEMETRY','WARNING','PROJECT_SIMULATION_POLICY','Demo battery reserve warning',1,'2026-10-28 02:00:00','2026-10-28 02:00:00');
INSERT INTO `alerts` (`id`,`alert_code`,`flight_id`,`mission_id`,`component_id`,`source`,`rule_code`,`severity`,`type`,`message`,`metric_name`,`observed_value`,`threshold_value`,`unit`,`status`,`detected_at`,`last_observed_at`,`resolved_at`,`resolution_note`,`created_at`,`updated_at`,`title`,`source_group`) VALUES
(1,'DEMO-ALT-001',NULL,2,24,'TELEMETRY','LOW_BATTERY','WARNING','LOW_BATTERY','Battery level is below the recommended reserve.','battery_percent',20,25,'%','ACTIVE','2026-10-21 06:05:00','2026-10-21 06:05:00',NULL,NULL,'2026-10-21 06:05:00','2026-10-21 06:05:00','Low battery','Components'),
(2,'DEMO-ALT-002',NULL,2,20,'TELEMETRY','MOTOR_OVERHEAT','WARNING','MOTOR_OVERHEAT','Motor temperature is above the normal operating range.','motor_temperature_c',75,70,'C','ACTIVE','2026-10-21 06:08:00','2026-10-21 06:08:00',NULL,'Inspect the motor and allow it to cool before the next flight.','2026-10-21 06:08:00','2026-10-21 06:08:00','Motor temperature warning','Components'),
(3,'DEMO-ALT-003',NULL,5,NULL,'WEATHER','UNSAFE_WEATHER','CRITICAL','UNSAFE_WEATHER','Strong wind and poor visibility caused the mission to fail.',NULL,NULL,NULL,NULL,'ACTIVE','2026-10-19 06:10:00','2026-10-19 06:10:00',NULL,'Mission stopped. Review weather conditions before scheduling a new attempt.','2026-10-19 06:10:00','2026-10-19 06:10:00','Unsafe weather','Weather');
INSERT INTO `demo_runs` (`id`,`run_code`,`selected_fault`,`component_id`,`detected_at`,`updated_at`) VALUES
(1,'INITIAL-MOTOR-FRONT-LEFT','MOTOR_OVERHEAT',20,'2026-10-21 06:08:00','2026-10-28 02:00:00');
INSERT INTO `flight_events` (`id`,`flight_id`,`event_code`,`occurred_at`,`title`,`description`,`severity`) VALUES
(1,14,'event-001','2026-10-16 02:15:00','Flight started','The drone began the assigned route.','INFO'),
(2,14,'event-002','2026-10-16 02:20:00','Waypoint reached','The drone reached waypoint WP-04.','INFO'),
(3,11,'FLIGHT-011-START','2026-10-13 09:10:00','Flight started','The drone began the assigned route.','INFO'),
(4,11,'FLIGHT-011-END','2026-10-13 09:33:00','Route completed','The drone completed the route.','INFO'),
(5,10,'FLIGHT-010-START','2026-10-12 03:05:00','Flight started','The drone began the assigned route.','INFO'),
(6,10,'FLIGHT-010-END','2026-10-12 03:20:45','Route completed','The drone completed the route.','INFO'),
(7,15,'FLIGHT-015-START','2026-10-28 01:55:00','Flight started','The drone began the assigned route.','INFO'),
(8,14,'event-003','2026-10-16 02:29:00','Route completed','The drone returned after completing the route.','INFO'),
(9,12,'FLIGHT-012-START','2026-10-14 01:55:00','Flight started','The drone began the assigned route.','INFO'),
(10,12,'FLIGHT-012-END','2026-10-14 02:03:16','Flight ended','The historical flight ended before completing its route.','ERROR');
INSERT INTO `component_findings` (`id`,`finding_code`,`drone_id`,`mission_id`,`component_id`,`alert_id`,`run_id`,`severity`,`detected_at`) VALUES
(1,'FINDING-002',2,2,20,2,1,'WARNING','2026-10-21 06:08:00');
COMMIT;

DELIMITER $$
CREATE TRIGGER prevent_blocked_flight BEFORE INSERT ON flights FOR EACH ROW
BEGIN
  IF (SELECT preflight_blocked FROM missions WHERE id=NEW.mission_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Cannot create a flight for a blocked preflight attempt';
  END IF;
END$$

CREATE PROCEDURE start_demo_run(IN p_seed INT UNSIGNED)
SQL SECURITY INVOKER
BEGIN
  DECLARE v_lock TINYINT;
  DECLARE v_choice INT;
  DECLARE v_arm INT;
  DECLARE v_component BIGINT UNSIGNED;
  DECLARE v_rule VARCHAR(60);
  DECLARE v_title VARCHAR(150);
  DECLARE v_message VARCHAR(500);
  DECLARE v_health VARCHAR(20);
  DECLARE v_severity VARCHAR(20);
  DECLARE v_metric VARCHAR(80);
  DECLARE v_value DECIMAL(10,3);
  DECLARE v_threshold DECIMAL(10,3);
  DECLARE v_unit VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT id INTO v_lock FROM demo_runs WHERE id=1 FOR UPDATE;
  IF v_lock IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Demo run singleton is missing'; END IF;
  SET v_choice=IF(p_seed IS NULL,FLOOR(RAND()*3),MOD(p_seed,3));
  SET v_arm=IF(p_seed IS NULL,FLOOR(RAND()*4),MOD(FLOOR(p_seed/3),4));
  IF v_choice=0 THEN
    SET v_component=20+v_arm, v_rule='MOTOR_OVERHEAT', v_title='Motor temperature warning',
        v_health='WARNING', v_severity='WARNING', v_metric='motor_temperature_c',
        v_value=75, v_threshold=70, v_unit='C';
    SET v_message=CONCAT(ELT(v_arm+1,'Front-left','Front-right','Rear-left','Rear-right'),' motor reached 75 C before takeoff.');
  ELSEIF v_choice=1 THEN
    SET v_component=16+v_arm, v_rule='PROPELLER_DAMAGE_SUSPECTED', v_title='Propeller damage suspected',
        v_health='FAULT', v_severity='CRITICAL', v_metric='vibration_g',
        v_value=2.8, v_threshold=2.5, v_unit='g';
    SET v_message=CONCAT(ELT(v_arm+1,'Front-left','Front-right','Rear-left','Rear-right'),' propeller: 28% RPM imbalance and 2.8 g vibration.');
  ELSE
    SET v_component=26, v_rule='GPS_LOST', v_title='GPS signal lost',
        v_health='FAULT', v_severity='CRITICAL', v_metric='gps_quality',
        v_value=NULL, v_threshold=NULL, v_unit=NULL;
    SET v_message='GPS quality is LOST before takeoff; the mission is blocked.';
  END IF;
  DELETE FROM component_findings WHERE drone_id=2;
  UPDATE drone_components SET health_status='HEALTHY',updated_at='2026-10-28 02:00:00' WHERE drone_id=2;
  UPDATE drone_components SET health_status=v_health WHERE id=v_component AND drone_id=2;
  UPDATE demo_runs SET run_code=UUID(),selected_fault=v_rule,component_id=v_component,
      detected_at='2026-10-21 06:08:00',updated_at='2026-10-28 02:00:00' WHERE id=1;
  UPDATE alerts SET component_id=v_component,rule_code=v_rule,type=v_rule,severity=v_severity,
      title=v_title,message=v_message,metric_name=v_metric,observed_value=v_value,threshold_value=v_threshold,
      unit=v_unit,status='ACTIVE',resolved_at=NULL,resolution_note='Inspect the motor and allow it to cool before the next flight.' WHERE id=2 AND mission_id=2;
  INSERT INTO component_findings
    (id,finding_code,drone_id,mission_id,component_id,alert_id,run_id,severity,detected_at)
    VALUES(1,'FINDING-002',2,2,v_component,2,1,v_health,'2026-10-21 06:08:00');
  UPDATE missions SET status='WARNING',progress_percent=0 WHERE id=2;
  COMMIT;
END$$

CREATE PROCEDURE verify_frontend_demo()
SQL SECURITY INVOKER
BEGIN
  IF (SELECT build_id FROM data_pack_metadata WHERE id=1)<>'DRONE-DATA-2.1.0-R4-20261030' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Wrong data pack';
  END IF;
  IF (SELECT COUNT(*) FROM drones)<>5 OR (SELECT COUNT(*) FROM drone_components)<>70
      OR (SELECT COUNT(*) FROM missions WHERE is_current=1)<>5 OR (SELECT COUNT(*) FROM missions)<>9
      OR (SELECT COUNT(*) FROM waypoints)<>66 OR (SELECT COUNT(*) FROM flights)<>5
      OR (SELECT COUNT(*) FROM telemetry)<>30 OR (SELECT COUNT(*) FROM alerts)<>3
      OR (SELECT COUNT(*) FROM component_findings)<>1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Frontend demo record counts do not match';
  END IF;
  IF EXISTS(SELECT 1 FROM flights WHERE mission_id IN (2,5)) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='A blocked preflight attempt must not have a flight';
  END IF;
  IF EXISTS(SELECT 1 FROM missions WHERE is_current=1 AND status<>CASE id
      WHEN 1 THEN 'READY' WHEN 2 THEN 'WARNING' WHEN 3 THEN 'IN_PROGRESS'
      WHEN 4 THEN 'COMPLETED' WHEN 5 THEN 'FAILED' END) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Mission demonstration roles do not match';
  END IF;
  IF EXISTS(SELECT 1 FROM drones WHERE battery_percent<>100) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Current drone batteries must be 100 percent';
  END IF;
  IF (SELECT COUNT(*) FROM flights WHERE status='FLYING' AND drone_id=3 AND mission_id=3 AND route_progress_percent=43)<>1
     OR (SELECT COUNT(*) FROM drones WHERE status='IN_FLIGHT')<>1
     OR (SELECT COUNT(*) FROM drones WHERE status='OFFLINE')<>4
     OR (SELECT status FROM drones WHERE id=3)<>'IN_FLIGHT' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Active flight and drone state do not agree';
  END IF;
  IF (SELECT COUNT(*) FROM flights WHERE ended_at IS NOT NULL)<>4
     OR EXISTS(SELECT 1 FROM flights WHERE ended_at IS NOT NULL AND
       (TIMESTAMPDIFF(SECOND,started_at,ended_at)<>duration_sec OR
        (result='SUCCESS' AND route_progress_percent<>100))) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Historical flight duration or progress is inconsistent';
  END IF;
  IF (SELECT COUNT(*) FROM component_findings f JOIN alerts a ON a.id=f.alert_id
      JOIN drone_components c ON c.id=f.component_id JOIN demo_runs r ON r.id=f.run_id
      WHERE f.drone_id=2 AND f.mission_id=2 AND a.mission_id=f.mission_id
       AND a.component_id=f.component_id AND c.drone_id=f.drone_id AND r.component_id=f.component_id
       AND r.selected_fault=a.rule_code AND c.health_status=f.severity AND a.flight_id IS NULL)<>1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Finding, alert and selected run fault disagree';
  END IF;
  IF (SELECT COUNT(*) FROM weather_checks WHERE mission_id=5 AND recommendation='UNSAFE'
      AND wind_speed_10m_mps>10 AND visibility_m<2000)<>1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Weather incident measurements do not support the failure';
  END IF;
  SELECT 'PASS' AS verification, 'DRONE-DATA-2.1.0-R4-20261030' AS build_id;
END$$
DELIMITER ;
