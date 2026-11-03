import { useEffect, useState } from "react";
import { DroneIllustration } from "../shared/DroneIllustration";
import { DroneComponentGroup } from "./components/DroneComponentGroup";
import { droneDetailDataSource } from "./droneDetail.data";
import type {
  DroneComponent,
  DroneComponentType,
  DroneDetail,
} from "./droneDetail.types";
import "./styles/drone-detail.css";

type DroneDetailPageProps = {
  droneCode: string;
  onBack: () => void;
};

type LoadState = "loading" | "ready" | "error";

const componentTypeOrder: DroneComponentType[] = [
  "FRAME",
  "PROPELLER",
  "MOTOR",
  "BATTERY",
  "FLIGHT_CONTROLLER",
  "GPS",
  "SENSOR",
  "CAMERA",
];

function ArrowLeftIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M16 10H4m0 0 5-5m-5 5 5 5" />
    </svg>
  );
}

function DetailField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="drone-detail-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
      {note && <span>{note}</span>}
    </div>
  );
}

function groupComponents(components: DroneComponent[]) {
  const groups = new Map<DroneComponentType, DroneComponent[]>();

  for (const component of components) {
    const group = groups.get(component.type) ?? [];
    group.push(component);
    groups.set(component.type, group);
  }

  return componentTypeOrder.flatMap((type) => {
    const group = groups.get(type);
    return group?.length ? [{ type, components: group }] : [];
  });
}

function DroneDetailContent({ drone }: { drone: DroneDetail }) {
  const groups = groupComponents(drone.components);
  const statusClass = drone.status.toLowerCase().replace(/_/g, "-");

  return (
    <>
      <section className="drone-detail-header">
        <div className="drone-detail-art" role="img" aria-label="Drone image">
          <span className="drone-detail-art-orbit" />
          <DroneIllustration className="drone-icon drone-detail-illustration" />
        </div>

        <div className="drone-detail-heading">
          <span className={`drone-detail-status drone-detail-status--${statusClass}`}>
            {drone.status}
          </span>
          <h1>{drone.code}</h1>
          <p>{drone.modelName}</p>
        </div>
      </section>

      <section
        className="drone-profile-panel"
        aria-labelledby="drone-profile-title"
      >
        <div className="drone-detail-section-heading">
          <h2 id="drone-profile-title">Drone profile</h2>
        </div>

        <dl className="drone-spec-grid">
          <DetailField label="Serial number" value={drone.serialNumber} />
          <DetailField label="Manufacturer" value={drone.manufacturer} />
          <DetailField
            label="Model"
            value={drone.modelName}
            note={drone.modelCode}
          />
          <DetailField
            label="Maximum speed"
            value={`${drone.maxSpeedMps} m/s`}
          />
          <DetailField
            label="Maximum flight time"
            value={`${drone.maxFlightTimeMinutes} minutes`}
          />
        </dl>
      </section>

      <section
        className="drone-components-section"
        aria-labelledby="drone-components-title"
      >
        <div className="drone-detail-section-heading">
          <div>
            <h2 id="drone-components-title">Drone components</h2>
            <p>
              Seed component health
            </p>
          </div>
          <span className="component-total">
            {drone.components.length} components
          </span>
        </div>

        <div className="component-groups-grid">
          {groups.map((group) => (
            <DroneComponentGroup
              key={group.type}
              type={group.type}
              components={group.components}
              showHealthStatus
            />
          ))}
        </div>
      </section>

      {drone.isActivated && drone.findings.length > 0 && (
        <section
          className="drone-findings-panel"
          aria-labelledby="drone-findings-title"
        >
          <div className="drone-detail-section-heading">
            <div>
              <h2 id="drone-findings-title">Component findings</h2>
              <p>Issues reported during missions</p>
            </div>
            <span className="component-total">
              {drone.findings.length} findings
            </span>
          </div>

          <ul className="drone-findings-list">
            {drone.findings.map((finding) => (
              <li
                className="drone-finding"
                key={finding.id}
              >
                <div className="drone-finding-heading">
                  <strong>{finding.componentCode}</strong>
                  <span
                    className={`drone-finding-severity drone-finding-severity--${finding.severity.toLowerCase()}`}
                  >
                    {finding.severity}
                  </span>
                </div>

                <div className="drone-finding-meta">
                  <span>
                    Mission <strong>{finding.missionCode}</strong>
                  </span>
                  <time dateTime={finding.detectedAt}>
                    {finding.detectedAt}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function DroneDetailRequest({
  droneCode,
  onBack,
}: DroneDetailPageProps) {
  const [drone, setDrone] = useState<DroneDetail | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    let isActive = true;

    droneDetailDataSource
      .loadByCode(droneCode)
      .then((result) => {
        if (!isActive) {
          return;
        }

        setDrone(result);
        setLoadState("ready");
      })
      .catch((error: unknown) => {
        console.error("Failed to load drone details:", error);

        if (isActive) {
          setLoadState("error");
        }
      });

    return () => {
      isActive = false;
    };
  }, [droneCode]);

  return (
    <section className="drone-detail-page">
      <div className="drone-detail-container">
        <button
          className="back-to-fleet-button"
          type="button"
          onClick={onBack}
        >
          <ArrowLeftIcon />
          Back to fleet
        </button>

        {loadState === "loading" && (
          <p className="drone-detail-message">Loading drone details...</p>
        )}

        {loadState === "error" && (
          <p className="drone-detail-message" role="alert">
            Unable to load drone details. Return to the fleet and try again.
          </p>
        )}

        {loadState === "ready" && !drone && (
          <p className="drone-detail-message">Drone not found.</p>
        )}

        {loadState === "ready" && drone && (
          <DroneDetailContent drone={drone} />
        )}
      </div>
    </section>
  );
}

function DroneDetailPage(props: DroneDetailPageProps) {
  return <DroneDetailRequest key={props.droneCode} {...props} />;
}

export default DroneDetailPage;
