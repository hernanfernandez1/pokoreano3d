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

// --- overworld ---
const spots = [
  ["pradera",  30, 32],
  ["cruce",    48, 34],
  ["bosque",   72, 14],
  ["playa",    34, 60],
  ["muelle",   24, 64],
  ["casa",      8, 10],
  ["rio",      49, 40],
];
for (const [name, x, y] of spots){
  await page.evaluate((x, y) => World.tp(x, y), x, y);
  await shot(name);
}

console.log("debug:", JSON.stringify(await page.evaluate(() => {
  try { return World.debug(); } catch(e){ return { ERROR: e.message }; }
})));

// --- interiores / pueblo / cueva ---
for (const dest of ["pueblo", "cave", "shop"]){
  await page.evaluate(d => World.debugEnter(d), dest);
  await shot(dest);
}

await browser.close();
server.close();
console.log("OK");
