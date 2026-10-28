import type {
  Drone,
  DroneStatus,
  SwitchableDroneStatus,
} from "../droneInventory.types";
import { DroneIllustration } from "../../shared/DroneIllustration";
import { DronePowerSwitch } from "./DronePowerSwitch";
import "../styles/drone-card.css";

const BATTERY_PREVIEW_LEVEL = 100;

type DroneCardProps = {
  drone: Drone;
  onViewDetails: (droneCode: string) => void;
  onTogglePower: (
    droneCode: string,
    nextStatus: SwitchableDroneStatus,
  ) => void;
};

function formatStatus(status: DroneStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: DroneStatus): string {
  return status.toLowerCase().replace(/_/g, "-");
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 10h11M10 5l5 5-5 5" />
    </svg>
  );
}

function BatteryMeter({ level }: { level: number }) {
  return (
    <div
      className="battery-meter"
      role="img"
      aria-label={`Battery visual placeholder: ${level}%`}
    >
      <div className="battery-body">
        <span className="battery-fill" style={{ width: `${level}%` }} />
      </div>
      <span className="battery-cap" />
    </div>
  );
}

export function DroneCard({
  drone,
  onViewDetails,
  onTogglePower,
}: DroneCardProps) {
  return (
    <article className="drone-card">
      <div className="drone-art">
        <span className="drone-art-glow" />
        <DroneIllustration className="drone-icon" />

        <span
          className={`status-badge status--${getStatusClass(drone.status)}`}
        >
          <span className="status-dot" />
          {formatStatus(drone.status)}
        </span>
      </div>

      <div className="drone-heading">
        <h3>{drone.code}</h3>
        <p className="drone-model">{drone.modelName}</p>
      </div>

      <div className="drone-meta">
        <div>
          <span>Location</span>
          <strong>{drone.lastKnownLocation ?? "No location reported"}</strong>
        </div>

        <div>
          <span>Active mission</span>
          <strong>{drone.activeMission ?? "No active mission"}</strong>
        </div>
      </div>

      <div className="battery-block">
        <div className="battery-label-row">
          <span>Battery</span>
          <strong>{BATTERY_PREVIEW_LEVEL}%</strong>
        </div>

        <BatteryMeter level={BATTERY_PREVIEW_LEVEL} />
      </div>

      <div className="drone-card-actions">
        <DronePowerSwitch
          droneCode={drone.code}
          status={drone.status}
          onToggle={(nextStatus) =>
            onTogglePower(drone.code, nextStatus)
          }
        />

        <button
          className="details-button"
          type="button"
          onClick={() => onViewDetails(drone.code)}
          aria-label={`View details for ${drone.code}`}
        >
          View details
          <ArrowIcon />
        </button>
      </div>
    </article>
  );
}