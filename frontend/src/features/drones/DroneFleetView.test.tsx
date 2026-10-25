import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DroneFleetView from "./DroneFleetView";
import { DronePowerSwitch } from "./inventory/components/DronePowerSwitch";

describe("DronePowerSwitch", () => {
  it("turns an offline drone on", () => {
    const onToggle = vi.fn();

    render(
      <DronePowerSwitch
        droneCode="DRONE-TEST"
        status="OFFLINE"
        onToggle={onToggle}
      />,
    );

    const powerSwitch = screen.getByRole("switch", {
      name: "DRONE-TEST power off",
    });

    expect(powerSwitch).not.toBeDisabled();
    expect(powerSwitch).toHaveAttribute("aria-checked", "false");

    fireEvent.click(powerSwitch);

    expect(onToggle).toHaveBeenCalledWith("AVAILABLE");
  });

  it("turns an available drone off", () => {
    const onToggle = vi.fn();

    render(
      <DronePowerSwitch
        droneCode="DRONE-TEST"
        status="AVAILABLE"
        onToggle={onToggle}
      />,
    );

    const powerSwitch = screen.getByRole("switch", {
      name: "DRONE-TEST power on",
    });

    expect(powerSwitch).not.toBeDisabled();
    expect(powerSwitch).toHaveAttribute("aria-checked", "true");

    fireEvent.click(powerSwitch);

    expect(onToggle).toHaveBeenCalledWith("OFFLINE");
  });

  it.each(["IN_FLIGHT", "MAINTENANCE"] as const)(
    "disables power switching while the drone is %s",
    (status) => {
      const onToggle = vi.fn();

      render(
        <DronePowerSwitch
          droneCode="DRONE-TEST"
          status={status}
          onToggle={onToggle}
        />,
      );

      const powerSwitch = screen.getByRole("switch");

      expect(powerSwitch).toBeDisabled();

      fireEvent.click(powerSwitch);

      expect(onToggle).not.toHaveBeenCalled();
    },
  );
});

describe("DroneFleetView power state", () => {
  it("keeps the changed status when moving between the inventory and detail page", async () => {
    render(<DroneFleetView />);

    fireEvent.click(
      await screen.findByRole("switch", {
        name: "DRONE-001 power off",
      }),
    );

    const poweredOnSwitch = await screen.findByRole("switch", {
      name: "DRONE-001 power on",
    });

    expect(poweredOnSwitch).toHaveAttribute("aria-checked", "true");

    const droneHeading = screen.getByRole("heading", {
      name: "DRONE-001",
    });
    const droneCard = droneHeading.closest(".drone-card");

    expect(droneCard).not.toBeNull();
    expect(within(droneCard as HTMLElement).getByText("Available")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "View details for DRONE-001",
      }),
    );

    expect(await screen.findByText("AVAILABLE", { exact: true })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: /Back to fleet/,
      }),
    );

    const returnedSwitch = await screen.findByRole("switch", {
      name: "DRONE-001 power on",
    });

    expect(returnedSwitch).toHaveAttribute("aria-checked", "true");
  });
});