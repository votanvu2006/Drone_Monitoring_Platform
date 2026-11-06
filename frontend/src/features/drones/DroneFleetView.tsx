import { useEffect, useState } from "react";
import DroneDetailPage from "./detail/DroneDetailPage";
import DroneInventoryPage from "./inventory/DroneInventoryPage";

function selectedDroneFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("drone");
}

function setDroneInUrl(droneCode: string | null) {
  const url = new URL(window.location.href);

  if (droneCode) {
    url.searchParams.set("drone", droneCode);
  } else {
    url.searchParams.delete("drone");
  }

  window.history.pushState({}, "", url);
}

function DroneFleetView() {
  const [selectedDroneCode, setSelectedDroneCode] = useState<string | null>(
    selectedDroneFromUrl,
  );

  useEffect(() => {
    const syncFromUrl = () => setSelectedDroneCode(selectedDroneFromUrl());

    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  function viewDetails(droneCode: string) {
    setDroneInUrl(droneCode);
    setSelectedDroneCode(droneCode);
  }

  function backToFleet() {
    setDroneInUrl(null);
    setSelectedDroneCode(null);
  }

  if (selectedDroneCode) {
    return (
      <DroneDetailPage
        droneCode={selectedDroneCode}
        onBack={backToFleet}
      />
    );
  }

  return <DroneInventoryPage onViewDetails={viewDetails} />;
}

export default DroneFleetView;