import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { AppShell } from './components/AppShell';
import { navigation } from './app/examples';

describe('shared application shell', () => {
  it('renders the shared frame, all six navigation entries and the static selected state', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    navigation.forEach((item) => expect(within(nav).getByText(item)).toBeVisible());
    expect(within(nav).getByText('Overview').closest('.nav-item')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('banner')).toBeVisible();
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
    render(<AppShell title="Alerts" activeNav="Alerts"><h1>Example module</h1></AppShell>);
    expect(screen.getByRole('main')).toHaveTextContent('Example module');
    expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent('Alerts');
  });
});
