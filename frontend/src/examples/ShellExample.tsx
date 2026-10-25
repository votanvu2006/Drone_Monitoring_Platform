import { Icon } from '../components/Icon';
import { PageHeading, Panel, StatusBadge } from '../components/ui';

export function ShellExample() {
  return <>
    <PageHeading title="Your flight operations workspace"
      description="A clear view of the fleet, the mission, and the flight ahead."
      accessory={<StatusBadge tone="success">Workspace ready</StatusBadge>} />
    <Panel title="One workspace. Every operation." eyebrow="DRONE MONITORING PLATFORM">
      <div className="shell-welcome"><span className="welcome-mark"><Icon name="drone" size={68} /></span>
        <div><h3>Stay focused on the next flight.</h3>
          <p>Plan missions, monitor aircraft, and review operational events in a consistent workspace.</p>
          <div className="welcome-tags"><span>Fleet visibility</span><span>Mission planning</span><span>Flight review</span></div>
        </div></div>
    </Panel>
  </>;
}