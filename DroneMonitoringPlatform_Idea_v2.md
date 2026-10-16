# Drone Monitoring Platform

> **Target release:** `v2.0.0`  
> **Goal:** Expand the platform from a single-drone foundation into a five-drone monitoring demo with clear mission, flight, weather, simulation and alert behaviour, while remaining easy to present and extend.

> **Description:** Drone Monitoring Platform (Version 2.0.0) builds on the v1.0.0 idea. It uses the **data pack v2.0.0** as the planned domain model: five simulated drones, full component sets, mission versus flight separation, DEMO weather gates, reusable fault scenarios and presentation-ready history. This document is the **plan to implement against**, not a status report of finished work.

> **Related documents:**  
> - Historical plan: `DroneMonitoringPlatform_Idea_v1.md` (v1.0.0, single-drone scope)  
> - Data contract: `data/` pack version **2.0.0** (build `DRONE-DATA-2.0.0-R1-20260919`)

---

## 1. Project Requirements

The project must include:

- A database: **MySQL** (aligned with data pack v2.0.0)
- A RESTful API server: **Node.js + Express + TypeScript**
- A frontend: **React**
- Frontend and API source code maintained on **GitHub**
- Online API documentation (OpenAPI / Swagger)
- A publicly accessible API base URL
- A public live web URL
- A PowerPoint presentation
- A short Word document
- A two-student team
- Course activities and deliverables in English

Bonus points are awarded for an innovative idea and high-quality implementation.

---

## 2. Product Direction

The product should feel simple, focused, and visually polished.

Design rules:

1. Each page has one clear purpose.
2. A data point appears only where it is most useful.
3. Summary pages do not repeat detailed operational data.
4. Reusable components are shared between features.
5. Future functionality is not shown as unfinished navigation in `v2.0.0`.
6. Demo data is never presented as official airspace, certified limits or real aircraft control.

---

## 3. Version 2.0.0 Scope

### 3.1 What changes from v1.0.0

| Area | v1.0.0 plan | v2.0.0 plan (from data pack) |
| --- | --- | --- |
| Fleet size | Exactly **one** drone | **Five** drones: Drone - 001 … Drone - 005 |
| Power state | AVAILABLE / IN_USE / OFFLINE | Boot **OFFLINE**; power ON → **AVAILABLE** and capture device geolocation |
| Hardware | Single structure description | Shared **14-component** layout per drone (70 installed parts) |
| Mission vs flight | Closely mixed | **Mission** = route plan; **Flight** = one execution attempt |
| Faults | Generic simulation | **Nine** scenarios; weighted pools per drone; Drone 003 selects **fault arm** |
| Weather | Basic suitability | **DEMO** mode with SAFE / CAUTION / UNSAFE; checks expire in **10 minutes**; LIVE Open-Meteo marked Coming Soon |
| Airspace | Demo restricted zones | One HCMC **allowed** boundary + **seven** restricted polygons (DEMO_ONLY) |
| Telemetry | Essential metrics | Position validity, transmission state, heartbeat, motors, battery, vibration, GPS, signal |
| Alerts | Fixed type list | Rule catalog + lifecycle (ACTIVE / RESOLVED); route, weather and telemetry sources |

### 3.2 User-facing features (still six primary areas)

1. **Overview**
2. **Drone** (fleet-aware)
3. **Live Flight**
4. **Missions**
5. **Alerts**
6. **Flight History**

Flow structure:

```text
Overview
   ↓
Drone (select from fleet)
   ↓
Live Flight ← Mission (validate route + weather → create flight → simulate)
   ↓
Alerts
   ↓
Flight History
```

### 3.3 Planned demo fleet roles

| Drone | Planned behaviour |
| --- | --- |
| Drone - 001 | Normal baseline flights |
| Drone - 002 | Power / battery fault scenarios |
| Drone - 003 | Propulsion faults; runtime choice of one of four arms |
| Drone - 004 | GPS loss, signal loss, unexpected offline |
| Drone - 005 | Route and weather preflight gate (e.g. CAUTION acknowledgement) |

---

## 4. Team Module Ownership

Work is split by **backend domain modules**. Each owner implements APIs and logic for their modules; integration connects them into one launch flow.

