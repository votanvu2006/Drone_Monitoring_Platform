import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { AirspacePanel } from './AirspacePanel';
import { PreflightReviewExample } from '../../examples/airspace/PreflightReviewExample';

describe('static preflight Airspace panel', () => {
  it('displays both checks with fixed status and supporting text', () => {
    render(<AirspacePanel />);
    const boundary = screen.getByRole('article', { name: 'Boundary Check' });
    expect(boundary).toHaveTextContent('PASS');
    expect(boundary).toHaveTextContent('training boundary');
    const restricted = screen.getByRole('article', { name: 'Restricted Zones' });
    expect(restricted).toHaveTextContent('CLEAR');
    expect(restricted).toHaveTextContent('No restricted zone intersects');
  });
  it('renders inside Mission Wizard step four without a top-level Airspace entry', () => {
    window.history.replaceState({}, '', '/?screen=preflight-airspace');
    render(<App />);
    const step = screen.getByRole('region', { name: 'Mission Wizard preflight step' });
    expect(within(step).getByRole('region', { name: 'Airspace' })).toBeVisible();
    const steps = screen.getByRole('list', { name: 'Mission creation steps' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(4);
    expect(steps.querySelector('[aria-current="step"]')).toHaveTextContent('Preflight review');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(step).toHaveTextContent('Aircraft OFFLINE');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('offers a composition slot for Weather without computing geometry or fetching data', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { container } = render(<PreflightReviewExample weather={<p>Weather slot contents</p>} />);
    expect(container.querySelector('[data-preflight-slot="weather"]')).toHaveTextContent('Weather slot contents');
    expect(screen.getByRole('region', { name: 'Airspace' })).toBeVisible();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
