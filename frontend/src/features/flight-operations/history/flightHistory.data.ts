import type {
  FlightHistoryDataSource,
  FlightHistoryDetail,
  FlightHistoryRecord,
} from "./flightHistory.types";

export const DEFAULT_FLIGHT_CODE = "FLIGHT-014";

const featuredFlight: FlightHistoryRecord = {
  flightCode: DEFAULT_FLIGHT_CODE,
  startedAt: "2026-10-16T09:15:00+07:00",
  durationSeconds: 1122,
  droneCode: "DRONE-001",
  missionCode: "MISSION-014",
  status: "COMPLETED",
};

const additionalFlights: FlightHistoryRecord[] = [
  {
    flightCode: "FLIGHT-012",
    startedAt: "2026-10-14T08:55:00+07:00",
    durationSeconds: 496,
    droneCode: "DRONE-005",
    missionCode: "MISSION-012",
    status: "FAILED",
  },
  {
    flightCode: "FLIGHT-011",
    startedAt: "2026-10-13T16:10:00+07:00",
    durationSeconds: 1380,
    droneCode: "DRONE-003",
    missionCode: "MISSION-011",
    status: "COMPLETED",
  },
  {
    flightCode: "FLIGHT-010",
    startedAt: "2026-10-12T10:05:00+07:00",
    durationSeconds: 945,
    droneCode: "DRONE-004",
    missionCode: "MISSION-010",
    status: "COMPLETED",
  },
];

const flightDetails: FlightHistoryDetail[] = [
  {
    ...featuredFlight,
    routeName: "North Perimeter Survey",
    waypoints: [
      { code: "WP-01", x: 8, y: 48 },
      { code: "WP-02", x: 21, y: 39 },
      { code: "WP-03", x: 33, y: 48 },
      { code: "WP-04", x: 45, y: 27 },
      { code: "WP-05", x: 59, y: 34 },
      { code: "WP-06", x: 70, y: 15 },
      { code: "WP-07", x: 83, y: 24 },
      { code: "WP-08", x: 93, y: 10 },
    ],
    telemetry: {
      startBatteryPercent: 100,
      endBatteryPercent: 62,
      maxAltitudeMeters: 82,
      averageSpeedMps: 9.4,
      distanceMeters: 3620,
    },
    events: [
      {
        id: "event-001",
        occurredAt: "2026-10-16T09:15:00+07:00",
        title: "Flight started",
        description: "The drone began the assigned route.",
        severity: "INFO",
      },
      {
        id: "event-002",
        occurredAt: "2026-10-16T09:20:00+07:00",
        title: "Waypoint reached",
        description: "The drone reached waypoint WP-04.",
        severity: "INFO",
      },
      {
        id: "event-003",
        occurredAt: "2026-10-16T09:29:00+07:00",
        title: "Route completed",
        description: "The drone returned after completing the route.",
        severity: "INFO",
      },
    ],
  },
];

const flightRecords: FlightHistoryRecord[] = [
  featuredFlight,
  ...additionalFlights,
].sort(
  (first, second) =>
    Date.parse(second.startedAt) - Date.parse(first.startedAt),
);

export const flightHistoryDataSource: FlightHistoryDataSource = {
  async loadRecords() {
    return flightRecords.map((record) => ({ ...record }));
  },

  async loadDetail(flightCode) {
    const flight = flightDetails.find(
      (item) => item.flightCode === flightCode,
    );

    if (!flight) {
      return null;
    }

    return {
      ...flight,
      waypoints: flight.waypoints.map((waypoint) => ({
        ...waypoint,
      })),
      telemetry: { ...flight.telemetry },
      events: flight.events.map((event) => ({ ...event })),
    };
  },
};