| Module | Owner | Responsibility |
| --- | --- | --- |
| **Fleet** | **Vo Tan Vu** | Drone list/detail, power ON/OFF, location, component health views |
| **Mission** | **Vo Tan Vu** | Mission and waypoint planning, list/detail, progress fields |
| **Flight Operations** | **Vo Tan Vu** | Create and list flights, link mission–drone–scenario, READY lifecycle entry |
| **Airspace** | **Pham Nhu Quan** | Flight zones, route validation against allowed/restricted geometry |
| **Weather** | **Pham Nhu Quan** | DEMO profiles, weather-check snapshots, expiry and recommendations |
| **Simulation** | **Pham Nhu Quan** | Scenario selection helper, 2-second telemetry loop, start/stop simulation |
| **Alerts** | **Pham Nhu Quan** | Rule catalog, alert list/resolve, creation from route/weather/telemetry rules |

### Integration principle (plan)

```text
Mission (VALID route)
    → Weather check (fresh, not UNSAFE; CAUTION needs acknowledgement)
    → Flight Operations creates flight READY + scenario
    → Simulation starts the READY flight
    → Alerts and fleet/mission statuses update during the flight
```

- **Flight creation** is planned under **Flight Operations** (Vo Tan Vu).
- **Simulation start** is planned under **Simulation** (Pham Nhu Quan).
- Simulation does not create flights; it only runs a flight that is already READY.

---

## 5. Information Ownership

| Information | Primary location | Reason |
| --- | --- | --- |
| Product identity and fleet snapshot | Overview | First impression of the platform |
| Drone identity, model, components, power state | Drone | Fleet and hardware home |
| Active flight status and live telemetry | Live Flight | Monitoring during execution |
| Route plan, waypoints, validation, weather decision | Missions | Planning and preflight gates |
| Incidents requiring attention | Alerts | Problems only, not routine logs |
| Completed attempts and outcomes | Flight History | Past flights, not live control |

---

## 6. Feature Plan

### 6.1 Overview

**Purpose:** Introduce the platform and the five-drone fleet at a glance.

**Plan:**

- Short product tagline and visual presentation
- Fleet status summary (how many OFFLINE / AVAILABLE / IN_FLIGHT)
- Clear entry actions: open a drone, open missions, open live flight when a flight is active

Overview stays visual. Detailed telemetry and component grids belong on other pages.

### 6.2 Drone

**Purpose:** Show identity, structure and operational state for each aircraft in the fleet.

**Planned statuses:**

```text
OFFLINE      Drone is powered down (default at system start)
AVAILABLE    Drone is on and free for a new flight
IN_FLIGHT    Drone is assigned to an active flight
MAINTENANCE  Drone is held for inspection or recovery
```

**Planned structure (14 components per drone):**

- Frame / body systems as defined in the component catalog
- Four motors and four propellers (positions: front-left, front-right, rear-left, rear-right)
- Battery, flight controller, GPS and remaining shared systems from the data model

**Planned behaviours:**

- List and select any of the five drones
- Power ON: OFFLINE → AVAILABLE and store authorized browser/device location as the starting position
- Show component health (including faults left by historical or simulated incidents)
- Do not invent a live map position while the drone is OFFLINE

### 6.3 Live Flight

**Purpose:** Monitor an active flight on the map with essential telemetry.

**Planned flight states:**

```text
READY       Flight accepted; waiting to start simulation
FLYING      Simulation running along the route
PAUSED      Held by system policy if required
RETURNING   Returning after a fault or mission end policy
LANDED      Ended successfully or returned safely
ABORTED     Ended as failed / aborted
```

**Planned monitoring:**

- Drone name, flight code, mission reference
- Flight status and duration
- Map: current marker, home, planned route, travelled path
- Follow Drone camera behaviour around the newest **valid delivered** position
- Essential telemetry: battery, altitude, speed, GPS quality, signal, wind display for context

**Planned map safety rules:**

- Move the marker only when position is valid
- On GPS loss, freeze at last-known position
- Buffered samples belong in history; do not jump the live marker through old points
- On unexpected offline, freeze marker and surface the offline incident

Telemetry is **simulated by the backend**. Real aircraft command and WebSocket transport remain future work.

### 6.4 Missions

**Purpose:** Plan a route, validate airspace, check weather, then enable flight creation.

**Planned mission states:**

```text
DRAFT       Editing or not yet fully prepared
READY       Route and preflight policy satisfied for launch preparation
RUNNING     At least one flight is in progress for this mission
COMPLETED   Execution finished successfully (per flight outcomes)
FAILED      Execution failed
CANCELLED   Abandoned by operator policy
```

**Planned capabilities:**

- Mission list and detail
- Create route on the map (start, destination, optional intermediate waypoints)
- Validate every segment against the allowed HCMC demo boundary and restricted polygons
- Weather check for start, mid-route and destination samples under one validation run
- Recommendations: **SAFE**, **CAUTION**, **UNSAFE**
- CAUTION requires explicit user acknowledgement before launch
- UNSAFE blocks launch with no override
- Weather snapshots expire after **ten minutes** and must be refreshed

