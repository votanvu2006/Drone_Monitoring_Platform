# Domain Context

| Term | Meaning in this project |
| --- | --- |
| Data pack identity | The singleton release signature stored in MySQL so developers can prove which pack and revision were imported. |
| Drone model | A reusable aircraft specification shared by multiple fleet instances. |
| Drone | One simulated aircraft instance with its own identity and operational state. |
| Component definition | A reusable description of a component type and position in the model configuration. |
| Installed component | A serialized component instance owned by one drone, with its own health and maintenance state. |
| Home location | The drone's fixed operational base. It does not move when the drone travels. |
| Last-known location | The newest coordinates reported for a drone. While the drone is OFFLINE this may be absent or stale; the UI may call it “current location” only while the drone is online and the snapshot is fresh. |
| Power switch | The user action that changes an OFFLINE simulated drone to AVAILABLE and captures the browser's current geolocation as the drone's starting position. |
| Mission | A planned route and its planning/validation lifecycle. It is not a flight attempt. |
| Flight | One execution attempt of a mission. A mission can have retries and therefore multiple flights. |
| Waypoint | An ordered route coordinate belonging to exactly one mission. |
| Telemetry sample | One timestamped flight observation containing position, energy, propulsion, environment and link-health values. |
| Position validity | Whether a telemetry coordinate is a current GNSS position or only the retained last-known position. |
| Transmission state | Whether a telemetry sample arrived live, arrived after degradation, was buffered, or was not delivered. |
| Flight zone | Demo-only GeoJSON used to exercise route validation. It is not official airspace data. |
| Weather check | A short-lived snapshot for a specific route location and validation run. New coordinates require a new backend API call. |
| Weather mode | The source context for a weather check. DEMO is available in the current project; LIVE/Open-Meteo is a planned mode marked Coming Soon. |
| Demo weather profile | A reusable simulated weather condition used only when Weather mode is DEMO. |
| Simulation scenario | A reusable normal or fault recipe that changes telemetry or connectivity during a flight. |
| Fault position | The concrete component position selected for one flight from a scenario template that supports runtime position selection. |
| Scenario pool | The weighted set of in-flight fault scenarios for Drone - 001 through Drone - 004. Drone - 005 instead receives a normal flight only after route and weather approval. |
| Alert rule | A catalog definition connecting a stable rule code to an alert type, source, severity and meaning. |
| Alert | A lifecycle event produced by a rule; repeated bad samples update one ACTIVE alert instead of creating duplicates. |
| Component health | Current maintenance state. It changes only after an incident or explicit inspection, not on every telemetry sample. |
