# Drone Monitoring Platform — Frontend V1

A responsive, dark operations console built with React, TypeScript and Vite. The interface reads and updates data through the existing Express API; it does not add mock operational records or change the backend contract.

## Run locally

Requirements: Node.js 24+ and a running backend connected to the project MySQL data pack.

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

By default, Vite serves the app on port 5173 and proxies `/api` to `http://localhost:3000`. Start the backend separately from `../backend` with its required database environment variables. Change `VITE_API_PROXY_TARGET` if the API uses another local address. `VITE_API_BASE_URL` defaults to `/api`; production deployments should use a same-origin reverse proxy or configure backend CORS before pointing the browser at a separate API origin.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## API-backed screens

- Overview: fleet, mission, flight, active-alert and health endpoints.
- Aircraft: fleet identity and last-known position. Component-level health is not shown because there is no component-list endpoint yet.
- Live flight: `/api/flights` and `/api/flights/:id/simulation/status`, polled every two seconds. Its route and flight trail are drawn over active flight zones. Trail samples are held only in the current browser session because the API exposes only the latest telemetry sample.
- Missions: persisted mission detail, route validation, weather check and active flight zones. Creation/editing are not exposed by the current API.
- Alerts: filtering and alert resolution, including the required component-health result for propeller inspections.
- Flight history: persisted flight list and result filters. Historical replay and export are not exposed by the current API.

The start action can start an existing `READY` simulation flight. It does not create a flight. A `CAUTION` weather result remains blocked unless the backend already records an acknowledgement; the current API has no endpoint to submit that acknowledgement. Backend conflicts are shown as returned instead of bypassed.

## Maps

The map uses Leaflet and a configurable `VITE_MAP_TILE_URL`; the default is the OpenStreetMap standard tile service. Keep the visible OpenStreetMap attribution, configure a provider-compliant tile URL before production use, and follow the provider's usage policy. Tiles are loaded by the map viewport; the app does not prefetch or cache tiles.
