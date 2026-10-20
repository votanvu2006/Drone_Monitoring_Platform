import type { FlightHistoryWaypoint } from "../../flightHistory.types";

type FlightRouteMapProps = {
  routeName: string;
  waypoints: FlightHistoryWaypoint[];
};

function toPolylinePoints(
  waypoints: FlightHistoryWaypoint[],
): string {
  return waypoints
    .map(({ x, y }) => `${x},${y}`)
    .join(" ");
}

export function FlightRouteMap({
  routeName,
  waypoints,
}: FlightRouteMapProps) {
  if (waypoints.length < 2) {
    return (
      <p className="flight-detail-route-unavailable">
        Route information is unavailable.
      </p>
    );
  }

  return (
    <div className="flight-detail-route-map">
      <svg
        className="flight-detail-route-svg"
        viewBox="0 0 100 60"
        role="img"
        aria-label={`${routeName} route with ${waypoints.length} waypoints`}
      >
        <polyline
          className="flight-detail-route-line"
          points={toPolylinePoints(waypoints)}
        />

        {waypoints.map((waypoint, index) => (
          <g
            className="flight-detail-waypoint"
            key={waypoint.code}
            aria-hidden="true"
          >
            <circle
              cx={waypoint.x}
              cy={waypoint.y}
              r="3.2"
            />
            <text x={waypoint.x} y={waypoint.y}>
              {String(index + 1).padStart(2, "0")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}