import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockApiFetch } from '../../test/api-fixtures';
import { ConnectedAlertsPage } from './ConnectedAlertsPage';

describe('mission alert server filters', () => {
  it('sends both URL identities and reloads when they change without retaining old results', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(mockApiFetch);
    const view = render(<ConnectedAlertsPage droneCode="DRONE-002" missionCode="mission-002" />);
    expect(await screen.findByRole('table')).toHaveTextContent('Motor temperature warning');
    expect(fetch).toHaveBeenLastCalledWith('/api/alerts?droneCode=DRONE-002&missionCode=mission-002&page=1&pageSize=100', expect.any(Object));
    view.rerender(<ConnectedAlertsPage droneCode="DRONE-005" missionCode="mission-005" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading alerts');
    expect(screen.queryByText('Motor temperature warning')).not.toBeInTheDocument();
    expect(await screen.findByRole('table')).toHaveTextContent('Unsafe weather');
    expect(fetch).toHaveBeenLastCalledWith('/api/alerts?droneCode=DRONE-005&missionCode=mission-005&page=1&pageSize=100', expect.any(Object));
    view.rerender(<ConnectedAlertsPage droneCode="DRONE-002" missionCode="mission-005" />);
    expect(await screen.findByText('No alerts match your search or severity filter.')).toBeVisible();
    expect(screen.queryByText('Unsafe weather')).not.toBeInTheDocument();
  });
});
