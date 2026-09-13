# Drone Monitoring Platform

> **Target release:** `v1.0.0`  
> **Goal:** Build the smallest complete full-stack product that satisfies the course requirements and remains easy to expand.

> **Description:** Drone Monitoring Platform (Version 1.0.0) is a basically product to have a solid foundation first. After having a solid foundation, we will develop more in-depth feautures of drone and introduce the final production to the market.

## 1. Project Requirements

The project must include:

- A database: **MySQL or MongoDB**
- A RESTful API server: **Node.js + Express**
- A frontend: **React**
- Frontend and API source code maintained on **GitHub**
- Online API documentation
- A publicly accessible API base URL
- A public live web URL
- A PowerPoint presentation
- A short Word document
- A two-student team
- Course activities and deliverables in English

Bonus points are awarded for an innovative idea and high-quality implementation.

## 2. Product Direction

The product should feel simple, focused, and visually polished.

Idea design:

1. Each page has one clear purpose.
2. A data point appears only where it is most useful.
3. Summary pages do not repeat detailed operational data.
4. Reusable components are shared between features.
5. Future functionality is not shown as unfinished navigation in `v1.0.0`.

## 3. Version 1.0.0 Scope

The version 1.0.0 manages exactly **one drone** and contains six user-facing features:

1. **Overview**
2. **Drone**
3. **Live Flight**
4. **Missions**
5. **Alerts**
6. **Flight History**

We deployed 6 features first to have a solid foundation to easy expand more features in the future.

This is our project structure:

```text
Overview
   ↓
Drone
   ↓
Live Flight ← Mission
   ↓
Alerts
   ↓
Flight History
```

## 4. Information Ownership

This table defines the single best location for each type of information.

| Information | Primary location | Reason |
| --- | --- | --- |
| Drone image and product identity | Overview | Visual introduction to the platform |
| Drone ID, model and structure | Drone | Describes the single drone and its physical components |
| Drone operational status | Drone | Shows whether the drone is available, offline or in use |
| Flight status | Live Flight | Describes the current flight, not the drone itself |
| Battery level | Live Flight | Battery is most useful during active monitoring |
| Altitude and speed | Live Flight | Live telemetry only |
| GPS and communication signal | Live Flight | Live safety and connection information |
| Wind direction | Live Flight | Affects the active flight and map orientation |
| Mission status and progress | Missions | Mission execution information |
| Route, allowed zones and restricted zones | Missions | Required when assigning a mission |
| Weather suitability | Missions | Determines whether the planned mission can fly safely |
| Severity and operational problems | Alerts | Central alert management |
| Completed-flight statistics | Flight History | Historical review only |
| Health score | Future release | Requires a meaningful diagnostics model |
| Map and route | Live Flight, Mission Detail and Flight Detail | Shared component with a different mode for each context |

## 5. Feature Details

### 5.1 Overview

#### Purpose

Introduce the active drone with a strong visual presentation.

#### Layout direction

Use a large, high-quality drone image as the main focus, inspired by a minimal product hero layout:

- Dark or neutral full-width background
- Large centered drone image
- Generous empty space
- Drone name and one short tagline
- One primary action: `View Drone`
- Optional secondary action: `Open Live Flight`

The Overview is intentionally visual. Operational information belongs to the relevant feature pages.

#### Example

```text
DRONE-001
Built for precise aerial monitoring.

[Image of Drone]
```

### 5.2 Drone

#### Purpose

Present the identity and physical structure of the single drone used by the project.

#### Drone will have 3 status:

```text
AVAILABLE (Drone is free to use)
IN_USE (Drone is in processing)
OFFLINE (Drone is inactive)
```

#### Drone structure

Show the drone as a clean visual diagram or component grid. Each component can be selected to reveal a short description.

- Frame / body
- Four propellers
- Four motors
- Battery
- Flight controller
- GPS module
- Sensors
- Camera

### 5.3 Live Flight

#### Purpose

Monitor active flight.

#### Monitor

