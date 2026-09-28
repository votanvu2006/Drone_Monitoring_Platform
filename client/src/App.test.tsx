import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('operations console', () => {
  it('renders fleet identity from the live API responses', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const path = String(input);
      if (path.includes('/health')) return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      if (path.includes('/drones')) return new Response(JSON.stringify({
        data: [{
          id: 1, droneCode: 'DRN-001', displayName: 'Test quadcopter', status: 'AVAILABLE', isSimulated: true,
          model: { modelCode: 'Q-1', manufacturer: 'Northstar', modelName: 'Survey One' },
          homeLocation: { label: 'Hangar A', latitude: 21, longitude: 105 }, lastKnownLocation: null,
        }], page: 1, pageSize: 100, total: 1,
      }), { status: 200 });
      return new Response(JSON.stringify({ data: [], page: 1, pageSize: 100, total: 0 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><App /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Welcome back, operator' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Test quadcopter/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View drone/ })).toHaveAttribute('href', '/drones');
    expect(fetchMock).toHaveBeenCalledWith('/api/drones?page=1&pageSize=100', expect.any(Object));
  });
});
