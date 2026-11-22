# Pruebas de QA en navegador

Guiones usados en la verificación final (`docs/INFORME-QA.md`). Prueban datos reales de la app en modo demo
(sin InsForge), no solo lo que se ve en pantalla.

1. Levanta la app en modo demo:
   `DISABLE_HMR=true VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev`
2. Con `playwright` instalado (y `axe-core` en una carpeta aparte para los escaneos de accesibilidad):
   - `node qa/e2e-escritorio.cjs` — 12 casos de computador.
   - `node qa/e2e-celular-accesibilidad.cjs <carpeta-con-axe-core>` — 4 casos de celular y accesibilidad en 12 vistas.
   - `node qa/accesibilidad-tema-oscuro.cjs <carpeta-con-axe-core>` — contraste en tema oscuro.
3. Resultado esperado: todas las líneas `PASS` y "sin violaciones".

Los selectores (`#sidebar-*`, `#mobile-nav-*`, `#checkout-bar`, etc.) son ids estables de la interfaz.
