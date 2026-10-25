import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AppShell } from './components/AppShell';

describe('shared application shell', () => {
  beforeEach(() => window.history.replaceState({}, '', '/?screen=shell'));
  it('renders five sidebar entries without Overview and selects Drones by default', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(within(nav).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Drones', 'Missions', 'Live Flight', 'Flight History', 'Alerts',
    ]);
    expect(within(nav).queryByText('Overview', { exact: true })).not.toBeInTheDocument();
    expect(within(nav).getByText('Drones').closest('.nav-item')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('banner')).not.toHaveTextContent('Operations');
    expect(screen.queryByText('Workspace', { exact: true })).not.toBeInTheDocument();
    expect(document.querySelector('.ui-page-heading .eyebrow')).toBeNull();
    expect(screen.getByRole('main')).toHaveTextContent('Your flight operations workspace');
  });
  it('keeps navigation visual and does not call APIs', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unexpected API call'));
    render(<App />);
    const before = window.location.href;
    fireEvent.click(screen.getByText('Missions'));
    expect(window.location.href).toBe(before);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('hosts arbitrary module content and highlights its declared section', () => {
    render(<AppShell activeNav="Alerts"><h1>Example module</h1></AppShell>);
    expect(screen.getByRole('main')).toHaveTextContent('Example module');
    expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent('Alerts');
  });
  it('keeps the theme switch visual without changing the document or saving a preference', () => {
    const localWrite = vi.spyOn(Storage.prototype, 'setItem');
    const { unmount } = render(<App />);
    const toggle = screen.getByRole('switch', { name: 'Dark theme' });
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    fireEvent.keyDown(toggle, { key: 'Enter' });
    fireEvent.keyDown(toggle, { key: ' ' });
    expect(toggle).not.toBeChecked();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
    expect(localWrite).not.toHaveBeenCalled();
    unmount();
    expect(document.documentElement).not.toHaveAttribute('data-theme');
  });
});
