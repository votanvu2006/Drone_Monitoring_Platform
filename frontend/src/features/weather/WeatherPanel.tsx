import { Icon } from '../../components/Icon';
import { Panel, StatusBadge } from '../../components/ui';
import { weatherExamples } from './weather.data';
import type { WeatherPoint } from './weather.data';
import './weather.css';


export function WeatherPanel({ examples = weatherExamples }: { examples?: readonly WeatherPoint[] }) {
  return <Panel title="Weather" eyebrow="ROUTE CONDITIONS" accessory={<span className="weather-panel-count">3 route points</span>}>
    <div className="weather-points">
      {examples.map((example) => <article className="weather-point" key={example.point} aria-label={example.point}>
        <span className={'weather-point-icon tone-' + example.tone}><Icon name="weather" size={22} /></span>
        <div className="weather-point-content"><div className="weather-point-title"><h3>{example.point}</h3>
          <StatusBadge tone={example.tone}>{example.status}</StatusBadge></div>
          <span className="weather-point-index">{example.sampleLabel}</span><p>{example.summary}</p></div>
      </article>)}
    </div>
    <p className="weather-panel-note"><Icon name="weather" size={15} /> Training weather conditions · Fixed route samples</p>
  </Panel>;
}
