# Drone Monitoring Platform

Drone Monitoring Platform is a demo web application for monitoring a drone fleet, missions, flights, and alerts in one place. Users can power on drones, review assigned missions, follow an active flight, inspect flight history, and investigate related incidents.

The current demo integrates four modules: **Fleet, Missions, Flight Operations, and Alerts**. It uses simulated data and does not control physical drones.

## Tech stack

| Component | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Backend API | Node.js, TypeScript, Express |
| Database | MySQL 8.4 with Docker Compose |
| Testing | Vitest, Supertest, Playwright |

The frontend calls the backend through `/api`. The backend reads and updates MySQL. During local development, Vite proxies `/api` requests to `http://127.0.0.1:3000`.

## Features

- **Demo login:** enter any nonempty username and password. The application stores only a demo session flag, not the credentials.
- **Fleet:** view five drones, their status, details, and components; power drones on or off according to their state.
- **Missions:** view mission status, planned waypoints, alerts, and a flight code when a flight exists.
- **Live Flight:** follow an active flight, its route, and its progress.
- **Flight History:** review ended flights and inspect their route, telemetry summary, and events.
- **Alerts:** view, filter, and resolve incidents; open matching alerts from a mission.

A **mission waypoint is part of a planned route**. It does not mean the drone visited that point. Flight History contains flights that have ended.

## R6 demo scenarios

The active data pack is **v2.1.0 R6**, build ID `DRONE-DATA-2.1.0-R6-20261109`. It contains 5 drones, 5 missions, 2 flights, and 1 Flight History record.

All five drones start `OFFLINE`. Fleet cards remain visible, while Missions, Live Flight, Flight History, and Alerts show records only for powered-on drones.

| Drone | After power on | Mission | Flight |
| --- | --- | --- | --- |
| DRONE-001 | `AVAILABLE` | `mission-001` is `READY` with a planned route | No flight yet |
| DRONE-002 | `MAINTENANCE` | `mission-002` is `WARNING` | No flight until its warning and preflight checks are resolved |
| DRONE-003 | `IN_FLIGHT` | `mission-003` becomes `IN_PROGRESS` | `FLIGHT-003` appears in Live Flight |
| DRONE-004 | `AVAILABLE` | `mission-004` is `COMPLETED` | `FLIGHT-004` appears in Flight History |
| DRONE-005 | `AVAILABLE` | `mission-005` is `FAILED` before takeoff | No flight; its weather alert remains visible |

`FLIGHT-003` is still active, so it does not appear in Flight History. DRONE-005 was blocked before takeoff, so it has no flight record.

## Run locally on a new machine

### Requirements

Install **Git**, **Node.js 24 or later**, and **Docker Desktop**. Start Docker Desktop before continuing.

### 1. Clone the repository

```powershell
git clone https://github.com/votanvu2006/Drone_Monitoring_Platform.git
cd Drone_Monitoring_Platform
```

### 2. Start MySQL

Run these commands from the repository root:

```powershell
docker compose -f .\data\docker-compose.yml up -d --wait
node .\data\tools\check-snapshot.mjs
```

MySQL uses host port `3307` by default. On the first start, Docker creates a volume and imports the R6 data pack. Restarting a container with an existing volume does not import the seed again.

### 3. Configure and start the backend

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Set `backend/.env` to match the default MySQL configuration:

```dotenv
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=drone_monitoring_frontend
DB_USER=drone_app
DB_PASSWORD=drone_app_password
```

Verify the data pack and start the API:

```powershell
npm run wait:data-pack
npm run dev
```

Keep this terminal running. Open `http://localhost:3000/api/health` to check the API. Interactive API documentation is available at `http://localhost:3000/api/docs`.

### 4. Start the frontend

Open another PowerShell terminal at the repository root:

```powershell
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`. Enter any nonempty username and password to access the demo.

If port `3307` is already in use, set `DEMO_MYSQL_PORT` before starting Docker Compose and set `DB_PORT` in `backend/.env` to the same port.

## Run checks

From the repository root, verify the generated snapshot:

```powershell
node .\data\tools\check-snapshot.mjs
```

From `backend/`, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run wait:data-pack
npm run test:integration
npm run build
```

Integration tests require the R6 MySQL data pack to be running.

From `frontend/`, run:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

Browser tests use API fixtures by default to check layouts and navigation. On a new machine, if the Playwright browser is missing, run `npx playwright install chromium` from `frontend/` and rerun `npm run test:browser`.

## Repository structure

```text
backend/   Express API, OpenAPI documentation, and backend tests
frontend/  React application and frontend tests
data/      MySQL schema, seed, manifest, snapshot, and verification tools
```

See `backend/README.md`, `frontend/README.md`, and `data/README.md` for module-specific details.
