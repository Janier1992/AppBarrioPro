// ======================================================
// Archivo: marketing/grabar-escenas.cjs
// Responsabilidad: Grabar, en ALTA RESOLUCIÓN (1080x1920, 9:16), una escena de la app real por cada
//   línea de marketing/narracion.json. Las escenas se componen después con componer-video.cjs
//   (voz, subtítulos y ritmo), así se puede cambiar la voz sin volver a grabar.
//
// Por qué "cámara lenta": capturar a 1080x1920 reales cuesta ~5 fotogramas por segundo en un
//   Chromium sin GPU. Se alargan 6 veces (K = 6) TODAS las esperas, la escritura y los toques del
//   guion, y los fotogramas se reproducen 6 veces más rápido: salen ~30 fps nítidos. Las animaciones
//   propias de la app (cambios de pantalla, desvanecidos) corren en tiempo real, así que en el video
//   se ven como cortes limpios. (Antes se capturaban 360x640 y se ampliaban: de ahí la imagen "empañada".)
//
// Datos: tienda FICTICIA ("Tienda La Esquina"), sembrada en localStorage. La respuesta del chat del
//   asistente es de EJEMPLO (se intercepta /api/chat). El resto es la app real.
//
// Uso (≈ 10–15 min):
//   VITE_INSFORGE_ANON_KEY="your-anon-key" PORT=3180 npm run dev
//   node marketing/grabar-escenas.cjs http://localhost:3180 marketing/escenas
// ======================================================
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { execFileSync } = require("node:child_process");

const BASE_URL = process.argv[2] || "http://localhost:3180";
const OUT_DIR = path.resolve(process.argv[3] || "marketing/escenas");
const FRAMES_DIR = fs.mkdtempSync(path.join(process.env.FRAMES_TMP || os.tmpdir(), "tiendly-frames-"));
const UID = "dev-user-id-01";
const K = Number(process.env.SLOWMO || 6); // factor de cámara lenta
const FPS = 30;
const VIEWPORT = { width: 360, height: 640 };
const SCALE = 3; // 360x640 CSS px x3 = 1080x1920 exactos
const BAND_PX = 104; // franja superior reservada (CSS px) donde se dibujan los subtítulos al componer

const NARRACION = JSON.parse(fs.readFileSync(path.join(__dirname, "narracion.json"), "utf-8"));

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

