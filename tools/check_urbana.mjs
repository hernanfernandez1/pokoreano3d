// Verificación de la skin urbana + marcador de misión + APIs del pack "juego real".
// Uso: node tools/check_urbana.mjs
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
await new Promise(r => server.listen(8112, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
let errors = 0;
page.on("console", m => { if (m.type() === "error"){ errors++; console.log("[console.error]", m.text()); } });
page.on("pageerror", e => { errors++; console.log("[pageerror]", e.message); });

const wait = ms => new Promise(r => setTimeout(r, ms));
await page.goto("http://localhost:8112/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

// 1) APIs del pack juego real presentes
const apis = await page.evaluate(() => ({
  respawn: typeof World.respawn === "function",
  setTheme: typeof Sfx.setTheme === "function",
  questTarget: typeof Quests !== "undefined" && typeof Quests.target === "function",
  sheetFrameURL: typeof World.sheetFrameURL === "function",
}));
console.log("APIs:", JSON.stringify(apis));

// 2) marcador de misión visible al empezar (quest 1 → alcalde en Hangul)
await wait(1800);
await page.screenshot({ path: path.join(root, "test-shots/urbana_marker.png") });
console.log("  → urbana_marker.png (marcador de misión)");

// 3) esperar la hoja y equipar la skin urbana
await page.waitForFunction('World.sheetFrameURL("urbana") !== null', { timeout: 15000 });
await page.evaluate(() => { State.unlockSkin("urbana"); State.setSkin("urbana"); });
await wait(1200);
await page.screenshot({ path: path.join(root, "test-shots/urbana_world.png") });
console.log("  → urbana_world.png (frente)");

// 4) caminar hacia arriba para ver los frames de espalda
await page.keyboard.down("ArrowUp");
await wait(650);
await page.screenshot({ path: path.join(root, "test-shots/urbana_back.png") });
await page.keyboard.up("ArrowUp");
console.log("  → urbana_back.png (espalda caminando)");

// 5) tienda: compra directa de la skin
await page.evaluate(() => {
  const s = State.get(); s.coins = 1000; State.unlockSkin("clásico"); // re-bloquear para probar compra
  s.unlockedSkins = s.unlockedSkins.filter(k => k !== "urbana");
  State.setSkin("clásico");
  UI.openShop();
});
await wait(400);
await page.screenshot({ path: path.join(root, "test-shots/urbana_shop.png") });
console.log("  → urbana_shop.png (card en tienda)");
const bought = await page.evaluate(() => {
  const b = document.querySelector("[data-buy-urbana]");
  if (!b || b.disabled) return { ok: false, reason: b ? "disabled" : "sin botón" };
  b.click();
  return { ok: State.get().unlockedSkins.includes("urbana"), coins: State.get().coins, skin: State.get().activeSkin };
});
console.log("compra:", JSON.stringify(bought));

console.log(errors ? `ERRORES DE CONSOLA: ${errors}` : "sin errores de consola");
await browser.close();
server.close();
process.exit(errors ? 1 : 0);
