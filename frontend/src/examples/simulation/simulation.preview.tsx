import type { ExampleDefinition } from '../../app/examples';
import { LiveFlightScenarioExample } from './LiveFlightScenarioExample';
const simulationPreview = { id: 'live-flight-scenarios', title: 'Live Flight', activeNav: 'Live Flight', component: LiveFlightScenarioExample, standalone: true } satisfies ExampleDefinition;
export default simulationPreview;
