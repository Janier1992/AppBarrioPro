// QA Tiendly — Control de suscripción en la app contra un InsForge SIMULADO (puerto 9999 interceptado por Playwright).
// Levantar la app con: VITE_INSFORGE_URL=http://localhost:9999 VITE_INSFORGE_ANON_KEY=ik_test_key PORT=3181 npm run dev
// Uso: node qa/e2e-suscripcion.cjs <carpeta de salida para capturas>
const { chromium } = require('playwright');
const UID = 'u-ana';
const sub = (o) => ({ userId: UID, state: 'trial', status: 'trial', hasAccess: true, daysLeft: 5, isAdmin: false, serverTime: new Date().toISOString(), trialEndsAt: new Date(Date.now() + 5 * 86400000).toISOString(), currentPeriodEnd: null, ...o });
(async () => {
  const b = await chromium.launch(); const res = []; const t = async (n, f) => { try { const r = await f(); res.push('PASS ' + n + (r ? ' → ' + r : '')); } catch (e) { res.push('FAIL ' + n + ' :: ' + e.message.split('\n')[0]); } };
  async function open(getSub, opts = {}) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    const state = { dataCalls: [], rpcFail: false, sub: getSub };
    const cors = { 'access-control-allow-origin': 'http://localhost:3181', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-credentials': 'true' };
    await p.route('http://localhost:9999/**', async (r) => {
      const url = r.request().url().replace('http://localhost:9999', ''); const m = r.request().method();
      if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
      const json = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', headers: cors, body: JSON.stringify(o) });
      if (url.startsWith('/api/auth/refresh')) return json({ accessToken: 'tok', user: { id: UID, email: 'ana@correo.com', user_metadata: { name: 'Ana' } } });
      if (url.startsWith('/api/database/rpc/ensure_subscription')) return state.rpcFail ? json({ message: 'boom' }, 500) : json(state.sub());
      if (/\/api\/database\/records\/(products|sales|tasks|debts)/.test(url)) { state.dataCalls.push(url); return json([]); }
      if (url.includes('/records/profile')) return json([{ id: 'prof', userId: UID, businessName: 'Tienda de Ana', hasCompletedOnboarding: true, theme: 'light', securityPin: '' }]);
      return json([]);
    });
    await p.addInitScript(([u, pre]) => { localStorage.setItem('barriopro_user', JSON.stringify(u)); localStorage.setItem('hasCompletedOnboarding', 'true'); if (pre) localStorage.setItem('tiendly_subscription_' + u.uid, JSON.stringify(pre)); }, [{ uid: UID, displayName: 'Ana', email: 'ana@correo.com' }, opts.cache || null]);
    await p.goto('http://localhost:3181/'); await p.waitForTimeout(2500);
    return { p, state, ctx };
  }
  let r;
  r = await open(() => sub({ daysLeft: 5 }));
  await t('prueba con 5 días: entra a la app y muestra el aviso', async () => { if (await r.p.locator('#paywall-screen').count()) throw new Error('bloqueó'); const bn = await r.p.locator('#subscription-banner').innerText(); if (!/5 días de prueba/.test(bn)) throw new Error(bn); });
  await r.ctx.close();
  r = await open(() => sub({ daysLeft: 1 }));
  await t('prueba con 1 día: aviso de urgencia', async () => { const bn = await r.p.locator('#subscription-banner').innerText(); if (!/queda 1 día/.test(bn)) throw new Error(bn); });
  await r.ctx.close();
  r = await open(() => sub({ state: 'active', status: 'active', daysLeft: 20, currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString() }));
  await t('suscripción activa (20 días): sin aviso', async () => { if (await r.p.locator('#paywall-screen').count()) throw new Error('bloqueó'); if (await r.p.locator('#subscription-banner').count()) throw new Error('muestra aviso'); });
  await r.ctx.close();
  r = await open(() => sub({ state: 'active', status: 'active', daysLeft: 3, currentPeriodEnd: new Date(Date.now() + 3 * 86400000).toISOString() }));
  await t('suscripción por vencer (3 días): aviso de renovar', async () => { const bn = await r.p.locator('#subscription-banner').innerText(); if (!/vence en 3 días/.test(bn) || !/Renovar/.test(bn)) throw new Error(bn); });
  await r.ctx.close();
  for (const [state, expect, label] of [['trial_expired', /Terminó tu prueba gratis/, 'prueba terminada'], ['past_due', /Tu suscripción venció/, 'mes vencido sin pago'], ['suspended', /cuenta está suspendida/, 'cuenta suspendida'], ['cancelled', /fue cancelada/, 'cancelada']]) {
    r = await open(() => sub({ state, hasAccess: false, daysLeft: 0, status: state === 'trial_expired' ? 'trial' : state, trialEndsAt: new Date(Date.now() - 86400000).toISOString(), currentPeriodEnd: new Date(Date.now() - 86400000).toISOString() }));
    await t(`${label}: se muestra la pantalla de suscripción y NO se pide ningún dato del negocio`, async () => {
      const txt = await r.p.locator('#paywall-screen').innerText(); if (!expect.test(txt)) throw new Error(txt.slice(0, 80));
      if (!/\$\s?29\.900/.test(txt)) throw new Error('sin precio');
      if (r.state.dataCalls.length) throw new Error('pidió datos: ' + r.state.dataCalls[0]);
      if (await r.p.locator('#desktop-sidebar').count()) throw new Error('se ve el menú de la app');
    });
    if (state === 'trial_expired') {
      await t('el botón de WhatsApp lleva al número de ventas con el mensaje', async () => { const href = await r.p.locator('#paywall-whatsapp').getAttribute('href'); if (!href.startsWith('https://wa.me/573044769592?text=')) throw new Error(href); });
      await t('"Ya pagué, verificar" abre la app en cuanto el servidor dice que hay acceso', async () => {
        r.state.sub = () => sub({ state: 'active', status: 'active', daysLeft: 30, currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString() });
        await r.p.click('#paywall-refresh'); await r.p.waitForTimeout(2500); if (await r.p.locator('#paywall-screen').count()) throw new Error('sigue bloqueada'); if (!(await r.p.locator('#desktop-sidebar').count())) throw new Error('no cargó la app');
      });
      await t('si vence con la app abierta, aparece la pantalla al volver a la ventana', async () => {
        r.state.sub = () => sub({ state: 'past_due', hasAccess: false, daysLeft: 0, status: 'active', currentPeriodEnd: new Date(Date.now() - 1000).toISOString() });
        await r.p.evaluate(() => window.dispatchEvent(new Event('focus'))); await r.p.waitForTimeout(2000); if (!(await r.p.locator('#paywall-screen').count())) throw new Error('no apareció');
      });
    }
    await r.ctx.close();
  }
  // sin conexión
  r = await open(() => sub({}), { cache: sub({ daysLeft: 3, trialEndsAt: new Date(Date.now() + 3 * 86400000).toISOString() }) });
  r.state.rpcFail = false; await r.ctx.close();
  const offline = async (cache) => { const x = await open(() => sub({}), { cache }); return x; };
  { const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    const cors = { 'access-control-allow-origin': 'http://localhost:3181', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-credentials': 'true' };
    await p.route('http://localhost:9999/**', async (rt) => { const url = rt.request().url(); const j = (o, s = 200) => rt.fulfill({ status: s, contentType: 'application/json', headers: cors, body: JSON.stringify(o) });
      if (rt.request().method() === 'OPTIONS') return rt.fulfill({ status: 204, headers: cors });
      if (url.includes('/auth/refresh')) return j({ accessToken: 't', user: { id: UID, email: 'ana@correo.com' } }); if (url.includes('ensure_subscription')) return rt.abort('failed'); return j([]); });
    const cacheOk = sub({ daysLeft: 3 }); const cacheOld = sub({ daysLeft: 3, trialEndsAt: new Date(Date.now() - 1000).toISOString() });
    await p.addInitScript(([u, c]) => { localStorage.setItem('barriopro_user', JSON.stringify(u)); localStorage.setItem('tiendly_subscription_' + u.uid, JSON.stringify(c)); }, [{ uid: UID, displayName: 'Ana', email: 'ana@correo.com' }, cacheOk]);
    await p.goto('http://localhost:3181/'); await p.waitForTimeout(2500);
    await t('sin conexión y con prueba vigente guardada: la app sigue funcionando', async () => { if (await p.locator('#paywall-screen').count()) throw new Error('bloqueó'); });
    const p2 = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p2.setDefaultTimeout(8000);
    await p2.route('http://localhost:9999/**', async (rt) => { const url = rt.request().url(); const j = (o) => rt.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(o) });
      if (rt.request().method() === 'OPTIONS') return rt.fulfill({ status: 204, headers: cors }); if (url.includes('/auth/refresh')) return j({ accessToken: 't', user: { id: UID, email: 'ana@correo.com' } }); if (url.includes('ensure_subscription')) return rt.abort('failed'); return j([]); });
    await p2.addInitScript(([u, c]) => { localStorage.setItem('barriopro_user', JSON.stringify(u)); localStorage.setItem('tiendly_subscription_' + u.uid, JSON.stringify(c)); }, [{ uid: UID, displayName: 'Ana', email: 'ana@correo.com' }, cacheOld]);
    await p2.goto('http://localhost:3181/'); await p2.waitForTimeout(2500);
    await t('sin conexión y con la fecha guardada ya vencida: se bloquea (no se estira la prueba apagando internet)', async () => { if (!(await p2.locator('#paywall-screen').count())) throw new Error('no bloqueó'); });
    await p2.screenshot({ path: process.argv[2] + '/paywall.png' });
    await ctx.close(); }
  console.log(res.join('\n')); await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
