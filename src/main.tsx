import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { initMonitoring } from './lib/monitoring';
import { registerServiceWorker } from './lib/serviceWorker';
import './index.css';

initMonitoring();
registerServiceWorker();

// /planes es una página pública (sin sesión) para quien llega desde un mensaje comercial.
const PlansPage = lazy(() => import('./components/PlansPage.tsx'));
const isPlansRoute = window.location.pathname.replace(/\/+$/, '') === '/planes';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPlansRoute ? (
      <Suspense fallback={null}>
        <PlansPage />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
