# Backend API

TypeScript and Express API for the Drone Monitoring Platform. The demo uses the MySQL v2.1.0 R6 data pack in `../data/`, identified by `DRONE-DATA-2.1.0-R6-20261109`.

## Demo scope

The enabled API modules are Fleet, Missions, Flight Operations, and Alerts. Airspace validation, weather checks, and flight simulation are outside this demo build. Their routes and OpenAPI entries are not included.

The database contains `simulation_scenarios` so the Flight list can read a scenario code. This does not enable a simulation API or two-second telemetry playback.

Interactive API documentation is available at `/api/docs`; its JSON document is at `/api/openapi.json`.

## R6 behavior

All five drones start `OFFLINE`. Their stored missions, flights, and alerts remain in MySQL, but the Mission, Flight, and Alert APIs expose records only for powered-on drones. A fresh import therefore returns five Fleet drones and empty Mission, Live Flight, Flight History, Flight list, and Alerts responses.

`GET /api/missions` returns the five current missions when their drones are powered on. A mission can contain planned waypoints without an actual flight. The `flightCode` field is `null` until a flight has started or completed. Pagination totals use the same visibility filter as the returned rows.

Power changes are persisted through `PATCH /api/drones/{droneCode}/power` with `{ "isOn": true }` or `{ "isOn": false }`:

| Drone | Result when powered on |
| --- | --- |
| DRONE-001 | `AVAILABLE`; `mission-001` remains `READY` with a planned route and no flight |
| DRONE-002 | `MAINTENANCE`; `mission-002` remains `WARNING` with no flight |
| DRONE-003 | `IN_FLIGHT`; `mission-003` becomes `IN_PROGRESS` and `FLIGHT-003` becomes `FLYING` |
| DRONE-004 | `AVAILABLE`; completed `mission-004` links to `FLIGHT-004` in Flight History |
| DRONE-005 | `AVAILABLE`; `mission-005` failed before takeoff, so its weather alert has no flight |

`FLIGHT-003` belongs in Live Flight while it is active. `FLIGHT-004` is the completed Flight History record. DRONE-002 cannot fly until its warning is confirmed and preflight is safe. DRONE-005 has no flight record because its attempt was blocked before takeoff.

A drone in `IN_FLIGHT` or `MAINTENANCE` cannot be switched off through this demo API. Power changes update MySQL; refreshing a page reads the persisted status. The endpoint does not send a command to a physical drone.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the API process responds |
| `GET` | `/api/openapi.json` | Read the OpenAPI document |
| `GET` | `/api/docs` | Open interactive API documentation |
| `GET` | `/api/drones` | List drones with pagination and an optional status filter |
| `GET` | `/api/drones/{droneCode}` | Read drone details, components, and findings |
| `PATCH` | `/api/drones/{droneCode}/power` | Persist a demo power transition |
| `GET` | `/api/missions` | List visible missions with pagination and filters |
| `GET` | `/api/missions/{missionId}` | Read a mission and its planned waypoints |
| `GET` | `/api/flights` | List visible flight records with pagination and filters |
| `GET` | `/api/flights/active` | Read active flights and route progress |
| `GET` | `/api/flights/history` | Read ended flights with recorded results |
| `GET` | `/api/flights/{flightCode}` | Read a historical flight, telemetry summary, route, and events |
| `GET` | `/api/alerts` | List visible alerts with ownership and lifecycle filters |
| `PATCH` | `/api/alerts/{id}/resolve` | Resolve an alert and record the inspection result when required |

A `READY` flight is not active. A blocked preflight attempt without a flight record does not appear in Flight History; its alert can belong directly to a mission. Stored telemetry consists of sparse observations, not a live stream.

Unknown routes return:

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }

Malformed JSON returns 400 with code INVALID_JSON. Unhandled server failures return 500 with code INTERNAL_ERROR.
Local setup
Use Node.js 24 or later and Docker. From the repository root, start the MySQL data pack:
docker compose -f .\data\docker-compose.yml up -d --wait

The default host port is 3307. MySQL imports the seed only when Docker creates an empty volume; restarting an older volume does not upgrade it to R6.

To keep an existing database and start a separate R6 instance, choose an unused host port and a distinct Compose project name:
$env:DEMO_MYSQL_PORT = "3316"
docker compose -p drone-monitoring-r6-local -f .\data\docker-compose.yml up -d --wait

Set DB_PORT in backend/.env to the selected host port. Install dependencies and create local configuration in backend/:
cd backend
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }

Set DB_HOST, DB_PORT, DB_NAME, DB_USER, and DB_PASSWORD to match the running MySQL instance. The default demo database name is drone_monitoring_frontend. .env is ignored by Git.

Confirm the database build ID and seed counts, then start the API:
npm run wait:data-pack
npm run dev

Open http://localhost:3000/api/health. The expected response is:
{ "status": "ok" }

The server checks its MySQL connection before listening. /api/health checks the API process; it is not a separate database health report.
Checks
From backend/, run:
npm run typecheck
npm run lint
npm test
npm run wait:data-pack
npm run test:integration
npm run build

Unit tests do not need MySQL. Integration tests require the R6 data pack and a disposable database instance because they exercise power and alert state. The tests restore their fixtures after each scenario.

wait:data-pack checks the build ID and expected table counts from data/manifest.json. It does not reset a volume or modify seed data. If it reports an older build ID, point .env to a separate R6 instance instead of assuming a container restart imported new data.

npm run build removes stale dist output before compiling. npm start runs the compiled dist/server.js.