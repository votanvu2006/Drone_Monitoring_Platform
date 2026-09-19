# Drone Monitoring Platform — Data Pack v2.0.0

This is a deterministic MySQL data pack for a five-drone dashboard. Each drone owns the same 14-component hardware configuration. The 20 historical flights are distributed evenly across the fleet while respecting each drone's assigned scenario category.

Release identity: **DRONE-DATA-2.0.0-R1-20260919**. After every import, query data_pack_metadata before inspecting any scenario or component row. This makes an old database/volume immediately visible.

## Included data

| Entity | Rows |
| --- | ---: |
| data_pack_metadata | 1 |
| drone_models | 1 |
| drones | 5 |
| component_catalog | 14 |
| drone_components | 70 |
| flight_zones | 8 |
| simulation_scenarios | 9 |
| drone_scenario_pool | 9 |
| missions | 20 |
| waypoints | 90 |
| weather_runtime_config | 1 |
| weather_demo_profiles | 3 |
| drone_weather_demo_assignments | 5 |
| weather_checks | 9 |
| flights | 20 |
| telemetry | 6,000 |
| alert_rule_catalog | 14 |
| alerts | 24 |

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
