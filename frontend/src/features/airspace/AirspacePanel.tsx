import { Icon } from '../../components/Icon';
import { Panel, StatusBadge } from '../../components/ui';
import './airspace.css';

export function AirspacePanel() {
  return <Panel title="Airspace" eyebrow="PREFLIGHT CHECKS" accessory={<span className="preflight-panel-count">2 checks</span>}>
    <div className="airspace-checks">
      <article className="airspace-check" aria-label="Boundary Check">
        <span className="preflight-check-icon"><Icon name="shield" size={23} /></span>
        <div><h3>Boundary Check</h3><p>The sample route stays within the Ho Chi Minh City training boundary.</p></div>
        <StatusBadge tone="success">PASS</StatusBadge>
      </article>
      <article className="airspace-check" aria-label="Restricted Zones">
        <span className="preflight-check-icon"><Icon name="route" size={23} /></span>
        <div><h3>Restricted Zones</h3><p>No restricted zone intersects the sample route.</p></div>
        <StatusBadge tone="success">CLEAR</StatusBadge>
      </article>
    </div>
    <p className="preflight-panel-note"><Icon name="shield" size={15} /> Training airspace · Ho Chi Minh City</p>
  </Panel>;
}
