// QA Tiendly — Portal de soporte (/admin) en modo demostración: cifras, filtros, pagos, suspensión, prueba, bitácora, accesibilidad.
// Requiere la app en modo demo (puerto 3180). Uso: node qa/e2e-admin.cjs <carpeta con node_modules/axe-core>.
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(process.argv[2] + '/axe/node_modules/axe-core/axe.min.js', 'utf8');
(async () => {
  const b = await chromium.launch(); const res = []; const t = async (n, f) => { try { const r = await f(); res.push('PASS ' + n + (r ? ' → ' + r : '')); } catch (e) { res.push('FAIL ' + n + ' :: ' + e.message.split('\n')[0]); } };
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.setDefaultTimeout(7000);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const row = (id) => p.locator(`tr[data-account="${id}"]`);
  const badge = async (id) => (await row(id).locator('td').nth(1).innerText()).trim();
  await t('login: enlace "Acceso de soporte" lleva a /admin', async () => {
    await p.addInitScript(() => { if (!sessionStorage.getItem('x')) { localStorage.setItem('barriopro_explicit_signout', 'true'); sessionStorage.setItem('x', '1'); } });
    await p.goto('http://localhost:3180/'); await p.waitForSelector('#login-container'); await p.click('#support-access-link'); await p.waitForTimeout(1200);
    if (!p.url().endsWith('/admin')) throw new Error(p.url());
  });
  await t('/admin sin sesión muestra el formulario de acceso de soporte', async () => { if (!(await p.locator('#admin-login').count())) throw new Error('sin formulario'); });
  await t('con sesión (modo demostración) entra al portal con aviso de datos ficticios', async () => {
    await p.evaluate(() => localStorage.removeItem('barriopro_explicit_signout')); await p.goto('http://localhost:3180/admin');
    await p.waitForSelector('#admin-kpis', { timeout: 8000 }); if (!(await p.locator('#admin-demo-note').count())) throw new Error('sin aviso de demo');
  });
  await t('cifras del tablero correctas', async () => { const k = await p.locator('#admin-kpis').innerText(); const nums = k.replace(/\s+/g, ' '); for (const x of ['Cuentas 7', 'En prueba 2', 'Activas 2', 'Por vencer (≤5 días) 2', 'Bloqueadas 3', 'Ingreso mensual $ 59.800']) if (!nums.includes(x)) throw new Error('falta ' + x + ' en ' + nums); });
  await t('filtro "Bloqueadas" muestra solo las 3 bloqueadas', async () => { await p.getByRole('button', { name: /Bloqueadas/ }).click(); const n = await p.locator('#accounts-table tbody tr[data-account]').count(); if (n !== 3) throw new Error('n=' + n); });
  await t('búsqueda por nombre', async () => { await p.locator('#admin-kpis button').first().click(); await p.fill('#admin-search', 'fruver'); const n = await p.locator('#accounts-table tbody tr[data-account]').count(); if (n !== 1) throw new Error('n=' + n); await p.fill('#admin-search', ''); });
  await t('cuenta con prueba vencida (u3): registrar pago la activa', async () => {
    if (!/Prueba vencida/.test(await badge('u3'))) throw new Error(await badge('u3'));
    await row('u3').getByRole('button', { name: /Administrar/ }).click(); await p.waitForSelector('#account-panel');
    await p.selectOption('#pay-months', '2'); const amt = await p.inputValue('#pay-amount'); if (amt !== '59800') throw new Error('monto ' + amt);
    await p.selectOption('#pay-method', 'Nequi'); await p.fill('#pay-ref', 'NQ-9'); await p.click('#pay-submit'); await p.waitForSelector('#account-message');
    await p.waitForTimeout(500); if (!/registrado/.test(await p.locator('#account-message').innerText())) throw new Error(await p.locator('#account-message').innerText());
    await p.click('#account-close'); await p.waitForTimeout(300); const bd = await badge('u3'); if (!/Activa/.test(bd)) throw new Error(bd);
  });
  await t('suspender pide confirmación y bloquea', async () => {
    await row('u1').getByRole('button', { name: /Administrar/ }).click(); await p.waitForSelector('#account-panel');
    await p.click('#act-suspend'); if (!(await p.locator('#account-confirm').count())) throw new Error('sin confirmación');
    await p.click('#confirm-yes'); await p.waitForTimeout(600); await p.click('#account-close'); await p.waitForTimeout(300);
    const bd = await badge('u1'); if (!/Suspendida/.test(bd)) throw new Error(bd);
  });
  await t('reactivar una cuenta suspendida con mes vigente', async () => {
    await row('u1').getByRole('button', { name: /Administrar/ }).click(); await p.waitForSelector('#account-panel');
    await p.click('#act-resume'); await p.waitForTimeout(600); await p.click('#account-close'); await p.waitForTimeout(300);
    const bd = await badge('u1'); if (!/Activa/.test(bd)) throw new Error(bd);
  });
  await t('extender la prueba +7 días (u2)', async () => {
    await row('u2').getByRole('button', { name: /Administrar/ }).click(); await p.waitForSelector('#account-panel');
    await p.click('#act-trial-7'); await p.waitForTimeout(600); const m = await p.locator('#account-message').innerText(); if (!/extendida/.test(m)) throw new Error(m);
    await p.click('#account-close');
  });
  await t('el resumen del negocio y los pagos se muestran', async () => {
    await row('u6').getByRole('button', { name: /Administrar/ }).click(); await p.waitForSelector('#account-summary'); await p.waitForTimeout(500);
    const s = await p.locator('#account-summary').innerText(); if (!/Productos/.test(s) || !/Fiados abiertos/.test(s)) throw new Error(s.slice(0, 80)); await p.click('#account-close');
  });
  await t('la bitácora lista lo que se hizo', async () => {
    await p.click('#admin-tab-audit'); await p.waitForSelector('#audit-list'); const l = await p.locator('#audit-list').innerText();
    for (const x of ['Registró un pago', 'Suspendió la cuenta', 'Reactivó la cuenta', 'Extendió la prueba']) if (!l.includes(x)) throw new Error('falta ' + x);
  });
  await t('sin desbordamiento horizontal en celular', async () => { await p.setViewportSize({ width: 390, height: 844 }); await p.click('#admin-tab-accounts'); await p.waitForTimeout(500); const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 1) throw new Error(o); });
  await t('accesibilidad axe (WCAG A/AA) en el portal', async () => {
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.evaluate(s => { const e = document.createElement('script'); e.textContent = s; document.head.appendChild(e); }, AXE);
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + '×' + x.nodes.length + ' ' + (x.nodes[0].html || '').slice(0, 90)));
    if (v.length) throw new Error(v.join(' ;; '));
  });
  await p.screenshot({ path: process.argv[2] + '/admin-lista.png' });
  console.log(res.join('\n')); console.log('errores de página:', errs.length, errs.slice(0, 2)); await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
