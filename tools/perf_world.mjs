// Mide FPS y errores de consola en el overworld. Uso: node tools/perf_world.mjs
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
await new Promise(r => server.listen(8106, r));

const browser = await puppeteer.launch({ headless: "new", args: ["--enable-gpu"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));

await page.goto("http://localhost:8106/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

const results = {};
for (const [name, x, y] of [["plaza",20,20], ["borde",30,10], ["camino",10,25]]){
  await page.evaluate((x,y) => World.tp(x,y), x, y);
  await new Promise(r => setTimeout(r, 1200));
  results[name] = await page.evaluate(() => new Promise(res => {
    let n = 0; const t0 = performance.now();
    const f = () => { n++; const dt = performance.now()-t0;
      if (dt < 2500) requestAnimationFrame(f); else res(Math.round(n/(dt/1000))); };
    requestAnimationFrame(f);
  }));
}
const info = await page.evaluate(() => {
  const r = { ...World.debug() };
  delete r.npcs;
  return r;
});
console.log("FPS:", JSON.stringify(results));
console.log("debug:", JSON.stringify(info));
console.log("errores:", errors.length ? errors : "ninguno");
await browser.close();
server.close();
