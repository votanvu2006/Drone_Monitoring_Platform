import type { ExampleDefinition } from '../../app/examples';
import { AirspacePreview } from './AirspacePreview';
const airspacePreview = { id: 'preflight-airspace', title: 'Mission preflight', activeNav: 'Missions', component: AirspacePreview, standalone: true } satisfies ExampleDefinition;
export default airspacePreview;
