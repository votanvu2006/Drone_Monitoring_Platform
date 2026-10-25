import { AppShell } from '../components/AppShell';
import { ModuleContent } from './ModuleContent';
import { moduleNavigation } from './navigation';

export function ModuleShellPreview({ selector }: { selector: string | null }) {
  const module = moduleNavigation.find(item => item.id === selector) ?? moduleNavigation[1];
  return <AppShell activeNav={module.label} contentClassName={module.id === 'drones' ? 'fleet-content' : ''}>
    <ModuleContent module={module} />
  </AppShell>;
}
