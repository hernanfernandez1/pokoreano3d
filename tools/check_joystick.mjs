// Comprueba el joystick táctil emulando un móvil: que aparezca solo en
// pantallas de dedo, que mueva al personaje en las cuatro direcciones y que
// al soltar se pare. Uso: node tools/check_joystick.mjs
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8121, r));

const checks = [];
const check = (name, ok, extra) => checks.push((ok ? "OK   " : "FALLA") + "  " + name + (extra ? "  " + extra : ""));
const browser = await puppeteer.launch({ headless: "new" });
const errors = [];

// --- escritorio: no debe salir el joystick, y no quedan flechas ---
{
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  page.on("dialog", d => d.accept());
  page.on("pageerror", e => errors.push("escritorio: " + e.message));
  await page.goto("http://localhost:8121/index.html", { waitUntil: "load" });
  await page.click('[data-action="new-game"]');
  await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });
  const r = await page.evaluate(() => ({
    joyOculto: document.getElementById("joystick").hidden,
    flechasRestantes: document.querySelectorAll("[data-pad], .dpad").length,
  }));
  check("escritorio: joystick oculto", r.joyOculto);
  check("no quedan flechas en pantalla", r.flechasRestantes === 0, `encontradas ${r.flechasRestantes}`);
  await page.close();
}

// --- que quepa entero en pantallas de todos los tamaños ---
{
  const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";
  const sizes = [
    ["móvil pequeño",   320, 568],
    ["móvil estándar",  390, 844],
    ["móvil grande",    430, 932],
    ["móvil apaisado",  844, 390],
    ["tablet",          820, 1180],
    ["tablet apaisada",1180,  820],
  ];
  for (const [nombre, w, h] of sizes){
    const page = await browser.newPage();
    await page.emulate({ name: nombre, userAgent: UA,
      viewport: { width: w, height: h, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });
    page.on("dialog", d => d.accept());
    page.on("pageerror", e => errors.push(nombre + ": " + e.message));
    await page.goto("http://localhost:8121/index.html", { waitUntil: "load" });
    await page.click('[data-action="new-game"]');
    await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });
    const r = await page.evaluate(() => {
      const b = document.getElementById("joystick").getBoundingClientRect();
      return { left:b.left, top:b.top, right:b.right, bottom:b.bottom, w:b.width, h:b.height,
        vw: window.innerWidth, vh: window.innerHeight };
    });
    const dentro = r.left >= 0 && r.top >= 0 && r.right <= r.vw + 0.5 && r.bottom <= r.vh + 0.5;
    const derecha = r.left > r.vw/2;   // debe quedar en la mitad derecha
    const usable = r.w >= 90;          // y con tamaño suficiente para el pulgar
    check(`${nombre} (${w}x${h}): entero en pantalla`, dentro,
      `caja ${r.left.toFixed(0)},${r.top.toFixed(0)}→${r.right.toFixed(0)},${r.bottom.toFixed(0)} en ${r.vw}x${r.vh}`);
    check(`${nombre}: a la derecha`, derecha);
    check(`${nombre}: tamaño usable`, usable, `${r.w.toFixed(0)}px`);
    if (nombre === "móvil estándar")
      await page.screenshot({ path: path.join(root, "test-shots/joystick_movil.png") });
    await page.close();
  }
}

// --- móvil: joystick visible y funcional ---
{
  const page = await browser.newPage();
  await page.emulate({
    name: "movil",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    viewport: { width: 414, height: 896, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  });
  page.on("dialog", d => d.accept());
  page.on("pageerror", e => errors.push("movil: " + e.message));
  await page.goto("http://localhost:8121/index.html", { waitUntil: "load" });
  await page.click('[data-action="new-game"]');
  await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

  const box = await page.evaluate(() => {
    const j = document.getElementById("joystick");
    const r = j.getBoundingClientRect();
    return { hidden: j.hidden, cx: r.left + r.width/2, cy: r.top + r.height/2, r: r.width/2 };
  });
  check("móvil: joystick visible", !box.hidden);

  // arrastrar el joystick en una dirección y mirar si el personaje avanza
  const drag = async (dx, dy, ms = 600) => {
    const from = await page.evaluate(() => { const d = World.regionInfo().player; return [d.x, d.y]; });
    await page.touchscreen.touchStart(box.cx, box.cy);
    await page.touchscreen.touchMove(box.cx + dx*box.r*0.85, box.cy + dy*box.r*0.85);
    await new Promise(r => setTimeout(r, ms));
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 250));
    const to = await page.evaluate(() => { const d = World.regionInfo().player; return [d.x, d.y]; });
    return { from, to };
  };

  // se busca un hueco despejado para no chocar con una casa
  await page.evaluate(() => { World.debugZone(1,1); World.tp(20, 16); });
  const abajo = await drag(0, 1);
  check("arrastre abajo mueve", abajo.to[1] > abajo.from[1], JSON.stringify(abajo));
  const arriba = await drag(0, -1);
  check("arrastre arriba mueve", arriba.to[1] < arriba.from[1], JSON.stringify(arriba));
  const der = await drag(1, 0);
  check("arrastre derecha mueve", der.to[0] > der.from[0], JSON.stringify(der));
  const izq = await drag(-1, 0);
  check("arrastre izquierda mueve", izq.to[0] < izq.from[0], JSON.stringify(izq));

  // al soltar tiene que quedarse quieto
  const antes = await page.evaluate(() => { const d = World.regionInfo().player; return [d.x, d.y]; });
  await new Promise(r => setTimeout(r, 900));
  const despues = await page.evaluate(() => { const d = World.regionInfo().player; return [d.x, d.y]; });
  check("al soltar se detiene", antes[0] === despues[0] && antes[1] === despues[1], JSON.stringify([antes, despues]));

  // el centro (zona muerta) no debe mover
  const quieto = await page.evaluate(() => { const d = World.regionInfo().player; return [d.x, d.y]; });
  await page.touchscreen.touchStart(box.cx, box.cy);
  await new Promise(r => setTimeout(r, 700));
  await page.touchscreen.touchEnd();
  const trasCentro = await page.evaluate(() => { const d = World.regionInfo().player; return [d.x, d.y]; });
  check("zona muerta no mueve", quieto[0] === trasCentro[0] && quieto[1] === trasCentro[1]);

  await page.screenshot({ path: path.join(root, "test-shots/joystick_movil.png") });
  await page.close();
}

console.log(checks.join("\n"));
console.log("errores de consola:", errors.length ? errors : "ninguno");
await browser.close();
server.close();
process.exit(checks.some(c => c.startsWith("FALLA")) || errors.length ? 1 : 0);
