import type { ComponentFinding, Drone } from "../droneInventory.types";

function formatCount(count: number) {
  return String(count).padStart(2, "0");
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

export function FleetSummary({
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