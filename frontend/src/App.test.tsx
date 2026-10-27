import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { ThemeProvider } from './app/ThemeProvider';
import { THEME_STORAGE_KEY } from './app/theme';
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
    render(<ThemeProvider><AppShell activeNav="Alerts"><h1>Example module</h1></AppShell></ThemeProvider>);
    expect(screen.getByRole('main')).toHaveTextContent('Example module');
    expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent('Alerts');
  });
  it('defaults to light, toggles both ways and restores a saved preference after remount', () => {
    const first = render(<App />);
    const toggle = screen.getByRole('switch', { name: 'Dark theme' });
    expect(toggle).toBeEnabled();
    expect(toggle).not.toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(toggle).toHaveTextContent('Dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    first.unmount();
    render(<App />);
    expect(screen.getByRole('switch', { name: 'Dark theme' })).toBeChecked();
    fireEvent.click(screen.getByRole('switch', { name: 'Dark theme' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('falls back to light for an invalid saved preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'invalid');
    render(<App />);
    expect(screen.getByRole('switch', { name: 'Dark theme' })).not.toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('still switches both ways when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    render(<App />);
    const toggle = screen.getByRole('switch', { name: 'Dark theme' });
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it.each(['login', 'alerts'])('applies the saved theme to the standalone %s screen', name => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    window.history.replaceState({}, '', '/?screen=' + name);
    render(<App />);
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeVisible();
  });
});
