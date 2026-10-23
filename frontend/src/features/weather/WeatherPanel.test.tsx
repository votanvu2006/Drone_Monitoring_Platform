import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { WeatherPanel } from './WeatherPanel';
import { weatherExamples } from './weather.data';
import { weatherProfiles } from '../../data/seeds';

describe('static preflight Weather panel', () => {
  it('shows departure, midpoint and destination with fixed status and conditions', () => {
    render(<WeatherPanel />);
    const points = [['Departure', 'SAFE', '4.2 m/s'], ['Midpoint', 'CAUTION', '8.7 m/s'], ['Destination', 'SAFE', '4.2 m/s']];
    expect(screen.getAllByRole('article')).toHaveLength(3);
    for (const point of weatherExamples) expect(weatherProfiles.find(profile => profile.profile_code === point.profileCode)?.recommendation).toBe(point.status);
    points.forEach(([point, status, wind]) => {
      const record = screen.getByRole('article', { name: point });
      expect(record).toHaveTextContent(status);
      expect(record).toHaveTextContent(wind);
      expect(record).toHaveTextContent('visibility');
    });
  });
  it('composes Weather and Airspace in Mission Wizard preflight without new navigation entries', () => {
    window.history.replaceState({}, '', '/?screen=preflight-weather');
    render(<App />);
    const step = screen.getByRole('region', { name: 'Mission Wizard preflight step' });
    const weather = within(step).getByRole('region', { name: 'Weather' });
    expect(weather.closest('[data-preflight-slot="weather"]')).not.toBeNull();
    expect(within(step).getByRole('region', { name: 'Airspace' })).toBeVisible();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it('uses sample statuses without fetching, forecasting or launch controls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<WeatherPanel />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('region', { name: 'Weather' })).toHaveTextContent('Training weather conditions');
  });
});
