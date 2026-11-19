// ======================================================
// Archivo: marketing/record-demo.cjs
// Responsabilidad: Grabar un video vertical (9:16, 1080x1920) del funcionamiento real de Tiendly
//   para Instagram Reels, TikTok y Facebook Reels: Hoy, vender, reponer, fiado, tarea y asistente.
// Cómo funciona: abre la app en un celular simulado (390x693 CSS px a escala 2,77 = 1080x1919),
//   captura fotogramas por CDP (~35 fps), superpone subtítulos y "toques" dentro de la página y
//   los une con ffmpeg (H.264).
// Datos: una tienda FICTICIA ("Tienda La Esquina") sembrada en localStorage; no toca datos reales.
// Asistente: la respuesta del chat es una respuesta de EJEMPLO (se intercepta /api/chat) para no
//   depender de una clave de Gemini; el resto del video es la app real.
//
// Requisitos: la app corriendo en modo demostración (sin InsForge) y ffmpeg instalado:
//   VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev
//   node marketing/record-demo.cjs http://localhost:3180 marketing/out
// ======================================================
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const BASE_URL = process.argv[2] || "http://localhost:3180";
const OUT_DIR = path.resolve(process.argv[3] || "marketing/out");
const FRAMES_DIR = fs.mkdtempSync(path.join(process.env.FRAMES_TMP || os.tmpdir(), "tiendly-frames-"));
const UID = "dev-user-id-01";

// ---------- Datos de ejemplo (tienda ficticia) ----------
function buildSeed() {
  const now = new Date();
  const iso = (daysAgo, hour, minute) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const ymd = (daysAhead) => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  };
  const defs = [
    ["Arroz 1 kg", "Abarrotes", 3800, 3, 10],
    ["Aceite 900 ml", "Abarrotes", 9500, 2, 8],
    ["Leche entera 1 L", "Lácteos", 4200, 18, 12],
    ["Huevos x 12", "Lácteos", 11000, 9, 6],
    ["Pan tajado", "Abarrotes", 5100, 12, 6],
    ["Gaseosa 1,5 L", "Bebidas", 5900, 24, 12],
    ["Azúcar 1 kg", "Abarrotes", 3600, 3, 10],
    ["Jabón de baño", "Aseo", 2400, 31, 10],
    ["Café molido 250 g", "Abarrotes", 7800, 14, 6],
    ["Papel higiénico x4", "Aseo", 6500, 20, 8],
    ["Panela 500 g", "Abarrotes", 3200, 4, 10],
    ["Detergente 500 g", "Aseo", 5400, 11, 6],
  ];
  const products = defs.map(([name, category, price, stock, minStock], i) => ({
    id: `p${i + 1}`, name, sku: `TIE-${100 + i}`, category, stock, minStock, price,
    cost: Math.round(price * 0.7), updatedAt: iso(1, 9, 0),
  }));
  const perDay = [8, 5, 6, 5, 7, 6, 5]; // hoy (0) ... hace 6 días (hoy supera a ayer)
  const sales = [];
  perDay.forEach((count, daysAgo) => {
    for (let k = 0; k < count; k++) {
      const a = products[(daysAgo * 3 + k * 2) % products.length];
      const b = products[(daysAgo * 5 + k * 3 + 1) % products.length];
      const items = [
        { productId: a.id, name: a.name, quantity: 1 + (k % 2), price: a.price },
        { productId: b.id, name: b.name, quantity: 1, price: b.price },
      ];
      sales.push({
        id: `s${daysAgo}_${k}`, items, timestamp: iso(daysAgo, 8 + k, (k * 11) % 60), paymentMethod: "Efectivo",
        clientName: "Consumidor Final", total: items.reduce((t, it) => t + it.price * it.quantity, 0),
      });
    }
  });
  const debts = [
    { id: "d1", clientName: "Doña Marta", amount: 42000, dueDate: ymd(-7), paid: false, createdAt: iso(10, 10, 0) },
    { id: "d2", clientName: "Panadería La Esquina", amount: 65200, dueDate: ymd(5), paid: false, createdAt: iso(4, 10, 0) },
    { id: "d3", clientName: "Carlos Pérez", amount: 18500, dueDate: ymd(12), paid: false, createdAt: iso(2, 10, 0) },
  ];
  const tasks = [
    { id: "t1", text: "Reponer bebidas y neveras", completed: false, createdAt: iso(1, 8, 0) },
    { id: "t2", text: "Revisar productos próximos a vencer", completed: false, createdAt: iso(1, 8, 5) },
    { id: "t3", text: "Cuadrar la caja al cierre", completed: false, createdAt: iso(1, 8, 10) },
    { id: "t4", text: "Abrir caja y contar el efectivo", completed: true, completedAt: iso(0, 7, 30), createdAt: iso(1, 8, 15) },
  ];
  const profile = {
    id: `prof_${UID}`, userId: UID, businessName: "Tienda La Esquina", address: "Calle 10 # 5-20", phone: "", email: "",
    hours: "07:00 - 21:00", lowStockThreshold: 5, securityPin: "", theme: "light", hasCompletedOnboarding: true,
    updatedAt: iso(0, 7, 0),
  };
  return { products, sales, debts, tasks, profile };
}

