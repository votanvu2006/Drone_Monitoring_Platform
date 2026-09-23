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

Edit `.env` and set `DB_PASSWORD` to the `MYSQL_PASSWORD` configured for the `data/` container. The data pack's sample configuration uses `drone_app` and `drone_monitoring`; if you changed them, update `DB_USER` and `DB_NAME` too. `.env` is ignored by Git.

Run `npm run dev`. Open `http://localhost:3000/api/health`; a running API returns `{ "status": "ok" }`. The server verifies its database connection before listening. If MySQL is unavailable or credentials are wrong, startup exits with a clear error.

## Checks

From `backend/`:

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

`npm start` runs the compiled `dist/server.js` after building. Unknown routes return `404` with `{ "error": { "code": "NOT_FOUND", "message": "Route not found" } }`. Malformed JSON returns `400` with code `INVALID_JSON`. Unhandled failures return `500` with code `INTERNAL_ERROR`.

`/api/health` checks whether the API process is responding. It is not a database health report; the database is checked during startup.
