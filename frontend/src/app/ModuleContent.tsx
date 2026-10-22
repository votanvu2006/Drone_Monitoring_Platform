import { PageHeading, Panel } from '../components/ui';
import { availableLoginPage, availableModulePages } from './module-pages';
import type { ModuleNavigationEntry } from './navigation';

function ModulePlaceholder({ title }: { title: string }) {
  return <section className="module-placeholder">
    <PageHeading eyebrow="WORKSPACE" title={title} description="This page is not available yet." />
    <Panel title="Coming soon"><p>The workspace is ready for this page.</p></Panel>
  </section>;
}

export function ModuleContent({ module }: { module: ModuleNavigationEntry }) {
  const Page = availableModulePages[module.id];
  return Page ? <Page /> : <ModulePlaceholder title={module.label} />;
}

export function StandaloneLoginPage() {
  const LoginPage = availableLoginPage;
  return LoginPage ? <LoginPage /> : <main className="page-content"><ModulePlaceholder title="Sign in" /></main>;
}
