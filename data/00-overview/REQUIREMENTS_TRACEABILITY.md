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
