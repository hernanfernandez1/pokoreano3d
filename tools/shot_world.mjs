// Capturas del mundo 3D en varias zonas → test-shots/world_*.png
// Uso: node tools/shot_world.mjs [prefijo]
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prefix = process.argv[2] || "world";

const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css",
  ".png":"image/png", ".jpg":"image/jpeg", ".glb":"model/gltf-binary" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8104, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
page.on("console", m => { if (m.type() === "error") console.log("[console.error]", m.text()); });
page.on("pageerror", e => console.log("[pageerror]", e.message));

await page.goto("http://localhost:8104/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });
await new Promise(r => setTimeout(r, 900));

const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (name) => {
  await wait(1600);
  await page.screenshot({ path: path.join(root, `test-shots/${prefix}_${name}.png`) });
  console.log("  →", `${prefix}_${name}.png`);
};

// --- overworld: una parada por zona (coordenadas de la región) ---
const spots = [
  ["hangul",   0, 0,  20, 20],   // pueblo inicial (alcaldía + casa de Karol)
  ["sutja",    1, 0,  64, 20],   // tienda
  ["josa",     2, 0, 110, 20],   // academia
  ["topik2",   0, 1,  20, 60],   // pueblo oeste
  ["lago",     1, 1,  45, 40],   // Valle del Lago
  ["cueva",    1, 1,  78, 44],   // bosque profundo y cueva
  ["dongsa",   2, 1, 110, 50],   // norebang
  ["bosquesur",0, 2,  30, 78],   // Bosque del Sur
  ["puerto",   1, 2,  64, 82],   // Puerto Topik + muelle
  ["jondae",   2, 2, 110, 82],   // café
  ["borde",    0, 0,  20, 33],   // salida sur de la zona inicial
];
for (const [name, i, j, gx, gy] of spots){
  await page.evaluate((i, j, gx, gy) => {
    World.debugZone(i, j);
    World.tp(gx - World.regionInfo().cols[i], gy - World.regionInfo().rows[j]);
  }, i, j, gx, gy);
  await shot(name);
}

console.log("debug:", JSON.stringify(await page.evaluate(() => {
  try { return World.debug(); } catch(e){ return { ERROR: e.message }; }
})));

// --- interiores / pueblo / cueva ---
for (const dest of ["cave", "shop", "home"]){
  await page.evaluate(d => World.debugEnter(d), dest);
  await shot(dest);
}

await browser.close();
server.close();
console.log("OK");
