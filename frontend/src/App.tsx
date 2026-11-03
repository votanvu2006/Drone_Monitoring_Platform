import { useEffect, useState } from "react";
import { LoginPage } from "./features/authentication/LoginPage";
import { hasDemoSession, saveDemoSession } from "./app/demo-session";
import { ModulePageView } from "./app/ModulePageView";
import { RouteNotFoundPage } from "./app/RouteNotFoundPage";
import { ThemeProvider } from "./app/ThemeProvider";
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

function AppContent() {
  const [signedIn, setSignedIn] = useState(hasDemoSession);
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

  function signIn() {
    saveDemoSession(true);
    setSignedIn(true);
    window.history.replaceState(null, "", "/drones");
    setBrowserLocation(readBrowserLocation());
  }

  function signOut() {
    saveDemoSession(false);
    setSignedIn(false);
    window.history.replaceState(null, "", "/login");
    setBrowserLocation(readBrowserLocation());
  }

  const { pathname, search } = browserLocation;
  const params = new URLSearchParams(search);

  if (!signedIn || pathname === "/login" || params.get("screen") === "login") {
    return <LoginPage onSignIn={signIn} />;
  }

  if (pathname === "/" && params.has("module")) {
    const previewPage = getModulePage(params.get("module"));

    if (previewPage) {
      return (
        <ModulePageView
          page={previewPage}
          onNavigate={handleNavigate}
          onSignOut={signOut}
        />
      );
    }
  }

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

  const page =
    pathname === "/"
      ? getModulePage("drones")
      : getModulePageByPath(pathname);

  if (page) {
    return (
      <ModulePageView
        page={page}
        onNavigate={handleNavigate}
          onSignOut={signOut}
      />
    );
  }

  return (
    <AppShell activeNav={null} onNavigate={handleNavigate}
          onSignOut={signOut}>
      <RouteNotFoundPage />
    </AppShell>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;