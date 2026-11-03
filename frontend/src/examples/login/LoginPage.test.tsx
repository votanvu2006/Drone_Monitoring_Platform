import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { DEMO_SESSION_KEY } from '../../app/demo-session';

function signIn() {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'operator' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'demo-password' } });
  fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
}

describe('demo login flow', () => {
  it('gates direct module URLs and accepts the form without calling an API or storing credentials', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    window.history.replaceState(null, '', '/missions');
    render(<App />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Username')).not.toHaveAttribute('readonly');
    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
    expect(localStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
    signIn();
    expect(window.location.pathname).toBe('/drones');
    expect(screen.getByRole('heading', { name: /^Drones$/ })).toBeVisible();
    expect(localStorage.getItem(DEMO_SESSION_KEY)).toBe('active');
    expect(JSON.stringify(localStorage)).not.toContain('demo-password');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('restores the session after remount and clears it on logout, including history navigation', () => {
    const first = render(<App />);
    signIn();
    first.unmount();
    const second = render(<App />);
    expect(screen.getByRole('navigation')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(window.location.pathname).toBe('/login');
    expect(localStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
    window.history.replaceState(null, '', '/missions');
    fireEvent.popState(window);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    second.unmount();
    render(<App />);
    expect(screen.getByRole('form', { name: 'Sign in' })).toBeVisible();
  });
});
