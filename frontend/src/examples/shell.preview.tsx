import type { ExampleDefinition } from '../app/examples';
import { ShellExample } from './ShellExample';

const shellExample = { id: 'shell', title: 'Workspace', activeNav: 'Drones', component: ShellExample } satisfies ExampleDefinition;
export default shellExample;
