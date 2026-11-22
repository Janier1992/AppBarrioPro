// QA Tiendly — Acceso de soporte: recuperar contraseña y reenviar confirmación (InsForge simulado, puerto 9999).
// Levantar la app con: VITE_INSFORGE_URL=http://localhost:9999 VITE_INSFORGE_ANON_KEY=ik_test_key PORT=3183 npm run dev
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(process.argv[2] + '/axe/node_modules/axe-core/axe.min.js', 'utf8');
(async () => {
  const b = await chromium.launch(); const res = []; const t = async (n, f) => { try { const r = await f(); res.push('PASS ' + n + (r ? ' → ' + r : '')); } catch (e) { res.push('FAIL ' + n + ' :: ' + e.message.split('\n')[0]); } };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.setDefaultTimeout(8000);
  const cors = { 'access-control-allow-origin': 'http://localhost:3183', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-credentials': 'true' };
  const calls = [];
  await p.route('http://localhost:9999/**', async (r) => { const url = r.request().url().replace('http://localhost:9999', ''); const m = r.request().method(); const j = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', headers: cors, body: JSON.stringify(o) });
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: cors }); calls.push(m + ' ' + url + ' ' + (r.request().postData() || ''));
    if (url.startsWith('/api/auth/sessions') && m === 'POST') return j({ error: 'EMAIL_NOT_VERIFIED', message: 'Email not confirmed', statusCode: 403 }, 403);
    if (url.startsWith('/api/auth/email/send-verification') || url.startsWith('/api/auth/email/send-reset-password')) return j({ success: true });
    if (url.startsWith('/api/auth/refresh')) return j({ error: 'no session' }, 401); return j([]); });
  await p.goto('http://localhost:3183/admin'); await p.waitForSelector('#admin-login');
  await t('el acceso de soporte tiene "¿Olvidaste tu contraseña?"', async () => { if (!(await p.locator('#admin-forgot-link').count())) throw new Error('falta'); });
  await t('correo sin confirmar: mensaje claro y botón para reenviar', async () => {
    await p.fill('#admin-email', 'synflow.ia@gmail.com'); await p.fill('#admin-password', 'x'); await p.click('#admin-login-submit'); await p.waitForSelector('#admin-resend');
    const e = await p.locator('#admin-error').innerText(); if (!/confirmar tu correo/.test(e)) throw new Error(e); });
  await t('"Reenviar correo de confirmación" llama al servicio con ese correo', async () => { await p.click('#admin-resend'); await p.waitForTimeout(700); if (!calls.some(c => c.includes('send-verification') && c.includes('synflow.ia@gmail.com'))) throw new Error(calls.join('|')); if (!/nuevo correo/.test(await p.locator('#admin-notice').innerText())) throw new Error('sin aviso'); });
  await t('"¿Olvidaste tu contraseña?" abre el flujo de recuperación y envía el código al correo', async () => {
    await p.click('#admin-forgot-link'); await p.waitForSelector('#admin-forgot'); const txt = await p.locator('#admin-forgot').innerText(); if (!/contraseña/i.test(txt)) throw new Error(txt.slice(0, 100));
    const input = p.locator('#admin-forgot input[type=email]'); if (await input.count()) { const v = await input.inputValue(); if (v !== 'synflow.ia@gmail.com') throw new Error('correo ' + v); }
    await p.locator('#admin-forgot button[type=submit]').first().click(); await p.waitForTimeout(800); if (!calls.some(c => c.includes('send-reset-password') && c.includes('synflow.ia@gmail.com'))) throw new Error(calls.join('|')); });
  await t('accesibilidad axe del acceso de soporte', async () => { await p.reload(); await p.waitForSelector('#admin-login'); await p.evaluate(s => { const e = document.createElement('script'); e.textContent = s; document.head.appendChild(e); }, AXE); const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + '×' + x.nodes.length)); if (v.length) throw new Error(v.join(',')); });
  console.log(res.join('\n')); await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
