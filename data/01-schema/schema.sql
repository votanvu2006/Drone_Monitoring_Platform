SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS alerts;
DROP TABLE IF EXISTS telemetry;
DROP TABLE IF EXISTS flights;
DROP TABLE IF EXISTS weather_checks;
DROP TABLE IF EXISTS waypoints;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS flight_zones;
DROP TABLE IF EXISTS drone_components;
DROP TABLE IF EXISTS drones;

CREATE TABLE drones (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  drone_code VARCHAR(30) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  serial_number VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  image_url VARCHAR(500) NULL,
  status ENUM('AVAILABLE','IN_USE','OFFLINE') NOT NULL DEFAULT 'AVAILABLE',
  home_latitude DECIMAL(10,7) NOT NULL,
  home_longitude DECIMAL(10,7) NOT NULL,
  max_flight_time_minutes SMALLINT UNSIGNED NOT NULL,
  max_speed_mps DECIMAL(6,2) NOT NULL,
  recommended_max_wind_mps DECIMAL(6,2) NOT NULL,
  battery_capacity_mah INT UNSIGNED NOT NULL,
  last_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE drone_components (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  drone_id BIGINT UNSIGNED NOT NULL,
  component_type ENUM('FRAME','PROPELLER','MOTOR','BATTERY','FLIGHT_CONTROLLER','GPS','SENSOR','CAMERA') NOT NULL,
  name VARCHAR(120) NOT NULL,
  position VARCHAR(50) NOT NULL,
  model VARCHAR(120) NOT NULL,
  primary_function VARCHAR(255) NOT NULL,
  installed BOOLEAN NOT NULL DEFAULT TRUE,
  display_order SMALLINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_component_drone FOREIGN KEY (drone_id) REFERENCES drones(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE flight_zones (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  zone_code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  zone_type ENUM('ALLOWED','RESTRICTED') NOT NULL,
  boundary_geojson JSON NOT NULL,
  reason VARCHAR(255) NULL,
  display_color CHAR(7) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE missions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mission_code VARCHAR(30) NOT NULL UNIQUE,
  drone_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  status ENUM('DRAFT','READY','RUNNING','COMPLETED','FAILED') NOT NULL,
  validation_status ENUM('NOT_CHECKED','VALID','INVALID') NOT NULL DEFAULT 'NOT_CHECKED',
  validation_message VARCHAR(500) NULL,
  planned_altitude_m DECIMAL(6,2) NOT NULL,
  planned_speed_mps DECIMAL(6,2) NOT NULL,
  estimated_distance_m DECIMAL(10,2) NOT NULL,
  estimated_duration_sec INT UNSIGNED NOT NULL,
  progress_percent TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_mission_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
  CONSTRAINT chk_mission_progress CHECK (progress_percent BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE waypoints (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mission_id BIGINT UNSIGNED NOT NULL,
  sequence_number SMALLINT UNSIGNED NOT NULL,
  waypoint_type ENUM('START','INTERMEDIATE','DESTINATION') NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude_m DECIMAL(6,2) NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_waypoint_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  CONSTRAINT uq_waypoint_sequence UNIQUE (mission_id, sequence_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE weather_checks (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  mission_id BIGINT UNSIGNED NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  condition_code VARCHAR(50) NOT NULL,
  temperature_c DECIMAL(5,2) NULL,
  wind_speed_mps DECIMAL(6,2) NOT NULL,
  wind_direction_deg SMALLINT UNSIGNED NOT NULL,
  is_raining BOOLEAN NOT NULL,
  precipitation_mm DECIMAL(6,2) NOT NULL,
  visibility_m INT UNSIGNED NOT NULL,
  recommendation ENUM('SAFE','CAUTION','UNSAFE') NOT NULL,
  reason VARCHAR(500) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  provider_observed_at DATETIME NULL,
  checked_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  raw_response JSON NULL,
  CONSTRAINT fk_weather_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  INDEX idx_weather_mission_time (mission_id, checked_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE flights (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  flight_code VARCHAR(30) NOT NULL UNIQUE,
  drone_id BIGINT UNSIGNED NOT NULL,
  mission_id BIGINT UNSIGNED NULL,
  status ENUM('READY','FLYING','PAUSED','RETURNING','LANDED') NOT NULL,
  result ENUM('SUCCESS','FAILED') NULL,
  started_at DATETIME NULL,
  ended_at DATETIME NULL,
  duration_sec INT UNSIGNED NOT NULL DEFAULT 0,
  distance_m DECIMAL(10,2) NOT NULL DEFAULT 0,
  start_battery_percent TINYINT UNSIGNED NULL,
  end_battery_percent TINYINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_flight_drone FOREIGN KEY (drone_id) REFERENCES drones(id),
  CONSTRAINT fk_flight_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  INDEX idx_flight_drone_status (drone_id, status),
  INDEX idx_flight_mission (mission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE telemetry (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  flight_id BIGINT UNSIGNED NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  altitude_m DECIMAL(7,2) NOT NULL,
  speed_mps DECIMAL(7,2) NOT NULL,
  heading_deg DECIMAL(5,2) NOT NULL,
  battery_percent TINYINT UNSIGNED NOT NULL,
  gps_quality ENUM('GOOD','FAIR','POOR','LOST') NOT NULL,
  gps_satellites TINYINT UNSIGNED NOT NULL,
  signal_percent TINYINT UNSIGNED NOT NULL,
  wind_speed_mps DECIMAL(6,2) NOT NULL,
  wind_direction_deg SMALLINT UNSIGNED NOT NULL,
  CONSTRAINT fk_telemetry_flight FOREIGN KEY (flight_id) REFERENCES flights(id),
  INDEX idx_telemetry_flight_time (flight_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE alerts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  alert_code VARCHAR(30) NOT NULL UNIQUE,
  flight_id BIGINT UNSIGNED NULL,
  mission_id BIGINT UNSIGNED NULL,
  severity ENUM('WARNING','CRITICAL') NOT NULL,
  type ENUM('LOW_BATTERY','GPS_LOST','COMMUNICATION_LOST','DRONE_OFFLINE','MISSION_FAILED','RESTRICTED_FLIGHT_ZONE','UNSAFE_WEATHER') NOT NULL,
  message VARCHAR(500) NOT NULL,
  status ENUM('ACTIVE','RESOLVED') NOT NULL,
  detected_at DATETIME NOT NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  CONSTRAINT fk_alert_flight FOREIGN KEY (flight_id) REFERENCES flights(id),
  CONSTRAINT fk_alert_mission FOREIGN KEY (mission_id) REFERENCES missions(id),
  CONSTRAINT chk_alert_owner CHECK (flight_id IS NOT NULL OR mission_id IS NOT NULL),
  INDEX idx_alert_status_time (status, detected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

