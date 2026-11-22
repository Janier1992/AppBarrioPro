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
const route = window.location.pathname.replace(/\/+$/, '');
const isPlansRoute = route === '/planes';
const isAdminRoute = route === '/admin';
const AdminPortal = lazy(() => import('./admin/AdminPortal.tsx'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPlansRoute ? (
      <Suspense fallback={null}>
        <PlansPage />
      </Suspense>
    ) : isAdminRoute ? (
      <Suspense fallback={null}>
        <AdminPortal />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
