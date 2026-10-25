import {
  MISSION_STATUSES,
  type MissionDateFilter,
  type MissionListFilters,
  type MissionListItem,
  type MissionStatusFilter,
} from "../missionList.types";
import { formatMissionStatus } from "../missionList.utils";
import { MissionTable } from "./MissionTable";

type MissionListSectionProps = {
  missions: MissionListItem[];
  statusCounts: Record<MissionStatusFilter, number>;
  droneCodes: string[];
  filters: MissionListFilters;
  onSearchTextChange: (value: string) => void;
  onStatusChange: (status: MissionStatusFilter) => void;
  onDroneChange: (droneCode: string) => void;
  onDateRangeChange: (dateRange: MissionDateFilter) => void;
  onViewAlert?: (mission: MissionListItem) => void;
};

type MissionStatusTabsProps = {
  selectedStatus: MissionStatusFilter;
  statusCounts: Record<MissionStatusFilter, number>;
  onStatusChange: (status: MissionStatusFilter) => void;
};

type MissionFilterBarProps = {
  filters: MissionListFilters;
  droneCodes: string[];
  onSearchTextChange: (value: string) => void;
  onStatusChange: (status: MissionStatusFilter) => void;
  onDroneChange: (droneCode: string) => void;
  onDateRangeChange: (dateRange: MissionDateFilter) => void;
};

const statusTabs: Array<{
  value: MissionStatusFilter;
  label: string;
}> = [
  { value: "ALL", label: "All" },
  { value: "READY", label: "Ready" },
  { value: "WARNING", label: "Warning" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.8" />
      <path d="m13.2 13.2 4 4" />
    </svg>
  );
}

/* ---------- Status tabs ---------- */

function MissionStatusTabs({
  selectedStatus,
  statusCounts,
  onStatusChange,
}: MissionStatusTabsProps) {
  return (
    <div
      className="mission-status-tabs"
      role="tablist"
      aria-label="Filter missions by status"
    >
      {statusTabs.map((tab) => (
        <button
          className={`mission-status-tab${
            selectedStatus === tab.value ? " is-active" : ""
          }`}
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={selectedStatus === tab.value}
          onClick={() => onStatusChange(tab.value)}
        >
          <span>{tab.label}</span>
          <span className="mission-tab-count">
            {statusCounts[tab.value]}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Search and dropdown filters ---------- */

function MissionFilterBar({
  filters,
  droneCodes,
  onSearchTextChange,
  onStatusChange,
  onDroneChange,
  onDateRangeChange,
}: MissionFilterBarProps) {
  return (
    <div className="mission-filter-row">
      <label className="mission-search-field">
        <SearchIcon />
        <span className="visually-hidden">Search missions</span>
        <input
          type="search"
          value={filters.searchText}
          onChange={(event) =>
            onSearchTextChange(event.target.value)
          }
          placeholder="Search missions..."
        />
      </label>

      <label
        className="visually-hidden"
        htmlFor="mission-status-filter"
      >
        Filter by status
      </label>
      <select
        id="mission-status-filter"
        value={filters.status}
        onChange={(event) =>
          onStatusChange(event.target.value as MissionStatusFilter)
        }
      >
        <option value="ALL">All statuses</option>
        {MISSION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {formatMissionStatus(status)}
          </option>
        ))}
      </select>

      <label
        className="visually-hidden"
        htmlFor="mission-drone-filter"
      >
        Filter by drone
      </label>
      <select
        id="mission-drone-filter"
        value={filters.droneCode}
        onChange={(event) =>
          onDroneChange(event.target.value)
        }
      >
        <option value="ALL">All drones</option>
        {droneCodes.map((droneCode) => (
          <option key={droneCode} value={droneCode}>
            {droneCode}
          </option>
        ))}
      </select>

      <label
        className="visually-hidden"
        htmlFor="mission-date-filter"
      >
        Filter by date
      </label>
      <select
        id="mission-date-filter"
        value={filters.dateRange}
        onChange={(event) =>
          onDateRangeChange(event.target.value as MissionDateFilter)
        }
      >
        <option value="ALL">Any date</option>
        <option value="LAST_7_DAYS">Last 7 days</option>
        <option value="LAST_30_DAYS">Last 30 days</option>
      </select>
    </div>
  );
}

/* ---------- Section composition ---------- */

export function MissionListSection({
  missions,
  statusCounts,
  droneCodes,
  filters,
  onSearchTextChange,
  onStatusChange,
  onDroneChange,
  onDateRangeChange,
  onViewAlert,
}: MissionListSectionProps) {
  return (
    <section className="mission-list-panel" aria-label="Mission list">
      <MissionStatusTabs
        selectedStatus={filters.status}
        statusCounts={statusCounts}
        onStatusChange={onStatusChange}
      />

      <MissionFilterBar
        filters={filters}
        droneCodes={droneCodes}
        onSearchTextChange={onSearchTextChange}
        onStatusChange={onStatusChange}
        onDroneChange={onDroneChange}
        onDateRangeChange={onDateRangeChange}
      />

      <MissionTable
        missions={missions}
        onViewAlert={onViewAlert}
      />
    </section>
  );
}