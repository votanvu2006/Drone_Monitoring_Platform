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
