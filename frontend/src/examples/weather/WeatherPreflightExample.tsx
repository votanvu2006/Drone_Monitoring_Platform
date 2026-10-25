import { PreflightReviewExample } from '../airspace/PreflightReviewExample';
import { WeatherPanel } from '../../features/weather/WeatherPanel';
export function WeatherPreflightExample() { return <PreflightReviewExample weather={<WeatherPanel />} />; }
