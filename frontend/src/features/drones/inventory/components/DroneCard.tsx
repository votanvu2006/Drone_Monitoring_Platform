import type { Drone, DroneStatus } from "../droneInventory.types";
import { DroneIllustration } from "../../shared/DroneIllustration";
import "../styles/drone-card.css";

type DroneCardProps = {
  drone: Drone;
  onViewDetails: (droneCode: string) => void;
};

function formatStatus(status: DroneStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: DroneStatus) {
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
  const displayLevel = Math.max(0, Math.min(100, level));

  return (
    <div
      className="battery-meter"
      role="img"
      aria-label={`Battery: ${displayLevel}%`}
    >
      <div className="battery-body">
        <span
          className="battery-fill"
          style={{ width: `${displayLevel}%` }}
        />
      </div>
      <span className="battery-cap" />
    </div>
  );
}

function PowerSwitch({ drone }: { drone: Drone }) {
  const isOn = drone.status === "IN_FLIGHT";

  return (
    <button
      className="power-switch"
      type="button"
      disabled
      aria-label={`${drone.code} power is ${isOn ? "on" : "off"}`}
      aria-pressed={isOn}
    >
      <span className="switch-track">
        <span className="switch-knob" />
      </span>
      <span className="switch-label">{isOn ? "ON" : "OFF"}</span>
    </button>
  );
}

export function DroneCard({ drone, onViewDetails }: DroneCardProps) {
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
          <strong>
            {drone.lastKnownLocation ?? "No location reported"}
          </strong>
        </div>
        <div>
          <span>Active mission</span>
          <strong>{drone.activeMission ?? "No active mission"}</strong>
        </div>
      </div>

      <div className="battery-block">
        <div className="battery-label-row">
          <span>Battery</span>
          <strong>{drone.batteryPercent}%</strong>
        </div>
        <BatteryMeter level={drone.batteryPercent} />
      </div>

      <div className="drone-card-actions">
        <PowerSwitch drone={drone} />

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