const ASSISTANT_REPLY =
  "Te recomiendo reponer hoy:\n\n" +
  "- **Arroz 1 kg**: quedan 3 (mínimo 10)\n" +
  "- **Aceite 900 ml**: quedan 2 (mínimo 8)\n" +
  "- **Azúcar 1 kg**: quedan 3 (mínimo 10)\n\n" +
  "¿Quieres que te arme la lista del pedido?";

// ---------- Superposiciones (subtítulos, toques y tarjetas) dentro de la página ----------
const OVERLAY_JS = () => {
  if (document.getElementById("__cap")) return;
  const style = document.createElement("style");
  style.textContent = `
    #root{padding-top:96px;box-sizing:border-box}
    #checkout-panel{padding-top:100px !important}
    #__cap{position:fixed;left:16px;right:16px;top:14px;z-index:99998;display:flex;justify-content:center;pointer-events:none;
      opacity:0;transform:translateY(-8px);transition:opacity .25s,transform .25s}
    #__cap.on{opacity:1;transform:none}
    #__cap span{background:rgba(17,17,16,.92);color:#fff;font:700 21px/1.25 Inter,system-ui,sans-serif;padding:12px 18px;border-radius:16px;text-align:center;
      letter-spacing:-.01em;box-shadow:0 6px 24px rgba(0,0,0,.25)}
    #__tap{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;z-index:99999;pointer-events:none;
      background:rgba(47,107,79,.28);border:3px solid #2F6B4F;opacity:0}
    #__tap.go{animation:__tap .5s ease-out}
    @keyframes __tap{0%{opacity:1;transform:scale(.6)}70%{opacity:.9;transform:scale(1.15)}100%{opacity:0;transform:scale(1.5)}}
    #__card{position:fixed;inset:0;z-index:100000;background:linear-gradient(160deg,#2F6B4F,#1F4D38);color:#fff;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:18px;text-align:center;padding:32px;font-family:Inter,system-ui,sans-serif;opacity:0;pointer-events:none;transition:opacity .35s}
    #__card.on{opacity:1}
    #__card .logo{width:84px;height:84px;border-radius:24px;background:#fff;display:flex;align-items:center;justify-content:center}
    #__card h1{margin:0;font-size:46px;letter-spacing:-.03em}
    #__card p{margin:0;font-size:22px;line-height:1.35;max-width:300px;opacity:.95}
  `;
  document.head.appendChild(style);
  const cap = document.createElement("div"); cap.id = "__cap"; cap.innerHTML = "<span></span>"; document.body.appendChild(cap);
  const tap = document.createElement("div"); tap.id = "__tap"; document.body.appendChild(tap);
  const card = document.createElement("div"); card.id = "__card"; document.body.appendChild(card);
};

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seed = buildSeed();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 693 }, deviceScaleFactor: 1080 / 390, isMobile: true, hasTouch: true });

  await ctx.addInitScript(({ seed, uid }) => {
    if (localStorage.getItem("__seeded")) return;
    localStorage.setItem(`barriopro_products_${uid}`, JSON.stringify(seed.products));
    localStorage.setItem(`barriopro_sales_${uid}`, JSON.stringify(seed.sales));
    localStorage.setItem(`barriopro_debts_${uid}`, JSON.stringify(seed.debts));
    localStorage.setItem(`barriopro_tasks_${uid}`, JSON.stringify(seed.tasks));
    localStorage.setItem(`barriopro_profile_${uid}`, JSON.stringify(seed.profile));
    localStorage.setItem(`tiendly_business_type_${uid}`, "tienda");
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.setItem("barriopro_notif_prompt_dismissed", "true");
    localStorage.setItem("__seeded", "1");
  }, { seed, uid: UID });

  // Respuesta de ejemplo del asistente (con una pausa para que se vea "analizando").
  await ctx.route("**/api/chat", async (route) => {
    await new Promise((r) => setTimeout(r, 2200));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: ASSISTANT_REPLY }) });
  });

  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  const cdp = await ctx.newCDPSession(page);
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(OVERLAY_JS);

  // ---------- Captura ----------
  const stamps = [];
  let running = true;
  const loop = (async () => {
    let i = 0;
    while (running) {
      const t = performance.now();
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 82, optimizeForSpeed: true });
      fs.writeFileSync(path.join(FRAMES_DIR, `f${String(i).padStart(6, "0")}.jpg`), Buffer.from(shot.data, "base64"));
      stamps.push(t);
      i++;
    }
  })();

  // ---------- Ayudas de guion ----------
  const wait = (ms) => page.waitForTimeout(ms);
  const marks = [];
  const mark = (name) => marks.push({ name, t: performance.now() });
  const caption = async (text) => {
    await page.evaluate((t) => {
      const cap = document.getElementById("__cap");
      cap.querySelector("span").textContent = t;
      cap.classList.add("on");
    }, text);
  };
  const hideCaption = () => page.evaluate(() => document.getElementById("__cap").classList.remove("on"));
  const card = async (html, ms, { instant = false } = {}) => {
    await page.evaluate(({ h, instant }) => {
      const c = document.getElementById("__card");
      c.innerHTML = h;
      if (instant) { c.style.transition = "none"; c.classList.add("on"); void c.offsetWidth; c.style.transition = ""; }
      else c.classList.add("on");
    }, { h: html, instant });
    await wait(ms);
    await page.evaluate(() => document.getElementById("__card").classList.remove("on"));
    await wait(450);
  };
  const tap = async (target, { before = 350, after = 450 } = {}) => {
    const loc = typeof target === "string" ? page.locator(target).first() : target.first();
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    await page.evaluate(({ x, y }) => {
      const t = document.getElementById("__tap");
      t.style.left = x + "px"; t.style.top = y + "px";
      t.classList.remove("go"); void t.offsetWidth; t.classList.add("go");
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await wait(before);
    await loc.click();
    await wait(after);
  };
  const typeSlow = async (loc, text, delay = 85) => {
    await loc.click();
    await loc.pressSequentially(text, { delay });
  };
  const tile = (name) => page.locator("#sales-layout button").filter({ hasText: name });

  // ---------- Guion ----------
  const LOGO = `<div class="logo"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg></div>`;
  await card(`${LOGO}<h1>Tiendly</h1><p>El sistema más simple para tu negocio de barrio</p>`, 2800, { instant: true });

  // 1) Hoy
  mark("1-hoy");
  await caption("Mira cómo va tu día, de un vistazo");
  await wait(3200);
  await caption("Y lo que no debes olvidar: Para hoy");
  await page.mouse.wheel(0, 260);
  await wait(2600);
  await page.mouse.wheel(0, -260);
  await wait(500);

  // 2) Vender
  mark("2-vender");
  await caption("Vender son 3 toques");
  await tap("#mobile-nav-sales");
  await tap(tile("Arroz 1 kg"), { before: 300, after: 450 });
  await tap(tile("Leche entera"), { before: 250, after: 450 });
  await tap(tile("Pan tajado"), { before: 250, after: 600 });
  await caption("Toca Cobrar y elige cómo paga");
  await tap("#checkout-bar");
  await wait(900);
  await tap(page.getByRole("button", { name: "Efectivo", exact: true }), { before: 450 });
  await caption("Listo: el stock se descuenta solo");
  await tap(page.getByRole("button", { name: /^Cobrar \$/ }), { before: 450, after: 1800 });

  // 3) Reponer inventario
  mark("3-reponer");
  await hideCaption();
  await tap(page.getByRole("button", { name: "Volver a Hoy" }), { before: 250 });
  await caption("Sabe qué se te acaba");
  await tap("#mobile-nav-inventory");
  await wait(600);
  await tap(page.getByRole("button", { name: /Se acaban/ }), { before: 400 });
  await wait(1100);
  await caption("Repón en un toque");
  await tap(page.getByRole("button", { name: /Reponer Arroz/ }), { before: 450 });
  await wait(500);
  const stockInput = page.locator("label:has-text('Stock Actual') + input").first();
  await stockInput.click();
  await stockInput.fill("");
  await stockInput.pressSequentially("40", { delay: 140 });
  await wait(600);
  await tap(page.getByRole("button", { name: "Guardar Cambios" }), { before: 350, after: 1500 });

  // 4) Fiado
  mark("4-fiado");
  await caption("¿Fiaste? Anótalo y cobra a tiempo");
  await tap("#mobile-nav-sales");
  await tap(tile("Huevos"), { before: 250, after: 400 });
  await tap(tile("Gaseosa"), { before: 250, after: 600 });
  await tap("#checkout-bar");
  await wait(700);
  await tap(page.getByRole("button", { name: "Fiado", exact: true }), { before: 400 });
  await typeSlow(page.locator("#pos-client"), "Don Luis", 110);
  await wait(400);
  await page.locator("#pos-due").fill(new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
  await wait(700);
  await tap(page.getByRole("button", { name: /^Cobrar \$/ }), { before: 450, after: 1400 });
  await tap(page.getByRole("button", { name: "Volver a Hoy" }), { before: 200 });
  await tap("#mobile-nav-debts");
  await caption("Siempre sabes cuánto te deben");
  await wait(3000);

  // 5) Tarea
  mark("5-tarea");
  await caption("Anota tus pendientes");
  await tap("#mobile-nav-more");
  await tap("#more-menu-checklist");
  await typeSlow(page.getByPlaceholder(/^Ej:/), "Pedir pan para mañana", 70);
  await wait(400);
  await tap(page.getByRole("button", { name: "Añadir Tarea" }), { before: 350, after: 1100 });
  await caption("Y táchalos cuando termines");
  await tap(page.locator("#checklist-grid button").first(), { before: 450, after: 1800 });

  // 6) Asistente
  mark("6-asistente");
  await caption("Pregúntale a tu asistente");
  await tap("#mobile-nav-more");
  await tap("#more-menu-assistant", { before: 300 });
  await wait(900);
  await tap(page.getByRole("button", { name: /productos debo reponer/i }), { before: 500, after: 600 });
  await caption("Te responde con los datos de tu negocio");
  await wait(5200);
  await hideCaption();

  // 7) Cierre
  mark("7-cierre");
  await card(`${LOGO}<h1>Tiendly</h1><p>Vende, repón y cobra sin complicarte</p><p style="font-size:19px;opacity:.85">Funciona en tu celular o computador</p>`, 3200);

  running = false;
  await loop;
  await browser.close();

  // ---------- Unir los fotogramas con ffmpeg ----------
  const files = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".jpg")).sort();
  const lines = [];
  files.forEach((f, i) => {
    const dur = i < files.length - 1 ? Math.max((stamps[i + 1] - stamps[i]) / 1000, 0.01) : 0.1;
    lines.push(`file '${path.join(FRAMES_DIR, f)}'`, `duration ${dur.toFixed(4)}`);
  });
  lines.push(`file '${path.join(FRAMES_DIR, files[files.length - 1])}'`);
  const list = path.join(FRAMES_DIR, "list.txt");
  fs.writeFileSync(list, lines.join("\n"));
  const out = path.join(OUT_DIR, "tiendly-demo-9x16.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-vf", "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
    "-movflags", "+faststart", out], { stdio: "inherit" });
  // Clips cortos por función (Reels/TikTok de 8-20 s), cortados con las marcas de escena.
  const t0 = stamps[0];
  for (let i = 0; i < marks.length - 1; i++) {
    const start = Math.max((marks[i].t - t0) / 1000, 0);
    const end = (marks[i + 1].t - t0) / 1000;
    const clip = path.join(OUT_DIR, `tiendly-${marks[i].name}-9x16.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", start.toFixed(2), "-to", end.toFixed(2), "-i", out,
      "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-movflags", "+faststart", clip], { stdio: "inherit" });
    console.log(`  clip ${marks[i].name}: ${(end - start).toFixed(1)} s`);
  }
  const seconds = ((stamps[stamps.length - 1] - stamps[0]) / 1000).toFixed(1);
  console.log(`Listo: ${out} (${files.length} fotogramas, ${seconds} s)`);
  if (!process.env.KEEP_FRAMES) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
})().catch((error) => {
  console.error("Falló la grabación:", error);
  process.exit(1);
});
