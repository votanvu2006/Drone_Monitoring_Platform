import MissionListPage from '../features/missions/list/MissionListPage';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { AppShell } from "../components/AppShell";
import type { ModulePage } from "./module-pages";

type ModulePageViewProps = {
  page: ModulePage;
  search?: string;
  onSignOut?: () => void;
  onNavigate?: (path: string) => void;
};

export function ModulePageView({
  page,
  search = "",
  onNavigate,
  onSignOut,
}: ModulePageViewProps) {
  const PageComponent = page.component;
  const params = new URLSearchParams(search);
  const content = page.id === 'missions'
    ? <MissionListPage onViewAlert={onNavigate ? mission => onNavigate(
        `/alerts?drone=${encodeURIComponent(mission.droneCode)}&mission=${encodeURIComponent(mission.id)}`,
      ) : undefined} />
    : page.id === 'alerts'
      ? <AlertsPage droneCode={params.get('drone') ?? undefined} missionCode={params.get('mission') ?? undefined} />
      : <PageComponent />;

  return (
    <AppShell
      activeNav={page.label}
      contentHasMain={page.contentHasMain}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
    >
      {content}
    </AppShell>
  );
}