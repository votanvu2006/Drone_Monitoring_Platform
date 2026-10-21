import { Icon } from '../../components/Icon';
import './login.css';

export function LoginPage() {
  return <main className="login-page">
    <div className="login-layout">
      <div className="login-heading">
        <span className="login-brand" aria-hidden="true"><Icon name="drone" size={30} /></span>
        <h1>Drone Monitoring Platform</h1>
      </div>
      <section className="login-card" aria-label="Sign in">
        <div className="field-label">
          <label htmlFor="login-username">Username</label>
          <input id="login-username" className="text-field" type="text" autoComplete="off"
            placeholder="Enter your username" value="" readOnly />
        </div>
        <div className="field-label">
          <label htmlFor="login-password">Password</label>
          <input id="login-password" className="text-field" type="password" autoComplete="off"
            placeholder="Enter your password" value="" readOnly />
        </div>
        <button type="button" className="button login-submit" disabled>Sign In</button>
      </section>
    </div>
  </main>;
}
