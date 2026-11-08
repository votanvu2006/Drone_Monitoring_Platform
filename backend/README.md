# Backend API

TypeScript and Express API for the Drone Monitoring Platform. The demo uses the MySQL v2.1.0 R5 data pack in `../data/`, identified by `DRONE-DATA-2.1.0-R5-20261106`.

## Demo scope

The enabled API modules are Fleet, Missions, Flight Operations, and Alerts. Airspace validation, weather checks, and flight simulation are outside this demo build. Their routes, source modules, tests, and OpenAPI entries are not included.

The R5 database still contains `simulation_scenarios`: the Flight list reads its scenario code. This table does not enable a simulation API or two-second telemetry playback.

Interactive API documentation is available at `/api/docs`; its JSON document is at `/api/openapi.json`.

## R5 behavior

All five drones start `OFFLINE`. Their stored missions, historical flights, and alerts remain in MySQL, but the Mission list, Flight reads, and Alerts list show records only for powered-on drones. A fresh R5 import therefore returns five Fleet drones and empty Mission, Live Flight, Flight History, Flight list, and Alerts lists.

`GET /api/missions` returns only current missions belonging to powered-on drones. A historical mission can still be retrieved directly with `GET /api/missions/{missionId}`. Pagination totals use the same visibility filter as the returned rows.

Power changes are persisted through `PATCH /api/drones/{droneCode}/power` with `{ "isOn": true }` or `{ "isOn": false }`:

| Drone | Result when powered on |
| --- | --- |
| DRONE-001 | `AVAILABLE` |
| DRONE-002 | `MAINTENANCE`; its stored component alerts become visible |
| DRONE-003 | `IN_FLIGHT`; `mission-003` becomes `IN_PROGRESS` and `FLIGHT-015` becomes `FLYING` |
| DRONE-004 | `AVAILABLE` |
| DRONE-005 | `AVAILABLE`; its stored weather alert becomes visible |

A drone in `IN_FLIGHT` or `MAINTENANCE` cannot be switched off through this demo API. The power endpoint updates MySQL; refreshing a page reads the persisted status. It does not send a command to a physical drone.

## API endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the API process responds |
| `GET` | `/api/openapi.json` | Read the OpenAPI document |
| `GET` | `/api/docs` | Open interactive API documentation |
| `GET` | `/api/drones` | List drones with pagination and optional status filter |
| `GET` | `/api/drones/{droneCode}` | Read drone details, components, and findings |
| `PATCH` | `/api/drones/{droneCode}/power` | Persist a demo power transition |
| `GET` | `/api/missions` | List visible current missions with pagination and filters |
| `GET` | `/api/missions/{missionId}` | Read a current or historical mission and its waypoints |
| `GET` | `/api/flights` | List visible flight records with pagination and filters |
| `GET` | `/api/flights/active` | Read active flights and route progress |
| `GET` | `/api/flights/history` | Read ended flights with recorded results |
| `GET` | `/api/flights/{flightCode}` | Read a historical flight, telemetry summary, route, and events |
| `GET` | `/api/alerts` | List visible alerts with ownership and lifecycle filters |
| `PATCH` | `/api/alerts/{id}/resolve` | Resolve an alert and record the inspection result when required |

A `READY` flight is not an active flight. A blocked preflight attempt without a flight record does not appear in Flight History; its alert can belong directly to a mission. The telemetry in R5 consists of sparse stored observations, not a live stream.

Unknown routes return:

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }
```

Malformed JSON returns `400` with code `INVALID_JSON`. Unhandled server failures return `500` with code `INTERNAL_ERROR`.

## Local setup

Use Node.js 24 or later and Docker. From the repository root, start the R5 MySQL data pack:

```powershell
docker compose -f .\data\docker-compose.yml up -d --wait
```

The default host port is `3307`. MySQL imports the SQL seed only when Docker creates an empty volume. Restarting a container with an older R1 or R4 volume does not upgrade that volume to R5.

To keep an existing database and start a separate R5 instance, choose an unused host port and a distinct Compose project name. For example:

```powershell
$env:DEMO_MYSQL_PORT = "3315"
docker compose -p drone-monitoring-r5-local -f .\data\docker-compose.yml up -d --wait
```

Set `DB_PORT` in `backend/.env` to the host port you chose. In `backend/`, install dependencies and create local configuration:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` to match the running MySQL instance. The default demo database name is `drone_monitoring_frontend`. The `.env` file is ignored by Git.

Confirm the database build ID and seed counts before starting the API:

```powershell
npm run wait:data-pack
npm run dev
```

Open `http://localhost:3000/api/health`. The expected response is:

```json
{ "status": "ok" }
```

The server checks its MySQL connection before listening. `/api/health` checks the API process; it is not a separate database health report.

## Checks

From `backend/`, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run wait:data-pack
npm run test:integration
npm run build
```

Unit tests do not need MySQL. Integration tests require the R5 data pack and a disposable database instance because they exercise power and alert state. The tests restore their fixtures after each scenario.

`wait:data-pack` checks the build ID and expected table counts from `data/manifest.json`. It does not reset a volume or modify seed data. If it reports an older build ID, point `.env` to a separate R5 instance instead of assuming a container restart imported new data.

`npm run build` removes stale `dist` output before compiling, so removed modules are not included in the build. `npm start` runs the compiled `dist/server.js`.