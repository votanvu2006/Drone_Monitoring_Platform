# Runtime invariants

- OFFLINE is a normal power state. DRONE_OFFLINE is an incident only when an online/in-flight drone unexpectedly misses its heartbeat.
- Switching a drone ON changes it to AVAILABLE and captures an authorized device/browser location; seed data does not contain a fabricated current location.
- Route validation runs before weather. Outside the allowed demo boundary or intersecting an active restricted polygon always blocks launch.
- A VALID mission only means route geometry passed. Weather still must be fresh and evaluated immediately before flight creation.
- Weather checks expire after ten minutes. CAUTION requires explicit acknowledgement; UNSAFE cannot be overridden.
- DEMO weather is visibly simulated. LIVE/Open-Meteo must remain disabled while its status is COMING_SOON and must never silently fall back to DEMO.
- The Live Map moves only from delivered, valid positions. GPS loss or heartbeat loss freezes the marker at the last-known coordinate.
- Buffered telemetry belongs in history after receipt; it must not be rendered retroactively as if it were the current live position.
- Drone - 003 first selects a propulsion scenario and then independently selects one of four arm positions. Telemetry, alerts and component health must all reference that same flight fault_position.
- Suspected propeller damage requires manual inspection. Metric recovery alone does not restore component health.
