import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { moduleNavigation } from './navigation';
import { availableModulePages } from './module-pages';

describe('shared module composition', () => {
  it.each(moduleNavigation)('composes $label with one shell and one main', async module => {
    window.history.replaceState({}, '', '/?module=' + module.id);
    render(<App />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getByRole('banner')).not.toHaveTextContent('Operations');
    const nav = screen.getByRole('navigation');
    expect(nav.querySelectorAll('.nav-item')).toHaveLength(5);
    expect(nav).not.toHaveTextContent('Overview');
    if (module.id === 'overview') expect(nav.querySelector('[aria-current="page"]')).toBeNull();
    else expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent(module.label);
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    if (!availableModulePages[module.id]) expect(screen.getByRole('main')).toHaveTextContent('This page is not available yet.');
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    const before=window.location.href;
    fireEvent.click(screen.getByRole('navigation').querySelector('.nav-item') as HTMLElement);
    expect(window.location.href).toBe(before);
  });
  it.each([
    ['missions', 'Mission 001'],
    ['live-flight', 'FLIGHT-015'],
    ['flight-history', 'FLIGHT-014'],
    ['alerts', 'DEMO-ALT-003'],
  ])('renders the merged %s module content instead of a placeholder', async (id, sample) => {
    window.history.replaceState({}, '', '/?module=' + id);
    render(<App />);
    await waitFor(() => expect(screen.getByRole('main')).toHaveTextContent(sample));
    expect(screen.getByRole('main')).not.toHaveTextContent('This page is not available yet.');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
  it('keeps module IDs and paths unique and falls back to Fleet for invalid preview selectors', () => {
    expect(new Set(moduleNavigation.map(item=>item.id)).size).toBe(6);
    expect(new Set(moduleNavigation.map(item=>item.path)).size).toBe(6);
    window.history.replaceState({}, '', '/?module=missing');render(<App />);
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Drones');
  });
});
