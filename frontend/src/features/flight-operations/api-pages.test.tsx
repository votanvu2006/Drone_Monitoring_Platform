import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import snapshot from '../../../../data/frontend.snapshot.json';
import { activatedFlight, apiAlertRows } from '../../test/api-fixtures';
import LiveFlightPage from './live/LiveFlightPage';
import FlightHistoryListPage from './history/list/FlightHistoryListPage';
import FlightHistoryDetailPage from './history/detail/FlightHistoryDetailPage';
import { ConnectedAlertsPage } from '../alerts/ConnectedAlertsPage';
import { loadAlerts } from '../alerts/alerts.api';

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } });
}

const pages = [
  { name: 'active flights', element: <LiveFlightPage />, loading: 'Loading active flights...', empty: 'No active flights are available.', path: '/api/flights/active' },
  { name: 'history', element: <FlightHistoryListPage />, loading: 'Loading flight history...', empty: 'No flight records', path: '/api/flights/history' },
  { name: 'detail', element: <FlightHistoryDetailPage flightCode="FLIGHT-012" />, loading: 'Loading flight details...', empty: 'Flight record not found.', path: '/api/flights/FLIGHT-012' },
  { name: 'alerts', element: <ConnectedAlertsPage />, loading: 'Loading alerts...', empty: 'No alerts match your search or severity filter.', path: '/api/alerts?page=1&pageSize=100' },
];

describe('runtime pages read backend data', () => {
  it.each(pages)('shows loading and request failure for $name', async page => {
    let reject: (reason: Error) => void = () => {};
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }));
    render(page.element);
    expect(screen.getByRole('status')).toHaveTextContent(page.loading);
    expect(fetch).toHaveBeenCalledWith(page.path, expect.any(Object));
    reject(new Error('Network unavailable'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it.each(pages)('shows an empty server result for $name', async page => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(page.name === 'detail' ? null : [], page.name === 'detail' ? 404 : 200));
    render(page.element);
    expect(await screen.findByText(page.empty)).toBeVisible();
  });

  it('renders server route and progress instead of the bundled live flight', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([{ ...activatedFlight, routeName: 'API route', routeProgressPercent: 61 }]));
    render(<LiveFlightPage />);
    expect(await screen.findByRole('heading', { name: 'API route' })).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '61');
  });

  it('renders a server history record and links to that exact flight', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([{ ...snapshot.history[0], flightCode: 'SERVER-001' }]));
    render(<FlightHistoryListPage />);
    expect(await screen.findByRole('link', { name: 'SERVER-001' })).toHaveAttribute('href', '/flight-history?flight=SERVER-001');
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });

  it('renders the requested flight detail, its server telemetry and events', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ ...snapshot.historyDetails[1], routeName: 'API detail route',
      telemetry: { ...snapshot.historyDetails[1].telemetry, averageSpeedMps: null },
      events: [{ ...snapshot.historyDetails[1].events[0], title: 'Server event' }],
    }));
    render(<FlightHistoryDetailPage flightCode="FLIGHT-012" />);
    expect(await screen.findByText('API detail route')).toBeVisible();
    expect(screen.getByText('Server event')).toBeVisible();
    expect(screen.getByText('Not recorded')).toBeVisible();
    expect(screen.queryByText('FLIGHT-014')).not.toBeInTheDocument();
  });

  it('renders server alerts and derives totals from the returned set', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([{ ...apiAlertRows[0], title: 'Server incident' }]));
    render(<ConnectedAlertsPage />);
    expect(await screen.findByText('Server incident')).toBeVisible();
    expect(screen.getByLabelText('Alert totals')).toHaveTextContent('Total alerts1Critical0Warning1');
    expect(screen.queryByText('Unsafe weather')).not.toBeInTheDocument();
  });

  it('loads every alert page and keeps a failed detail request distinct from a missing flight', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [apiAlertRows[0]], total: 2 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [apiAlertRows[1]], total: 2 })));
    expect(await loadAlerts()).toHaveLength(2);
    expect(fetch).toHaveBeenLastCalledWith('/api/alerts?page=2&pageSize=100', expect.any(Object));
    fetch.mockResolvedValue(response(null, 500));
    render(<FlightHistoryDetailPage flightCode="FLIGHT-012" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load flight details.');
    expect(screen.queryByText('Flight record not found.')).not.toBeInTheDocument();
  });
});
