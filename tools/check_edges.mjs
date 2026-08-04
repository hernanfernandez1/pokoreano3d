// Verifica: icono de gimnasio en el minimapa + arboleda exterior en los bordes.
// Se para en Pueblo Dongsa (2,1) junto al puente del río, la vista del usuario.
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
await new Promise(r => server.listen(8116, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
let errors = 0;
page.on("console", m => { if (m.type() === "error"){ errors++; console.log("[console.error]", m.text()); } });
page.on("pageerror", e => { errors++; console.log("[pageerror]", e.message); });
const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto("http://localhost:8116/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

// la vista de la captura del usuario: puente del río al oeste de Dongsa
await page.evaluate(() => { World.debugZone(2, 1); });
await wait(1500);
await page.evaluate(() => World.tp(6, 24));
await wait(1800);
await page.screenshot({ path: path.join(root, "test-shots/edge_forest.png") });
console.log("  → edge_forest.png (borde oeste, río)");

// minimapa con el icono de gimnasio
await page.screenshot({ path: path.join(root, "test-shots/minimap_gym.png"),
  clip: { x: 1060, y: 55, width: 220, height: 190 } });
console.log("  → minimap_gym.png");

console.log(errors ? `ERRORES DE CONSOLA: ${errors}` : "sin errores de consola");
await browser.close();
server.close();
process.exit(errors ? 1 : 0);
