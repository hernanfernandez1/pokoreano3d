// Screenshot de prueba: casa en la playa + jardín del lago (vía HTTP local).
// Uso: node tools/shot_seahouse.mjs
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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
await new Promise(r => server.listen(8099, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
page.on("console", m => { if (m.type() === "error") console.log("[console.error]", m.text()); });
page.on("pageerror", e => console.log("[pageerror]", e.message));

await page.goto("http://localhost:8099/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 15000 });
await new Promise(r => setTimeout(r, 800));

// vista desde el muelle, mirando al mar (la casa debe verse al este)
await page.evaluate(() => World.tp(24, 64));
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: path.join(root, "test-shots/sea_house_pier.png") });

// la casa desde la playa (de frente, con su pasarela hacia el mar)
await page.evaluate(() => World.tp(30, 52));
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: path.join(root, "test-shots/sea_house_beach.png") });

console.log("debug:", JSON.stringify(await page.evaluate(() => {
  const d = World.debug();
  return { envAssets: d.envAssets, gardenMeshes: d.gardenMeshes, mode: d.mode };
})));

// el diorama-isla en el mar al suroeste (en ~13.5,66): se ve desde el muelle
console.log("tp muelle:", await page.evaluate(() => World.tp(24, 65)));
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: path.join(root, "test-shots/env_garden.png") });

// pradera: comprobar el scatter de flores/arbustos/rocas
await page.evaluate(() => World.tp(30, 32));
await new Promise(r => setTimeout(r, 2000));
await page.screenshot({ path: path.join(root, "test-shots/env_scatter.png") });

await browser.close();
server.close();
console.log("OK: test-shots/sea_house_pier.png, sea_house_beach.png, env_garden.png, env_scatter.png");
