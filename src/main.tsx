import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/light-theme.css';
import { ThemeProvider } from './context/ThemeContext';

if (location.hostname !== 'appassets.androidplatform.net') {
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (isLocal) {
    // Local dev: drop stale service workers + caches so freshly built frames show.
    void navigator.serviceWorker?.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    void window.caches?.keys().then((keys) => Promise.all(keys.map((k) => window.caches.delete(k))));
  }
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: !isLocal }));
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
