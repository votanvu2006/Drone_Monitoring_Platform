import { AppShell } from '../components/AppShell';
import { resolveExample } from './examples';
import type { ExampleModule } from './examples';

const examples = import.meta.glob<ExampleModule>('../examples/**/*.preview.tsx', { eager: true });

export function PreviewHost({ search }: { search: string }) {
  const { definition, state } = resolveExample(examples, search);
  const Screen = definition.component;
  const content = <Screen state={state} />;
  if (definition.standalone) return content;
  return <AppShell title={definition.title} activeNav={definition.activeNav}
    contentClassName={definition.id === 'drones' ? 'fleet-content' : ''}>{content}</AppShell>;
}
