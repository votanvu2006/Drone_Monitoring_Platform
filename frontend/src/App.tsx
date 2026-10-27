import { resolveExample } from './app/examples';
import type { ExampleModule } from './app/examples';
import { ThemeProvider } from './app/ThemeProvider';
import { AppShell } from './components/AppShell';

const modules = import.meta.glob<ExampleModule>('./examples/**/*.preview.tsx', { eager: true });

function AppContent() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('screen')) params.set('screen', 'drones');
  const { definition, state } = resolveExample(modules, params.toString());
  const Screen = definition.component;
  const content = <Screen state={state} />;
  if (definition.standalone) return content;
  return <AppShell activeNav={definition.activeNav}
    contentHasMain={definition.contentHasMain}>{content}</AppShell>;
}

export function App() {
  return <ThemeProvider><AppContent /></ThemeProvider>;
}

export default App;