- Drone name
- Flight ID
- Flight status
- Flight duration
- Drone monitoring map
- Current drone marker
- Home marker
- Planned route
- Travelled path and remaining path
- Follow Drone mode that automatically centers the map on the drone
- Heading-up rotation so the map follows the drone's direction
- Wind direction overlay
- One compact telemetry chart with metric switching

#### Flight states

```text
READY (Drone is in ready flight state)
FLYING (Drone is in processing)
PAUSED (Drone is in a trouble or wait for a mission)
RETURNING (Drone finished mission or in a trouble)
LANDED (Drone landed successfully)
```

#### Essential telemetry

- Battery
- Altitude
- Speed
- GPS quality
- Communication signal
- Wind direction

Heading, wind direction and distance from home are visualized inside the map panel. A small wind value remains visible with the essential telemetry so the user can read it without opening another panel.

#### Course behavior

Telemetry is simulated by the backend and refreshed through the REST API.

Real drone commands, authorization and WebSocket communication are coming soon features. The Drone version 1.0.0 interface does not pretend to send commands to a real drone.

### 5.4 Missions

#### Purpose

Plan a route, validate whether the drone may fly it, and track mission execution.

#### Mission list

- Mission name
- Status
- Progress
- Created date
- Mission name
- Status
- Progress
- Waypoints
- Planned altitude
- Planned speed
- Mission planning map
- Weather suitability
- Validation result

#### Mission states

```text
DRAFT (Drone is in waiting state)
READY (Drone is in ready flight state)
RUNNING (Drone is in processing)
COMPLETED (Drone completed a mission)
FAILED (Drone failed to flight with some troubles)
```

#### Mission planning map

The user creates a route directly on the map:

1. Select point A as the start.
2. Select or drag to point B as the destination.
3. Add optional intermediate waypoints.
4. Submit the route for validation.

The map displays:

- Allowed flight area
- Restricted flight zones
- Start and destination markers
- Waypoints
- Planned route
- Clear color and label differences between allowed and restricted areas

Before a mission can enter `READY`, the backend checks every route segment against stored restricted-zone boundaries. If the route enters a restricted zone, the mission remains `DRAFT` and an alert is created.

Example alert shown in the user interface:

```text
Mission rejected: the selected route enters a restricted flight zone.
```

The no-fly zones in v1 are course demo data stored in the project database. They are not presented as official aviation data.

#### Weather check

Mission Detail shows only the conditions needed for a go/no-go decision:

- Weather condition
- Wind speed and direction
- Rain status
- Visibility
- Flight recommendation: `SAFE`, `CAUTION` or `UNSAFE`

Weather is checked for the mission area before the mission can enter `READY`. An `UNSAFE` result blocks the mission and creates an alert explaining the reason.

#### Course scope

- View mission list
- Create mission
- View mission detail
- Display waypoints
- Create a route by selecting points on the map
- Validate the route against restricted zones
- Check weather suitability
- Update simulated mission progress

Official aviation-zone integration, advanced route optimization and command execution are future work.

### 5.5 Alerts

#### Purpose

Show only operational problems that require attention.

#### Severity

```text
WARNING
CRITICAL
```

Routine information is not stored as an alert.

#### Alert types

- Low battery
- GPS lost
- Communication lost
- Drone offline
- Mission failed
- Restricted flight zone
- Unsafe weather

#### Alert record

- Severity
- Type
- Message
- Detected time
- Status

#### Alert states

```text
ACTIVE
RESOLVED
```

Acknowledgement, notification delivery and escalation are future features.

### 5.6 Flight History

#### Purpose

Review flights that have already ended.

#### Flight list

- Flight ID
- Mission
- Start time
- Duration
- Result

#### Flight detail

- Start and end time
- Duration
- Distance
- Battery used
- Result
- Shared map showing the recorded route
- Alerts generated during the flight

Full telemetry replay and analytics are coming soon features.

## 6. Shared Map Component

The map is a shared interface component rather than a navigation feature.

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

Usage:

| Page | Map content |
| --- | --- |
| Live Flight | Follow Drone mode, current position, heading, wind, home point and live path |
| Mission Detail | Interactive route planning, waypoints, allowed zones and restricted zones |
| Flight Detail | Recorded route |

This avoids maintaining multiple map implementations.

## 7. Navigation

