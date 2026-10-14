import type { Drone } from "../droneInventory.types";
import { DroneCard } from "./DroneCard";

type DroneInventorySectionProps = {
  drones: Drone[];
  modelNames: string[];
  onViewDetails: (droneCode: string) => void;
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
  onViewDetails,
}: DroneInventorySectionProps) {
  return (
    <section className="inventory-panel" aria-labelledby="inventory-title">
      <div className="panel-heading">
        <h2 id="inventory-title">Fleet inventory</h2>
        <p>Browse registered drones and their initial data-pack state</p>
      </div>

      <div className="filter-row">
        <label className="search-field">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search drones..."
            aria-label="Search drones"
          />
        </label>

        <select aria-label="Filter by status" defaultValue="all-statuses">
          <option value="all-statuses">All statuses</option>
          <option value="offline">Offline</option>
          <option value="available">Available</option>
          <option value="in-flight">In flight</option>
        </select>

        <select aria-label="Filter by model" defaultValue="all-models">
          <option value="all-models">All models</option>
          {modelNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="drone-row">
        {drones.map((drone) => (
          <DroneCard
            key={drone.code}
            drone={drone}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </section>
  );
}