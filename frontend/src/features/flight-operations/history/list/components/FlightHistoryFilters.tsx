import {
  FLIGHT_HISTORY_STATUSES,
  type FlightHistoryRecord,
} from "../../flightHistory.types";
import { formatFlightStatus } from "../../flightHistory.utils";

type FlightHistoryFiltersProps = {
  records: FlightHistoryRecord[];
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
}: FlightHistoryFiltersProps) {
  const droneCodes = Array.from(
    new Set(records.map((record) => record.droneCode)),
  ).sort();

  return (
    <div className="flight-history-filters">
      <label className="flight-history-search">
        <SearchIcon />
        <span className="visually-hidden">Search flights</span>
        <input
          type="search"
          placeholder="Search flights..."
          readOnly
        />
      </label>

      <label>
        <span className="visually-hidden">Filter by status</span>
        <select defaultValue="ALL" disabled>
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
        <select defaultValue="ALL" disabled>
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
        <select defaultValue="ALL" disabled>
          <option value="ALL">Any date</option>
          <option value="LAST_7_DAYS">Last 7 days</option>
          <option value="LAST_30_DAYS">Last 30 days</option>
        </select>
      </label>
    </div>
  );
}