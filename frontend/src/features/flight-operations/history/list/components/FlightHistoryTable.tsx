import type { FlightHistoryRecord } from "../../flightHistory.types";
import {
  formatFlightDateTime,
  formatFlightDuration,
  formatFlightStatus,
  getFlightStatusClass,
} from "../../flightHistory.utils";

type FlightHistoryTableProps = {
  records: FlightHistoryRecord[];
  isFiltered: boolean;
};

function FlightStatusBadge({
  status,
}: {
  status: FlightHistoryRecord["status"];
}) {
  const statusClass = getFlightStatusClass(status);

  return (
    <span
      className={`flight-history-status flight-history-status--${statusClass}`}
    >
      <span className="flight-history-status-dot" />
      {formatFlightStatus(status)}
    </span>
  );
}

export function FlightHistoryTable({
  records,
  isFiltered,
}: FlightHistoryTableProps) {
  if (records.length === 0) {
    return (
      <div className="flight-history-empty" role="status">
        <h3>
          {isFiltered ? "No matching flights" : "No flight records"}
        </h3>

        <p>
          {isFiltered
            ? "Try changing your search or filters."
            : "Flight history will appear here when available."}
        </p>
      </div>
    );
  }

  return (
    <div className="flight-history-table-scroll">
      <table className="flight-history-table">
        <thead>
          <tr>
            <th scope="col">Flight</th>
            <th scope="col">Date and time</th>
            <th scope="col">Duration</th>
            <th scope="col">Drone</th>
            <th scope="col">Mission</th>
            <th scope="col">Status</th>
          </tr>
        </thead>

        <tbody>
          {records.map((record) => (
            <tr key={record.flightCode}>
              <td className="flight-history-code">
                {record.flightCode}
              </td>
              <td>{formatFlightDateTime(record.startedAt)}</td>
              <td>{formatFlightDuration(record.durationSeconds)}</td>
              <td>{record.droneCode}</td>
              <td>{record.missionCode}</td>
              <td>
                <FlightStatusBadge status={record.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}