import { useEffect, useState } from "react";
import {
  DEFAULT_FLIGHT_CODE,
  flightHistoryDataSource,
} from "../flightHistory.data";
import type {
  FlightHistoryDetail,
  FlightHistoryDataSource,
  FlightHistoryStatus,
} from "../flightHistory.types";
import {
  formatFlightStatus,
  getFlightStatusClass,
} from "../flightHistory.utils";
import {
  FlightEvents,
  FlightRouteSection,
  FlightSummary,
  TelemetrySummary,
} from "./components/FlightDetailSections";
import "./styles/flight-history-detail.css";

type PageState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; flight: FlightHistoryDetail | null };

type FlightHistoryDetailPageProps = {
  flightCode?: string;
  dataSource?: FlightHistoryDataSource;
};

function FlightStatusBadge({
  status,
}: {
  status: FlightHistoryStatus;
}) {
  return (
    <span
      className={`flight-detail-status flight-detail-status--${getFlightStatusClass(status)}`}
    >
      <span className="flight-detail-status-dot" />
      {formatFlightStatus(status)}
    </span>
  );
}

function FlightHistoryDetailPage({
  flightCode = DEFAULT_FLIGHT_CODE,
  dataSource = flightHistoryDataSource,
}: FlightHistoryDetailPageProps) {
  const [pageState, setPageState] = useState<PageState>({
    kind: "loading",
  });

  // Load one flight. The default code supports a standalone page preview.
  useEffect(() => {
    let isActive = true;

    dataSource
      .loadDetail(flightCode)
      .then((flight) => {
        if (isActive) {
          setPageState({ kind: "ready", flight });
        }
      })
      .catch(() => {
        if (isActive) {
          setPageState({ kind: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, [flightCode, dataSource]);

  const flight =
    pageState.kind === "ready" ? pageState.flight : null;

  return (
    <main className="flight-detail-page">
      <div className="flight-detail-container">
        <header className="flight-detail-heading">
          <div>
            <p className="flight-detail-eyebrow">
              Flight operations
            </p>
            <h1>Flight Details</h1>
          </div>

          {flight && <FlightStatusBadge status={flight.status} />}
        </header>

        {pageState.kind === "loading" && (
          <p className="flight-detail-message" role="status">
            Loading flight details...
          </p>
        )}

        {pageState.kind === "error" && (
          <p className="flight-detail-message" role="alert">
            Unable to load flight details.
          </p>
        )}

        {pageState.kind === "ready" && !flight && (
          <p className="flight-detail-message">
            Flight record not found.
          </p>
        )}

        {flight && (
          <div className="flight-detail-content">
            <FlightSummary flight={flight} />
            <FlightRouteSection flight={flight} />
            <TelemetrySummary telemetry={flight.telemetry} />
            <FlightEvents events={flight.events} />
          </div>
        )}
      </div>
    </main>
  );
}

export default FlightHistoryDetailPage;