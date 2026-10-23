import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { moduleNavigation } from './navigation';
import { availableModulePages } from './module-pages';

describe('shared module composition', () => {
  it.each(moduleNavigation)('composes $label with one shell and one main', module => {
    window.history.replaceState({}, '', '/?module=' + module.id);
    render(<App />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('navigation')).toHaveLength(1);
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getByRole('banner')).not.toHaveTextContent('Operations');
    expect(screen.getByRole('navigation').querySelector('[aria-current="page"]')).toHaveTextContent(module.label);
    expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
    if (!availableModulePages[module.id]) expect(screen.getByRole('main')).toHaveTextContent('This page is not available yet.');
    const before=window.location.href;
    fireEvent.click(screen.getByRole('navigation').querySelector('.nav-item') as HTMLElement);
    expect(window.location.href).toBe(before);
  });
  it('keeps module IDs and paths unique and falls back to Fleet for invalid preview selectors', () => {
    expect(new Set(moduleNavigation.map(item=>item.id)).size).toBe(6);
    expect(new Set(moduleNavigation.map(item=>item.path)).size).toBe(6);
    window.history.replaceState({}, '', '/?module=missing');render(<App />);
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Drones');
  });
});
