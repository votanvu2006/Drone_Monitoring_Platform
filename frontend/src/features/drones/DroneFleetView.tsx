import { useState } from "react";
import DroneDetailPage from "./detail/DroneDetailPage";
import DroneInventoryPage from "./inventory/DroneInventoryPage";

function DroneFleetView() {
  const [selectedDroneCode, setSelectedDroneCode] = useState<string | null>(
    null,
  );

  if (selectedDroneCode) {
    return (
      <DroneDetailPage
        droneCode={selectedDroneCode}
        onBack={() => setSelectedDroneCode(null)}
      />
    );
  }

  return <DroneInventoryPage onViewDetails={setSelectedDroneCode} />;
}

export default DroneFleetView;