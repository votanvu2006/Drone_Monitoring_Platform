import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlertsPage } from './AlertsPage';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('AlertsPage resolve dialog', () => {
  it('moves focus into the dialog, traps tab focus, closes with Escape and restores focus', async () => {
    const alert = {
      id: 7, alert_code: 'ALT-007', flight_id: 12, mission_id: 5, component_id: null,
      source: 'TELEMETRY', rule_code: 'LOW_BATTERY', severity: 'WARNING', type: 'LOW_BATTERY',
      message: 'Battery capacity is below the operational threshold.', metric_name: 'battery_percent', observed_value: 15,
      threshold_value: 20, unit: '%', status: 'ACTIVE', detected_at: '2026-09-28 10:00:00', last_observed_at: '2026-09-28 10:00:00',
      resolved_at: null, resolution_note: null,
    };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [alert], page: 1, pageSize: 10, total: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    render(<AlertsPage />);
    const openButton = await screen.findByRole('button', { name: /Resolve/ });
    await user.click(openButton);

    const dialog = screen.getByRole('dialog', { name: 'Resolve incident' });
    const note = screen.getByRole('textbox', { name: /Resolution note/ });
    expect(note).toHaveFocus();
    await user.type(note, 'Inspected battery');

    const submit = screen.getByRole('button', { name: 'Resolve alert' });
    submit.focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(dialog).not.toBeInTheDocument();
    await waitFor(() => expect(openButton).toHaveFocus());
  });
});
