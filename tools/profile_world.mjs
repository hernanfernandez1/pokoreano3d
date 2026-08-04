// Perfilado real: no cuenta frames, mide cuánto tarda CADA uno mientras el
// personaje camina, y reparte el tiempo entre las fases del bucle. Los
// tirones se ven en los percentiles altos, no en la media.
// Uso: node tools/profile_world.mjs
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
await new Promise(r => server.listen(8131, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8131/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });
await new Promise(r => setTimeout(r, 1500));

// se instrumentan las fases envolviendo el rAF: se mide el hueco entre frames
await page.evaluate(() => {
  window.__frames = [];
  window.__long = [];
  let last = performance.now();
  const loop = () => {
    const now = performance.now();
    const dt = now - last;
    last = now;
    window.__frames.push(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  // marcar reconstrucciones de escena, que son lo más caro del bucle
  window.__builds = 0;
  const obs = new PerformanceObserver(list => {
    list.getEntries().forEach(e => { if (e.duration > 50) window.__long.push(Math.round(e.duration)); });
  });
  try { obs.observe({ entryTypes: ["longtask"] }); } catch(e){}
});

const walk = async (key, ms) => {
  await page.keyboard.down(key);
  await new Promise(r => setTimeout(r, ms));
  await page.keyboard.up(key);
};

await page.focus("body");
await page.evaluate(() => { window.__frames.length = 0; });
// caminar de verdad, que es cuando se nota
for (const k of ["ArrowDown","ArrowRight","ArrowUp","ArrowLeft"]) await walk(k, 1800);

const r = await page.evaluate(() => {
  const f = window.__frames.slice(5).sort((a,b) => a-b);
  const pc = p => f[Math.min(f.length-1, Math.floor(f.length*p))];
  const sum = f.reduce((a,b) => a+b, 0);
  return {
    frames: f.length,
    fpsMedio: Math.round(1000/(sum/f.length)),
    p50: +pc(0.50).toFixed(1), p95: +pc(0.95).toFixed(1),
    p99: +pc(0.99).toFixed(1), peor: +f[f.length-1].toFixed(1),
    sobre33ms: f.filter(v => v > 33).length,
    sobre100ms: f.filter(v => v > 100).length,
    tareasLargas: window.__long.slice(0, 8),
    props: World.debug().props3d, lotes: World.debug().batches,
  };
});
console.log("--- tiempo por frame caminando (ms) ---");
console.log(`  frames medidos : ${r.frames}   ·  FPS medio: ${r.fpsMedio}`);
console.log(`  p50 ${r.p50}   p95 ${r.p95}   p99 ${r.p99}   peor ${r.peor}`);
console.log(`  frames >33ms (tirón visible): ${r.sobre33ms}`);
console.log(`  frames >100ms (parón)       : ${r.sobre100ms}`);
console.log(`  tareas largas (ms): ${r.tareasLargas.join(", ") || "ninguna"}`);
console.log(`  props en escena: ${r.props} en ${r.lotes} lotes`);
await browser.close();
server.close();