// ---------- Superposiciones dentro de la página: franja superior, toques y tarjetas ----------
const OVERLAY_JS = (bandPx) => {
  if (document.getElementById("__tap")) return;
  const style = document.createElement("style");
  style.textContent = `
    #root{padding-top:${bandPx}px;box-sizing:border-box}
    #checkout-panel{padding-top:${bandPx + 4}px !important}
    #__tap{position:fixed;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;z-index:99999;pointer-events:none;
      background:rgba(47,107,79,.28);border:3px solid #2F6B4F;opacity:0}
    #__tap.on{opacity:1}
    #__tap.press{transform:scale(.8);background:rgba(47,107,79,.5)}
    #__card{position:fixed;inset:0;z-index:100000;background:linear-gradient(160deg,#2F6B4F,#1F4D38);color:#fff;display:flex;flex-direction:column;align-items:center;
      justify-content:center;gap:18px;text-align:center;padding:${bandPx}px 28px 0;font-family:Inter,system-ui,sans-serif;opacity:0;pointer-events:none}
    #__card.on{opacity:1}
    #__card .logo{width:84px;height:84px;border-radius:24px;background:#fff;display:flex;align-items:center;justify-content:center}
    #__card h1{margin:0;font-size:46px;letter-spacing:-.03em}
    #__card p{margin:0;font-size:21px;line-height:1.35;max-width:290px;opacity:.95}
  `;
  document.head.appendChild(style);
  const tap = document.createElement("div"); tap.id = "__tap"; document.body.appendChild(tap);
  const card = document.createElement("div"); card.id = "__card"; document.body.appendChild(card);
};

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const seed = buildSeed();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, isMobile: true, hasTouch: true });

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

  // Respuesta de EJEMPLO del asistente; la pausa de "analizando" también va en cámara lenta.
  await ctx.route("**/api/chat", async (route) => {
    await new Promise((r) => setTimeout(r, 2200 * K));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: ASSISTANT_REPLY }) });
  });

  const page = await ctx.newPage();
  page.on("dialog", (d) => d.accept());
  const cdp = await ctx.newCDPSession(page);
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(OVERLAY_JS, BAND_PX);

  // ---------- Captura a 1080x1920 reales ----------
  const stamps = [];
  let running = true;
  const loop = (async () => {
    let i = 0;
    while (running) {
      const t = performance.now();
      // El "clip" va en coordenadas del DOCUMENTO: se sigue el viewport visible para que, aunque la
      // página esté desplazada, se capture exactamente lo que ve el usuario.
      const vv = (await cdp.send("Page.getLayoutMetrics")).cssVisualViewport;
      const clip = { x: vv.pageX, y: vv.pageY, width: VIEWPORT.width, height: VIEWPORT.height, scale: SCALE };
      const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 90, optimizeForSpeed: true, clip });
      fs.writeFileSync(path.join(FRAMES_DIR, `f${String(i).padStart(6, "0")}.jpg`), Buffer.from(shot.data, "base64"));
      stamps.push(t);
      i++;
    }
  })();

  // ---------- Ayudas de guion (todo el tiempo va multiplicado por K) ----------
  const wait = (ms) => page.waitForTimeout(ms * K);
  const marks = [];
  const scene = async (id, actions) => {
    const start = performance.now();
    await actions();
    marks.push({ id, start, end: performance.now() });
    console.log(`  escena ${id}: ${((performance.now() - start) / 1000 / K).toFixed(1)} s (reproducción)`);
  };
  const card = async (html, ms) => {
    await page.evaluate(({ h }) => {
      const c = document.getElementById("__card");
      c.innerHTML = h;
      c.classList.add("on");
    }, { h: html });
    await wait(ms);
  };
  const hideCard = async () => {
    await page.evaluate(() => document.getElementById("__card").classList.remove("on"));
    await wait(300);
  };
  const tap = async (target, { before = 350, after = 450 } = {}) => {
    const loc = typeof target === "string" ? page.locator(target).first() : target.first();
    await loc.scrollIntoViewIfNeeded();
    const box = await loc.boundingBox();
    // Anillo que aparece sobre el botón, "se presiona" y desaparece (todo con tiempos controlados).
    await page.evaluate(({ x, y }) => {
      const t = document.getElementById("__tap");
      t.style.left = x + "px"; t.style.top = y + "px";
      t.classList.remove("press"); t.classList.add("on");
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    await wait(before);
    await page.evaluate(() => document.getElementById("__tap").classList.add("press"));
    await wait(160);
    await loc.click();
    await page.evaluate(() => document.getElementById("__tap").classList.remove("on", "press"));
    await wait(after);
  };
  const typeSlow = async (loc, text, delay = 85) => {
    await loc.click();
    await loc.pressSequentially(text, { delay: delay * K });
  };
  const scroll = async (dy) => {
    const steps = 12;
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await wait(35); }
  };
  const tile = (name) => page.locator("#sales-layout button").filter({ hasText: name });
  const LOGO = `<div class="logo"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#2F6B4F" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg></div>`;

  // ---------- Escenas (una por cada línea de narracion.json) ----------
  await scene("01-intro", async () => {
    await card(`${LOGO}<h1>Tiendly</h1><p>El sistema más simple para tu negocio de barrio</p>`, 3000);
    // La tarjeta se queda puesta: así, al alargar la escena para ajustarla a la voz, se ve la tarjeta y no la app.
  });

  await scene("02-hoy", async () => { await hideCard(); await wait(4200); });

  await scene("03-para-hoy", async () => {
    await scroll(250);
    await wait(2800);
    await scroll(-250);
    await wait(600);
  });

  await scene("04-vender", async () => {
    await tap("#mobile-nav-sales");
    await tap(tile("Arroz 1 kg"), { before: 300, after: 450 });
    await tap(tile("Leche entera"), { before: 250, after: 450 });
    await tap(tile("Pan tajado"), { before: 250, after: 700 });
  });

  await scene("05-cobrar", async () => {
    await tap("#checkout-bar");
    await wait(1000);
    await tap(page.getByRole("button", { name: "Efectivo", exact: true }), { before: 500 });
    await wait(600);
    await tap(page.getByRole("button", { name: /^Cobrar \$/ }), { before: 500, after: 2000 });
  });

  await scene("06-se-acaban", async () => {
    await tap(page.getByRole("button", { name: "Volver a Hoy" }), { before: 250 });
    await tap("#mobile-nav-inventory");
    await wait(700);
    await tap(page.getByRole("button", { name: /Se acaban/ }), { before: 450 });
    await wait(1800);
  });

  await scene("07-reponer", async () => {
    await tap(page.getByRole("button", { name: /Reponer Arroz/ }), { before: 450 });
    await wait(600);
    const stockInput = page.locator("label:has-text('Stock Actual') + input").first();
    await stockInput.click();
    await stockInput.press("Control+A"); // seleccionar todo: el campo numérico no admite "vaciar" sin dejar un 0
    await stockInput.pressSequentially("40", { delay: 140 * K });
    await wait(700);
    await tap(page.getByRole("button", { name: "Guardar Cambios" }), { before: 400, after: 1600 });
  });

  await scene("08-fiado", async () => {
    await tap("#mobile-nav-sales");
    await tap(tile("Huevos"), { before: 250, after: 400 });
    await tap(tile("Gaseosa"), { before: 250, after: 600 });
    await tap("#checkout-bar");
    await wait(800);
    await tap(page.getByRole("button", { name: "Fiado", exact: true }), { before: 450 });
    await typeSlow(page.locator("#pos-client"), "Don Luis", 110);
    await wait(500);
    await page.locator("#pos-due").fill(new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10));
    await wait(900);
  });

  await scene("09-fiados", async () => {
    await tap(page.getByRole("button", { name: /^Cobrar \$/ }), { before: 450, after: 1400 });
    await tap(page.getByRole("button", { name: "Volver a Hoy" }), { before: 200 });
    await tap("#mobile-nav-debts");
    await wait(3200);
  });

  await scene("10-tarea", async () => {
    await tap("#mobile-nav-more");
    await tap("#more-menu-checklist");
    await typeSlow(page.getByPlaceholder(/^Ej:/), "Pedir pan para mañana", 75);
    await wait(500);
    await tap(page.getByRole("button", { name: "Añadir Tarea" }), { before: 400, after: 1400 });
  });

  await scene("11-tachar", async () => {
    await tap(page.locator("#checklist-grid button").first(), { before: 500, after: 2200 });
  });

  await scene("12-asistente", async () => {
    await tap("#mobile-nav-more");
    await tap("#more-menu-assistant", { before: 350 });
    await wait(1800);
  });

  await scene("13-pregunta", async () => {
    await tap(page.getByRole("button", { name: /productos debo reponer/i }), { before: 550, after: 600 });
    await wait(6200);
  });

  await scene("14-cierre", async () => {
    await card(`${LOGO}<h1>Tiendly</h1><p>Vende, repón y cobra sin complicarte</p><p style="font-size:18px;opacity:.85">Funciona en tu celular o computador</p>`, 3200);
  });

  running = false;
  await loop;
  await browser.close();

  // ---------- Cortar cada escena desde los fotogramas y codificarla ----------
  const files = fs.readdirSync(FRAMES_DIR).filter((f) => f.endsWith(".jpg")).sort();
  const info = [];
  for (const m of marks) {
    const idx = files.map((_, i) => i).filter((i) => stamps[i] >= m.start && stamps[i] < m.end);
    if (!idx.length) continue;
    const lines = [];
    idx.forEach((i, n) => {
      const nextT = n < idx.length - 1 ? stamps[idx[n + 1]] : m.end;
      const dur = Math.max((nextT - stamps[i]) / 1000 / K, 0.005); // cámara lenta -> tiempo real de reproducción
      lines.push(`file '${path.join(FRAMES_DIR, files[i])}'`, `duration ${dur.toFixed(5)}`);
    });
    lines.push(`file '${path.join(FRAMES_DIR, files[idx[idx.length - 1]])}'`);
    const list = path.join(FRAMES_DIR, `${m.id}.txt`);
    fs.writeFileSync(list, lines.join("\n"));
    const out = path.join(OUT_DIR, `${m.id}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
      "-vf", `fps=${FPS},scale=1080:1920:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "fast", "-crf", "14", out], { stdio: "inherit" });
    const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString().trim());
    info.push({ id: m.id, duracion: Number(dur.toFixed(3)), fotogramas: idx.length });
  }
  fs.writeFileSync(path.join(OUT_DIR, "escenas.json"), JSON.stringify({ bandaCssPx: BAND_PX, escenas: info }, null, 2));
  console.log(`Listo: ${info.length} escenas en ${OUT_DIR} (${info.reduce((s, e) => s + e.duracion, 0).toFixed(1)} s en total)`);
  if (!process.env.KEEP_FRAMES) fs.rmSync(FRAMES_DIR, { recursive: true, force: true });
})().catch((error) => {
  console.error("Falló la grabación:", error);
  process.exit(1);
});
