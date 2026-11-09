# Drone Monitoring Platform frontend

React, TypeScript and Vite dashboard for the Drone Monitoring Platform. The app uses a shared shell, light/dark themes and a demo login session.

## Run locally

Start the MySQL v2.1.0 R6 database and backend API using `../backend/README.md`. Then, from `frontend/`, run:

```powershell
npm ci
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

Vite proxies `/api` to `http://127.0.0.1:3000`. For a deployed frontend, serve `/api` from the backend on the same origin or set `VITE_API_BASE_URL` before building. If using a different origin, configure CORS at the API gateway.

## Demo session

With no saved demo session, app URLs show Login. Enter any nonempty username and password to open Drones. Only a demo session flag is stored; credentials are not persisted. Logging out clears the flag and returns to Login.

## R6 data flow

Fleet, Missions, Live Flight, Flight History, flight details and Alerts load runtime data from the backend API. These pages show loading, error and empty states. API failures do not fall back to bundled fixtures.

All five drones start `OFFLINE`. Fleet cards remain visible, while Missions, Live Flight, Flight History and Alerts initially show empty results. Use the Fleet power controls to expose each drone's demo scenario:

| Drone | Mission after Power ON | Flight display |
| --- | --- | --- |
| DRONE-001 | `mission-001` is `READY` with planned waypoints | No flight code or history |
| DRONE-002 | `mission-002` is `WARNING` | No flight code or history |
| DRONE-003 | `mission-003` becomes `IN_PROGRESS` | `FLIGHT-003` appears in Missions and Live Flight |
| DRONE-004 | `mission-004` is `COMPLETED` | `FLIGHT-004` appears in Missions and Flight History |
| DRONE-005 | `mission-005` is `FAILED` before takeoff | No flight code or history; its weather alert is available |

Mission waypoints describe a **planned route**. They do not mean a drone visited those points. The Missions Flight column shows a code only when a flight has started or completed.

Open `FLIGHT-004` in Flight History to load its details at `/flight-history?flight=FLIGHT-004`. Refreshing preserves the selected flight through the URL and reloads its data. `FLIGHT-003` is active, so it appears in Live Flight rather than Flight History.

A mission's **View alert** action opens Alerts with the matching drone and mission filters, such as `/alerts?drone=DRONE-005&mission=mission-005`. The filters survive refresh and back/forward navigation.

Static data sources (`*.static.ts`) and standalone previews use `data/frontend.snapshot.json`. The browser tests use explicit API response fixtures for powered-on scenarios and a separate offline case.

## Checks

From `frontend/`, run:

```powershell
npm run typecheck
npm run lint
npx vitest run
npm run build
npm run test:browser
```

The browser suite checks navigation and layouts across wide, compact, tablet, mobile and landscape viewports. The default suite uses API fixtures and does not require the MySQL server.