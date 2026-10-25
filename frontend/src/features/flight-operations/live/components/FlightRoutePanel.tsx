import type { LiveFlightSnapshot } from "../liveFlight.types";
import { FlightRouteMap } from "./FlightRouteMap";

type FlightRoutePanelProps = {
  flight: LiveFlightSnapshot;
};

function getCurrentWaypointIndex(
  requestedIndex: number,
  waypointCount: number,
): number {
  if (waypointCount === 0) {
    return -1;
  }

  return Math.min(
    Math.max(requestedIndex, 0),
    waypointCount - 1,
  );
}

function getRouteProgress(
  waypointCount: number,
  currentIndex: number,
) {
  const totalSegments = Math.max(waypointCount - 1, 0);
  const completedSegments = Math.max(currentIndex, 0);

  return {
    completedSegments,
    totalSegments,
    percent:
      totalSegments === 0
        ? 0
        : Math.round(
            (completedSegments / totalSegments) * 100,
          ),
  };
}

function RouteLegend() {
  return (
    <div className="flight-route-legend" aria-label="Route legend">
      <span>
        <i className="flight-route-legend-marker flight-route-legend-marker--completed" />
        Completed
      </span>

      <span>
        <i className="flight-route-legend-marker flight-route-legend-marker--current" />
        Current waypoint
      </span>

      <span>
        <i className="flight-route-legend-marker flight-route-legend-marker--upcoming" />
        Planned
      </span>
    </div>
  );
}

export function FlightRoutePanel({
  flight,
}: FlightRoutePanelProps) {
  const currentIndex = getCurrentWaypointIndex(
    flight.currentWaypointIndex,
    flight.waypoints.length,
  );

  const currentWaypoint = flight.waypoints[currentIndex];

  const progress = getRouteProgress(
    flight.waypoints.length,
    currentIndex,
  );

  return (
    <section
      className="flight-route-panel"
      aria-labelledby="flight-route-title"
    >
      <div className="flight-route-heading">
        <div>
          <p className="flight-section-eyebrow">Flight route</p>
          <h2 id="flight-route-title">{flight.routeName}</h2>
        </div>

        <div className="flight-current-waypoint">
          <span>Current waypoint</span>
          <strong>{currentWaypoint?.code ?? "Unavailable"}</strong>

          {currentWaypoint && (
            <small>{currentWaypoint.label}</small>
          )}
        </div>
      </div>

      <div className="flight-route-progress">
        <div className="flight-route-progress-heading">
          <span>Route completed</span>
          <strong>{progress.percent}%</strong>
        </div>

        <div
          className="flight-route-progress-bar"
          role="progressbar"
          aria-label="Route progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
        >
          <span style={{ width: `${progress.percent}%` }} />
        </div>

        <p className="flight-route-progress-note">
          {currentWaypoint
            ? `Waypoint ${currentIndex + 1} of ${flight.waypoints.length}`
            : "Waypoints unavailable"}

          {progress.totalSegments > 0 &&
            ` · ${progress.completedSegments} of ${progress.totalSegments} route segments complete`}
        </p>
      </div>

      <FlightRouteMap
        routeName={flight.routeName}
        waypoints={flight.waypoints}
        currentWaypointIndex={currentIndex}
      />

      <RouteLegend />
    </section>
  );
}