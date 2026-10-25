import { AppShell } from "../components/AppShell";
import { getModulePage } from "./module-pages";
import type { ModulePageId } from "./module-pages";

type ModuleShellPreviewProps = {
  moduleId: ModulePageId;
};

export function ModuleShellPreview({
  moduleId,
}: ModuleShellPreviewProps) {
  const page = getModulePage(moduleId);

  if (!page) {
    return null;
  }

  const Page = page.component;

  return (
    <AppShell
      activeNav={page.label}
      contentHasMain={page.contentHasMain}
    >
      <Page />
    </AppShell>
  );
}