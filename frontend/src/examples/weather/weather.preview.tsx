import type { ExampleDefinition } from '../../app/examples';
import { WeatherPreflightExample } from './WeatherPreflightExample';
const weatherPreview = { id: 'preflight-weather', title: 'Mission preflight', activeNav: 'Missions', component: WeatherPreflightExample, standalone: true } satisfies ExampleDefinition;
export default weatherPreview;
