// Capturas de la casa de la playa (Bosque del Sur) y la isla-jardín (mar de
// Jondae) tras el arreglo de coordenadas por zona.
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
await new Promise(r => server.listen(8141, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8141/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });
await new Promise(r => setTimeout(r, 900));
const wait = ms => new Promise(r => setTimeout(r, ms));

// casa de la playa: región (32,88) → zona (0,2), junto a la huella
await page.evaluate(() => {
  World.debugZone(0, 2);
  World.tp(32 - World.regionInfo().cols[0], 84 - World.regionInfo().rows[2]);
});
await wait(1700);
await page.screenshot({ path: path.join(root, "test-shots/casamar_fix.png") });
console.log("  → casamar_fix.png", JSON.stringify(await page.evaluate(() => World.debug().mode)));

// isla-jardín: región (104,99) → zona (2,2), desde la playa sur
await page.evaluate(() => {
  World.debugZone(2, 2);
  World.tp(104 - World.regionInfo().cols[2], 90 - World.regionInfo().rows[2]);
});
await wait(1700);
await page.screenshot({ path: path.join(root, "test-shots/jardin_fix.png") });
const dbg = await page.evaluate(() => World.debug());
console.log("  → jardin_fix.png  gardenMeshes:", dbg.gardenMeshes);

// pantalla de título con el campo de nombre (sin prompt nativo)
await page.goto("http://localhost:8141/index.html", { waitUntil: "load" });
await wait(400);
await page.screenshot({ path: path.join(root, "test-shots/title_fix.png") });
console.log("  → title_fix.png");

await browser.close();
server.close();
console.log("OK");
