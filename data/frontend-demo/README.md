# Frontend-aligned MySQL data pack 2.1.0

## Contents

MySQL schema/seed, one transactional demo-run selector, verification, frontend export tools and a generated frontend snapshot. The five current missions use the agreed READY/WARNING/IN_PROGRESS/COMPLETED/FAILED roles. Two additional mission records exist only to own older actual flights.

- 5 drones; 14 component definitions; 70 installed parts.
- 5 current missions plus 2 historical mission references; 53 waypoints.
- 1 active flight and 3 ended flights; every ended flight has detail data.
- 25 sparse synthetic route observations and 7 flight events. These are not a two-second playback stream.
- 1 selected component finding for DRONE-002 and 1 matching component alert.
- 1 weather alert for DRONE-005, supported by the retained UNSAFE weather fixture.
- No flight for the current blocked attempt on DRONE-002 or DRONE-005.
- Current battery values are 100%; recorded end batteries belong to historical flights.

The imported operating snapshot has DRONE-003 IN_FLIGHT and the other drones AVAILABLE. It is a monitoring snapshot, not a claim that every aircraft has just powered on. Power toggling in the existing frontend remains a frontend demonstration interaction; exporting MySQL again restores the database snapshot.

The schema contains 17 tables. A single NORMAL scenario definition is retained solely for the existing flight-list API join; no scenario-selection UI or old random scenario pool is added. Weather profiles/checks support the weather incident; no standalone weather page is introduced.

## Start on Windows

Run from the repository root after applying the update files:

```powershell
docker compose -f data/docker-compose.yml config
docker compose -f data/docker-compose.yml up -d --wait --wait-timeout 180
```

The container uses a new project/volume, a loopback-only host port 3307 and a separate database. Existing port-3306 data is preserved. Initialization runs only on an empty new volume. Recreating or restarting a container does not rerun seed SQL on an existing volume.

No `down -v` or automatic deletion of old data is required.

## Backend environment

Keep existing `PORT` or unrelated settings. Set these values in `backend/.env`:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=drone_monitoring_frontend
DB_USER=drone_app
DB_PASSWORD=drone_app_password
DATA_PACK_PROFILE=frontend-demo
```

`backend/.env.frontend-demo.example` contains the complete default example. Do not blindly overwrite a customized `.env`. If using custom Docker credentials, edit the matching backend values as well.

Compose uses **DEMO_MYSQL_*** names so an old `data/.env` containing MYSQL_* does not accidentally select the old database or volume. Custom values can be supplied with:

```powershell
docker compose --env-file data/frontend-demo/.env -f data/docker-compose.yml up -d --wait
```

The `.env.example` lists supported variables. `New-DemoRun.ps1` and `Verify-DemoData.ps1` use the standard Compose file; use environment variables in the same shell for custom Compose settings, or run the equivalent Compose commands with your `--env-file` explicitly. Changing a password variable does not reset accounts inside an already initialized MySQL volume.

## Verify and export

```powershell
npm --prefix backend ci
npm --prefix backend run wait:data-pack
npm --prefix backend run test:demo
npm --prefix backend run data:export
powershell -ExecutionPolicy Bypass -File data/frontend-demo/Verify-DemoData.ps1
npm --prefix frontend ci
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run dev
```

The SQL verification checks build identity, counts, blocked-attempt exclusion, state consistency, matching component ownership and timing. The MySQL integration tests also exercise the existing mission/flight read APIs and all component-fault arm variants.

**Frontend delivery boundary:** pages currently import the generated snapshot. Starting MySQL does not itself switch those pages to live REST requests. `data:export` reads one consistent MySQL transaction and writes the JSON consumed by the pages. Stop/restart the dev server or refresh only after export finishes. Deploying the frontend requires a rebuild after an export. Full live API adapters remain a separate integration step.

## Select a new component fault

```powershell
powershell -ExecutionPolicy Bypass -File data/frontend-demo/New-DemoRun.ps1
```

This selects and persists a random motor/propeller/GPS case, verifies it and exports the same selection to the frontend. Repeated random runs may select the same fault; changing page or refreshing never chooses another one.

For reproducible review:

```powershell
powershell -ExecutionPolicy Bypass -File data/frontend-demo/New-DemoRun.ps1 -Seed 0
```

Seed modulo 3 chooses motor/propeller/GPS; floor(seed/3) modulo 4 chooses the motor/propeller arm. Seeds 0–11 cover four motor arms, four propeller arms and the GPS case. This is a **demo data command**, not Start Mission; it creates no flight.

For a non-PowerShell workflow, call `CALL start_demo_run(NULL); CALL verify_frontend_demo();` using the MySQL client, then run `npm --prefix backend run data:export` with the configured backend environment.

## Regeneration

`records.json` and `frontend.snapshot.json` are generated exports. The SQL initialization seed represents the chosen release snapshot. Exporting a random runtime run changes JSON; it does not silently rewrite the release seed.

For an intentional seed-data change, review `records.json`, update the manifest counts if necessary, then run:

```powershell
node data/frontend-demo/tools/build-sql.mjs
node data/frontend-demo/tools/generate-snapshot.mjs
node data/frontend-demo/tools/check-snapshot.mjs
```

`build-sql` combines schema, seed and procedures into the one init SQL file. Do not manually import that file into a populated database: it contains schema recreation statements and is intended for initialization of a separate empty demo volume.

The legacy suite uses `data/docker-compose.legacy.yml` and `DATA_PACK_PROFILE=legacy`. Do not run legacy integration assertions against the new database: they deliberately expect different rows and build identity.
