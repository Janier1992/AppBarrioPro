// QA Tiendly — Escaneo axe-core (WCAG A/AA) de las 6 vistas en tema oscuro. Uso: node qa/accesibilidad-tema-oscuro.cjs <carpeta con node_modules/axe-core>
// Requiere la app en modo demo: DISABLE_HMR=true VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev
// y `playwright` disponible (require('playwright')). Ver qa/README.md.
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(process.argv[2] + '/axe/node_modules/axe-core/axe.min.js', 'utf8');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  p.setDefaultTimeout(7000); p.on('dialog', d => d.accept());
  const skip = async () => { for (let i = 0; i < 6 && await p.locator('#onboarding-modal').count(); i++) { await p.locator('#onboarding-modal button').last().click(); await p.waitForTimeout(600); } };
  await p.goto('http://localhost:3180/'); await p.waitForTimeout(3000); await skip();
  if (await p.locator('#btn-load-demo').count()) { await p.locator('#btn-load-demo').click(); await p.waitForTimeout(3500); await skip(); }
  await p.click('#sidebar-theme'); await p.waitForTimeout(900);
  console.log('tema oscuro activo:', await p.evaluate(() => document.documentElement.classList.contains('dark')));
  for (const [n, sel] of [['Hoy', '#sidebar-dashboard'], ['Productos', '#sidebar-inventory'], ['Vender', '#sidebar-sales'], ['Fiados', '#sidebar-debts'], ['Tareas', '#sidebar-checklist'], ['Ajustes', '#sidebar-settings']]) {
    await p.click(sel); await p.waitForTimeout(900);
    await p.evaluate(s => { const e = document.createElement('script'); e.textContent = s; document.head.appendChild(e); }, AXE);
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.flatMap(v => v.nodes.map(x => x.html.slice(0, 140) + ' => ' + (((x.any[0] || {}).message || '').match(/ratio of ([0-9.]+).*?foreground color: (#[0-9a-f]+), background color: (#[0-9a-f]+)/) || []).slice(1).join(' '))));
    console.log('oscuro/' + n + ':', r.length ? r.join(' ;; ') : 'sin violaciones');
  }
  await b.close();
})();
