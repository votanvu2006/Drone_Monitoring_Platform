import type { ExampleProps } from '../../app/examples';
import { Icon } from '../../components/Icon';
import './login.css';

const content: Record<string, { email: string; message: string }> = {
  default: { email: '', message: 'Enter your credentials to access the workspace.' },
  'validation-error': { email: 'operator', message: 'Check the highlighted fields before signing in.' },
  loading: { email: 'operator@example.com', message: 'Checking your credentials. Please wait.' },
  'login-error': { email: 'operator@example.com', message: 'Unable to sign in. Check your email and password.' },
};

export function LoginPage({ state }: ExampleProps) {
  const example = content[state] ?? content.default;
  const validation = state === 'validation-error';
  const loading = state === 'loading';
  const error = validation || state === 'login-error';
  return <main className="login-page">
    <section className="login-introduction" aria-label="Drone Monitoring Platform">
      <div className="brand"><span className="brand-symbol"><Icon name="drone" size={25} /></span>
        <div>DRONE<span>MONITORING PLATFORM</span></div></div>
      <div className="login-hero">
        <span className="eyebrow">PLAN · MONITOR · REVIEW</span>
        <h1>Clarity from takeoff<br />to touchdown.</h1>
        <p>Your fleet, missions and flight operations. Together in one focused workspace.</p>
        <div className="login-flight-art" aria-hidden="true">
          <svg viewBox="0 0 450 220" fill="none">
            <path d="M40 175C120 175 92 50 205 85S320 183 408 45" stroke="#46695e" strokeWidth="2" strokeDasharray="5 7" />
            <circle cx="40" cy="175" r="7" fill="#5ee6a8" /><circle cx="408" cy="45" r="7" fill="#5ee6a8" />
            <circle cx="230" cy="106" r="66" stroke="#355646" /><circle cx="230" cy="106" r="87" stroke="#243d33" />
          </svg>
          <span className="login-aircraft"><Icon name="drone" size={63} /></span>
          <span className="login-route-label start">DEPARTURE</span><span className="login-route-label end">DESTINATION</span>
        </div>
      </div>
      <p className="login-intro-footer">PRECISION IN EVERY FLIGHT</p>
    </section>
    <section className="login-form-area" aria-label="Sign in">
      <div className="login-card" aria-busy={loading}>
        <span className="eyebrow">OPERATIONS ACCESS</span>
        <h2>Welcome back.</h2><p className="login-subtitle">Sign in to your operations workspace.</p>
        <div className="login-fields">
          <div className="field-label"><label htmlFor="login-email">Username or email</label>
            <input id="login-email" className="text-field" type="text" inputMode="email" autoComplete="off"
              placeholder="operator@example.com" value={example.email} readOnly
              aria-invalid={validation} aria-describedby={validation ? 'email-error' : undefined} />
            {validation && <span id="email-error" className="field-error">Enter a valid email address.</span>}
          </div>
          <div className="field-label"><label htmlFor="login-password">Password</label>
            <input id="login-password" className="text-field" type="password" autoComplete="off"
              placeholder="Enter your password" value={loading || state === 'login-error' ? 'training-password' : ''}
              readOnly aria-invalid={validation} aria-describedby={validation ? 'password-error' : undefined} />
            {validation && <span id="password-error" className="field-error">Password is required.</span>}
          </div>
          <button type="button" className="button login-submit" aria-disabled="true">
            {loading ? <><span className="loading-mark" aria-hidden="true" />Signing in…</> : <>Sign in<Icon name="arrow" size={17} /></>}
          </button>
          <div className={'login-feedback' + (error ? ' is-error' : '')}
            role={error ? 'alert' : 'status'}>{example.message}</div>
        </div>
        <div className="login-security"><Icon name="shield" size={16} /> A focused workspace for your flight operations.</div>
      </div>
      <p className="login-copyright">Drone Monitoring Platform · Operations workspace</p>
    </section>
  </main>;
}
