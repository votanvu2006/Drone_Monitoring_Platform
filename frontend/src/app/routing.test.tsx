import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { moduleNavigation } from './navigation';

function show(path: string) { window.history.replaceState({}, '', path); return render(<App />); }
describe('module routes', () => {
  it.each(moduleNavigation)('opens $path directly with the correct sidebar selection', async module => {
    show(module.path);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getByRole('banner')).not.toHaveTextContent('Operations');
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    expect(within(screen.getByRole('navigation')).getAllByRole('link')).toHaveLength(5);
    expect(screen.queryByRole('link', { name: 'Overview' })).not.toBeInTheDocument();
    if (module.id === 'overview') expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toBeNull();
    else expect(screen.getByRole('link',{name:module.label})).toHaveAttribute('aria-current','page');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    const samples: Record<string, string> = { missions: 'Mission 001', 'live-flight': 'FLIGHT-015', 'flight-history': 'FLIGHT-014', alerts: 'DEMO-ALT-003' };
    if (samples[module.id]) {
      expect(screen.getByRole('main')).toHaveTextContent(samples[module.id]);
      expect(screen.getByRole('main')).not.toHaveTextContent('This page is not available yet.');
    }
  });
  it('redirects the root to Drones', async () => {
    show('/'); await waitFor(() => expect(window.location.pathname).toBe('/drones'));
    expect(screen.getByRole('link', { name: 'Drones' })).toHaveAttribute('aria-current', 'page');
  });
  it('keeps shell identity and visual-only theme controls while navigating', async () => {
    show('/drones'); const banner=screen.getByRole('banner');
    fireEvent.click(screen.getByRole('switch',{name:'Dark theme'}));
    fireEvent.click(screen.getByRole('link',{name:'Missions'}));
    expect(window.location.pathname).toBe('/missions');
    expect(screen.getByRole('banner')).toBe(banner);
    expect(screen.getByRole('switch')).toBeDisabled();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(screen.getByRole('link',{name:'Missions'})).toHaveAttribute('aria-current','page');
    expect(await screen.findByText('Mission 001')).toBeVisible();
  });
  it('keeps existing drone detail actions in the URL and supports unknown codes', async () => {
    const view=show('/drones');
    fireEvent.click(await screen.findByRole('button',{name:'View details for DRONE-003'}));
    expect(window.location.pathname).toBe('/drones/DRONE-003');
    expect(await screen.findByRole('heading',{name:'DRONE-003'})).toBeVisible();
    expect(screen.getByRole('link',{name:'Drones'})).toHaveAttribute('aria-current','page');
    fireEvent.click(screen.getByRole('button',{name:'Back to fleet'}));
    expect(window.location.pathname).toBe('/drones');view.unmount();
    show('/drones/DRONE-999');expect(await screen.findByText('Drone not found.')).toBeVisible();
  });
  it('keeps login outside the application shell and renders a not-found page for unknown paths', () => {
    const login=show('/login');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();login.unmount();
    show('/unknown/path');expect(screen.getByRole('heading',{name:'Page not found'})).toBeVisible();
    expect(within(screen.getByRole('navigation')).getAllByRole('link')).toHaveLength(5);
  });
});
