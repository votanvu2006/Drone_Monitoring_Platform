import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { FlightScenarioPanel, scenarioExamples } from './FlightScenarioPanel';

describe('static flight scenario panel', () => {
  it('shows all four named scenarios with status and event summary', () => {
    render(<FlightScenarioPanel />);
    expect(screen.getAllByRole('article')).toHaveLength(4);
    scenarioExamples.forEach((example) => {
      const card = screen.getByRole('article', { name: example.name });
      expect(card).toHaveTextContent(example.status);
      expect(card).toHaveTextContent(example.summary);
    });
  });
  it('belongs to Live Flight without adding a Simulation navigation entry', () => {
    window.history.replaceState({}, '', '/?screen=live-flight-scenarios');
    render(<App />);
    const workspace = screen.getByRole('region', { name: 'Live Flight workspace' });
    expect(within(workspace).getByRole('region', { name: 'Flight scenarios' })).toBeVisible();
    expect(workspace).toHaveTextContent('FLT-001');
    expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent('Live Flight');
    expect(within(screen.getByRole('navigation')).queryByText('Simulation')).not.toBeInTheDocument();
  });
  it('cannot select, play or run a scenario and makes no API calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<FlightScenarioPanel />);
    fireEvent.click(screen.getByRole('article', { name: 'Component failure' }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
