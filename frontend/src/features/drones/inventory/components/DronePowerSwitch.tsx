import type {
  DroneStatus,
  SwitchableDroneStatus,
} from "../droneInventory.types";

type DronePowerSwitchProps = {
  droneCode: string;
  status: DroneStatus;
  onToggle: (nextStatus: SwitchableDroneStatus) => void;
};

function formatStatus(status: DroneStatus): string {
  return status.toLowerCase().replace(/_/g, " ");
}

export function DronePowerSwitch({
  droneCode,
  status,
  onToggle,
}: DronePowerSwitchProps) {
  const canToggle = status === "OFFLINE" || status === "AVAILABLE";
  const isPoweredOn = status === "AVAILABLE" || status === "IN_FLIGHT";
  const powerLabel = isPoweredOn ? "ON" : "OFF";

  const accessibleLabel = canToggle
    ? `${droneCode} power ${powerLabel.toLowerCase()}`
    : `${droneCode} power ${powerLabel.toLowerCase()}; switching is unavailable while ${formatStatus(status)}`;

  const title = canToggle
    ? `Turn ${isPoweredOn ? "off" : "on"} ${droneCode}`
    : `Power switching is unavailable while ${formatStatus(status)}`;

  function handleToggle() {
    if (!canToggle) {
      return;
    }

    const nextStatus: SwitchableDroneStatus =
      status === "OFFLINE" ? "AVAILABLE" : "OFFLINE";

    onToggle(nextStatus);
  }

  return (
    <button
      className={`power-switch${isPoweredOn ? " is-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={isPoweredOn}
      aria-label={accessibleLabel}
      title={title}
      disabled={!canToggle}
      onClick={handleToggle}
    >
      <span className="switch-track">
        <span className="switch-knob" />
      </span>

      <span className="switch-label">{powerLabel}</span>
    </button>
  );
}