import { Icon } from '../../components/Icon';
import { Panel, StatusBadge } from '../../components/ui';
import type { Tone } from '../../components/ui';
import './weather.css';

export const weatherExamples: readonly {
  point: string; status: 'SAFE' | 'CAUTION'; tone: Tone; summary: string;
}[] = [
  { point: 'Departure', status: 'SAFE', tone: 'success',
    summary: 'Clear sky. Wind 8 km/h, with visibility of 10 km.' },
  { point: 'Midpoint', status: 'CAUTION', tone: 'warning',
    summary: 'Stronger wind along the route. Wind 18 km/h, with visibility of 8 km.' },
  { point: 'Destination', status: 'SAFE', tone: 'success',
    summary: 'Partly cloudy. Wind 9 km/h, with visibility of 10 km.' },
];

export function WeatherPanel() {
  return <Panel title="Weather" eyebrow="ROUTE CONDITIONS" accessory={<span className="preflight-panel-count">3 route points</span>}>
    <div className="weather-points">
      {weatherExamples.map((example, index) => <article className="weather-point" key={example.point} aria-label={example.point}>
        <span className={'weather-point-icon tone-' + example.tone}><Icon name="weather" size={22} /></span>
        <div className="weather-point-content"><div className="weather-point-title"><h3>{example.point}</h3>
          <StatusBadge tone={example.tone}>{example.status}</StatusBadge></div>
          <span className="weather-point-index">ROUTE SAMPLE 0{index + 1}</span><p>{example.summary}</p></div>
      </article>)}
    </div>
    <p className="preflight-panel-note"><Icon name="weather" size={15} /> Training weather conditions · Fixed route samples</p>
  </Panel>;
}
