# Backend API

TypeScript/Express API for the Drone Monitoring Platform. The MySQL database and seed data are defined in `../data/`.

## Local setup

Use Node.js 24 or later and Docker. From the repository root, start MySQL:

```powershell
cd data
docker compose up -d
cd ..
```

MySQL initializes from the data pack only when its Docker volume is empty. Do not delete a volume to restart the API.

In `backend/`, install dependencies and make a local configuration file:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Edit `.env` and set `DB_PASSWORD` to the `MYSQL_PASSWORD` configured for the `data/` container. The data pack's sample configuration uses `drone_app` and `drone_monitoring_frontend`; if you changed them, update `DB_USER` and `DB_NAME` too. `.env` is ignored by Git.

Run `npm run dev`. Open `http://localhost:3000/api/health`; a running API returns `{ "status": "ok" }`. Interactive OpenAPI documentation is available at `http://localhost:3000/api/docs`, with its JSON document at `/api/openapi.json`. The server verifies its database connection before listening. If MySQL is unavailable or credentials are wrong, startup exits with a clear error.

The canonical v2.1.0 R5 database (`DRONE-DATA-2.1.0-R5-20261106`) uses port 3307 and database `drone_monitoring_frontend`. The Flight Operations and Alerts read APIs support the existing dashboard:

- `GET /api/missions?isCurrent=true`: paginated current missions for powered-on drones, including `waypointCount`. `isCurrent=false` selects historical references; omitting it selects both. The response retains numeric `id`, `missionCode`, nested `drone`, and the existing list fields. R5 statuses include `WARNING` and `IN_PROGRESS`.
- `GET /api/flights`: paginated flight attempts for powered-on drones, including READY flights.
- `GET /api/flights/active`: active flights with mission waypoints, current waypoint and route progress.
- `GET /api/flights/history`: ended flights with a recorded result, ordered by start time. Blocked preflight missions do not create history entries.
- `GET /api/flights/{flightCode}`: one historical flight with its mission route, stored battery values, telemetry aggregates and ordered flight events. Unknown or unfinished flights, and flights owned by OFFLINE drones, return `404`.
- `GET /api/alerts`: paginated incident data with drone, mission and component identities. Supports `droneCode`, `missionCode`, status, severity, source and existing numeric owner filters. Preflight alerts may have a null `flight_id`.

All mission, flight and alert reads exclude drones whose status is `OFFLINE`; list counts and rows use the same visibility rule. Mission detail also returns `404` for an OFFLINE owner. The raw seed/snapshot retain records while the drone is off. A fresh R5 import therefore returns empty mission, alert, live and history lists. `FLIGHT-015` is READY with no telemetry/events and cannot become active as a side effect of a read. Power-state transitions and transactional activation are tracked in #90 and are not implemented here.

New flight view timestamps are UTC ISO strings. Alert DATETIME strings are UTC and are formatted as ICT in the frontend. Missing telemetry aggregates remain null.

The older Airspace, Weather and Simulation routes still depend on tables removed from v2.1.0 and need their own migration before use. Fleet migration and the remaining Missions work are tracked separately in #84 and #85; the current-mission read adapter required by #77 is included here. This change does not enable flight creation, playback, real-time streaming or flight controls.

## Checks

From `backend/`:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

`npm test` runs the unit tests and does not require MySQL. To run the MySQL-backed integration tests, first make sure the v2.1.0 data-pack database is available. From the repository root, start it with:

```powershell
docker compose -f data/docker-compose.yml up -d --wait
```

Then, from `backend/`, run:

```powershell
npm run wait:data-pack
npm run test:integration
```

`wait:data-pack` waits for the v2.1.0 build ID and expected seed counts before the tests run. This matters with a fresh database volume: MySQL may respond before the data-pack initialization script has finished. The command does not modify seed data or reset/delete the MySQL volume. The integration tests then load database settings from `.env`, check the Fleet baseline, and read the seeded drone list through the API. If the readiness check times out, inspect the configured database before changing or resetting any local data.

`npm start` runs the compiled `dist/server.js` after building. Unknown routes return `404` with `{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }`. Malformed JSON returns `400` with code `INVALID_JSON`. Unhandled failures return `500` with code `INTERNAL_ERROR`.

`/api/health` checks whether the API process is responding. It is not a database health report; the database is checked during startup.

## Focused Flight Operations and Alerts checks

With the v2.1.0 database available and the `DB_*` variables configured, run:

```powershell
npx vitest run tests/integration/flight-operations.mysql.test.ts tests/integration/alerts.mysql.test.ts tests/integration/missions.mysql.test.ts tests/integration/mission-visibility.mysql.test.ts --no-file-parallelism
```

Run integration tests against a disposable R5 database. These 21 tests cover the offline baseline, per-drone visibility, current/historical mission filters, flight details, pagination, preflight alert ownership, and alert lifecycle. Powered-on and active-flight fixtures restore the database state afterward; they do not implement the power API or rewrite seed files.

The full integration command remains enabled. On R5 it currently has 23 passing and 8 failing tests: Airspace (3), Weather (3), and Simulation (2). The legacy modules still query removed `flight_zones`, `weather_runtime_config`, and `drone_scenario_pool` tables. Full backend CI is not green until those separate migrations are completed; do not restore old tables or skip their suites to hide the failures.
