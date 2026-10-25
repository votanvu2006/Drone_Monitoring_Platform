import type {
  LiveFlightDataSource,
  LiveFlightSnapshot,
} from "./liveFlight.types";

const mockActiveFlights: LiveFlightSnapshot[] = [
  {
    flightCode: "FLIGHT-015",
    missionCode: "MISSION-015",
    droneCode: "DRONE-003",
    flightStatus: "IN_PROGRESS",
    routeName: "North Perimeter Survey",
    currentWaypointIndex: 3,
    waypoints: [
      { code: "WP-01", label: "Launch", x: 8, y: 48 },
      { code: "WP-02", label: "Waypoint 02", x: 21, y: 39 },
      { code: "WP-03", label: "Waypoint 03", x: 33, y: 48 },
      { code: "WP-04", label: "Waypoint 04", x: 45, y: 27 },
      { code: "WP-05", label: "Waypoint 05", x: 59, y: 34 },
      { code: "WP-06", label: "Waypoint 06", x: 70, y: 15 },
      { code: "WP-07", label: "Waypoint 07", x: 83, y: 24 },
      { code: "WP-08", label: "Return", x: 93, y: 10 },
    ],
  },
];

function cloneFlight(
  flight: LiveFlightSnapshot,
): LiveFlightSnapshot {
  return {
    ...flight,
    waypoints: flight.waypoints.map((waypoint) => ({
      ...waypoint,
    })),
  };
}

// Replace this data source when the live flight API is available.
export const liveFlightDataSource: LiveFlightDataSource = {
  async loadActiveFlights() {
    return mockActiveFlights.map(cloneFlight);
  },
};