import { useState } from "react";
import DroneDetailPage from "./detail/DroneDetailPage";
import DroneInventoryPage from "./inventory/DroneInventoryPage";
import type { SwitchableDroneStatus } from "./inventory/droneInventory.types";

function DroneFleetView() {
  const [selectedDroneCode, setSelectedDroneCode] = useState<string | null>(
    null,
  );

  // Demo-only changes stay here while moving between inventory and detail.
  const [droneStatusOverrides, setDroneStatusOverrides] = useState<
    Partial<Record<string, SwitchableDroneStatus>>
  >({});

  function handleTogglePower(
    droneCode: string,
    nextStatus: SwitchableDroneStatus,
  ) {
    setDroneStatusOverrides((currentOverrides) => ({
      ...currentOverrides,
      [droneCode]: nextStatus,
    }));
  }

  if (selectedDroneCode) {
    return (
      <DroneDetailPage
        droneCode={selectedDroneCode}
        statusOverride={droneStatusOverrides[selectedDroneCode]}
        onBack={() => setSelectedDroneCode(null)}
      />
    );
  }

  return (
    <DroneInventoryPage
      onViewDetails={setSelectedDroneCode}
      droneStatusOverrides={droneStatusOverrides}
      onTogglePower={handleTogglePower}
    />
  );
}

export default DroneFleetView;