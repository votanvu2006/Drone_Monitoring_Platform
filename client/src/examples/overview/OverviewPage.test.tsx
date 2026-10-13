import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { activeFlight, recentActivity } from '../../data/fixtures';

function show() {
  window.history.replaceState({}, '', '/?screen=overview');
  render(<App />);
}
describe('static overview dashboard', () => {
  it('shows all four summary areas with the shared fixture totals', () => {
    show();
    for (const [name, value] of [['Fleet status', '5'], ['Mission status', '3'], ['Active flights', '1'], ['Open alerts', '2']]) {
      expect(within(screen.getByRole('region', { name })).getByText(value, { exact: true })).toBeVisible();
    }
    expect(screen.getByText('3 available · 1 in flight · 1 offline')).toBeVisible();
    expect(screen.getByText('1 critical · 1 warning')).toBeVisible();
  });
  it('shows the active-flight snapshot and the fixed recent activity', () => {
    show();
    const active = screen.getByRole('region', { name: 'Active flight' });
    expect(active).toHaveTextContent(activeFlight.id);
    expect(active).toHaveTextContent('Riverside inspection');
    expect(active).toHaveTextContent('Drone - 001');
    expect(active).toHaveTextContent('64%');
    recentActivity.forEach((activity) => expect(screen.getByText(activity.title)).toBeVisible());
  });
  it('uses the shared shell and provides no card navigation or live data', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    show();
    const before = window.location.href;
    fireEvent.click(screen.getByRole('region', { name: 'Open alerts' }));
    expect(window.location.href).toBe(before);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent('Overview');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
