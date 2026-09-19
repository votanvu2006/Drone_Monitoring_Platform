# Simulation and alert engine

## Runtime loop

Every two seconds, load the selected scenario, compute the next route position, generate internally consistent flight/energy/health fields, save one telemetry row, then evaluate health-alert-rules.json in the same logical cycle.

At flight creation, randomly select from the enabled weighted pool for that drone and persist the chosen simulation_scenario_id on the flight. Drone - 001 always selects NORMAL; Drone - 002 selects a power fault; Drone - 003 selects a propulsion/thermal fault; Drone - 004 selects a navigation/communication fault. Drone - 005 has no random in-flight fault pool: route and weather are evaluated first, and a launch accepted after CAUTION uses NORMAL.

For Drone - 003, scenario selection and component-position selection are separate. After selecting MOTOR_OVERHEAT or PROPELLER_DAMAGE, choose FRONT_LEFT, FRONT_RIGHT, REAR_LEFT or REAR_RIGHT with equal probability and persist it as flights.fault_position. Use that one value to select the telemetry RPM/temperature channel, alert component_id and final component-health update. Do not encode a permanent arm in the reusable scenario code.

Random runtime selection is not the mechanism that guarantees demo coverage. Historical seed flights must contain at least one example of every enabled fault so Alerts and Flight History always show the complete catalog even if future random draws repeat. The four Drone - 003 seed flights deliberately cover front-left, front-right, rear-left and rear-right once each.

For each rule, count consecutive bad samples. When the count reaches the threshold, upsert by (flight_id, rule_code, ACTIVE): create one alert or update its last_observed_at and worst observed value. Do not create a new row every two seconds.

Recovery uses a separate threshold and more consecutive samples (hysteresis) to prevent alert flicker. PROPELLER_DAMAGE_SUSPECTED is manual-resolution-only. When a critical flight fault fires, change flight state to RETURNING or ABORTED, record the reason, and end with RETURNED_SAFELY or FAILED.

## Correct interpretation of simulated hardware data

- Motor RPM is a plausible synthetic signal for dashboard behavior; it is not reverse-engineered DJI telemetry.
- An RPM difference alone does not prove a broken propeller. This package emits “suspected damage” only when critical RPM imbalance and excessive vibration coexist.
- Battery percent and voltage are different signals. A voltage-sag scenario can be critical before percent reaches zero.
- Temperature alerts require consecutive samples; one spike should not generate an incident.
- Historical Flight 12 leaves Drone - 003's rear-right propeller in FAULT and its rear-right motor in WARNING. Earlier seed flights exercise the other three arms. All five drone power states still boot OFFLINE because power state and component health are independent.

## Live Flight map contract

Query telemetry by received_at, not only recorded_at. At playback time T, the frontend may consume only rows whose received_at <= T.

- Move the marker only when position_is_valid = true and position_source = GNSS or ESTIMATED.
- During GPS loss, retain the previous coordinate and label it Last known location. Do not follow changing coordinates from an invalid row.
- During SIGNAL_LOSS, rows marked BUFFERED arrive after recovery. Store/replay them in history, but do not jump the live marker through old points as though they were current.
- During UNEXPECTED_OFFLINE, the stream ends and heartbeat_age_seconds reaches the backend timeout. Freeze the marker and show DRONE_OFFLINE.
- FAILED hardware flights stop at their final emergency coordinate. RETURNED_SAFELY flights follow the generated return segment back toward the start.
- Follow Drone is therefore a camera behavior around the newest delivered valid coordinate; it does not calculate a route and it does not depend on having every HCMC coordinate in advance.

The telemetry wind fields are derived from the assigned simulated weather profile for visual consistency. This MVP does not implement wind-vector physics or coordinate drift; route position changes come from the scenario engine only.
