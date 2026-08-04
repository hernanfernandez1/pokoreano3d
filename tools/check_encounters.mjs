// Encuentros por TERRENO: la hierba alta debe dar batallas aunque nadie haya
// sembrado meta de encuentro a mano en esa casilla (lugares nuevos y matas
// decorativas). Se prueba en Jondae (zona 2,2), donde NO hay ningún parche
// sembrado: si salta batalla ahí, es la reserva por terreno la que dispara.
// Uso: node tools/check_encounters.mjs
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
await new Promise(r => server.listen(8139, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));

await page.goto("http://localhost:8139/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });
await new Promise(r => setTimeout(r, 800));

const checks = [];
const check = (name, ok, extra) => checks.push((ok ? "OK   " : "FALLA") + "  " + name + (extra ? "  " + extra : ""));
const wait = ms => new Promise(r => setTimeout(r, ms));

// tallgrass del minimapa: #57a04b, 2 px por tile (MM_SCALE=2, ver world.js)
async function tallgrassTiles(){
  return page.evaluate(() => {
    const cv = document.getElementById("minimap-canvas");
    const x = cv.getContext("2d");
    const img = x.getImageData(0, 0, cv.width, cv.height).data;
    const out = [];
    for (let py = 0; py < cv.height; py += 2) for (let px = 0; px < cv.width; px += 2){
      const k = (py*cv.width + px) * 4;
      if (img[k] === 0x57 && img[k+1] === 0xa0 && img[k+2] === 0x4b) out.push([px/2, py/2]);
    }
    return out;
  });
}

// pisa una casilla de hierba alta con el azar forzado y mira si salta batalla
async function stepOnto([tx, ty]){
  await page.evaluate(() => { Math.random = () => 0.01; });
  for (const [dx, dy, key] of [[0,-1,"ArrowDown"],[0,1,"ArrowUp"],[-1,0,"ArrowRight"],[1,0,"ArrowLeft"]]){
    const ok = await page.evaluate((x, y) => World.tp(x, y), tx+dx, ty+dy);
    if (!ok) continue;
    await wait(150);
    await page.keyboard.down(key); await wait(120); await page.keyboard.up(key);
    await wait(700); // lo que tarda en llegar a la casilla
    const battle = await page.evaluate(() => !!document.querySelector("#screen-battle.active"));
    if (battle) return true;
  }
  return false;
}

// 1) zona SIN parches sembrados (Jondae, 2,2): solo la reserva puede disparar
await page.evaluate(() => World.debugZone(2, 2));
await wait(1200);
let tiles = await tallgrassTiles();
let fired = false, used = null;
for (const t of tiles.slice(0, 12)){
  if (await stepOnto(t)){ fired = true; used = t; break; }
  await page.evaluate(() => UI.showScreen("screen-map"));
  await wait(200);
}
check("hierba sin sembrar (Jondae) da batalla", fired,
  fired ? `tile ${used} de ${tiles.length} matas` : `matas encontradas: ${tiles.length}`);
await page.evaluate(() => UI.showScreen("screen-map"));

// 2) regresión: la hierba sembrada de la Ruta 1 (Hangul, 0,0) sigue igual
await page.evaluate(() => World.debugZone(0, 0));
await wait(1200);
tiles = await tallgrassTiles();
fired = false; used = null;
for (const t of tiles.slice(0, 15)){
  if (await stepOnto(t)){ fired = true; used = t; break; }
  await page.evaluate(() => UI.showScreen("screen-map"));
  await wait(200);
}
check("hierba sembrada (Ruta 1) sigue dando batalla", fired,
  fired ? `tile ${used}` : `matas encontradas: ${tiles.length}`);
await page.evaluate(() => UI.showScreen("screen-map"));

console.log(checks.join("\n"));
console.log("errores de consola:", errors.length ? errors : "ninguno");
await browser.close();
server.close();
process.exit(checks.some(c => c.startsWith("FALLA")) || errors.length ? 1 : 0);
