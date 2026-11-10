import { describe, expect, it } from "vitest";
import type { FlightHistoryRecord } from "../flightHistory.types";
import {
  DEFAULT_FLIGHT_HISTORY_FILTERS,
  filterFlightRecords,
} from "./flightHistory.filters";

const now = new Date("2026-10-25T12:00:00.000Z");

const records: FlightHistoryRecord[] = [
  {
    flightCode: "FLIGHT-001",
    startedAt: "2026-10-23T12:00:00.000Z",
    durationSeconds: 600,
    droneCode: "DRONE-001",
    missionCode: "MISSION-001",
    status: "COMPLETED",
  },
  {
    flightCode: "FLIGHT-002",
    startedAt: "2026-10-13T12:00:00.000Z",
    durationSeconds: 400,
    droneCode: "DRONE-002",
    missionCode: "MISSION-002",
    status: "FAILED",
  },
  {
    flightCode: "FLIGHT-003",
    startedAt: "2026-09-10T12:00:00.000Z",
    durationSeconds: 800,
    droneCode: "DRONE-003",
    missionCode: "MISSION-003",
    status: "COMPLETED",
  },
];

describe("flight history filters", () => {
  it.each(["flight-002", "drone-002", "mission-002"])(
    "searches by flight, drone, or mission code: %s",
    (searchText) => {
      const result = filterFlightRecords(
        records,
        { ...DEFAULT_FLIGHT_HISTORY_FILTERS, searchText },
        now,
      );

      expect(result.map((record) => record.flightCode)).toEqual([
        "FLIGHT-002",
      ]);
    },
  );

  it("combines search, status, drone, and date filters", () => {
    const result = filterFlightRecords(
      records,
      {
        searchText: "mission",
        status: "FAILED",
        droneCode: "DRONE-002",
        dateRange: "LAST_30_DAYS",
      },
      now,
    );

    expect(result.map((record) => record.flightCode)).toEqual([
      "FLIGHT-002",
    ]);
  });

  it("filters records by their flight start time", () => {
    const lastSevenDays = filterFlightRecords(
      records,
      {
        ...DEFAULT_FLIGHT_HISTORY_FILTERS,
        dateRange: "LAST_7_DAYS",
      },
      now,
    );

    expect(lastSevenDays.map((record) => record.flightCode)).toEqual([
      "FLIGHT-001",
    ]);

    const lastThirtyDays = filterFlightRecords(
      records,
      {
        ...DEFAULT_FLIGHT_HISTORY_FILTERS,
        dateRange: "LAST_30_DAYS",
      },
      now,
    );

    expect(lastThirtyDays.map((record) => record.flightCode)).toEqual([
      "FLIGHT-001",
      "FLIGHT-002",
    ]);
  });

  it("returns all records when filters are cleared", () => {
    const result = filterFlightRecords(
      records,
      DEFAULT_FLIGHT_HISTORY_FILTERS,
      now,
    );

    expect(result).toEqual(records);
  });
});