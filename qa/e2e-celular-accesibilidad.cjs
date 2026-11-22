// QA Tiendly — Flujos en celular (390x844) y escaneo de accesibilidad axe-core (WCAG A/AA) en computador y celular. Uso: node qa/e2e-celular-accesibilidad.cjs <carpeta con node_modules/axe-core>
// Requiere la app en modo demo: DISABLE_HMR=true VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev
// y `playwright` disponible (require('playwright')). Ver qa/README.md.
const { chromium } = require('playwright');
const fs = require('fs');
const AXE = fs.readFileSync(process.argv[2] + '/axe/node_modules/axe-core/axe.min.js', 'utf8');
const UID = 'dev-user-id-01';
(async () => {
  const b = await chromium.launch();
  const res = []; const t = async (id, n, f) => { try { const r = await f(); res.push(`PASS ${id} ${n}${r ? ' → ' + r : ''}`); } catch (e) { res.push(`FAIL ${id} ${n} :: ${e.message.split('\n')[0]}`); } };
  const ctx = async (w, h, mobile) => { const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile }); const p = await c.newPage(); p.setDefaultTimeout(7000); p.on('dialog', d => d.accept()); return p; };
  const boot = async (p) => { const skip = async () => { for (let i = 0; i < 6 && await p.locator('#onboarding-modal').count(); i++) { await p.locator('#onboarding-modal button').last().click(); await p.waitForTimeout(600); } };
    await p.goto('http://localhost:3180/'); await p.waitForTimeout(3000); await skip();
    if (await p.locator('#btn-load-demo').count()) { await p.locator('#btn-load-demo').click(); await p.waitForTimeout(3500); await skip(); } };
  const ls = (p, k) => p.evaluate(([k, u]) => JSON.parse(localStorage.getItem(`barriopro_${k}_${u}`) || '[]'), [k, UID]);
  // ---- MÓVIL ----
  let p = await ctx(390, 844, true); await boot(p);
  await t('TC-MOV-001', 'celular: barra inferior visible y sin menú lateral', async () => { if (!(await p.locator('#mobile-bottom-nav').isVisible())) throw new Error('sin barra'); if (await p.locator('#desktop-sidebar').isVisible()) throw new Error('sidebar visible'); });
  await t('TC-MOV-002', 'celular: sin desbordamiento horizontal en los 6 destinos', async () => {
    const bad = [];
    for (const go of [() => p.click('#mobile-nav-dashboard'), () => p.click('#mobile-nav-inventory'), () => p.click('#mobile-nav-debts'), async () => { await p.click('#mobile-nav-more'); await p.click('#more-menu-checklist'); }, async () => { await p.click('#mobile-nav-more'); await p.click('#more-menu-settings'); }, () => p.click('#mobile-nav-sales')]) {
      await go(); await p.waitForTimeout(700);
      const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (o > 1) bad.push(o);
    }
    if (bad.length) throw new Error('desbordamiento ' + bad.join(','));
  });
  await t('TC-MOV-003', 'celular: venta con barra "Cobrar" descuenta stock', async () => {
    await p.reload(); await p.waitForTimeout(2500);
    await p.click('#mobile-nav-sales'); await p.waitForTimeout(800);
    const before = await ls(p, 'products');
    const tiles = p.locator('#sales-layout button').filter({ hasText: '$' });
    const name = (await tiles.nth(1).innerText()).split('\n')[0];
    await tiles.nth(1).click(); await p.waitForTimeout(300);
    await p.click('#checkout-bar'); await p.waitForTimeout(700);
    await p.getByRole('button', { name: /^Cobrar \$/ }).click(); await p.waitForTimeout(1500);
    const a = (await ls(p, 'products')).find(x => x.name === name), bf = before.find(x => x.name === name);
    if (bf.stock - a.stock !== 1) throw new Error(`stock ${bf.stock}→${a.stock}`); return `${name}: ${bf.stock}→${a.stock}`;
  });
  await t('TC-MOV-004', 'celular: "+ Reponer" abre la edición del producto', async () => {
    await p.reload(); await p.waitForTimeout(2500); await p.click('#mobile-nav-inventory'); await p.waitForTimeout(700);
    await p.getByRole('button', { name: /^Reponer / }).first().click(); await p.waitForTimeout(700);
    if (!(await p.locator('body').innerText()).match(/Editar|Guardar/)) throw new Error('no abrió edición');
  });
  await p.close();
  // ---- ACCESIBILIDAD (axe-core) ----
  const scan = async (p, label) => {
    await p.evaluate(AXE_SRC => { const s = document.createElement('script'); s.textContent = AXE_SRC; document.head.appendChild(s); }, AXE);
    const r = await p.evaluate(async () => { const x = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] }); return x.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help })); });
    return r;
  };
  const a11y = {};
  for (const [label, w, h, mobile] of [['escritorio', 1440, 900, false], ['celular', 390, 844, true]]) {
    p = await ctx(w, h, mobile); await boot(p);
    const pages = mobile
      ? [['Hoy', () => p.click('#mobile-nav-dashboard')], ['Productos', () => p.click('#mobile-nav-inventory')], ['Fiados', () => p.click('#mobile-nav-debts')], ['Tareas', async () => { await p.click('#mobile-nav-more'); await p.click('#more-menu-checklist'); }], ['Ajustes', async () => { await p.click('#mobile-nav-more'); await p.click('#more-menu-settings'); }], ['Vender', () => p.click('#mobile-nav-sales')]]
      : [['Hoy', () => p.click('#sidebar-dashboard')], ['Productos', () => p.click('#sidebar-inventory')], ['Vender', () => p.click('#sidebar-sales')], ['Fiados', () => p.click('#sidebar-debts')], ['Tareas', () => p.click('#sidebar-checklist')], ['Ajustes', () => p.click('#sidebar-settings')]];
    for (const [name, go] of pages) { try { if (mobile && name === 'Hoy') { } await go(); await p.waitForTimeout(900); a11y[`${label}/${name}`] = await scan(p, name); } catch (e) { a11y[`${label}/${name}`] = [{ id: 'ERROR', impact: 'n/a', n: 0, help: e.message.split('\n')[0] }]; } }
    await p.close();
  }
  console.log(res.join('\n'));
  console.log('\nACCESIBILIDAD (WCAG 2.0 A/AA, axe-core):');
  const agg = {};
  for (const [k, v] of Object.entries(a11y)) { console.log(`  ${k}: ${v.length === 0 ? 'sin violaciones' : v.map(x => `${x.id}[${x.impact}]×${x.n}`).join(', ')}`); for (const x of v) agg[x.id] = x.help; }
  console.log('\nReglas con violaciones:', JSON.stringify(agg, null, 1));
  await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
