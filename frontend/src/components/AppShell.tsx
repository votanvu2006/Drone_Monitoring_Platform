import type { ReactNode } from "react";
import { useTheme } from "../app/theme";
import { sidebarNavigation } from "../app/navigation";
import type { NavigationItem } from "../app/navigation";
import { operatorProfile } from "../data/fixtures";
import { Icon } from "./Icon";

type AppShellProps = {
  activeNav?: NavigationItem | null;
  children: ReactNode;
  contentHasMain?: boolean;
  onNavigate?: (path: string) => void;
};

export function AppShell({
  activeNav = "Drones",
  children,
  contentHasMain = false,
  onNavigate,
}: AppShellProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-symbol">
            <Icon name="drone" size={23} />
          </span>

          <strong>
            Drone Monitoring
            <br />
            Platform
          </strong>
        </div>

        <nav aria-label="Primary navigation">
          <ul className="primary-nav">
            {sidebarNavigation.map((item) => {
              const isActive = item.label === activeNav;

              return (
                <li key={item.id}>
                  <a
                    className={`nav-item${isActive ? " is-selected" : ""}`}
                    href={item.path}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(event) => {
                      if (
                        !onNavigate ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      ) {
                        return;
                      }

                      event.preventDefault();
                      onNavigate(item.path);
                    }}
                  >
                    <Icon name={item.icon} />
                    <span>{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="logout-control"
            disabled
          >
            <Icon name="logout" size={18} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="header-actions">
            <button
              type="button"
              className="theme-toggle"
              role="switch"
              aria-checked={theme === "dark"}
              aria-label="Dark theme"
              onClick={toggleTheme}
            >
              <span
                className="theme-switch-track"
                aria-hidden="true"
              >
                <span />
              </span>
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </button>

            <div className="operator">
              <span
                className="operator-avatar"
                aria-label="Signed-in user avatar"
              >
                {operatorProfile.initials}
              </span>
              <strong>{operatorProfile.username}</strong>
            </div>
          </div>
        </header>

        {contentHasMain ? (
          <div className="page-content fleet-content">
            {children}
          </div>
        ) : (
          <main className="page-content">{children}</main>
        )}
      </div>
    </div>
  );
}