**Important rule:**  
A **VALID** route only means geometry passed. Weather must still be fresh before creating or starting a flight.

Restricted or out-of-boundary routes create **no flight**. Demo zones are course fixtures, not official aviation data.

### 6.5 Alerts

**Purpose:** Show operational problems that need attention.

**Planned severity:**

```text
WARNING
CRITICAL
```

**Planned sources:**

- Route validation failures
- Unsafe or blocking weather
- Telemetry-driven health rules during simulation
- System / heartbeat offline when appropriate

**Planned alert record:**

- Rule code, type, severity, message
- Optional links to mission, flight and affected component
- Detected time, status ACTIVE or RESOLVED

Repeated bad telemetry samples should update one ACTIVE alert, not create a new row every sample. Propeller-damage suspicion stays manual-resolution where the data policy requires it.

### 6.6 Flight History

**Purpose:** Review flights that have already ended.

**Planned list fields:**

- Flight code, mission, drone
- Scenario (and fault position when relevant)
- Start/end time, duration, distance
- Result: SUCCESS, RETURNED_SAFELY, FAILED

**Planned detail:**

- Shared map of the recorded route
- Alerts raised during the flight
- Summary battery and termination reason when available

Full interactive telemetry replay and deep analytics remain future work.

---

## 7. Shared Map Component

The map is a shared interface component, not a separate product area.

```text
components/map/
├── MapPanel
├── DroneMarker
├── FlightPath
├── WaypointMarker
├── HomeMarker
├── FlightZoneLayer
├── WindOverlay
└── FollowDroneControl
```

| Page | Map content |
| --- | --- |
| Live Flight | Follow mode, current position, heading, wind, home, live path |
| Mission Detail | Route planning, waypoints, allowed and restricted zones |
| Flight Detail | Recorded route |

---

## 8. Navigation

```text
DRONE PLATFORM

Overview
Drone
Live Flight
Missions
Alerts
Flight History
```

Coming-soon items stay out of the main navigation until implemented.

---

## 9. Technical Architecture

```text
React Client
     ↓
Express REST API (domain modules)
     ├── Fleet / Mission / Flight Operations   (Vo Tan Vu)
     ├── Airspace / Weather / Simulation / Alerts   (Pham Nhu Quan)
     └── MySQL  ← data pack v2.0.0 schema and seed
```

Recommended stack:

- React + TypeScript + Vite
- Node.js + Express + TypeScript
- MySQL 8.0+
- OpenAPI / Swagger
- Leaflet (or equivalent) for maps
- Weather provider called only from the backend when LIVE mode is enabled later

---

## 10. Database Scope (planned entities)

Core entities from data pack v2.0.0:

```text
data_pack_metadata
drone_models
drones
component_catalog
drone_components
flight_zones
missions
waypoints
weather_runtime_config
weather_demo_profiles
drone_weather_demo_assignments
weather_checks
simulation_scenarios
drone_scenario_pool
flights
telemetry
alert_rule_catalog
alerts
```

Core relationships:

```text
Drone
├── Components
├── Missions
└── Flights

Mission
├── Waypoints
├── Weather checks
└── Flights (one or more attempts)

Flight
├── Simulation scenario (+ optional fault_position)
├── Telemetry
└── Alerts

Flight zones → route validation
Scenario pool → scenario choice at flight creation
```

Rules to implement:

- Each telemetry row belongs to one flight.
- An alert may link to a mission (preflight) and/or a flight (in-flight), and optionally to a component.
- Only one active flying flight per drone at a time.
- Release identity is readable from `data_pack_metadata` after import.

---

## 11. Planned REST API (minimal surface)

### Fleet (Vo Tan Vu)

```http
GET    /api/drones
GET    /api/drones/:id
GET    /api/drones/:id/components
POST   /api/drones/:id/power-on
```

### Missions (Vo Tan Vu)

```http
GET    /api/missions
GET    /api/missions/:id
POST   /api/missions
```

### Flight Operations (Vo Tan Vu)

```http
GET    /api/flights
GET    /api/flights/:id
POST   /api/flights
```

### Airspace (Pham Nhu Quan)

```http
GET    /api/flight-zones
POST   /api/missions/:id/validate
```

### Weather (Pham Nhu Quan)

```http
GET    /api/weather/current
POST   /api/missions/:id/weather-check
```

### Simulation (Pham Nhu Quan)

