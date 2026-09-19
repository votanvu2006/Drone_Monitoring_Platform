# Final data audit — v2.0.0

Build: DRONE-DATA-2.0.0-R1-20260919  
Automated result: **PASS** (42/42 checks)  
Scope: deterministic project/demo fixtures prepared for backend integration. This is not certified flight, airspace, weather or maintenance data.

## Table-by-table contract

| Table | Rows | Purpose | Data basis | Backend use and key link |
| --- | ---: | --- | --- | --- |
| data_pack_metadata | 1 | Identifies the installed release | Release metadata | Query first; no business FK |
| drone_models | 1 | Shared aircraft reference envelope | Public DJI reference adapted to a fictional simulated model | drones.drone_model_id |
| drones | 5 | Fleet identities and power/location state | Project fixture | All five boot OFFLINE; runtime ON captures authorized geolocation |
| component_catalog | 14 | Reusable 14-part quadcopter layout | Project domain model | Four motors, four propellers and six shared systems |
| drone_components | 70 | Installed serialized parts and health | Synthetic fixture | 14 rows per drone; alerts may point to a part |
| flight_zones | 8 | One allowed HCMC demo boundary and seven restrictions | Synthetic demo geometry | Route gate; never treat as official airspace |
| simulation_scenarios | 9 | Reusable normal/fault recipes | Project simulation policy | Selected at flight creation; propulsion arm stays generic here |
| drone_scenario_pool | 9 | Weighted per-drone runtime choices | Approved demo design | Drone 001–004 weights total 100; Drone 005 has no fault pool |
| missions | 20 | Route plans and validation lifecycle | Synthetic fixture | One mission may have multiple flight attempts |
| waypoints | 90 | Ordered route geometry | Synthetic fixture | mission_id plus sequence_number |
| weather_runtime_config | 1 | Selects DEMO now and LIVE later | Project policy | DEMO available; Open-Meteo LIVE marked COMING_SOON |
| weather_demo_profiles | 3 | Deterministic SAFE/CAUTION/UNSAFE values | Synthetic fixture evaluated by project thresholds | Avoids presentation failure caused by real weather |
| drone_weather_demo_assignments | 5 | Maps each drone to a demo profile | Approved demo design | Drone 001–004 SAFE; Drone 005 CAUTION |
| weather_checks | 9 | Example route snapshots | Expired synthetic fixture | Must be regenerated for submitted coordinates; never authorizes current launch |
| flights | 20 | Historical mission attempts | Synthetic fixture | Four per drone; stores scenario and concrete fault_position |
| telemetry | 6000 | Position, power, propulsion, health and link samples | Physically plausible synthetic time series | 300 rows per flight at two-second intervals |
| alert_rule_catalog | 14 | Stable incident definitions | Project simulation/lifecycle policy | Drives type, source and default severity |
| alerts | 24 | Historical incident lifecycles | Derived from seeded scenarios/telemetry and preflight gates | Links mission/flight and optionally installed component |

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

After import, data_pack_metadata must return version **2.0.0**, revision **1**, build **DRONE-DATA-2.0.0-R1-20260919**; telemetry must return **6,000** rows; legacy MOTOR_OVERHEAT_FL and PROPELLER_DAMAGE_FL scenario rows must return **0**.
