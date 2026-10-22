import { AppShell } from './components/AppShell';
import { ModuleContent } from './app/ModuleContent';
import { moduleNavigation } from './app/navigation';
import { PreviewHost } from './app/PreviewHost';

export function App() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('screen')) return <PreviewHost search={params.toString()} />;
  const module = moduleNavigation.find(item => item.id === params.get('module')) ?? moduleNavigation[1];
  return <AppShell title={module.label} contentClassName={module.id === 'drones' ? 'fleet-content' : ''}>
    <ModuleContent module={module} />
  </AppShell>;
}
export default App;
