import type { Drone, DroneStatus } from "../droneInventory.types";
import "../styles/drone-card.css";

const BATTERY_PREVIEW_LEVEL = 100;

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

function DroneIcon() {
  return (
    <svg
      className="drone-icon"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      <path d="M21 21 10 15M27 21l11-6M21 27l-11 6M27 27l11 6" />
      <path d="M24 17v14M17 24h14" />
      <rect x="20" y="20" width="8" height="8" rx="2" />
      <ellipse cx="9" cy="14" rx="6" ry="2.5" />
      <ellipse cx="39" cy="14" rx="6" ry="2.5" />
      <ellipse cx="9" cy="34" rx="6" ry="2.5" />
      <ellipse cx="39" cy="34" rx="6" ry="2.5" />
    </svg>
  );
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

function PowerSwitch({ droneCode }: { droneCode: string }) {
  return (
    <button
      className="power-switch"
      type="button"
      disabled
      aria-label={`${droneCode} power is off`}
      aria-pressed={false}
    >
      <span className="switch-track">
        <span className="switch-knob" />
      </span>
      <span className="switch-label">OFF</span>
    </button>
  );
}

export function DroneCard({ drone }: { drone: Drone }) {
  return (
    <article className="drone-card">
      <div className="drone-art">
        <span className="drone-art-glow" />
        <DroneIcon />

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
          <strong>{BATTERY_PREVIEW_LEVEL}%</strong>
        </div>
        <BatteryMeter level={BATTERY_PREVIEW_LEVEL} />
      </div>

      <div className="drone-card-actions">
        <PowerSwitch droneCode={drone.code} />
        <button className="details-button" type="button" disabled>
          View details
          <ArrowIcon />
        </button>
      </div>
    </article>
  );
}