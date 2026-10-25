import { useEffect, useState } from "react";
import { flightHistoryDataSource } from "../flightHistory.data";
import type { FlightHistoryRecord } from "../flightHistory.types";
import { FlightHistoryFilters } from "./components/FlightHistoryFilters";
import { FlightHistoryTable } from "./components/FlightHistoryTable";
import {
  DEFAULT_FLIGHT_HISTORY_FILTERS,
  filterFlightRecords,
  hasActiveFlightFilters,
  type FlightHistoryFilterValues,
} from "./flightHistory.filters";
import "./styles/flight-history-list.css";

type PageState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; records: FlightHistoryRecord[] };

function FlightHistoryListPage() {
  const [pageState, setPageState] = useState<PageState>({
    kind: "loading",
  });

  const [filters, setFilters] = useState<FlightHistoryFilterValues>(
    DEFAULT_FLIGHT_HISTORY_FILTERS,
  );

  // Record loading
  useEffect(() => {
    let isActive = true;

    flightHistoryDataSource
      .loadRecords()
      .then((records) => {
        if (isActive) {
          setPageState({ kind: "ready", records });
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          console.error("Failed to load flight history:", error);
          setPageState({ kind: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  // Search and filter state
  function updateFilters(changes: Partial<FlightHistoryFilterValues>) {
    setFilters((current) => ({ ...current, ...changes }));
  }

  const records = pageState.kind === "ready" ? pageState.records : [];
  const visibleRecords = filterFlightRecords(records, filters);

  return (
    <main className="flight-history-page">
      <div className="flight-history-container">
        <header className="flight-history-heading">
          <p className="flight-history-eyebrow">
            Flight operations
          </p>
          <h1>Flight History</h1>
          <p className="flight-history-description">
            Review past flight records.
          </p>
        </header>

        {pageState.kind === "loading" && (
          <p className="flight-history-message" role="status">
            Loading flight history...
          </p>
        )}

        {pageState.kind === "error" && (
          <p className="flight-history-message" role="alert">
            Unable to load flight history.
          </p>
        )}

        {pageState.kind === "ready" && (
          <section
            className="flight-history-panel"
            aria-labelledby="flight-history-list-title"
          >
            <header className="flight-history-panel-heading">
              <div>
                <h2 id="flight-history-list-title">
                  Flight records
                </h2>
                <p>{records.length} records</p>
              </div>
            </header>

            <FlightHistoryFilters
              records={records}
              filters={filters}
              onChange={updateFilters}
            />

            <FlightHistoryTable
              records={visibleRecords}
              isFiltered={hasActiveFlightFilters(filters)}
            />
          </section>
        )}
      </div>
    </main>
  );
}

export default FlightHistoryListPage;