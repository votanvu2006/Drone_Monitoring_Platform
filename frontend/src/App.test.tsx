import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { App } from "./App";
import { ThemeProvider } from "./app/ThemeProvider";
import { THEME_STORAGE_KEY } from "./app/theme";
import { AppShell } from "./components/AppShell";

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

describe("application shell and module navigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    window.history.replaceState(null, "", "/?screen=shell");
  });

  it("renders the shared header and five navigation links", () => {
    render(<App />);

    const navigation = getNavigation();
    const links = within(navigation).getAllByRole("link");

    expect(links.map((link) => link.textContent)).toEqual(
      moduleRoutes.map((route) => route.label),
    );

    expect(
      within(navigation).queryByText("Overview"),
    ).not.toBeInTheDocument();

    expect(
      within(navigation).getByRole("link", { name: "Drones" }),
    ).toHaveAttribute("aria-current", "page");

    expect(document.querySelector(".topbar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeDisabled();
    expect(screen.getByRole("main")).toBeVisible();
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
    window.history.replaceState(null, "", "/");

    render(<App />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Drones" }),
    ).toBeInTheDocument();

    expect(
      within(getNavigation()).getByRole("link", { name: "Drones" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("changes pages without replacing the shared header", () => {
    window.history.replaceState(null, "", "/");

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
    window.history.replaceState(null, "", "/");

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

  it("can host module content and select its navigation item", () => {
    render(
      <ThemeProvider>
        <AppShell activeNav="Alerts">
          <h1>Example module</h1>
        </AppShell>
      </ThemeProvider>,
    );

    expect(screen.getByRole("main")).toHaveTextContent("Example module");
    expect(
      within(getNavigation()).getByRole("link", { name: "Alerts" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("defaults to light, toggles themes, and restores the saved theme", () => {
    window.history.replaceState(null, "", "/");

    const firstRender = render(<App />);
    const toggle = screen.getByRole("switch", { name: "Dark theme" });

    expect(toggle).toBeEnabled();
    expect(toggle).not.toBeChecked();
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "light",
    );

    fireEvent.click(toggle);

    expect(toggle).toBeChecked();
    expect(toggle).toHaveTextContent("Dark");
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "dark",
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");

    firstRender.unmount();
    render(<App />);

    expect(
      screen.getByRole("switch", { name: "Dark theme" }),
    ).toBeChecked();

    fireEvent.click(
      screen.getByRole("switch", { name: "Dark theme" }),
    );

    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "light",
    );
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("uses light mode for an invalid saved theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "invalid");
    window.history.replaceState(null, "", "/");

    render(<App />);

    expect(
      screen.getByRole("switch", { name: "Dark theme" }),
    ).not.toBeChecked();
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "light",
    );
  });

  it("still switches themes when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage unavailable");
    });
    window.history.replaceState(null, "", "/");

    render(<App />);

    const toggle = screen.getByRole("switch", { name: "Dark theme" });

    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "dark",
    );

    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(document.documentElement).toHaveAttribute(
      "data-theme",
      "light",
    );
  });

  it.each(["login", "alerts"])(
    "applies the saved theme to the standalone %s screen",
    (name) => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      window.history.replaceState(null, "", `/?screen=${name}`);

      render(<App />);

      expect(document.documentElement).toHaveAttribute(
        "data-theme",
        "dark",
      );
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
      expect(screen.getByRole("main")).toBeVisible();
    },
  );
});