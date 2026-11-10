import {
  FLIGHT_HISTORY_STATUSES,
  type FlightHistoryRecord,
} from "../../flightHistory.types";
import { formatFlightStatus } from "../../flightHistory.utils";
import {
  getFlightDroneCodes,
  type FlightDateFilter,
  type FlightHistoryFilterValues,
  type FlightStatusFilter,
} from "../flightHistory.filters";

type FlightHistoryFiltersProps = {
  records: FlightHistoryRecord[];
  filters: FlightHistoryFilterValues;
  onChange: (changes: Partial<FlightHistoryFilterValues>) => void;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.8" />
      <path d="m13.2 13.2 4 4" />
    </svg>
  );
}

export function FlightHistoryFilters({
  records,
  filters,
  onChange,
}: FlightHistoryFiltersProps) {
  const droneCodes = getFlightDroneCodes(records);

  return (
    <div className="flight-history-filters">
      <label className="flight-history-search">
        <SearchIcon />
        <span className="visually-hidden">Search flights</span>
        <input
          type="search"
          value={filters.searchText}
          onChange={(event) =>
            onChange({ searchText: event.target.value })
          }
          placeholder="Search flights..."
        />
      </label>

      <label>
        <span className="visually-hidden">Filter by status</span>
        <select
          value={filters.status}
          onChange={(event) =>
            onChange({
              status: event.target.value as FlightStatusFilter,
            })
          }
        >
          <option value="ALL">All statuses</option>
          {FLIGHT_HISTORY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {formatFlightStatus(status)}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="visually-hidden">Filter by drone</span>
        <select
          value={filters.droneCode}
          onChange={(event) =>
            onChange({ droneCode: event.target.value })
          }
        >
          <option value="ALL">All drones</option>
          {droneCodes.map((droneCode) => (
            <option key={droneCode} value={droneCode}>
              {droneCode}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className="visually-hidden">Filter by date</span>
        <select
          value={filters.dateRange}
          onChange={(event) =>
            onChange({
              dateRange: event.target.value as FlightDateFilter,
            })
          }
        >
          <option value="ALL">Any date</option>
          <option value="LAST_7_DAYS">Last 7 days</option>
          <option value="LAST_30_DAYS">Last 30 days</option>
        </select>
      </label>
    </div>
  );
}