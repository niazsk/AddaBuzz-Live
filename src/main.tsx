import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (location.hostname !== 'appassets.androidplatform.net') {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(<App />);
