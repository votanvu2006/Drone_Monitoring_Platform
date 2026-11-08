export type FlightWaypoint = {
  code: string;
  label: string;
  x: number;
  y: number;
};

export type LiveFlightSnapshot = {
  flightCode: string;
  missionCode: string;
  droneCode: string;
  flightStatus: "IN_PROGRESS";
  routeName: string;
  routeProgressPercent?: number;
  currentWaypointIndex: number;
  waypoints: FlightWaypoint[];
};

export type LiveFlightDataSource = {
  loadActiveFlights: () => Promise<LiveFlightSnapshot[]>;
};