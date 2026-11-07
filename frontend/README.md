# Drone Monitoring Platform frontend

React, TypeScript and Vite dashboard. The approved layouts use a shared shell with light/dark themes and a demo login session.

## Run locally

Start the canonical MySQL v2.1.0 R5 database and API using `../backend/README.md`, then run:

```powershell
npm ci
npm run dev
```

Vite proxies `/api` to `http://127.0.0.1:3000`. For a deployed frontend, serve `/api` from the backend on the same origin or set `VITE_API_BASE_URL` to a suitable API base before building. If using a different origin, configure CORS at the API gateway.

With no saved demo session, every app URL shows Login. Enter any nonempty username and password to open Drones. Only a demo session flag is stored; credentials are not persisted. Log out clears the flag and returns to Login.

Missions, Live Flight, Flight History, flight details and Alerts load their runtime data from the API and show loading, error and empty states. Open a history flight code to load its details at `/flight-history?flight=FLIGHT-014`. Refreshing preserves the selected flight through the URL and reloads its data. Missions requests `/api/missions?isCurrent=true`, maps the server mission code to its page identifier, and uses the returned waypoint count. A mission's View alert action opens `/alerts?drone=DRONE-005&mission=mission-005`; both identifiers are sent to the Alerts API, and the exact filter survives refresh and back/forward navigation.

Fleet inventory and drone detail still use the canonical bundled snapshot pending their separate API integration work. Mission reads needed by the Missions–Alerts link are connected here. Static flight data sources (`*.static.ts`) and the standalone `/?screen=alerts` previews also use `data/frontend.snapshot.json`. API failures do not fall back to these fixtures.

R5 starts with all five drones OFFLINE. The API therefore returns empty Missions, Alerts, Live Flight and Flight History views; this is an expected initial state, even though raw snapshots retain scenario/history records. Fleet cards remain visible. Power ON/OFF and activation of DRONE-003 are tracked in #90; there is no automatic activation or snapshot fallback.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:browser
```

The browser suite uses explicit powered-on API response fixtures for desktop/mobile layout and navigation checks, plus a separate R5 offline case. These fixtures are separate from the canonical snapshot, whose `activeFlights` is empty. To exercise the Flight Operations and Alerts flows against a running API/MySQL database, use a disposable R5 database and an explicit post-activation fixture: enable the five drones, set DRONE-003 IN_FLIGHT, and set FLIGHT-015 FLYING with route progress 25% and waypoint index 2; mission-003 must be IN_PROGRESS. Start the backend against the initial offline database before preparing this fixture, so the separate legacy simulation recovery loop is not scheduled. Restore the fixture after testing. Then set `E2E_LIVE_API=1` and run:

```powershell
$env:E2E_LIVE_API='1'
npm run test:browser -- --grep 'live route|mission alerts'
```

To check the initial offline state against the real API, restore the disposable database to the unmodified R5 seed and run:

```powershell
$env:E2E_LIVE_API='1'
npm run test:browser -- --grep 'R5 offline'
```
