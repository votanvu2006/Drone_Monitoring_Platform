import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { AppShell } from '../../components/AppShell';
import { alerts, alertsByCode } from './alerts.data';
import { AlertDetail, AlertsPage } from './AlertsPage';

function show(query = 'state=list') {
  window.history.replaceState({}, '', '/?screen=alerts&' + query);
  return render(<App />);
}

describe('standalone alert list and details', () => {
  it('shows the demo set, seven required columns, descriptions and severity counts', () => {
    show();
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual([
      'Alert ID/title', 'Drone', 'Mission', 'Problem Description', 'Severity', 'Source', 'Detected Time',
    ]);
    expect(screen.getByLabelText('Alert totals')).toHaveTextContent('Total alerts3Critical1Warning2');
    for (const alert of alerts) {
      const row = document.querySelector('[data-alert-code="' + alert.alertCode + '"]')!;
      for (const value of [alert.title, alert.droneCode, alert.missionCode, alert.problemDescription, alert.severity, alert.sourceGroup, alert.detectedTime.text]) {
        expect(row).toHaveTextContent(value);
      }
    }
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(document.querySelector('.ui-page-heading .eyebrow')).toBeNull();
    expect(screen.getAllByRole('main')).toHaveLength(1);
  });

  it('keeps search, severity and rows inert without API requests or navigation', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    show();
    expect(screen.getByLabelText('Search alerts')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Severity')).toBeDisabled();
    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
    const before = window.location.href;
    fireEvent.click(document.querySelector('[data-alert-code="DEMO-ALT-001"]')!);
    expect(screen.queryByRole('region', { name: 'Alert summary' })).not.toBeInTheDocument();
    expect(window.location.href).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('preserves default and legacy detail previews with empty and recorded notes', () => {
    const active = show('state=detail-active');
    expect(document.querySelector('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'DEMO-ALT-001');
    expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent('No resolution note has been recorded.');
    active.unmount();
    const resolved = show('state=detail-resolved');
    expect(document.querySelector('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'DEMO-ALT-003');
    expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent(alertsByCode.get('DEMO-ALT-003')!.resolutionNote!);
    expect(screen.getByRole('region', { name: 'Incident information' })).toHaveTextContent('Weather');
    resolved.unmount();
    show('state=detail');
    expect(document.querySelector('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'DEMO-ALT-001');
  });

  it('opens an explicit demo code independently of the priority order', () => {
    show('state=detail&alert=DEMO-ALT-002');
    expect(document.querySelector('.alert-detail-grid')).toHaveAttribute('data-alert-code', 'DEMO-ALT-002');
    expect(screen.getByRole('region', { name: 'Alert summary' })).toHaveTextContent('Motor temperature warning');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a missing-record message for an unknown explicit code', () => {
    show('state=detail&alert=DEMO-ALT-999');
    expect(screen.getByRole('region', { name: 'Alert not found' })).toHaveTextContent('DEMO-ALT-999');
    expect(document.querySelector('.alert-detail-grid')).toBeNull();
  });

  it('renders the same identifying fields and problem description in every detail', () => {
    for (const alert of alerts) {
      const view = render(<AlertDetail alert={alert} />);
      const summary = screen.getByRole('region', { name: 'Alert summary' });
      expect(summary).toHaveTextContent(alert.title);
      expect(summary).toHaveTextContent(alert.problemDescription);
      expect(summary).toHaveTextContent(alert.severity);
      const information = screen.getByRole('region', { name: 'Incident information' });
      for (const value of [alert.alertCode, alert.droneCode, alert.missionCode, alert.sourceGroup, alert.detectedTime.text]) {
        expect(information).toHaveTextContent(value);
      }
      expect(screen.getByRole('region', { name: 'Resolution note' })).toHaveTextContent(
        alert.resolutionNote ?? 'No resolution note has been recorded.',
      );
      view.unmount();
    }
  });

  it('exports content that fits one shared shell and switches theme', () => {
    render(<AppShell activeNav="Alerts"><AlertsPage /></AppShell>);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    fireEvent.click(screen.getByRole('switch', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });
});
