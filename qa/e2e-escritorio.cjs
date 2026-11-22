// QA Tiendly — Flujos funcionales en computador (ventas, fiados, inventario, tareas, tema, PIN, CSV, XSS, menú lateral).
// Requiere la app en modo demo: DISABLE_HMR=true VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev
// y `playwright` disponible (require('playwright')). Ver qa/README.md.
const { chromium } = require('playwright');
const fs = require('fs');
const UID = 'dev-user-id-01';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  const p = await c.newPage(); p.setDefaultTimeout(7000); p.on('dialog', d => d.accept());
  const pageErrors = []; p.on('pageerror', e => pageErrors.push(e.message));
  const res = []; const t = async (id, n, f) => { try { const r = await f(); res.push(`PASS ${id} ${n}${r ? ' → ' + r : ''}`); } catch (e) { res.push(`FAIL ${id} ${n} :: ${e.message.split('\n')[0]}`); } };
  const ls = (k) => p.evaluate(([k, u]) => JSON.parse(localStorage.getItem(`barriopro_${k}_${u}`) || '[]'), [k, UID]);
  const skip = async () => { for (let i = 0; i < 6 && await p.locator('#onboarding-modal').count(); i++) { await p.locator('#onboarding-modal button').last().click(); await p.waitForTimeout(600); } };
  await p.goto('http://localhost:3180/'); await p.waitForTimeout(3000); await skip();
  if (await p.locator('#btn-load-demo').count()) { await p.locator('#btn-load-demo').click(); await p.waitForTimeout(3500); await skip(); }

  // TC-VENT-001: venta en efectivo descuenta stock y registra la venta
  await t('TC-VENT-001', 'venta en efectivo: descuenta stock y crea la venta', async () => {
    const before = await ls('products'), salesBefore = (await ls('sales')).length;
    await p.click('#sidebar-sales'); await p.waitForTimeout(800);
    const tiles = p.locator('#sales-layout button').filter({ hasText: '$' });
    const name0 = (await tiles.nth(0).innerText()).split('\n')[0];
    await tiles.nth(0).click(); await tiles.nth(0).click(); await p.waitForTimeout(300);
    await p.getByRole('button', { name: /^Cobrar/ }).click(); await p.waitForTimeout(1500);
    const after = await ls('products'), salesAfter = await ls('sales');
    const pb = before.find(x => x.name === name0), pa = after.find(x => x.name === name0);
    if (!pb || !pa) throw new Error('producto no encontrado ' + name0);
    if (pb.stock - pa.stock !== 2) throw new Error(`stock ${pb.stock}→${pa.stock} (esperado -2)`);
    if (salesAfter.length !== salesBefore + 1) throw new Error('venta no registrada');
    const last = salesAfter[salesAfter.length - 1];
    if (Math.abs(last.total - pb.price * 2) > 0.01) throw new Error(`total ${last.total} vs ${pb.price * 2}`);
    return `${name0}: ${pb.stock}→${pa.stock}, total ${last.total}`;
  });
  // TC-VENT-002: cobro sin productos deshabilitado
  await t('TC-VENT-002', 'no se puede cobrar con el carrito vacío', async () => {
    if (!(await p.getByRole('button', { name: /^Cobrar/ }).isDisabled())) throw new Error('botón habilitado');
  });
  // TC-FIAD-001: venta a fiado crea la deuda
  await t('TC-FIAD-001', 'venta a fiado crea la deuda con cliente y monto', async () => {
    const debtsBefore = (await ls('debts')).length;
    const tiles = p.locator('#sales-layout button').filter({ hasText: '$' });
    await tiles.nth(1).click(); await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Fiado', exact: true }).click();
    await p.fill('#pos-client', 'Cliente QA'); await p.fill('#pos-due', '2026-12-31');
    await p.getByRole('button', { name: /^Cobrar/ }).click(); await p.waitForTimeout(1500);
    const d = await ls('debts');
    const nd = d.find(x => x.clientName === 'Cliente QA');
    if (d.length !== debtsBefore + 1 || !nd) throw new Error('deuda no creada');
    if (nd.paid) throw new Error('deuda nace pagada'); return `$${nd.amount} vence ${nd.dueDate}`;
  });
  // TC-FIAD-002: fiado exige cliente
  await t('TC-FIAD-002', 'fiado sin nombre de cliente no se registra', async () => {
    const salesBefore = (await ls('sales')).length;
    const tiles = p.locator('#sales-layout button').filter({ hasText: '$' });
    await tiles.nth(2).click(); await p.getByRole('button', { name: 'Fiado', exact: true }).click();
    await p.fill('#pos-client', ''); await p.fill('#pos-due', '2026-12-31');
    await p.getByRole('button', { name: /^Cobrar/ }).click(); await p.waitForTimeout(1000);
    if ((await ls('sales')).length !== salesBefore) throw new Error('se registró sin cliente');
    await p.reload(); await p.waitForTimeout(2500); await skip();
  });
  // TC-FIAD-003: cobrar deuda
  await t('TC-FIAD-003', 'cobrar un fiado lo marca como pagado', async () => {
    await p.click('#sidebar-debts'); await p.waitForTimeout(700);
    const row = p.locator('div,li').filter({ hasText: 'Cliente QA' }).filter({ has: p.getByRole('button', { name: 'Cobrar' }) }).last();
    await row.getByRole('button', { name: 'Cobrar' }).click(); await p.waitForTimeout(500);
    await p.getByRole('button', { name: 'Confirmar' }).click(); await p.waitForTimeout(1200);
    const d = (await ls('debts')).find(x => x.clientName === 'Cliente QA');
    if (!d || !d.paid) throw new Error('no quedó pagada');
  });
  // TC-INV-001: ajustar stock +/-
  await t('TC-INV-001', 'botones −/+ ajustan el stock de la fila y nunca bajan de 0', async () => {
    await p.click('#sidebar-inventory'); await p.waitForTimeout(800);
    const row = p.locator('tbody tr').first(); const name = (await row.locator('td').first().innerText()).split('\n')[0].trim();
    const st = () => p.evaluate(([n, u]) => (JSON.parse(localStorage.getItem(`barriopro_products_${u}`)).find(x => x.name === n) || {}).stock, [name, UID]);
    const s0 = await st(); await row.locator('button[title="Aumentar 1 de stock"]').click(); await p.waitForTimeout(700); const s1 = await st();
    await row.locator('button[title="Descontar 1 de stock"]').click(); await p.waitForTimeout(700); const s2 = await st();
    if (s1 !== s0 + 1 || s2 !== s0) throw new Error(`${s0}/${s1}/${s2}`);
    for (let i = 0; i < s2 + 2; i++) { await row.locator('button[title="Descontar 1 de stock"]').click(); await p.waitForTimeout(300); }
    if ((await st()) !== 0) throw new Error('no se detuvo en 0'); return `${name}: ${s0}→${s1}→${s2}→0`;
  });
  // TC-TASK-001
  await t('TC-TASK-001', 'crear y completar una tarea', async () => {
    await p.click('#sidebar-checklist'); await p.waitForTimeout(600);
    await p.fill('input[placeholder^="Ej: Revisar temperatura"]', 'Tarea de prueba QA');
    await p.getByRole('button', { name: /Añadir Tarea/ }).click(); await p.waitForTimeout(800);
    let task = (await ls('tasks')).find(x => x.text === 'Tarea de prueba QA' || x.title === 'Tarea de prueba QA' || JSON.stringify(x).includes('Tarea de prueba QA'));
    if (!task) throw new Error('tarea no creada');
    const row = p.locator('li,div').filter({ hasText: 'Tarea de prueba QA' }).last();
    await row.locator('button').first().click(); await p.waitForTimeout(800);
    task = (await ls('tasks')).find(x => JSON.stringify(x).includes('Tarea de prueba QA'));
    if (!(task.completed === true || task.done === true || task.isCompleted === true)) throw new Error('no quedó completada: ' + JSON.stringify(task));
  });
  // TC-TEMA-001: un solo clic cambia el tema y persiste
  await t('TC-TEMA-001', 'el tema cambia con UN clic y persiste tras recargar', async () => {
    const dark = () => p.evaluate(() => document.documentElement.classList.contains('dark'));
    const start = await dark();
    await p.click('#sidebar-theme'); await p.waitForTimeout(900);
    if ((await dark()) === start) throw new Error('no cambió con un clic');
    await p.reload(); await p.waitForTimeout(3000); await skip();
    if ((await dark()) === start) throw new Error('no persistió');
    await p.click('#sidebar-theme'); await p.waitForTimeout(900);
    if ((await dark()) !== start) throw new Error('no volvió');
  });
  // TC-PIN-001
  await t('TC-PIN-001', 'PIN: bloquear, rechazar PIN erróneo y desbloquear', async () => {
    await p.click('#sidebar-settings'); await p.waitForTimeout(600);
    await p.getByText('Seguridad e Inicialización').click(); await p.waitForTimeout(500);
    await p.fill('input[placeholder="Ej: 1234"]', '4321'); await p.getByRole('button', { name: 'Guardar PIN' }).click(); await p.waitForTimeout(1500);
    const stored = await p.evaluate(u => localStorage.getItem(`barriopro_profile_${u}`), UID);
    if (stored && stored.includes('"securityPin":"4321"')) throw new Error('PIN guardado en claro');
    await p.click('#sidebar-lock'); await p.waitForTimeout(600);
    if (!(await p.locator('#pin-lock-container').isVisible())) throw new Error('no bloqueó');
    await p.fill('input[placeholder="••••"]', '0000'); await p.getByRole('button', { name: 'Desbloquear' }).click(); await p.waitForTimeout(700);
    if (!(await p.locator('#pin-lock-container').isVisible())) throw new Error('aceptó PIN incorrecto');
    await p.fill('input[placeholder="••••"]', '4321'); await p.getByRole('button', { name: 'Desbloquear' }).click(); await p.waitForTimeout(900);
    if (await p.locator('#pin-lock-container').isVisible()) throw new Error('no desbloqueó con PIN correcto');
  });
  // TC-SEC-001: exportación CSV neutraliza fórmulas
  await t('TC-SEC-001', 'exportar CSV neutraliza =HYPERLINK en nombres', async () => {
    await p.evaluate(u => { const k = `barriopro_products_${u}`; const l = JSON.parse(localStorage.getItem(k)); l[0].name = '=HYPERLINK("http://x","y")'; localStorage.setItem(k, JSON.stringify(l)); }, UID);
    await p.reload(); await p.waitForTimeout(3000); await skip();
    await p.click('#sidebar-settings'); await p.waitForTimeout(600);
    await p.getByText('Gestión de Catálogo').first().click(); await p.waitForTimeout(500);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /Exportar a Excel/ }).click()]);
    const txt = fs.readFileSync(await dl.path(), 'utf8');
    if (/\n=HYPERLINK|^﻿?[^\n]*\n=HYPERLINK/.test(txt)) throw new Error('fórmula sin neutralizar');
    if (!txt.includes("'=HYPERLINK")) throw new Error('no encontré la celda neutralizada');
  });
  // TC-SEC-002: XSS
  await t('TC-SEC-002', 'nombre de producto con HTML no ejecuta código', async () => {
    await p.evaluate(u => { window.__x = 0; const k = `barriopro_products_${u}`; const l = JSON.parse(localStorage.getItem(k)); l[1].name = '<img src=x onerror="window.__x=1">'; localStorage.setItem(k, JSON.stringify(l)); }, UID);
    await p.reload(); await p.waitForTimeout(3000); await skip();
    await p.click('#sidebar-inventory'); await p.waitForTimeout(900);
    await p.evaluate(() => { window.__x = window.__x || 0; });
    if (await p.evaluate(() => window.__x)) throw new Error('XSS ejecutado');
    if (!(await p.locator('body').innerText()).includes('<img src=x')) throw new Error('el texto no se muestra literal');
  });
  // TC-NAV-001: menú lateral
  await t('TC-NAV-001', 'menú lateral: ocultar, mostrar y persistir', async () => {
    const w = async () => (await p.locator('#desktop-sidebar').boundingBox()).width;
    const w0 = await w(); await p.click('#sidebar-toggle'); await p.waitForTimeout(500); const w1 = await w();
    await p.reload(); await p.waitForTimeout(3000); await skip(); const w2 = await w();
    await p.click('#sidebar-toggle'); await p.waitForTimeout(500);
    if (!(w0 > 200 && w1 < 100 && w2 < 100)) throw new Error(`anchos ${w0}/${w1}/${w2}`);
  });
  console.log(res.join('\n')); console.log('errores de página (pageerror):', pageErrors.length, pageErrors.slice(0, 2));
  await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
