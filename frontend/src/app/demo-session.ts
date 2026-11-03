export const DEMO_SESSION_KEY = 'drone-monitoring.demo-session';

export function hasDemoSession(): boolean {
  try { return localStorage.getItem(DEMO_SESSION_KEY) === 'active'; }
  catch { return false; }
}

export function saveDemoSession(active: boolean): void {
  try {
    if (active) localStorage.setItem(DEMO_SESSION_KEY, 'active');
    else localStorage.removeItem(DEMO_SESSION_KEY);
  } catch { /* Keep the current session usable when browser storage is unavailable. */ }
}
