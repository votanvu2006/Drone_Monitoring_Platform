import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { alerts } from '../../data/fixtures';

function show(state = 'list') {
  window.history.replaceState({}, '', '/?screen=alerts&state=' + state);
  render(<App />);
}
describe('static alert list and detail', () => {
  it('shows all required information for every alert, including varied severity and status', () => {
    show();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    alerts.forEach((alert) => {
      const record = screen.getByRole('article', { name: alert.title });
      for (const text of [alert.title, alert.severity, alert.status, alert.source, alert.time]) {
        expect(record).toHaveTextContent(text);
      }
    });
  });
  it('keeps search, filters and record selection visual only', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    show();
    expect(screen.getByLabelText('Search alerts')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Severity')).toBeDisabled();
    expect(screen.getByLabelText('Status')).toBeDisabled();
    const before = window.location.href;
    fireEvent.click(screen.getByRole('article', { name: alerts[0].title }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.queryByRole('region', { name: 'Alert summary' })).not.toBeInTheDocument();
    expect(window.location.href).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('shows active alert details and a clearly empty resolution note', () => {
    show('detail-active');
    const details = screen.getByRole('region', { name: 'Incident information' });
    for (const text of [alerts[0].severity, alerts[0].status, alerts[0].source, alerts[0].time]) {
      expect(details).toHaveTextContent(text);
    }
    expect(screen.getByRole('region', { name: 'Alert summary' })).toHaveTextContent(alerts[0].summary);
    expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent('No resolution note has been recorded.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('shows the selected resolved alert and its recorded resolution', () => {
    show('detail-resolved');
    const summary = screen.getByRole('region', { name: 'Alert summary' });
    expect(within(summary).getByText(alerts[2].title)).toBeVisible();
    expect(summary).toHaveTextContent('RESOLVED');
    expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent(alerts[2].resolutionNote);
    expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent('Alerts');
  });
});
