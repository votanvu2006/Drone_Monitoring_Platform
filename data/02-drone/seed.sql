INSERT INTO drones (`id`, `drone_code`, `display_name`, `model`, `serial_number`, `description`, `image_url`, `status`, `home_latitude`, `home_longitude`, `max_flight_time_minutes`, `max_speed_mps`, `recommended_max_wind_mps`, `battery_capacity_mah`, `last_seen_at`, `created_at`, `updated_at`) VALUES
  (1, 'DRONE-001', 'AeroVision X1', 'AV-X1', 'AVX1-2026-0001', 'Built for precise aerial monitoring.', '/assets/drone/aerovision-x1.png', 'IN_USE', 10.7769, 106.7009, 32, 18, 10, 5200, '2026-09-12 12:00:00', '2026-07-01 09:00:00', '2026-09-12 12:00:00');

INSERT INTO drone_components (`id`, `drone_id`, `component_type`, `name`, `position`, `model`, `primary_function`, `installed`, `display_order`, `created_at`, `updated_at`) VALUES
  (1, 1, 'FRAME', 'Carbon Fiber Frame', 'CENTER', 'AV-X1 Carbon Monocoque', 'Supports and protects all aircraft systems', TRUE, 1, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (2, 1, 'PROPELLER', 'Front Left Propeller', 'FRONT_LEFT', '9450 Low-Noise Propeller', 'Generates lift at the front-left arm', TRUE, 2, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (3, 1, 'PROPELLER', 'Front Right Propeller', 'FRONT_RIGHT', '9450 Low-Noise Propeller', 'Generates lift at the front-right arm', TRUE, 3, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (4, 1, 'PROPELLER', 'Rear Left Propeller', 'REAR_LEFT', '9450 Low-Noise Propeller', 'Generates lift at the rear-left arm', TRUE, 4, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (5, 1, 'PROPELLER', 'Rear Right Propeller', 'REAR_RIGHT', '9450 Low-Noise Propeller', 'Generates lift at the rear-right arm', TRUE, 5, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (6, 1, 'MOTOR', 'Front Left Motor', 'FRONT_LEFT', 'AV 2312 Brushless Motor', 'Drives the front-left propeller', TRUE, 6, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (7, 1, 'MOTOR', 'Front Right Motor', 'FRONT_RIGHT', 'AV 2312 Brushless Motor', 'Drives the front-right propeller', TRUE, 7, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (8, 1, 'MOTOR', 'Rear Left Motor', 'REAR_LEFT', 'AV 2312 Brushless Motor', 'Drives the rear-left propeller', TRUE, 8, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (9, 1, 'MOTOR', 'Rear Right Motor', 'REAR_RIGHT', 'AV 2312 Brushless Motor', 'Drives the rear-right propeller', TRUE, 9, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (10, 1, 'BATTERY', 'Flight Battery', 'CENTER_REAR', '4S LiPo 5200 mAh', 'Supplies power to the aircraft', TRUE, 10, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (11, 1, 'FLIGHT_CONTROLLER', 'Flight Controller', 'CENTER', 'AV-FC1', 'Stabilizes the aircraft and executes the route', TRUE, 11, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (12, 1, 'GPS', 'GNSS Module', 'TOP_CENTER', 'Dual-Band GNSS Module', 'Provides positioning and navigation data', TRUE, 12, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (13, 1, 'SENSOR', 'Vision and IMU Sensor Module', 'BOTTOM_FRONT', 'AV VisionSense', 'Supports obstacle awareness and flight stabilization', TRUE, 13, '2026-07-01 09:05:00', '2026-09-12 12:00:00'),
  (14, 1, 'CAMERA', 'Monitoring Camera', 'FRONT', '4K 3-Axis Gimbal Camera', 'Captures stabilized monitoring imagery', TRUE, 14, '2026-07-01 09:05:00', '2026-09-12 12:00:00');

