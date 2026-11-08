import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DroneFleetView from "./DroneFleetView";

type Status = "OFFLINE" | "MAINTENANCE" | "IN_FLIGHT";

function reply(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

function drone(status: Status, activeMission: string | null = null) {
  return {
    droneCode: status === "MAINTENANCE" ? "DRONE-002" : "DRONE-003",
    status,
    batteryPercent: 100,
    model: { modelName: "AeroVision X1 Enterprise" },
    homeLocation: { label: "Home base" },
    lastKnownLocation: { label: "Demo operating location" },
    activeMission,
    findings: [],
  };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/?screen=drones");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Fleet power API", () => {
  it("keeps DRONE-002 ON in maintenance after opening the page again", async () => {
    let status: "OFFLINE" | "MAINTENANCE" = "OFFLINE";

    const fetchMock = vi.fn(async (input: string, options?: RequestInit) => {
      if (options?.method === "PATCH") {
        expect(input).toBe("/api/drones/DRONE-002/power");
        expect(JSON.parse(options.body as string)).toEqual({ isOn: true });
        status = "MAINTENANCE";

        return reply({
          data: {
            droneCode: "DRONE-002",
            status,
            isActivated: true,
          },
        });
      }

      expect(input).toBe("/api/drones?page=1&pageSize=100");
      return reply({
        data: [{ ...drone(status), droneCode: "DRONE-002" }],
        total: 1,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstView = render(<DroneFleetView />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "DRONE-002 power is off",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "DRONE-002 power is on" }),
      ).toBeDisabled();
    });

    firstView.unmount();
    render(<DroneFleetView />);

    expect(
      await screen.findByRole("button", {
        name: "DRONE-002 power is on",
      }),
    ).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("shows DRONE-003's mission after power ON and keeps it after reopening", async () => {
    let status: "OFFLINE" | "IN_FLIGHT" = "OFFLINE";

    const fetchMock = vi.fn(async (input: string, options?: RequestInit) => {
      if (options?.method === "PATCH") {
        expect(input).toBe("/api/drones/DRONE-003/power");
        expect(JSON.parse(options.body as string)).toEqual({ isOn: true });
        status = "IN_FLIGHT";

        return reply({
          data: {
            droneCode: "DRONE-003",
            status,
            isActivated: true,
          },
        });
      }

      expect(input).toBe("/api/drones?page=1&pageSize=100");
      return reply({
        data: [
          drone(status, status === "IN_FLIGHT" ? "mission-003" : null),
        ],
        total: 1,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const firstView = render(<DroneFleetView />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "DRONE-003 power is off",
      }),
    );

    expect(await screen.findByText("mission-003")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "DRONE-003 power is on" }),
    ).toBeDisabled();

    firstView.unmount();
    render(<DroneFleetView />);

    expect(await screen.findByText("mission-003")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});