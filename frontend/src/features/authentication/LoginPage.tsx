import type { FormEvent } from 'react';
import { Icon } from '../../components/Icon';
import './login.css';

export function LoginPage({ onSignIn }: { onSignIn?: () => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (event.currentTarget.reportValidity()) onSignIn?.();
  }
  return <main className="login-page">
    <div className="login-layout">
      <div className="login-heading">
        <span className="login-brand" aria-hidden="true"><Icon name="drone" size={30} /></span>
        <h1>Drone Monitoring Platform</h1>
      </div>
      <form className="login-card" aria-label="Sign in" onSubmit={submit}>
        <div className="field-label">
          <label htmlFor="login-username">Username</label>
          <input id="login-username" name="username" className="text-field" type="text" autoComplete="username"
            placeholder="Enter your username" required />
        </div>
        <div className="field-label">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" name="password" className="text-field" type="password" autoComplete="current-password"
            placeholder="Enter your password" required />
        </div>
        <button type="submit" className="button login-submit">Sign In</button>
      </form>
    </div>
  </main>;
}
