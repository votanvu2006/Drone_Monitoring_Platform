import { saveDemoSession } from './demo-session';

const DEMO_RUN_KEY = 'drone-monitoring.demo-run';

export async function initializeDemo(): Promise<void> {
  const apiBase = (
    import.meta.env.VITE_API_BASE_URL ?? '/api'
  ).replace(/\/$/, '');

  const response = await fetch(`${apiBase}/demo-run`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Could not check the demo session.');
  }

  const body: unknown = await response.json();

  if (
    !body ||
    typeof body !== 'object' ||
    !('data' in body) ||
    !body.data ||
    typeof body.data !== 'object' ||
    !('runId' in body.data)
  ) {
    throw new Error('Invalid demo session response.');
  }

  const runId = body.data.runId;

  // Khi chạy bằng npm start, backend không yêu cầu reset demo.
  if (runId === null) {
    return;
  }

  if (typeof runId !== 'string' || !runId) {
    throw new Error('Invalid demo run ID.');
  }

  let previousRunId: string | null = null;

  try {
    previousRunId = localStorage.getItem(DEMO_RUN_KEY);
  } catch {
    // Vẫn cho phép mở demo khi trình duyệt chặn storage.
  }

  if (previousRunId === runId) {
    // Cùng lần chạy: F5 vẫn giữ đăng nhập và trang hiện tại.
    return;
  }

  // Lần chạy mới: trở về màn hình đăng nhập.
  saveDemoSession(false);
  window.history.replaceState(null, '', '/login');
  window.history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  try {
    localStorage.setItem(DEMO_RUN_KEY, runId);
  } catch {
    // Không ngăn giao diện hoạt động khi storage bị chặn.
  }
}