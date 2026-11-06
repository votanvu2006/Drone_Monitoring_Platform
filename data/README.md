# Drone Monitoring Platform — MySQL Data Pack v2.1.0

**Build ID:** `DRONE-DATA-2.1.0-R5-20261106`

This is the active MySQL demo data pack in the repository.

## Contents

- 5 drones, 14 component definitions and 70 installed components.
- 9 mission records: 5 current missions and 4 historical references.
- 66 waypoints.
- 5 flights: 1 ready flight for DRONE-003 and 4 ended historical flights.
- 26 sparse synthetic telemetry observations from historical flights.
- 3 alerts and 1 component finding.
- MySQL schema, seed data, procedures, verification SQL, manifest and frontend snapshot.

## Start MySQL

Run from the repository root:

```powershell
docker compose -f .\data\docker-compose.yml config --quiet
docker compose -f .\data\docker-compose.yml up -d --wait --wait-timeout 180
docker compose -f .\data\docker-compose.yml ps
```

The database is `drone_monitoring_frontend`. The host port is `3307`. Demo credentials are defined by the `DEMO_MYSQL_*` variables in `.env.example`.

MySQL initialization runs only when Docker creates an empty volume. Restarting the container does not re-import the seed.

## Verify the pack

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\data\Verify-DemoData.ps1
```

The script runs the MySQL verification SQL and checks that the generated frontend snapshot matches `records.json`.

## Select a demo run

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\data\New-DemoRun.ps1
```

For a repeatable selection:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\data\New-DemoRun.ps1 -Seed 0
```

This selects and verifies a component-fault scenario in MySQL. It does not update the frontend snapshot or connect the frontend to MySQL; that integration is planned separately.

## Regenerate SQL and snapshot files

After intentionally editing `records.json` or `schema.sql`, run:

```powershell
node .\data\tools\build-sql.mjs
node .\data\tools\generate-snapshot.mjs
node .\data\tools\check-snapshot.mjs
```

`build-sql.mjs` generates `seed.sql` and `init/00-frontend-demo.sql`. The initialization SQL is intended for an empty MySQL volume.


## R5 initial state and activation scenarios

All five drones start OFFLINE with 100% battery. Fleet cards remain visible
so each drone can be powered on. The mission, alert, live flight and flight
history pages must only expose records for powered-on drones. Records are
retained while a drone is off. This visibility rule belongs to the API/UI
integration; the raw seed and generated snapshot retain the scenario records.

| Drone | Status after Power ON | Current mission |
| --- | --- | --- |
| DRONE-001 | AVAILABLE | READY |
| DRONE-002 | MAINTENANCE | WARNING |
| DRONE-003 | IN_FLIGHT | IN_PROGRESS |
| DRONE-004 | AVAILABLE | COMPLETED |
| DRONE-005 | AVAILABLE | FAILED |

DRONE-002 can fly from WARNING only after explicit confirmation and safe
preflight checks; its drone status then becomes IN_FLIGHT. Mission-005 is
blocked by dangerous weather and does not create a flight. Turning on
DRONE-003 must transactionally start FLIGHT-015 and update mission-003.
Power OFF is prohibited during flight. DRONE-004 and DRONE-005 are
AVAILABLE after Power ON despite their finished/failed missions.
