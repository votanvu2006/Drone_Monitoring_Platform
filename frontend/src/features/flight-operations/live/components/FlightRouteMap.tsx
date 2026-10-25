import type { FlightWaypoint } from "../liveFlight.types";

type FlightRouteMapProps = {
  routeName: string;
  waypoints: FlightWaypoint[];
  currentWaypointIndex: number;
};

type WaypointState = "completed" | "current" | "upcoming";

function toPolylinePoints(waypoints: FlightWaypoint[]): string {
  return waypoints
    .map(({ x, y }) => `${x},${y}`)
    .join(" ");
}

function getWaypointState(
  index: number,
  currentIndex: number,
): WaypointState {
  if (index < currentIndex) {
    return "completed";
  }

  if (index === currentIndex) {
    return "current";
  }

  return "upcoming";
}

export function FlightRouteMap({
  routeName,
  waypoints,
  currentWaypointIndex,
}: FlightRouteMapProps) {
  if (waypoints.length < 2) {
    return (
      <p className="flight-route-unavailable">
        Route information is unavailable.
      </p>
    );
  }

  const plannedPoints = toPolylinePoints(waypoints);
  const completedPoints = toPolylinePoints(
    waypoints.slice(0, currentWaypointIndex + 1),
  );

  const currentWaypoint = waypoints[currentWaypointIndex];

  return (
    <div className="flight-route-map">
      <svg
        className="flight-route-svg"
        viewBox="0 0 100 60"
        role="img"
        aria-label={`${routeName}: ${waypoints.length} waypoints. Current waypoint: ${currentWaypoint?.code ?? "unavailable"}.`}
      >
        <polyline
          className="flight-route-line flight-route-line--planned"
          points={plannedPoints}
        />

        {currentWaypointIndex > 0 && (
          <polyline
            className="flight-route-line flight-route-line--completed"
            points={completedPoints}
          />
        )}

        {waypoints.map((waypoint, index) => {
          const state = getWaypointState(
            index,
            currentWaypointIndex,
          );

          return (
            <g
              className={`flight-waypoint flight-waypoint--${state}`}
              key={waypoint.code}
              aria-hidden="true"
            >
              {state === "current" && (
                <circle
                  className="flight-waypoint-halo"
                  cx={waypoint.x}
                  cy={waypoint.y}
                  r="5"
                />
              )}

              <circle
                className="flight-waypoint-marker"
                cx={waypoint.x}
                cy={waypoint.y}
                r="3.2"
              />

              <text x={waypoint.x} y={waypoint.y}>
                {String(index + 1).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}