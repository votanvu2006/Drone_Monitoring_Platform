import { AppShell } from "../components/AppShell";
import type { ModulePage } from "./module-pages";

type ModulePageViewProps = {
  page: ModulePage;
  onNavigate?: (path: string) => void;
};

export function ModulePageView({
  page,
  onNavigate,
}: ModulePageViewProps) {
  const PageComponent = page.component;

  return (
    <AppShell
      activeNav={page.label}
      contentHasMain={page.contentHasMain}
      onNavigate={onNavigate}
    >
      <PageComponent />
    </AppShell>
  );
}