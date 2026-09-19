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
