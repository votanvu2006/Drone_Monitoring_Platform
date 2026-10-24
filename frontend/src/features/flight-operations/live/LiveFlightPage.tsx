import { useEffect, useState } from "react";
import { FlightRoutePanel } from "./components/FlightRoutePanel";
import { liveFlightDataSource } from "./liveFlight.data";
import type { LiveFlightSnapshot } from "./liveFlight.types";
import "./styles/live-flight.css";

type PageState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; flights: LiveFlightSnapshot[] };

function FlightStatusBadge() {
  return (
    <span className="live-flight-status">
      <span className="live-flight-status-dot" />
      In progress
    </span>
  );
}

function ActiveFlightSelector({
  flights,
  selectedFlightCode,
  onFlightChange,
}: {
  flights: LiveFlightSnapshot[];
  selectedFlightCode: string;
  onFlightChange: (flightCode: string) => void;
}) {
  return (
    <div className="live-flight-selector">
      <label htmlFor="active-flight-select">
        Active flight
      </label>

      <select
        id="active-flight-select"
        value={selectedFlightCode}
        onChange={(event) => onFlightChange(event.target.value)}
      >
        {flights.map((flight) => (
          <option key={flight.flightCode} value={flight.flightCode}>
            {flight.flightCode} · {flight.missionCode} · {flight.droneCode}
          </option>
        ))}
      </select>
    </div>
  );
}

function FlightDetails({
  flight,
}: {
  flight: LiveFlightSnapshot;
}) {
  return (
    <section
      className="live-flight-details"
      aria-labelledby="live-flight-details-title"
    >
      <h2 id="live-flight-details-title">Flight details</h2>

      <dl className="live-flight-details-grid">
        <div>
          <dt>Flight</dt>
          <dd>{flight.flightCode}</dd>
        </div>

        <div>
          <dt>Mission</dt>
          <dd>{flight.missionCode}</dd>
        </div>

        <div>
          <dt>Drone</dt>
          <dd>{flight.droneCode}</dd>
        </div>
      </dl>
    </section>
  );
}

function LiveFlightPage() {
  const [pageState, setPageState] = useState<PageState>({
    kind: "loading",
  });
  const [selectedFlightCode, setSelectedFlightCode] =
    useState<string | null>(null);

  // Load only flights that are currently in progress.
  useEffect(() => {
    let isActive = true;

    liveFlightDataSource
      .loadActiveFlights()
      .then((flights) => {
        if (isActive) {
          const inProgressFlights = flights.filter(
            (flight) => flight.flightStatus === "IN_PROGRESS",
          );

          setPageState({
            kind: "ready",
            flights: inProgressFlights,
          });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          console.error("Failed to load active flights:", error);
          setPageState({ kind: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const selectedFlight =
    pageState.kind === "ready"
      ? pageState.flights.find(
          (flight) => flight.flightCode === selectedFlightCode,
        ) ?? pageState.flights[0] ?? null
      : null;

  return (
    <main className="live-flight-page">
      <div className="live-flight-container">
        <header className="live-flight-heading">
          <div>
            <p className="live-flight-eyebrow">
              Flight operations
            </p>
            <h1>Live Flight</h1>
            <p className="live-flight-description">
              Track an active flight route and its completion progress.
            </p>
          </div>

          {selectedFlight && <FlightStatusBadge />}
        </header>

        {pageState.kind === "loading" && (
          <p className="live-flight-message" role="status">
            Loading active flights...
          </p>
        )}

        {pageState.kind === "error" && (
          <p className="live-flight-message" role="alert">
            Unable to load active flights.
          </p>
        )}

        {pageState.kind === "ready" &&
          pageState.flights.length === 0 && (
            <p className="live-flight-message">
              No active flights are available.
            </p>
          )}

        {pageState.kind === "ready" && selectedFlight && (
          <>
            <ActiveFlightSelector
              flights={pageState.flights}
              selectedFlightCode={selectedFlight.flightCode}
              onFlightChange={setSelectedFlightCode}
            />

            <FlightDetails flight={selectedFlight} />
            <FlightRoutePanel flight={selectedFlight} />
          </>
        )}
      </div>
    </main>
  );
}

export default LiveFlightPage;