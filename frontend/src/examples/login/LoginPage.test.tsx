import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../App';

function show(state = 'default') {
  window.history.replaceState({}, '', '/?screen=login&state=' + state);
  return render(<App />);
}

describe('default login screen', () => {
  it('renders the centered identity and readonly fields without an authenticated shell', () => {
    show();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Drone Monitoring Platform');
    expect(screen.getByLabelText('Username')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Password')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeDisabled();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['validation-error', 'loading', 'login-error'])('falls back to default for the former %s state', state => {
    show(state);
    expect(screen.getByLabelText('Username')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-invalid="true"], [aria-busy="true"]')).toBeNull();
    expect(screen.getByRole('button')).toHaveTextContent('Sign In');
  });

  it('does not submit, navigate, call an API or leave a dark theme behind', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    show();
    const before = window.location.href;
    fireEvent.click(screen.getByRole('button'));
    fireEvent.keyDown(screen.getByLabelText('Password'), { key: 'Enter' });
    expect(document.querySelector('form')).toBeNull();
    expect(document.documentElement).not.toHaveAttribute('data-theme', 'dark');
    expect(window.location.href).toBe(before);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
