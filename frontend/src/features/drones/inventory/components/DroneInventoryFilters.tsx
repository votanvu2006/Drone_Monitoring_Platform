import type { DroneInventoryFilters } from "../droneInventory.types";
import { DRONE_STATUS_FILTER_OPTIONS } from "../droneInventory.utils";

type DroneInventoryFiltersProps = {
  filters: DroneInventoryFilters;
  modelNames: string[];
  onChange: (changes: Partial<DroneInventoryFilters>) => void;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.8" />
      <path d="m13.2 13.2 4 4" />
    </svg>
  );
}

export function DroneInventoryFilters({
  filters,
  modelNames,
  onChange,
}: DroneInventoryFiltersProps) {
  return (
    <div className="filter-row">
      <label className="search-field">
        <SearchIcon />

        <input
          type="search"
          value={filters.searchText}
          onChange={(event) =>
            onChange({ searchText: event.target.value })
          }
          placeholder="Search drones..."
          aria-label="Search drones"
        />
      </label>

      <select
        value={filters.status}
        onChange={(event) =>
          onChange({
            status: event.target
              .value as DroneInventoryFilters["status"],
          })
        }
        aria-label="Filter by status"
      >
        <option value="ALL">All statuses</option>

        {DRONE_STATUS_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={filters.modelName}
        onChange={(event) =>
          onChange({ modelName: event.target.value })
        }
        aria-label="Filter by model"
      >
        <option value="ALL">All models</option>

        {modelNames.map((modelName) => (
          <option key={modelName} value={modelName}>
            {modelName}
          </option>
        ))}
      </select>
    </div>
  );
}