import { resolveExample } from './app/examples';
import type { ExampleModule } from './app/examples';
import { AppShell } from './components/AppShell';

const modules = import.meta.glob<ExampleModule>('./examples/**/*.preview.tsx', { eager: true });

export function App() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('screen')) params.set('screen', 'drones');
  const { definition, state } = resolveExample(modules, params.toString());
  const Screen = definition.component;
  const content = <Screen state={state} />;
  if (definition.standalone) return content;
  return <AppShell title={definition.title} activeNav={definition.activeNav}
    contentHasMain={definition.contentHasMain}>{content}</AppShell>;
}

export default App;
