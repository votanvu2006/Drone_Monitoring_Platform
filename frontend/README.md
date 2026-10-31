# Drone Monitoring Platform frontend

React, TypeScript and Vite dashboard. The approved layouts use a shared shell with light/dark themes and a demo login session.

## Run locally

Start the canonical MySQL v2.1.0 database and API using `../backend/README.md`, then run:

```powershell
npm ci
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:3000`. For a deployed frontend, serve `/api` from the backend on the same origin or set `VITE_API_BASE_URL` to a suitable API base before building. If using a different origin, configure CORS at the API gateway.

With no saved demo session, every app URL shows Login. Enter any nonempty username and password to open Drones. Only a demo session flag is stored; credentials are not persisted. Log out clears the flag and returns to Login.

Live Flight, Flight History, flight details and Alerts load their runtime data from the API and show loading, error and empty states. Open a history flight code to load its details at `/flight-history?flight=FLIGHT-014`. Refreshing preserves the selected flight through the URL and reloads its data. A mission's View alert action opens `/alerts?drone=DRONE-005&mission=mission-005`; the exact filter survives refresh.

Fleet and Missions still use the canonical bundled snapshot pending #88. Static flight data sources (`*.static.ts`) and the standalone `/?screen=alerts` previews also use `data/frontend.snapshot.json`. API failures do not fall back to these fixtures.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

The browser suite uses API response fixtures for deterministic desktop/mobile layout and navigation checks. To exercise the Flight Operations and Alerts flows against a running API/MySQL database, start the backend, set `E2E_LIVE_API=1`, and run:

```powershell
$env:E2E_LIVE_API='1'
npm run test:browser -- --project=wide --grep 'live route|mission alerts'
```
