# Drone Monitoring Platform data

The default Docker Compose file now starts the **frontend-aligned 2.1.0 data pack**.

| Setting | New frontend demo | Legacy pack |
| --- | --- | --- |
| Compose file | `data/docker-compose.yml` | `data/docker-compose.legacy.yml` |
| Host port | 3307 | 3306 |
| Database | drone_monitoring_frontend | drone_monitoring |
| Build | DRONE-DATA-2.1.0-R1-20261028 | DRONE-DATA-2.0.0-R1-20260919 |
| Initialization | `data/frontend-demo/init` | `data/database/init` |
| Volume | new frontend_v21_mysql volume | original v20 volume |

See [frontend-demo/README.md](frontend-demo/README.md) for startup, verification, export and run selection.

The existing numbered folders, root `manifest.json`, `all-data.sql`, old generator and `database/init` describe the legacy pack. They are retained for existing backend integration coverage; the new default container does not import them. Regenerating the legacy pack does not regenerate the new pack.

The new data pack keeps column compatibility for the existing Fleet/Missions/Flight Operations/Alerts read APIs. Legacy route/weather/simulation APIs are registered only when `DATA_PACK_PROFILE=legacy` is set. This does not add the removed pages or enable Coming soon controls.
