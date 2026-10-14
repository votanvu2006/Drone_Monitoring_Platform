import { useState } from "react";
import DroneDetailPage from "./features/drones/detail/DroneDetailPage";
import DroneInventoryPage from "./features/drones/inventory/DroneInventoryPage";

function App() {
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

export default App;