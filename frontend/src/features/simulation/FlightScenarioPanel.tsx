import { Icon } from '../../components/Icon';
import { Panel, StatusBadge } from '../../components/ui';
import { scenarioExamples } from './scenario.data';
import type { ScenarioExample } from './scenario.data';
import './simulation.css';


export function FlightScenarioPanel({ examples = scenarioExamples }: { examples?: readonly ScenarioExample[] }) {
  return <Panel title="Flight scenarios" eyebrow="SCENARIO EXAMPLES" accessory={<span className="scenario-count">{examples.length} scenarios</span>}>
    <div className="scenario-grid">
      {examples.map((example) => <article className="scenario-card" key={example.id} aria-label={example.name}>
        <div className="scenario-card-top"><span className={'scenario-icon tone-' + example.tone}>
          <Icon name={example.icon} size={22} /></span><StatusBadge tone={example.tone}>{example.status}</StatusBadge></div>
        <span className="eyebrow">{example.id}</span><h3>{example.name}</h3>
        <div className="scenario-event"><span>EVENT SUMMARY</span><p>{example.summary}</p></div>
      </article>)}
    </div>
  </Panel>;
}
