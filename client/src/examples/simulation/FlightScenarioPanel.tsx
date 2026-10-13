import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import { Panel, StatusBadge } from '../../components/ui';
import type { Tone } from '../../components/ui';
import './simulation.css';

export const scenarioExamples: readonly {
  id: string; name: string; status: string; tone: Tone; icon: IconName; summary: string;
}[] = [
  { id: 'SCN-01', name: 'Successful flight', status: 'SUCCESS', tone: 'success', icon: 'check',
    summary: 'The planned route was completed and the aircraft landed successfully.' },
  { id: 'SCN-02', name: 'Component failure', status: 'FAILED', tone: 'danger', icon: 'battery',
    summary: 'A motor fault was detected and the flight attempt ended with a component incident.' },
  { id: 'SCN-03', name: 'Restricted-zone failure', status: 'BLOCKED', tone: 'danger', icon: 'shield',
    summary: 'The preflight route check rejected a segment through a restricted zone.' },
  { id: 'SCN-04', name: 'Weather caution', status: 'CAUTION', tone: 'warning', icon: 'weather',
    summary: 'Stronger midpoint wind conditions require caution during the preflight review.' },
];

export function FlightScenarioPanel() {
  return <Panel title="Flight scenarios" eyebrow="SCENARIO EXAMPLES" accessory={<span className="scenario-count">4 scenarios</span>}>
    <div className="scenario-grid">
      {scenarioExamples.map((example) => <article className="scenario-card" key={example.id} aria-label={example.name}>
        <div className="scenario-card-top"><span className={'scenario-icon tone-' + example.tone}>
          <Icon name={example.icon} size={22} /></span><StatusBadge tone={example.tone}>{example.status}</StatusBadge></div>
        <span className="eyebrow">{example.id}</span><h3>{example.name}</h3>
        <div className="scenario-event"><span>EVENT SUMMARY</span><p>{example.summary}</p></div>
      </article>)}
    </div>
  </Panel>;
}
