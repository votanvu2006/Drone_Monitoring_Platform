# Package layout

| Folder | Contents | Primary consumer |
| --- | --- | --- |
| 00-overview | Final audit, dictionary, relationships, scenario matrix and runtime invariants | Entire team |
| 01-schema | MySQL tables, release metadata, constraints and indexes | Backend/database |
| 02-fleet | Models, five drones, component definitions and installed components | Fleet and maintenance UI |
| 03-airspace | One allowed HCMC demo boundary and seven restricted demo polygons | Mission validation/map |
| 04-missions | Twenty mission plans and ninety ordered waypoints | Mission planner |
| 05-weather | Runtime mode, deterministic profiles, assignments, policy and expired examples | Pre-flight service |
| 06-simulation | Nine fault recipes, per-drone weighted pools and health rules | Simulator/alert engine |
| 07-flight-operations | Twenty attempts and 6,000 telemetry samples | Live Flight/history |
| 08-alerts | Extensible rule catalog and twenty-four alert instances | Alert center |
| 09-backend-guidance | Processing flows and import/reset instructions | Backend developer |
| database | Docker auto-import plus post-import verification SQL | Local development/database |

JSON files are convenient fixtures and API examples. SQL files are the normalized import source. fleet-overview.json is a derived UI view, not a writable master record.
