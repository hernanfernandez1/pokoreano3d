// Capturas de los interiores nuevos (tienda, café, academia, norebang,
// alcaldía, gimnasio) + la skin urbana ensanchada en el mundo.
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
await new Promise(r => server.listen(8117, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
let errors = 0;
page.on("console", m => { if (m.type() === "error"){ errors++; console.log("[console.error]", m.text()); } });
page.on("pageerror", e => { errors++; console.log("[pageerror]", e.message); });
const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto("http://localhost:8117/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

for (const name of ["shop", "cafe", "academia", "norebang", "alcaldia", "gym"]){
  await page.evaluate(n => World.debugEnter(n), name);
  await wait(1500);
  await page.screenshot({ path: path.join(root, `test-shots/room_${name}.png`) });
  console.log("  →", `room_${name}.png`, await page.evaluate(() => World.debug().mode));
  await page.evaluate(() => World.debugEnter("exit"));
  await wait(900);
}

// skin urbana ensanchada, de frente en el mundo
await page.waitForFunction('World.sheetFrameURL("urbana") !== null', { timeout: 15000 });
await page.evaluate(() => { State.unlockSkin("urbana"); State.setSkin("urbana"); });
await wait(1200);
await page.screenshot({ path: path.join(root, "test-shots/urbana_wide.png") });
console.log("  → urbana_wide.png");

console.log(errors ? `ERRORES DE CONSOLA: ${errors}` : "sin errores de consola");
await browser.close();
server.close();
process.exit(errors ? 1 : 0);
