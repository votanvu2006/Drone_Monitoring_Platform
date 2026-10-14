import { useEffect, useState } from "react";
import "./App.css";

/* ---------- Data types ---------- */

type DroneStatus = "OFFLINE" | "AVAILABLE" | "IN_FLIGHT" | "MAINTENANCE";
type FindingSeverity = "WARNING" | "FAULT";

type Drone = {
  code: string;
  modelName: string;
  status: DroneStatus;
  homeBase: string;
  lastKnownLocation: string | null;
  activeMission: string | null;
};

type ComponentFinding = {
  id: string;
  droneCode: string;
  componentCode: string;
  severity: FindingSeverity;
  detectedAt: string;
};

type FleetSnapshot = {
  drones: Drone[];
  findings: ComponentFinding[];
};

type FleetDataSource = {
  loadSnapshot: () => Promise<FleetSnapshot>;
};

/* ---------- Mock data and API connection point ---------- */

const MODEL_NAME = "AeroVision X1 Enterprise";
const BATTERY_PREVIEW_LEVEL = 100;

const mockDrones: Drone[] = [
  "DRONE-001",
  "DRONE-002",
  "DRONE-003",
  "DRONE-004",
  "DRONE-005",
].map(
  (code): Drone => ({
    code,
    modelName: MODEL_NAME,
    status: "OFFLINE",
    homeBase: "District 1 Operations Home Base",
    lastKnownLocation: null,
    activeMission: null,
  }),
);

const mockSnapshot: FleetSnapshot = {
  drones: mockDrones,

  // A configured faulty component becomes a finding only after
  // the monitoring system detects its issue during flight.
  findings: [],
};

const fleetDataSource: FleetDataSource = {
  async loadSnapshot() {
    // Replace this return with an API request and response mapping
    // when the backend endpoint and response format are confirmed.
    return mockSnapshot;
  },
};

/* ---------- Formatting helpers ---------- */

function formatCount(count: number) {
  return String(count).padStart(2, "0");
}

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

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

/* ---------- Icons ---------- */

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

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="8.8" cy="8.8" r="5.8" />
      <path d="m13.2 13.2 4 4" />
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

/* ---------- Header and summary ---------- */

function AddDronesControl() {
  return (
    <span className="add-drones-control">
      <button
        className="add-drones-button"
        type="button"
        disabled
        aria-describedby="add-drones-tooltip"
      >
        <svg
          viewBox="0 0 20 20"
          width="14"
          height="14"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 4v12M4 10h12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span>Add drones</span>
      </button>

      <span
        className="add-drones-tooltip"
        id="add-drones-tooltip"
        role="tooltip"
      >
        Add drone
      </span>
    </span>
  );
}

function FleetSummary({
  drones,
  findings,
  modelNames,
}: {
  drones: Drone[];
  findings: ComponentFinding[];
  modelNames: string[];
}) {
  const offlineCount = drones.filter(
    (drone) => drone.status === "OFFLINE",
  ).length;

  const affectedDroneCount = new Set(
    findings.map((finding) => finding.droneCode),
  ).size;

  const faultCount = findings.filter(
    (finding) => finding.severity === "FAULT",
  ).length;

  const warningCount = findings.filter(
    (finding) => finding.severity === "WARNING",
  ).length;

  const findingsNote = [
    `${affectedDroneCount} affected ${pluralize(
      affectedDroneCount,
      "drone",
      "drones",
    )}`,
    `${faultCount} ${pluralize(faultCount, "fault", "faults")}`,
    `${warningCount} ${pluralize(warningCount, "warning", "warnings")}`,
  ].join(" · ");

  const cards = [
    {
      label: "Offline",
      value: formatCount(offlineCount),
      note: "Initial fleet state",
    },
    {
      label: "Model types",
      value: formatCount(modelNames.length),
      note: modelNames[0] ?? "No registered models",
    },
    {
      label: "Component findings",
      value: formatCount(findings.length),
      note: findingsNote,
    },
  ];

  return (
    <section className="summary-grid" aria-label="Fleet summary">
      {cards.map((card) => (
        <article className="summary-card" key={card.label}>
          <span className="summary-label">{card.label}</span>
          <strong className="summary-value">{card.value}</strong>
          <span className="summary-note">{card.note}</span>
        </article>
      ))}
    </section>
  );
}

/* ---------- Drone card ---------- */

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

function DroneCard({ drone }: { drone: Drone }) {
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

/* ---------- Fleet inventory ---------- */

function FleetInventory({
  drones,
  modelNames,
}: {
  drones: Drone[];
  modelNames: string[];
}) {
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
          <DroneCard key={drone.code} drone={drone} />
        ))}
      </div>
    </section>
  );
}

/* ---------- Page entry point ---------- */

function App() {
  const [snapshot, setSnapshot] = useState<FleetSnapshot>(mockSnapshot);

  useEffect(() => {
    let isActive = true;

    fleetDataSource
      .loadSnapshot()
      .then((data) => {
        if (isActive) setSnapshot(data);
      })
      .catch((error: unknown) => {
        console.error("Failed to load fleet data:", error);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const modelNames = Array.from(
    new Set(snapshot.drones.map((drone) => drone.modelName)),
  );

  return (
    <main className="fleet-page">
      <div className="page-container">
        <header className="page-heading">
          <div>
            <h1>Drones</h1>
            <p className="page-description">
              Manage and monitor your drone fleet
            </p>
          </div>
          <AddDronesControl />
        </header>

        <FleetSummary
          drones={snapshot.drones}
          findings={snapshot.findings}
          modelNames={modelNames}
        />

        <FleetInventory
          drones={snapshot.drones}
          modelNames={modelNames}
        />
      </div>
    </main>
  );
}

export default App;