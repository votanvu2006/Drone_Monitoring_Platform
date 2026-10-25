import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

const moduleRoutes = [
  { label: "Drones", path: "/drones" },
  { label: "Missions", path: "/missions" },
  { label: "Live Flight", path: "/live-flight" },
  { label: "Flight History", path: "/flight-history" },
  { label: "Alerts", path: "/alerts" },
] as const;

function getNavigation() {
  return screen.getByRole("navigation", {
    name: "Primary navigation",
  });
}

describe("module navigation", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it.each(moduleRoutes)(
    "opens $label directly at $path",
    ({ label, path }) => {
      window.history.replaceState(null, "", path);

      render(<App />);

      expect(
        screen.getByRole("heading", { level: 1, name: label }),
      ).toBeInTheDocument();

      expect(
        within(getNavigation()).getByRole("link", { name: label }),
      ).toHaveAttribute("aria-current", "page");

      expect(document.querySelector(".topbar")).toBeInTheDocument();
    },
  );

  it("shows Drones at the root URL", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Drones" }),
    ).toBeInTheDocument();

    expect(
      within(getNavigation()).getByRole("link", { name: "Drones" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows five navigation links without Overview", () => {
    render(<App />);

    const links = within(getNavigation()).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(
      moduleRoutes.map((route) => route.label),
    );

    for (const route of moduleRoutes) {
      expect(
        within(getNavigation()).getByRole("link", {
          name: route.label,
        }),
      ).toHaveAttribute("href", route.path);
    }

    expect(
      within(getNavigation()).queryByText("Overview"),
    ).not.toBeInTheDocument();
  });

  it("changes the module without replacing the shared header", () => {
    render(<App />);

    const header = document.querySelector(".topbar");

    fireEvent.click(
      within(getNavigation()).getByRole("link", {
        name: "Missions",
      }),
    );

    expect(window.location.pathname).toBe("/missions");
    expect(
      screen.getByRole("heading", { level: 1, name: "Missions" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".topbar")).toBe(header);

    expect(
      within(getNavigation()).getByRole("link", {
        name: "Missions",
      }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("updates the page when browser history changes", () => {
    render(<App />);

    fireEvent.click(
      within(getNavigation()).getByRole("link", {
        name: "Missions",
      }),
    );

    fireEvent.click(
      within(getNavigation()).getByRole("link", {
        name: "Alerts",
      }),
    );

    window.history.replaceState(null, "", "/missions");
    fireEvent.popState(window);

    expect(
      screen.getByRole("heading", { level: 1, name: "Missions" }),
    ).toBeInTheDocument();

    window.history.replaceState(null, "", "/alerts");
    fireEvent.popState(window);

    expect(
      screen.getByRole("heading", { level: 1, name: "Alerts" }),
    ).toBeInTheDocument();
  });

  it("shows a fallback for an unknown URL", () => {
    window.history.replaceState(null, "", "/unknown-page");

    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Page not found" }),
    ).toBeInTheDocument();

    expect(
      getNavigation().querySelector('[aria-current="page"]'),
    ).toBeNull();
  });

  it("keeps theme and logout controls disabled", () => {
    render(<App />);

    expect(
      screen.getByRole("switch", { name: "Dark theme" }),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", { name: "Log out" }),
    ).toBeDisabled();
  });
});