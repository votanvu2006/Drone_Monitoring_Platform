import type { ComponentType } from 'react';

import type { NavigationItem } from './navigation';
export interface ExampleProps { state: string }
export interface ExampleDefinition {
  id: string;
  title: string;
  component: ComponentType<ExampleProps>;
  activeNav?: NavigationItem;
  standalone?: boolean;
  states?: readonly string[];
}
export interface ExampleModule { default: ExampleDefinition }

export function resolveExample(modules: Record<string, ExampleModule>, search: string) {
  const definitions = Object.values(modules).map((module) => module.default);
  const fallback = definitions.find((definition) => definition.id === 'shell');
  if (!fallback) throw new Error('The application shell example is required.');
  const ids = definitions.map((definition) => definition.id);
  if (new Set(ids).size !== ids.length) throw new Error('Example IDs must be unique.');
  const params = new URLSearchParams(search);
  const definition = definitions.find((item) => item.id === params.get('screen')) ?? fallback;
  const states = definition.states?.length ? definition.states : ['default'];
  const requested = params.get('state');
  const state = requested && states.includes(requested) ? requested : states[0];
  return { definition, state };
}
