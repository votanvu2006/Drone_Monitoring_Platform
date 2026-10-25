import type {
  Drone,
  DroneInventoryFilters,
  SwitchableDroneStatus,
} from "../droneInventory.types";
import { DroneCard } from "./DroneCard";
import { DroneInventoryFilters as Filters } from "./DroneInventoryFilters";

type DroneInventorySectionProps = {
  drones: Drone[];
  modelNames: string[];
  filters: DroneInventoryFilters;
  onFiltersChange: (
    changes: Partial<DroneInventoryFilters>,
  ) => void;
  onViewDetails: (droneCode: string) => void;
  onTogglePower: (
    droneCode: string,
    nextStatus: SwitchableDroneStatus,
  ) => void;
};

export function DroneInventorySection({
  drones,
  modelNames,
  filters,
  onFiltersChange,
  onViewDetails,
  onTogglePower,
}: DroneInventorySectionProps) {
  return (
    <section
      className="inventory-panel"
      aria-labelledby="inventory-title"
    >
      <div className="panel-heading">
        <h2 id="inventory-title">Fleet inventory</h2>
        <p>Browse registered drones and their initial data-pack state</p>
      </div>

      <Filters
        filters={filters}
        modelNames={modelNames}
        onChange={onFiltersChange}
      />

      {drones.length === 0 ? (
        <p className="drone-empty-state" role="status">
          No drones match your search or filters.
        </p>
      ) : (
        <div className="drone-row">
          {drones.map((drone) => (
            <DroneCard
              key={drone.code}
              drone={drone}
              onViewDetails={onViewDetails}
              onTogglePower={onTogglePower}
            />
          ))}
        </div>
      )}
    </section>
  );
}