# Run MySQL and connect to the data

This ZIP package includes both the MySQL server configuration and seed data. Install Docker Desktop before you begin.

## 1. Start the database

Open a terminal in the `drone-data-package` directory, then run:

```bash
docker compose up -d
```

On the first startup, MySQL automatically runs `database/init/00-all-data.sql`, creates nine tables, and imports all data.

Check the service status:

```bash
docker compose ps
```

## 2. Connection details

| Property | Value |
| --- | --- |
| Host | `localhost` |
| Port | `3307` |
| Database | `drone_monitoring` |
| Username | `drone_app` |
| Password | `drone_app_password` |

Connection URL:

```text
mysql://drone_app:drone_app_password@localhost:3307/drone_monitoring
```

You can use these details in MySQL Workbench, DBeaver, or a Node.js backend.

## 3. Verify the data from a terminal

```bash
docker compose exec mysql mysql -udrone_app -pdrone_app_password drone_monitoring -e "SHOW TABLES;"
```

Check the row counts:

```bash
docker compose exec mysql mysql -udrone_app -pdrone_app_password drone_monitoring -e "SELECT COUNT(*) AS missions FROM missions; SELECT COUNT(*) AS telemetry FROM telemetry;"
```

Expected results:

- `missions`: 20
- `telemetry`: 6000

## 4. Connect from Express and Sequelize

Install the driver:

```bash
npm install sequelize mysql2
```

Backend environment variables:

```env
DB_HOST=localhost
DB_PORT=3307
DB_NAME=drone_monitoring
DB_USER=drone_app
DB_PASSWORD=drone_app_password
```

If the backend runs in the same Docker Compose project, use the `mysql` host and port `3306` instead of `localhost:3307`.

## 5. Weather data

The initial `weather_checks` table intentionally contains zero records. The backend calls a live weather API when a user validates a mission or prepares for takeoff, then stores the response as a snapshot in this table.

## Important note

Docker imports the SQL automatically only when the database volume is created for the first time. Do not run a command that deletes the volume if it contains data you need to keep.
