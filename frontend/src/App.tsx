import { BrowserRouter } from 'react-router';
import { AppRoutes } from './app/AppRoutes';
import { ModuleShellPreview } from './app/ModuleShellPreview';
import { PreviewHost } from './app/PreviewHost';

export function App() {
  const params = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/') {
    if (params.has('screen')) return <PreviewHost search={params.toString()} />;
    if (params.has('module')) return <ModuleShellPreview selector={params.get('module')} />;
  }
  return <BrowserRouter><AppRoutes /></BrowserRouter>;
}
export default App;
