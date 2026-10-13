import { describe, expect, it } from 'vitest';
import { resolveExample } from './examples';
import type { ExampleModule } from './examples';

const Component = () => null;
const modules: Record<string, ExampleModule> = {
  shell: { default: { id: 'shell', title: 'Shell', component: Component } },
  login: { default: { id: 'login', title: 'Login', component: Component, states: ['default', 'loading'] } },
};
describe('static example resolution', () => {
  it('resolves an explicitly requested screen and state', () => {
    expect(resolveExample(modules, '?screen=login&state=loading')).toMatchObject({
      definition: { id: 'login' }, state: 'loading',
    });
  });
  it('uses safe defaults for missing or unknown parameters', () => {
    expect(resolveExample(modules, '').definition.id).toBe('shell');
    expect(resolveExample(modules, '?screen=unknown').definition.id).toBe('shell');
    expect(resolveExample(modules, '?screen=login&state=invalid').state).toBe('default');
  });
  it('rejects ambiguous IDs and a missing foundation', () => {
    expect(() => resolveExample({ only: modules.login }, '')).toThrow('shell');
    expect(() => resolveExample({ ...modules, duplicate: modules.shell }, '')).toThrow('unique');
  });
});
