import type { ExampleDefinition } from '../app/examples';
import { ShellExample } from './ShellExample';

const shellExample = { id: 'shell', title: 'Workspace', activeNav: 'Overview', component: ShellExample } satisfies ExampleDefinition;
export default shellExample;
