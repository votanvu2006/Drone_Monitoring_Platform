import { useEffect, useState } from "react";
import { ModulePageView } from "./app/ModulePageView";
import { RouteNotFoundPage } from "./app/RouteNotFoundPage";
import { resolveExample } from "./app/examples";
import type { ExampleModule } from "./app/examples";
import { getModulePage, getModulePageByPath } from "./app/module-pages";
import { AppShell } from "./components/AppShell";

type BrowserLocation = {
  pathname: string;
  search: string;
};

const exampleModules = import.meta.glob<ExampleModule>(
  "./examples/**/*.preview.tsx",
  { eager: true },
);

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function readBrowserLocation(): BrowserLocation {
  return {
    pathname: normalizePath(window.location.pathname),
    search: window.location.search,
  };
}

export function App() {
  const [browserLocation, setBrowserLocation] =
    useState<BrowserLocation>(readBrowserLocation);

  useEffect(() => {
    function handlePopState() {
      setBrowserLocation(readBrowserLocation());
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function handleNavigate(path: string) {
    if (
      window.location.pathname === path &&
      window.location.search === ""
    ) {
      return;
    }

    window.history.pushState(null, "", path);
    setBrowserLocation(readBrowserLocation());
  }

  const { pathname, search } = browserLocation;
  const params = new URLSearchParams(search);

  // Keep the module preview URLs available while the pages are integrated.
  if (pathname === "/" && params.has("module")) {
    const previewPage = getModulePage(params.get("module"));

    if (previewPage) {
      return (
        <ModulePageView
          page={previewPage}
          onNavigate={handleNavigate}
        />
      );
    }
  }

  // The login preview remains separate from the shared application shell.
  if (pathname === "/" && params.has("screen")) {
    const { definition, state } = resolveExample(
      exampleModules,
      params.toString(),
    );

    if (definition.standalone) {
      const PreviewComponent = definition.component;
      return <PreviewComponent state={state} />;
    }
  }

  // Show Drones at the root URL; other modules use their own URLs.
  const page =
    pathname === "/"
      ? getModulePage("drones")
      : getModulePageByPath(pathname);

  if (page) {
    return (
      <ModulePageView
        page={page}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <AppShell activeNav={null} onNavigate={handleNavigate}>
      <RouteNotFoundPage />
    </AppShell>
  );
}

export default App;