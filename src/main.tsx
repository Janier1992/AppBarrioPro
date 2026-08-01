import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initMonitoring } from './lib/monitoring';
import { registerServiceWorker } from './lib/serviceWorker';
import './index.css';

initMonitoring();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
