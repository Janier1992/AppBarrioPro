// QA Tiendly — Botón "Reenviar correo de confirmación" en el inicio de sesión (InsForge simulado).
// Levantar la app con: VITE_INSFORGE_URL=http://localhost:9999 VITE_INSFORGE_ANON_KEY=ik_test_key PORT=3183 npm run dev
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const res = []; const t = async (n, f) => { try { const r = await f(); res.push('PASS ' + n + (r ? ' → ' + r : '')); } catch (e) { res.push('FAIL ' + n + ' :: ' + e.message.split('\n')[0]); } };
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); p.setDefaultTimeout(8000);
  const cors = { 'access-control-allow-origin': 'http://localhost:3183', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-credentials': 'true' };
  const calls = [];
  await p.route('http://localhost:9999/**', async (r) => { const url = r.request().url().replace('http://localhost:9999', ''); const m = r.request().method(); const j = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', headers: cors, body: JSON.stringify(o) });
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: cors });
    calls.push(m + ' ' + url + ' ' + (r.request().postData() || ''));
    if (url.startsWith('/api/auth/sessions') && m === 'POST') return j({ error: 'EMAIL_NOT_VERIFIED', message: 'Email not confirmed', statusCode: 403 }, 403);
    if (url.startsWith('/api/auth/email/send-verification')) return j({ success: true });
    if (url.startsWith('/api/auth/refresh')) return j({ error: 'no session' }, 401);
    return j([]); });
  await p.goto('http://localhost:3183/'); await p.waitForSelector('#login-container');
  await t('al iniciar con un correo sin confirmar se muestra el mensaje y el botón de reenvío', async () => {
    await p.fill('input[type=email]', 'synflow.ia@gmail.com'); await p.fill('input[type=password]', 'ClaveLarga123'); await p.getByRole('button', { name: /^Ingresar/ }).click();
    await p.waitForSelector('#resend-verification'); const txt = await p.locator('#login-container').innerText(); if (!/confirmar tu correo/.test(txt)) throw new Error(txt.slice(0, 200)); });
  await t('el botón reenvía el correo de confirmación a ese correo y avisa', async () => {
    await p.click('#resend-verification'); await p.waitForTimeout(800);
    const call = calls.find(c => c.includes('send-verification')); if (!call || !call.includes('synflow.ia@gmail.com')) throw new Error('llamadas: ' + calls.join(' | '));
    const txt = await p.locator('#login-container').innerText(); if (!/nuevo correo de confirmación/.test(txt)) throw new Error(txt.slice(0, 200)); });
  console.log(res.join('\n')); console.log(calls.filter(c => c.includes('send-verification') || c.includes('sessions')).join('\n')); await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
