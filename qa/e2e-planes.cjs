// QA Tiendly — Página pública /planes (personalización, precio, prueba gratis, WhatsApp, video, XSS, accesibilidad).
// Requiere la app en modo demo en el puerto 3180. Uso: node qa/e2e-planes.cjs <carpeta con node_modules/axe-core> (ver qa/README.md).
const { chromium } = require('playwright'); const fs = require('fs');
const AXE = fs.readFileSync(process.argv[2] + '/axe/node_modules/axe-core/axe.min.js', 'utf8');
(async () => {
  const b = await chromium.launch(); const res = []; const t = async (n, f) => { try { const r = await f(); res.push('PASS ' + n + (r ? ' → ' + r : '')); } catch (e) { res.push('FAIL ' + n + ' :: ' + e.message.split('\n')[0]); } };
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await c.newPage(); p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:3180/planes?n=Marta&negocio=Tienda%20La%20Esquina&fuente=radar'); await p.waitForTimeout(2000);
  await t('saluda con nombre y negocio', async () => { const h = await p.locator('h1').innerText(); if (!h.includes('Marta') || !h.includes('Tienda La Esquina')) throw new Error(h); return h.replace(/\n/g, ' '); });
  await t('muestra el precio $29.900 al mes', async () => { const x = await p.locator('#plan-card').innerText(); if (!/\$\s?29\.900/.test(x) || !/al mes/.test(x)) throw new Error(x.slice(0, 80)); });
  await t('botón WhatsApp con mensaje personalizado', async () => { const href = await p.locator('#plans-cta').getAttribute('href'); const txt = decodeURIComponent(href.split('text=')[1]); if (!href.startsWith('https://wa.me/573044769592?text=') || !txt.includes('Soy Marta de Tienda La Esquina') || !txt.includes('radar')) throw new Error(href); return txt; });
  await t('muestra la prueba gratis de 7 días y el botón de registro', async () => { const tr = await p.locator('#plans-trial').innerText(); const href = await p.locator('#plans-try').getAttribute('href'); if (!/7 días/.test(tr) || href !== '/?registro=1') throw new Error(tr + ' | ' + href); });
  await t('muestra el WhatsApp de ventas +57 304 476 9592', async () => { const x = await p.locator('#plans-cta').innerText(); if (!x.includes('+57 304 476 9592')) throw new Error(x); });
  await t('no abre sesión ni pide login', async () => { if (await p.locator('#login-container').count()) throw new Error('muestra login'); });
  await t('el video carga (metadatos y duración)', async () => { const d = await p.evaluate(() => new Promise(r => { const v = document.querySelector('video'); if (v.readyState >= 1) return r(v.duration); v.addEventListener('loadedmetadata', () => r(v.duration)); v.addEventListener('error', () => r(-1)); setTimeout(() => r(-2), 6000); })); if (!(d > 60)) throw new Error('duración ' + d); return d.toFixed(0) + ' s'; });
  await t('sin desbordamiento horizontal en celular', async () => { const o = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 1) throw new Error(o); });
  await p.screenshot({ path: process.argv[2] + '/planes-movil.png', fullPage: true });
  await t('accesibilidad axe WCAG A/AA', async () => { await p.evaluate(s => { const e = document.createElement('script'); e.textContent = s; document.head.appendChild(e); }, AXE); const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + '×' + x.nodes.length)); if (v.length) throw new Error(v.join(', ')); });
  // XSS por parámetros
  await p.evaluate(() => { window.__x = 0; });
  await p.goto('http://localhost:3180/planes?n=' + encodeURIComponent('<img src=x onerror="window.__x=1">Ana') + '&negocio=' + encodeURIComponent('<script>window.__x=1</script>Tienda')); await p.waitForTimeout(1500);
  await t('parámetros maliciosos no ejecutan código ni se muestran como HTML', async () => { if (await p.evaluate(() => window.__x)) throw new Error('XSS'); const h = await p.locator('h1').innerText(); if (/[<>]/.test(h)) throw new Error(h); return h.replace(/\n/g, ' '); });
  await p.goto('http://localhost:3180/planes'); await p.waitForTimeout(1500);
  await t('sin parámetros: saludo genérico', async () => { const h = await p.locator('h1').innerText(); if (!h.startsWith('Hola.')) throw new Error(h); });
  await t('barra final "/planes/" también funciona', async () => { await p.goto('http://localhost:3180/planes/'); await p.waitForTimeout(1200); if (!(await p.locator('#plans-page').count())) throw new Error('no cargó'); });
  await t('/?registro=1 abre la app directamente en "Crear Cuenta"', async () => { await p.addInitScript(() => localStorage.setItem('barriopro_explicit_signout', 'true')); await p.goto('http://localhost:3180/?registro=1'); await p.waitForSelector('#login-container'); const body = await p.locator('#login-container').innerText(); if (!/Nombre/i.test(body)) throw new Error('no está en modo registro: ' + body.slice(0, 120)); });
  await t('la app normal sigue funcionando en /', async () => { await p.goto('http://localhost:3180/'); await p.waitForTimeout(2500); if (await p.locator('#plans-page').count()) throw new Error('mostró planes'); });
  const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); await d.goto('http://localhost:3180/planes?n=Marta&negocio=La%20Esquina'); await d.waitForTimeout(1500); await d.screenshot({ path: process.argv[2] + '/planes-escritorio.png' });
  console.log(res.join('\n')); console.log('errores de página:', errs.length); await b.close();
})().catch(e => { console.log('ABORT', e.message); process.exit(1); });
