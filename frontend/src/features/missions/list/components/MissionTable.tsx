import type {
  MissionListItem,
  MissionStatus,
} from "../missionList.types";
import { formatMissionStatus } from "../missionList.utils";

type MissionTableProps = {
  missions: MissionListItem[];
  onViewAlert?: (mission: MissionListItem) => void;
};

function ArrowIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h9M8 4l4 4-4 4" />
    </svg>
  );
}

/* ---------- Mission status ---------- */

function MissionStatusBadge({
  status,
}: {
  status: MissionStatus;
}) {
  const statusClass = status.toLowerCase().replace(/_/g, "-");

  return (
    <span
      className={`mission-status-badge mission-status--${statusClass}`}
    >
      <span className="mission-status-dot" />
      {formatMissionStatus(status)}
    </span>
  );
}

/* ---------- Alert cell ---------- */

function MissionAlertCell({
  mission,
  onViewAlert,
}: {
  mission: MissionListItem;
  onViewAlert?: (mission: MissionListItem) => void;
}) {
  if (mission.status !== "WARNING" && mission.status !== "FAILED") {
    return (
      <span className="mission-no-alert">
        <span
          className="mission-no-alert-dot"
          aria-hidden="true"
        />
        No alert
      </span>
    );
  }

  const severity =
    mission.status === "WARNING" ? "warning" : "failed";

  return (
    <button
      className={`mission-alert-action mission-alert-action--${severity}`}
      type="button"
      disabled={!onViewAlert}
      onClick={() => onViewAlert?.(mission)}
      title={
        onViewAlert
          ? undefined
          : "Alerts page will be connected later"
      }
      aria-label={`View alert for ${mission.name}`}
    >
      View alert
      <ArrowIcon />
    </button>
  );
}

/* ---------- Empty state and table ---------- */

export function MissionTable({
  missions,
  onViewAlert,
}: MissionTableProps) {
  if (missions.length === 0) {
    return (
      <div className="mission-empty-state">
        <h3>No missions found</h3>
        <p>Try changing your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="mission-table-scroll">
      <table className="mission-table">
        <thead>
          <tr>
            <th scope="col">Mission</th>
            <th scope="col">Drone</th>
            <th scope="col">Status</th>
            <th scope="col">Waypoints</th>
            <th scope="col">Alert</th>
          </tr>
        </thead>

        <tbody>
          {missions.map((mission) => (
            <tr key={mission.id}>
              <td>
                <span className="mission-name">
                  {mission.name}
                </span>
              </td>
              <td>
                <span className="mission-drone-code">
                  {mission.droneCode}
                </span>
              </td>
              <td>
                <MissionStatusBadge status={mission.status} />
              </td>
              <td>{mission.waypointCount}</td>
              <td>
                <MissionAlertCell
                  mission={mission}
                  onViewAlert={onViewAlert}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}