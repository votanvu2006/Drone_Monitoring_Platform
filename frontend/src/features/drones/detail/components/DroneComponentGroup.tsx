import type {
  DroneComponent,
  DroneComponentType,
} from "../droneDetail.types";

type DroneComponentGroupProps = {
  type: DroneComponentType;
  components: DroneComponent[];
  showHealthStatus: boolean;
};

const componentTypeLabels: Record<DroneComponentType, string> = {
  FRAME: "Frame",
  PROPELLER: "Propellers",
  MOTOR: "Motors",
  BATTERY: "Battery",
  FLIGHT_CONTROLLER: "Flight controller",
  GPS: "GPS",
  SENSOR: "Sensors",
  CAMERA: "Camera",
};

export function DroneComponentGroup({
  type,
  components,
  showHealthStatus,
}: DroneComponentGroupProps) {
  return (
    <section
      className="drone-component-group"
      aria-label={`${componentTypeLabels[type]} components`}
    >
      <header className="drone-component-group-heading">
        <h3>{componentTypeLabels[type]}</h3>
        <span className="drone-component-count">
          {components.length}
        </span>
      </header>

      <div className="drone-component-table-scroll">
        <table className="drone-component-table">
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col">Model</th>
              <th scope="col">Serial number</th>
              {showHealthStatus && <th scope="col">Health</th>}
            </tr>
          </thead>

          <tbody>
            {components.map((component) => (
              <tr key={component.code}>
                <td>{component.name}</td>
                <td>{component.model}</td>
                <td>{component.serialNumber}</td>
                {showHealthStatus && (
                  <td>
                    <span
                      className={`drone-component-health drone-component-health--${component.healthStatus.toLowerCase()}`}
                    >
                      {component.healthStatus}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}