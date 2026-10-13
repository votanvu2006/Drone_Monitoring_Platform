import type { ExampleDefinition } from '../../app/examples';
import { PreflightReviewExample } from '../airspace/PreflightReviewExample';
import { WeatherPanel } from './WeatherPanel';

function WeatherPreflightExample() { return <PreflightReviewExample weather={<WeatherPanel />} />; }

export default {
  id: 'preflight-weather', title: 'Mission preflight', activeNav: 'Missions', component: WeatherPreflightExample,
} satisfies ExampleDefinition;
