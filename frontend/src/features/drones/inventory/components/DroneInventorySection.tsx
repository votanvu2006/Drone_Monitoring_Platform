import type { Drone, DroneStatus } from "../droneInventory.types";
import { DroneCard } from "./DroneCard";

export type FleetStatusFilter = "ALL" | DroneStatus;

type DroneInventorySectionProps = {
  drones: Drone[];
  modelNames: string[];
  searchText: string;
  status: FleetStatusFilter;
  modelName: string;
  onSearchTextChange: (value: string) => void;
  onStatusChange: (value: FleetStatusFilter) => void;
  onModelChange: (value: string) => void;
  onViewDetails: (droneCode: string) => void;
  onTogglePower: (droneCode: string, isOn: boolean) => Promise<void>;
  updatingDroneCode: string | null;
  powerError: { droneCode: string; message: string } | null;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.8" />
      <path d="m13.2 13.2 4 4" />
    </svg>
  );
}

export function DroneInventorySection({
  drones,
  modelNames,
  searchText,
  status,
  modelName,
  onSearchTextChange,
  onStatusChange,
  onModelChange,
  onViewDetails,
  onTogglePower,
  updatingDroneCode,
  powerError,
}: DroneInventorySectionProps) {
  return (
    <section className="inventory-panel" aria-labelledby="inventory-title">
      <div className="panel-heading">
        <h2 id="inventory-title">Fleet inventory</h2>
        <p>Browse registered drones and their current state</p>
      </div>

      <div className="filter-row">
        <label className="search-field">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search drones..."
            aria-label="Search drones"
            value={searchText}
            onChange={(event) => onSearchTextChange(event.target.value)}
          />
        </label>

        <select
          aria-label="Filter by status"
          value={status}
          onChange={(event) =>
            onStatusChange(event.target.value as FleetStatusFilter)
          }
        >
          <option value="ALL">All statuses</option>
          <option value="OFFLINE">Offline</option>
          <option value="AVAILABLE">Available</option>
          <option value="IN_FLIGHT">In flight</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>

        <select
          aria-label="Filter by model"
          value={modelName}
          onChange={(event) => onModelChange(event.target.value)}
        >
          <option value="ALL">All models</option>
          {modelNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {drones.length === 0 ? (
        <p role="status">No drones match these filters.</p>
      ) : (
        <div className="drone-row">
          {drones.map((drone) => (
            <DroneCard
              key={drone.code}
              drone={drone}
              onViewDetails={onViewDetails}
              onTogglePower={onTogglePower}
              powerBusy={updatingDroneCode !== null}
              isUpdating={updatingDroneCode === drone.code}
              powerError={
                powerError?.droneCode === drone.code
                  ? powerError.message
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}