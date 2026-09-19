# Relationships

```mermaid
erDiagram
  DRONE_MODELS ||--o{ DRONES : describes
  DRONES ||--o{ DRONE_COMPONENTS : owns
  COMPONENT_CATALOG ||--o{ DRONE_COMPONENTS : defines
  DRONES ||--o{ MISSIONS : plans
  MISSIONS ||--|{ WAYPOINTS : contains
  MISSIONS ||--o{ FLIGHTS : attempted_as
  SIMULATION_SCENARIOS ||--o{ FLIGHTS : drives
  FLIGHTS ||--|{ TELEMETRY : emits
  ALERT_RULE_CATALOG ||--o{ ALERTS : classifies
  FLIGHTS ||--o{ ALERTS : produces
```

- A route or weather alert can belong to a mission before any flight exists.
- A telemetry alert may optionally point to the affected installed component.
- One mission may be retried, so it can own multiple flights.
- Only one active flight per drone should be enforced transactionally by the backend.
