# Drone Monitoring Platform — Data Pack v1.0.0

This package contains deterministic demonstration data for one simulated quadcopter. Weather conditions are the only runtime external data source and are never fabricated in the production seed.

For the fastest setup, read `QUICKSTART.md` and run `docker compose up -d`. The included MySQL container automatically creates the database and imports `database/init/00-all-data.sql` on its first startup.

## Import order

1. `01-schema/schema.sql`
2. `02-drone/seed.sql`
3. `03-flight-zones/seed.sql`
4. `04-missions/seed.sql`
5. `05-flights/seed.sql`
6. `06-alerts/seed.sql`

## Included data

| Entity | Rows |
| --- | ---: |
| drones | 1 |
| drone_components | 14 |
| flight_zones | 8 |
| missions | 20 |
| waypoints | 90 |
| weather_checks | 0 |
| flights | 20 |
| telemetry | 6,000 |
| alerts | 24 |

## Modules

- `01-schema`: MySQL 8+ tables, constraints, indexes and relationships.
- `02-drone`: One AeroVision X1 reference drone and 14 installed components.
- `03-flight-zones`: One allowed demonstration boundary and seven restricted polygons.
- `04-missions`: Twenty missions with ordered waypoint routes and varied lifecycle states.
- `05-flights`: Twenty flights and 6,000 smooth telemetry samples at two-second intervals.
- `06-alerts`: Twenty-four flight and mission alerts.
- `07-weather`: Runtime weather policy and integration instructions.

## Important limitations

- AeroVision X1 is a fictional project drone with plausible mid-size camera-quadcopter specifications.
- Flight zones are demonstration data, not official aviation restrictions.
- Weather recommendations are decision support and do not guarantee safe flight.
- The active-flight seed is a UI fixture. A real simulator should create a fresh active flight at runtime.
