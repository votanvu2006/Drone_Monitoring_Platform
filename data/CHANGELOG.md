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
