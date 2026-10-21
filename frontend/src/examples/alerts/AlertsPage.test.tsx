import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { AppShell } from '../../components/AppShell';
import { alerts, alertsByCode, formatAlertTime, formatMeasurement } from './alerts.data';
import { AlertDetail, AlertsPage } from './AlertsPage';

function show(query = 'state=list') {
  window.history.replaceState({}, '', '/?screen=alerts&' + query);
  return render(<App />);
}

describe('standalone alert list and details', () => {
  it('shows all canonical incidents, required columns and derived counts', () => {
    show();
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(25);
    expect(rows[1]).toHaveAttribute('data-alert-code', 'ALT-022');
    expect(screen.getByLabelText('Alert totals')).toHaveTextContent('Total alerts24Active6Resolved18');
    for (const alert of alerts) {
      const row = document.querySelector('[data-alert-code="' + alert.alert_code + '"]')!;
      expect(row).toHaveTextContent(alert.title);
      expect(row).toHaveTextContent(alert.severity);
      expect(row).toHaveTextContent(alert.status);
      expect(row).toHaveTextContent(alert.sourceGroup);
      expect(row).toHaveTextContent(formatAlertTime(alert.detected_at));
    }
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('keeps search, filters and rows inert without API requests or navigation', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    show();
    expect(screen.getByLabelText('Search alerts')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Severity')).toBeDisabled();
    expect(screen.getByLabelText('Status')).toBeDisabled();
    const before = window.location.href;
    fireEvent.click(document.querySelector('[data-alert-code="ALT-016"]')!);
    expect(screen.queryByRole('region', { name: 'Alert summary' })).not.toBeInTheDocument();
    expect(window.location.href).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('uses stable default detail codes and shows both resolution states', () => {
    const active = show('state=detail-active');
    expect(document.querySelector('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'ALT-014');
    expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent('No resolution note has been recorded.');
    expect(screen.getByRole('region', { name: 'Related records' })).toHaveTextContent('Rear Right Propeller');
    active.unmount();
    show('state=detail-resolved');
    expect(document.querySelector('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'ALT-016');
    expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent(alertsByCode.get('ALT-016')!.resolution_note!);
    expect(screen.getByRole('region', { name: 'Incident information' })).toHaveTextContent('Components');
    expect(screen.getByRole('region', { name: 'Incident information' })).toHaveTextContent('TELEMETRY');
  });

  it('opens an arbitrary code independently of its position in the sorted list', () => {
    show('state=detail&alert=ALT-001');
    expect(document.querySelector('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'ALT-001');
    expect(screen.getByRole('region', { name: 'Alert summary' })).toHaveTextContent('Low battery');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a missing-record message for an unknown explicit code', () => {
    show('state=detail&alert=ALT-999');
    expect(screen.getByRole('region', { name: 'Alert not found' })).toHaveTextContent('ALT-999');
    expect(document.querySelector('.alert-detail-grid')).toBeNull();
  });

  it('renders complete identifying, measurement and lifecycle data for every seed record', () => {
    for (const alert of alerts) {
      const view = render(<AlertDetail alert={alert} />);
      const summary = screen.getByRole('region', { name: 'Alert summary' });
      expect(summary).toHaveTextContent(alert.message);
      expect(summary).toHaveTextContent(alert.severity);
      expect(summary).toHaveTextContent(alert.status);
      const information = screen.getByRole('region', { name: 'Incident information' });
      for (const value of [alert.alert_code, alert.rule_code, alert.type, alert.source, alert.sourceGroup]) {
        expect(information).toHaveTextContent(value);
      }
      const measurements = screen.getByRole('region', { name: 'Measurements' });
      expect(measurements).toHaveTextContent(formatMeasurement(alert.observed_value, alert.unit));
      expect(measurements).toHaveTextContent(formatMeasurement(alert.threshold_value, alert.unit));
      const lifecycle = screen.getByRole('region', { name: 'Lifecycle' });
      for (const value of [alert.detected_at, alert.last_observed_at, alert.resolved_at, alert.created_at, alert.updated_at]) {
        expect(lifecycle).toHaveTextContent(formatAlertTime(value));
      }
      expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent(
        alert.resolution_note ?? 'No resolution note has been recorded.',
      );
      view.unmount();
    }
  });

  it('displays absent relationships and zero observations explicitly', () => {
    const empty = render(<AlertDetail alert={alertsByCode.get('ALT-021')!} />);
    expect(screen.getByRole('region', { name: 'Related records' })).toHaveTextContent('No associated flight');
    expect(screen.getByRole('region', { name: 'Related records' })).toHaveTextContent('No associated component');
    expect(screen.getByRole('region', { name: 'Measurements' })).toHaveTextContent('Not recorded');
    empty.unmount();
    render(<AlertDetail alert={{ ...alerts[0], observed_value: 0, threshold_value: 0, unit: '%' }} />);
    expect(within(screen.getByRole('region', { name: 'Measurements' })).getAllByText('0 %')).toHaveLength(2);
  });

  it('exports content that fits one shared shell when composed later', () => {
    render(<AppShell title="Alerts" activeNav="Alerts"><AlertsPage state="list" /></AppShell>);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    fireEvent.click(screen.getByRole('switch', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getAllByRole('row')).toHaveLength(25);
  });
});
