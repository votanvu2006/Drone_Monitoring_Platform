import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DroneInventoryPage from "./DroneInventoryPage";

const testSnapshot = vi.hoisted(() => ({
  drones: [
    {
      code: "DRONE-001",
      modelName: "AeroVision X1",
      status: "OFFLINE",
      homeBase: "Base A",
      lastKnownLocation: null,
      activeMission: null,
    },
    {
      code: "DRONE-002",
      modelName: "AeroVision X1",
      status: "AVAILABLE",
      homeBase: "Base A",
      lastKnownLocation: null,
      activeMission: null,
    },
    {
      code: "DRONE-003",
      modelName: "SkyScout Mini",
      status: "MAINTENANCE",
      homeBase: "Base B",
      lastKnownLocation: null,
      activeMission: null,
    },
  ],
  findings: [],
}));

vi.mock("./droneInventory.data", () => ({
  mockSnapshot: testSnapshot,
  fleetDataSource: {
    loadSnapshot: vi.fn(async () => testSnapshot),
  },
}));

function renderInventory() {
  return render(
    <DroneInventoryPage
      onViewDetails={vi.fn()}
      droneStatusOverrides={{}}
      onTogglePower={vi.fn()}
    />,
  );
}

function inventory() {
  return screen.getByRole("region", { name: "Fleet inventory" });
}

describe("Drone inventory filters", () => {
  it("searches drone codes without changing letter case", () => {
    renderInventory();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search drones" }), {
      target: { value: "drone-002" },
    });

    expect(
      within(inventory()).getByRole("heading", { name: "DRONE-002" }),
    ).toBeInTheDocument();

    expect(
      within(inventory()).queryByRole("heading", { name: "DRONE-001" }),
    ).not.toBeInTheDocument();
  });

  it("searches model names", () => {
    renderInventory();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search drones" }), {
      target: { value: "skyscout" },
    });

    expect(
      within(inventory()).getByRole("heading", { name: "DRONE-003" }),
    ).toBeInTheDocument();

    expect(
      within(inventory()).queryByRole("heading", { name: "DRONE-001" }),
    ).not.toBeInTheDocument();
  });

  it("combines search, status, and model filters", () => {
    renderInventory();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search drones" }), {
      target: { value: "drone" },
    });

    fireEvent.change(screen.getByRole("combobox", { name: "Filter by status" }), {
      target: { value: "AVAILABLE" },
    });

    fireEvent.change(screen.getByRole("combobox", { name: "Filter by model" }), {
      target: { value: "AeroVision X1" },
    });

    expect(
      within(inventory()).getByRole("heading", { name: "DRONE-002" }),
    ).toBeInTheDocument();

    expect(
      within(inventory()).queryByRole("heading", { name: "DRONE-001" }),
    ).not.toBeInTheDocument();

    expect(
      within(inventory()).queryByRole("heading", { name: "DRONE-003" }),
    ).not.toBeInTheDocument();
  });

  it("shows a clear message when nothing matches", () => {
    renderInventory();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search drones" }), {
      target: { value: "not-a-drone" },
    });

    expect(
      within(inventory()).getByRole("status"),
    ).toHaveTextContent("No drones match your search or filters.");

    expect(
      within(inventory()).queryByRole("heading", { name: "DRONE-001" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the fleet summary based on all drones", () => {
    renderInventory();

    fireEvent.change(screen.getByRole("searchbox", { name: "Search drones" }), {
      target: { value: "DRONE-003" },
    });

    const summary = screen.getByRole("region", { name: "Fleet summary" });
    const offlineCard = within(summary)
      .getByText("Offline")
      .closest(".summary-card");
    const modelsCard = within(summary)
      .getByText("Model types")
      .closest(".summary-card");

    expect(offlineCard).not.toBeNull();
    expect(modelsCard).not.toBeNull();

    expect(
      within(offlineCard as HTMLElement).getByText("01"),
    ).toBeInTheDocument();

    expect(
      within(modelsCard as HTMLElement).getByText("02"),
    ).toBeInTheDocument();
  });
});