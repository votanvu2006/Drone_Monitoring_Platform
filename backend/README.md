# Backend API

TypeScript/Express API for the Drone Monitoring Platform. The active MySQL demo data pack is v2.1.0 in `../data/`.

## Demo scope

The enabled backend routes cover Fleet, Missions, Flight Operations, and Alerts. Airspace validation, weather checks, and the flight simulation endpoints are deferred; they are not registered as API routes or listed in OpenAPI.

Interactive API documentation is available at `/api/docs`, and its JSON document is at `/api/openapi.json`. Unknown routes return `404` with:

```json
{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }
```

## Local setup

Use Node.js 24 or later and Docker. From the repository root, start the v2.1.0 MySQL data pack:

```powershell
docker compose -f .\data\docker-compose.yml up -d --wait --wait-timeout 180
```

MySQL imports the seed only when Docker creates an empty volume. Restarting the container does not re-import it.

In `backend/`, install dependencies and create your local configuration:

```powershell
cd backend
npm ci
Copy-Item .env.example .env
```

Edit `.env` to match the running data pack. In particular, set `DB_PORT` to the host port used by Docker (normally `3307`), `DB_NAME` to `drone_monitoring_frontend`, and `DB_PASSWORD` to the configured demo database password. The `.env` file is ignored by Git.

Check that the database matches the repository's `data/manifest.json`, then start the API:

```powershell
npm run wait:data-pack
npm run dev
```

Open `http://localhost:3000/api/health`. A running API returns:

```json
{ "status": "ok" }
```

The server checks its MySQL connection before listening. `/api/health` checks the API process; it is not a database health report.

## Checks

From `backend/`:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

The unit tests do not require MySQL. To run the integration tests, first start the v2.1.0 data pack and ensure `.env` points to it. Then run:

```powershell
npm run wait:data-pack
npm run test:integration
```

`wait:data-pack` checks the build ID and expected counts in `data/manifest.json`. It does not reset the database. If it times out, check the configured MySQL instance and Docker volume before changing data.

`npm start` runs the compiled `dist/server.js` after `npm run build`. Malformed JSON returns `400` with code `INVALID_JSON`; unhandled failures return `500` with code `INTERNAL_ERROR`.