```text
DRONE PLATFORM

Overview
Drone
Live Flight
Missions
Alerts
Flight History
```

Future features are documented in the roadmap but are not shown in the main navigation until implemented.

## 8. Technical Architecture

```text
React Client
     ↓
Express REST API
     ├── Service Layer → MySQL Database
     └── Weather Service → Weather Provider
```

Recommended stack:

- React + TypeScript + Vite
- Node.js + Express + TypeScript
- MySQL
- Sequelize ORM
- OpenAPI / Swagger
- A map library such as Leaflet
- A weather API accessed only through the Express backend

MySQL is recommended because the drone, its components, missions, restricted zones, flights and alerts have clear relationships.

## 9. Database Scope

Core entities:

```text
drone
drone_components
missions
waypoints
flight_zones
weather_checks
flights
telemetry
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
└── Weather Check

Flight Zone
└── Restricted or Allowed Boundary

Flight
├── Telemetry
└── Alerts
```

Important rule: each telemetry record contains a `flight_id`. An alert contains either a `flight_id` for an in-flight problem or a `mission_id` for route and weather validation. This keeps alerts connected to the event that created them.

## 10. Minimal REST API

### Drone

```http
GET    /api/drone
GET    /api/drone/components
```

### Live Flight and Telemetry

```http
GET    /api/flights/active
GET    /api/flights/:id/telemetry/latest
GET    /api/flights/:id/route
GET    /api/weather/current?lat=:lat&lng=:lng
```

### Missions

```http
GET    /api/missions
GET    /api/missions/:id
POST   /api/missions
PUT    /api/missions/:id
POST   /api/missions/:id/validate
GET    /api/flight-zones
```

### Alerts

```http
GET    /api/alerts
PATCH  /api/alerts/:id/resolve
```

### Flight History

```http
GET    /api/flights
GET    /api/flights/:id
```

There is no separate `/api/overview` endpoint. Overview and Drone use the single-drone data from `/api/drone`.

## 11. Repository Structure

```text
drone-monitoring-platform/
├── client/
│   └── src/
│       ├── app/
│       ├── components/
│       │   ├── common/
│       │   └── map/
│       ├── features/
│       │   ├── overview/
│       │   ├── drone/
│       │   ├── live-flight/
│       │   ├── missions/
│       │   ├── alerts/
│       │   └── flight-history/
│       ├── services/
│       ├── types/
│       └── assets/
├── server/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── routes/
│       ├── services/
│       ├── models/
│       ├── middleware/
│       └── app.ts
├── docs/
├── .github/
├── .env.example
├── README.md
└── package.json
```

The structure is intentionally small. New folders should be added only when a real feature requires them.

## 12. Development Order

```text
01. Project setup
02. MySQL schema and demo data
03. Express REST API
04. React layout and navigation
05. Drone identity and component structure
06. Shared map foundation and flight-zone layers
07. Mission route planner and restricted-zone validation
08. Mission weather check
09. Live Flight, Follow Drone mode and telemetry simulation
10. Alerts
11. Flight History
12. Visual Overview
13. Swagger documentation
14. Testing and responsive polish
15. Deployment
16. PowerPoint, Word document and v1.0.0 release
```

The visual Overview is built after the core features so its links and drone data point to working pages.

## 13. Deployment and Submission

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
- [ ] MySQL database
- [ ] Frontend communicates only through the REST API
- [ ] Six core user-facing features completed
- [ ] Exactly one drone is used in v1
- [ ] Mission routes are validated against demo restricted zones
- [ ] Mission weather suitability is displayed
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
- [ ] `v1.0.0` release tag
- [ ] Package into docker

## 14. Future Roadmap

The following are coming soon features that we will develop:

- Real Drone
- Real-time WebSocket communication
- Drone command center
- Multi-drone fleet management
- Authentication and role-based access
- Drone health and component diagnostics
- Official aviation-zone data integration
- Maintenance records
- Camera and media
- Advanced weather forecasting
- Analytics
- AI insights
- Field intelligence
- Audit logs

## Conclusion

> Build a small, complete and visually polished monitoring product. Every page should answer one question, and every data point should have one clear home.
