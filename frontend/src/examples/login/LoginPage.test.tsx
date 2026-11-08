import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../App';
import { DEMO_SESSION_KEY } from '../../app/demo-session';
import { mockApiFetch } from '../../test/api-fixtures';

function signIn() {
  fireEvent.change(screen.getByLabelText('Username'), {
    target: { value: 'operator' },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { value: 'demo-password' },
  });
  fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('demo login flow', () => {
  it('gates module URLs and signs in without sending or storing credentials', () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(mockApiFetch);

    window.history.replaceState(null, '', '/missions');
    render(<App />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Username')).not.toHaveAttribute(
      'readonly',
    );

    fireEvent.submit(screen.getByRole('form', { name: 'Sign in' }));
    expect(localStorage.getItem(DEMO_SESSION_KEY)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    signIn();

    expect(window.location.pathname).toBe('/drones');
    expect(screen.getByRole('heading', { name: /^Drones$/ })).toBeVisible();
    expect(localStorage.getItem(DEMO_SESSION_KEY)).toBe('active');
    expect(JSON.stringify(localStorage)).not.toContain('demo-password');

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/drones?page=1&pageSize=100',
      expect.any(Object),
    );
    expect(
      fetchSpy.mock.calls.every(([input]) =>
        String(input).startsWith('/api/drones'),
      ),
    ).toBe(true);
  });

  it('restores the session after remount and clears it on logout, including history navigation', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(mockApiFetch);

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