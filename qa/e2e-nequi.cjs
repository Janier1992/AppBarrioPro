// QA Tiendly — Sección de pago por Nequi en la pantalla de suscripción vencida (InsForge simulado).
// Levantar la app con: VITE_INSFORGE_URL=http://localhost:9999 VITE_INSFORGE_ANON_KEY=ik_test_key VITE_NEQUI_NUMBER=3001234567 PORT=3182 npm run dev
// Uso: node qa/e2e-nequi.cjs <carpeta con node_modules/axe-core> (ver qa/README.md).
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(process.argv[2] + '/axe/node_modules/axe-core/axe.min.js', 'utf8');
const UID = 'a1b2c3d4-0000-0000-0000-00000000aaaa';
(async () => {
  const b = await chromium.launch(); const res = []; const t = async (n, f) => { try { const r = await f(); res.push('PASS ' + n + (r ? ' → ' + r : '')); } catch (e) { res.push('FAIL ' + n + ' :: ' + e.message.split('\n')[0]); } };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['clipboard-read', 'clipboard-write'] }); const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const cors = { 'access-control-allow-origin': 'http://localhost:3182', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-credentials': 'true' };
  const expired = { userId: UID, state: 'trial_expired', status: 'trial', hasAccess: false, daysLeft: 0, isAdmin: false, trialEndsAt: new Date(Date.now() - 86400000).toISOString() };
  await p.route('http://localhost:9999/**', async (r) => { const url = r.request().url(); const j = (o) => r.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(o) });
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    if (url.includes('/auth/refresh')) return j({ accessToken: 't', user: { id: UID, email: 'ana@correo.com', user_metadata: { name: 'Tienda de Ana' } } });
    if (url.includes('ensure_subscription')) return j(expired); return j([]); });
  await p.addInitScript((u) => localStorage.setItem('barriopro_user', JSON.stringify(u)), { uid: UID, displayName: 'Tienda de Ana', email: 'ana@correo.com' });
  await p.goto('http://localhost:3182/'); await p.waitForSelector('#paywall-screen');
  await t('muestra el número de Nequi configurado', async () => { const n = await p.locator('#paywall-nequi-number').innerText(); if (n !== '300 123 4567') throw new Error(n); });
  await t('muestra la referencia única de la cuenta', async () => { const r = await p.locator('#paywall-reference').innerText(); if (r !== 'TDLY-A1B2C3') throw new Error(r); });
  await t('"Copiar" deja el número y la referencia en el portapapeles', async () => {
    await p.getByRole('button', { name: 'Copiar el número de Nequi' }).click(); let c = await p.evaluate(() => navigator.clipboard.readText()); if (c !== '3001234567') throw new Error('número: ' + c);
    await p.getByRole('button', { name: 'Copiar la referencia de pago' }).click(); c = await p.evaluate(() => navigator.clipboard.readText()); if (c !== 'TDLY-A1B2C3') throw new Error('ref: ' + c); });
  await t('"Ya pagué: enviar comprobante" abre WhatsApp con la referencia y el negocio', async () => { const href = await p.locator('#paywall-paid').getAttribute('href'); const m = decodeURIComponent(href.split('text=')[1]); if (!href.startsWith('https://wa.me/573044769592') || !m.includes('TDLY-A1B2C3') || !m.includes('Tienda de Ana') || !m.includes('$ 29.900')) throw new Error(m); return m; });
  await t('sin desbordamiento horizontal', async () => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 1) throw new Error(o); });
  await t('accesibilidad axe (WCAG A/AA)', async () => { await p.evaluate(s => { const e = document.createElement('script'); e.textContent = s; document.head.appendChild(e); }, AXE); const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + '×' + x.nodes.length)); if (v.length) throw new Error(v.join(', ')); });
  await p.screenshot({ path: process.argv[2] + '/paywall-nequi.png', fullPage: true });
  // /planes
  await p.goto('http://localhost:3182/planes'); await p.waitForTimeout(1500);
  await t('/planes indica que se paga por Nequi', async () => { const x = await p.locator('#plan-card').innerText(); if (!/por Nequi/.test(x)) throw new Error(x.slice(0, 120)); });
  console.log(res.join('\n')); await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
