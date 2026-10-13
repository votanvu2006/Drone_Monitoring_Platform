import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';

function show(state: string) {
  window.history.replaceState({}, '', '/?screen=login&state=' + state);
  expect(window.location.search).toBe('?screen=login&state=' + state);
  render(<App />);
}
describe('static login examples', () => {
  it('renders a standalone, labelled login screen with readonly fields', () => {
    show('default');
    expect(screen.getByLabelText('Username or email')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute('type', 'button');
    expect(screen.getByRole('status')).toHaveTextContent('Enter your credentials');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it('associates validation feedback with both invalid fields', () => {
    show('validation-error');
    expect(screen.getByLabelText('Username or email')).toHaveAccessibleDescription('Enter a valid email address.');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Password is required.');
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('highlighted fields');
  });
  it('shows fixed loading feedback without starting authentication', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    show('loading');
    expect(screen.getByRole('region', { name: 'Sign in' }).firstElementChild).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button')).toHaveTextContent('Signing in');
    expect(screen.getByRole('status')).toHaveTextContent('Checking your credentials');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('shows a fixed login failure and cannot submit or redirect', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    show('login-error');
    const before = window.location.href;
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to sign in');
    expect(window.location.href).toBe(before);
    expect(document.querySelector('form')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
