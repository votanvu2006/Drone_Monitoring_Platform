import type { ExampleDefinition } from '../../app/examples';
import { PreflightReviewExample } from './PreflightReviewExample';

function AirspaceExample() { return <PreflightReviewExample />; }

export default {
  id: 'preflight-airspace', title: 'Mission preflight', activeNav: 'Missions', component: AirspaceExample,
} satisfies ExampleDefinition;
