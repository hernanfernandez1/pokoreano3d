// Verifica la entrada de la Cueva Maestra (región 78,40 → zona 1,1 local 34,6):
// no debe haber árboles sobre la boca ni bloqueando el acceso.
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
await new Promise(r => server.listen(8115, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
let errors = 0;
page.on("console", m => { if (m.type() === "error"){ errors++; console.log("[console.error]", m.text()); } });
page.on("pageerror", e => { errors++; console.log("[pageerror]", e.message); });
const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto("http://localhost:8115/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

// zona (1,1), jugador 3 casillas al sur de la boca de la cueva
await page.evaluate(() => { World.debugZone(1, 1); });
await wait(1400);
const tp = await page.evaluate(() => World.tp(35, 9)); // local: boca en (34..37, 6..7)
console.log("tp junto a la cueva:", tp);
await wait(1600);
await page.screenshot({ path: path.join(root, "test-shots/cave_entrance.png") });
console.log("  → cave_entrance.png");

// caminar hacia el norte hasta la puerta: debe abrir la cueva (modo=cueva)
for (let i = 0; i < 5; i++){
  await page.keyboard.down("ArrowUp"); await wait(320); await page.keyboard.up("ArrowUp"); await wait(420);
}
const mode = await page.evaluate(() => World.debug().mode);
console.log(mode === "cueva" ? "OK  la puerta abre la cueva" : `FALLO  modo=${mode} (la entrada sigue bloqueada)`);
await page.screenshot({ path: path.join(root, "test-shots/cave_inside.png") });

console.log(errors ? `ERRORES DE CONSOLA: ${errors}` : "sin errores de consola");
await browser.close();
server.close();
process.exit(mode === "cueva" && !errors ? 0 : 1);
