# Fleet data layout

This folder separates reusable definitions from operational instances, which keeps the structure clean when the fleet grows.

| File/table | Responsibility | Update pattern |
| --- | --- | --- |
| drone-models.json / drone_models | One reusable aircraft-model specification | Add once when a new hardware model is introduced |
| drones.json / drones | Individual aircraft identity and runtime state | Add one row per physical or simulated aircraft |
| component-catalog.json / component_catalog | The 14 reusable component definitions for this model | Change only when the model configuration changes |
| drone-components.json / drone_components | Installed component instances, serials and health per drone | Add 14 instances for each new drone; maintenance updates happen here |
| fleet-overview.json | Denormalized UI/read model joining all files above | Regenerate; do not use as the write source of truth |
| seed.sql | Importable normalized fleet rows | Run after 01-schema/schema.sql |

## Add Drone - 006 later

1. Add one drones row referencing an existing drone_model_id or first add a new model.
2. Add 14 drone_components rows referencing the existing component_catalog IDs; give every installed instance a unique serial number.
3. Add its weather demo assignment and, if appropriate, a weighted simulation-scenario pool.
4. Add missions first, then flights and telemetry. Never copy foreign-key IDs blindly.
5. Regenerate fleet-overview.json and run data-quality-report.json checks.

All five current drones intentionally boot OFFLINE. Browser/device geolocation is captured only when the user switches a drone ON; seed data therefore does not pretend that an offline drone has a live position.
