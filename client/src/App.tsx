import { resolveExample } from './app/examples';
import type { ExampleModule } from './app/examples';
import { AppShell } from './components/AppShell';

const modules = import.meta.glob<ExampleModule>('./examples/**/*.preview.tsx', { eager: true });

export function App() {
  const { definition, state } = resolveExample(modules, window.location.search);
  const Screen = definition.component;
  const content = <Screen state={state} />;
  if (definition.standalone) return content;
  return <AppShell title={definition.title} activeNav={definition.activeNav}>{content}</AppShell>;
}
