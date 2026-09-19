# Clean import and verification

## Recommended isolated Docker import

docker compose up -d

This release uses container drone-monitoring-mysql-v20 and volume drone_mysql_v20_data. They are deliberately different from v1.0, so an old initialized volume cannot suppress the new init script.

## Manual MySQL import

mysql -u root -p < all-data.sql

The script drops and recreates every pack-owned table inside drone_monitoring, then seeds v2.0.0. Back up any data you need before running it.

## Mandatory acceptance check

mysql -u root -p drone_monitoring < database/verify-import.sql

The first result must be version 2.0.0, revision 1 and build DRONE-DATA-2.0.0-R1-20260919. The verification summary must report five drones, seventy installed components, twenty missions, ninety waypoints, twenty flights, 6,000 telemetry rows and twenty-four alerts. legacy_left_only_scenarios must be zero.

If MySQL still shows MOTOR_OVERHEAT_FL or PROPELLER_DAMAGE_FL, the application is connected to another server/database or a separate backend migration/seed is re-inserting old rows. Run SELECT DATABASE(), @@hostname, @@port together with the metadata query before changing data again.

## Development reset

docker compose down -v
docker compose up -d

The first command deletes only this Compose project's named development volume. It is destructive to that local demo database, so do not use it for data you need to retain.
