import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { DEMO_SESSION_KEY } from './demo-session';

describe('mission alert navigation', () => {
  it.each([
    ['DRONE-002', 'mission-002', 'Motor temperature warning'],
    ['DRONE-005', 'mission-005', 'Unsafe weather'],
  ])('opens the matching alerts for %s and keeps the URL filter on refresh', async (drone, mission, title) => {
    localStorage.setItem(DEMO_SESSION_KEY, 'active');
    window.history.replaceState(null, '', '/missions');
    const view = render(<App />);
    const table = await screen.findByRole('table');
    const row = within(table).getByText(drone).closest('tr')!;
    fireEvent.click(within(row).getByRole('button', { name: /View alert/ }));
    expect(window.location.pathname).toBe('/alerts');
    expect(window.location.search).toContain('drone=' + drone);
    expect(screen.getByRole('table')).toHaveTextContent(title);
    expect(screen.getByRole('table')).not.toHaveTextContent(drone === 'DRONE-002' ? 'Unsafe weather' : 'Low battery');
    expect(screen.getByRole('table')).toHaveTextContent(mission);
    view.unmount();
    render(<App />);
    expect(screen.getByRole('table')).toHaveTextContent(title);
  });

  it('shows No alert for every other mission status', async () => {
    localStorage.setItem(DEMO_SESSION_KEY, 'active');
    window.history.replaceState(null, '', '/missions');
    render(<App />);
    await screen.findByRole('table');
    for (const drone of ['DRONE-001', 'DRONE-003', 'DRONE-004']) {
      const row = within(screen.getByRole('table')).getByText(drone).closest('tr')!;
      expect(row).toHaveTextContent('No alert');
      expect(within(row).queryByRole('button')).toBeNull();
    }
  });
});
