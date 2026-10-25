import type {
  FlightHistoryDetail,
  FlightHistoryEvent,
  FlightTelemetrySummary,
} from "../../flightHistory.types";
import {
  formatFlightDateTime,
  formatFlightDuration,
  formatFlightEventTime,
} from "../../flightHistory.utils";
import { FlightRouteMap } from "./FlightRouteMap";

// Flight identity and timing
export function FlightSummary({
  flight,
}: {
  flight: FlightHistoryDetail;
}) {
  const fields = [
    { label: "Flight", value: flight.flightCode },
    {
      label: "Date and time",
      value: formatFlightDateTime(flight.startedAt),
    },
    {
      label: "Duration",
      value: formatFlightDuration(flight.durationSeconds),
    },
    { label: "Drone", value: flight.droneCode },
    { label: "Mission", value: flight.missionCode },
  ];

  return (
    <section
      className="flight-detail-panel"
      aria-labelledby="flight-summary-title"
    >
      <h2 id="flight-summary-title">Flight summary</h2>

      <dl className="flight-detail-summary-grid">
        {fields.map((field) => (
          <div key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Route and waypoints
export function FlightRouteSection({
  flight,
}: {
  flight: FlightHistoryDetail;
}) {
  return (
    <section
      className="flight-detail-panel"
      aria-labelledby="flight-route-heading"
    >
      <div className="flight-detail-section-heading">
        <div>
          <h2 id="flight-route-heading">Flight route</h2>
          <p>{flight.routeName}</p>
        </div>
      </div>

      <FlightRouteMap
        routeName={flight.routeName}
        waypoints={flight.waypoints}
      />
    </section>
  );
}

// Recorded telemetry
export function TelemetrySummary({
  telemetry,
}: {
  telemetry: FlightTelemetrySummary;
}) {
  const metrics = [
    {
      label: "Start battery",
      value: `${telemetry.startBatteryPercent}%`,
    },
    {
      label: "End battery",
      value: `${telemetry.endBatteryPercent}%`,
    },
    {
      label: "Maximum altitude",
      value: `${telemetry.maxAltitudeMeters} m`,
    },
    {
      label: "Average speed",
      value: `${telemetry.averageSpeedMps} m/s`,
    },
    {
      label: "Distance",
      value: `${(telemetry.distanceMeters / 1000).toFixed(2)} km`,
    },
  ];

  return (
    <section
      className="flight-detail-panel"
      aria-labelledby="flight-telemetry-title"
    >
      <h2 id="flight-telemetry-title">Telemetry summary</h2>

      <dl className="flight-telemetry-grid">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// Flight events and alerts
export function FlightEvents({
  events,
}: {
  events: FlightHistoryEvent[];
}) {
  return (
    <section
      className="flight-detail-panel"
      aria-labelledby="flight-events-title"
    >
      <h2 id="flight-events-title">Events and alerts</h2>

      {events.length === 0 ? (
        <p className="flight-events-empty">
          No events or alerts were recorded for this flight.
        </p>
      ) : (
        <ol className="flight-events-list">
          {events.map((event) => (
            <li
              className={`flight-event flight-event--${event.severity.toLowerCase()}`}
              key={event.id}
            >
              <span
                className="flight-event-marker"
                aria-hidden="true"
              />

              <div className="flight-event-content">
                <div className="flight-event-heading">
                  <h3>{event.title}</h3>
                  <time dateTime={event.occurredAt}>
                    {formatFlightEventTime(event.occurredAt)}
                  </time>
                </div>
                <p>{event.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}