```http
POST   /api/flights/:id/simulation/start
POST   /api/flights/:id/simulation/stop
GET    /api/flights/:id/simulation/status
```

### Alerts (Pham Nhu Quan)

```http
GET    /api/alerts
PATCH  /api/alerts/:id/resolve
```

Public codes (mission, flight, alert) should be generated by the backend in a collision-safe way (for example date + insert id), not by `MAX(id) + 1`.

---

## 12. Repository Structure (planned)

```text
Drone_Monitoring_Platform/
├── DroneMonitoringPlatform_Idea_v1.md    # historical v1 plan
├── DroneMonitoringPlatform_Idea_v2.md    # this plan (v2.0.0)
├── data/                                 # data pack v2.0.0
├── backend/                              # Express API, domain modules
├── client/                               # React app (when added / maintained)
├── docs/
├── .github/
├── README.md
└── ...
```

Backend modules are organised by domain (fleet, missions, flight-operations, airspace, weather, simulation, alerts) so ownership matches Section 4.

---

## 13. Development Order

This is the **order of work to follow**, not a claim that steps are already finished.

```text
01. Project setup and shared conventions
02. MySQL schema and data pack v2.0.0 import / verification
03. Express app shell, config, errors, OpenAPI skeleton
04. Fleet module (list, detail, components, power ON)
05. Mission module (list, detail, create, waypoints)
06. Airspace module (zones, route validation)
07. Weather module (DEMO config, weather-check, expiry rules)
08. Flight Operations module (list, detail, create READY flight + scenario)
09. Integration: Mission → validate → weather → create flight
10. Simulation module (start/stop, 2 s loop, telemetry, scenario effects)
11. Alerts module (catalog, list, resolve, rule evaluation hooks)
12. React layout and navigation
13. Shared map and flight-zone layers
14. Mission planner UI + validation + weather UI
15. Live Flight UI (Follow Drone, valid-position rules)
16. Alerts and Flight History UI
17. Overview UI
18. End-to-end tests and responsive polish
19. Swagger completeness
20. Deployment
21. PowerPoint, Word document and v2.0.0 release tag
```

Integration (steps 08–11) is intentional: modules are built with clear boundaries, then connected into one launch path.

---

## 14. Deployment and Submission

The README must expose:

```text
Live Demo: <frontend-url>
API Base URL: <backend-url>
API Docs: <api-docs-url>
GitHub: <repository-url>
```

Submission checklist:

- [ ] React frontend
- [ ] Node.js + Express REST API
- [ ] MySQL database with data pack **v2.0.0** identity verified
- [ ] Frontend communicates only through the REST API
- [ ] Six core user-facing feature areas completed
- [ ] Five-drone fleet supported
- [ ] Mission routes validated against demo zones
- [ ] Mission weather suitability with SAFE / CAUTION / UNSAFE behaviour
- [ ] Flight creation owned by Flight Operations; simulation starts READY flights
- [ ] Responsive interface
- [ ] Public frontend URL
- [ ] Public API base URL
- [ ] Online Swagger documentation
- [ ] Frontend and backend source code on GitHub
- [ ] Meaningful commits and stable `main` branch
- [ ] `.env.example` and no committed secrets
- [ ] English README and project documentation
- [ ] PowerPoint presentation
- [ ] Short Word document
- [ ] `v2.0.0` release tag when the product milestone is complete
- [ ] Docker packaging for local data/API where applicable

---

## 15. Future Roadmap (after v2.0.0)

- LIVE weather via Open-Meteo (enable only when status is AVAILABLE)
- Real-time WebSocket telemetry push
- Real drone connectivity and command centre
- Authentication and role-based access
- Official aviation-zone data sources
- Maintenance workflows beyond demo component health
- Camera and media
- Advanced analytics and audit logs

Multi-drone fleet management in the product sense is **in scope for v2.0.0** as five simulated drones; real multi-operator fleet operations remain future work.

---

## 16. Explicit non-goals for v2.0.0

- Silent fallback between DEMO and LIVE weather
- Treating demo flight zones as legal authorization
- Wind physics that divert the planned route
- Certified manufacturer safety thresholds
- Pretending the UI sends commands to a physical aircraft

---

## Conclusion

> Plan v2.0.0 targets a complete, presentable five-drone monitoring product.  
> **Vo Tan Vu** owns Fleet, Mission and Flight Operations.  
> **Pham Nhu Quan** owns Airspace, Weather, Simulation and Alerts.  
> Implement against **data pack v2.0.0** and this plan; keep Idea v1 only as history.
