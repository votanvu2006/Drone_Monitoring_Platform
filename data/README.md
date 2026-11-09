# Drone Monitoring Platform — MySQL Data Pack v2.1.0

**Build ID:** `DRONE-DATA-2.1.0-R6-20261109`

This is the active MySQL demo data pack in the repository.

## Contents

- 5 drones, 14 component definitions and 70 installed components.
- 5 current missions and 37 planned waypoints.
- 2 flights: FLIGHT-003 is ready to start when DRONE-003 is powered on; FLIGHT-004 is completed.
- 1 Flight History record for FLIGHT-004.
- Sparse synthetic telemetry observations, 3 alerts and 1 component finding.
- MySQL schema, seed data, procedures, verification SQL, manifest and frontend snapshot.

## Start MySQL

Run from the repository root:

```powershell
docker compose -f .\data\docker-compose.yml config --quiet
docker compose -f .\data\docker-compose.yml up -d --wait --wait-timeout 180
docker compose -f .\data\docker-compose.yml ps

The database is drone_monitoring_frontend. The default host port is 3307; set DEMO_MYSQL_PORT to use another port.

MySQL imports the SQL seed only when Docker creates an empty volume. Restarting an existing container does not replace its data. To keep an older data pack, use a different Compose project name and port:
$env:DEMO_MYSQL_PORT = "3316"
docker compose -p drone-monitoring-r6-local -f .\data\docker-compose.yml up -d --wait

Point backend/.env at the selected host port.
Verify the pack
From the repository root, check the generated snapshot:
node .\data\tools\check-snapshot.mjs

In backend/, verify the build ID and table counts of the MySQL instance selected in .env:
npm run wait:data-pack
npm run test:integration

Regenerate SQL and snapshot files
After intentionally editing records.json or the SQL source, run from the repository root:
node .\data\tools\build-sql.mjs
node .\data\tools\generate-snapshot.mjs
node .\data\tools\check-snapshot.mjs

build-sql.mjs generates seed.sql and init/00-frontend-demo.sql. The initialization SQL is intended for an empty MySQL volume.
R6 demo behavior
All five drones start OFFLINE with 100% battery. Fleet cards remain visible so each drone can be powered on. Missions, Live Flight, Flight History and Alerts expose records only for powered-on drones. The raw seed and generated snapshot retain the planned missions and historical record while drones are off.
Drone	After Power ON	Mission	Flight
DRONE-001	AVAILABLE	mission-001 is READY; its waypoints are a planned route	None
DRONE-002	MAINTENANCE	mission-002 is WARNING	None before confirmation and safe preflight
DRONE-003	IN_FLIGHT	mission-003 becomes IN_PROGRESS	FLIGHT-003 becomes active and appears in Live Flight
DRONE-004	AVAILABLE	mission-004 is COMPLETED	FLIGHT-004 appears in Flight History
DRONE-005	AVAILABLE	mission-005 is FAILED before takeoff	None; its weather alert remains available


A planned waypoint does not mean the drone visited that point. DRONE-002 requires confirmation and safe preflight before flying. DRONE-005 was blocked by unsafe weather before takeoff, so it has no flight record. Power OFF is prohibited while DRONE-003 is in flight.