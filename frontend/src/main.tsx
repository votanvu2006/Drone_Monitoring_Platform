import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles.css';
import App from './App.tsx';
import { initializeDemo } from './app/initialize-demo';

async function bootstrap(): Promise<void> {
  const container = document.getElementById('root');

  if (!container) {
    throw new Error('Root element not found.');
  }

  try {
    // Kiểm tra phiên trước khi App đọc trạng thái đăng nhập.
    await initializeDemo();

    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error(error);

    const message = document.createElement('p');
    message.textContent =
      'Could not connect to the API. Start the backend, then reload this page.';

    const retry = document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Reload';
    retry.onclick = () => window.location.reload();

    container.replaceChildren(message, retry);
  }
}

void bootstrap();