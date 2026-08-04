// Prueba la derrota en batalla: debe quitar el 25% de las monedas y
// despertar al jugador en casa (zona 0,0). Uso: node tools/check_defeat.mjs
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
await new Promise(r => server.listen(8113, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
let errors = 0;
page.on("console", m => { if (m.type() === "error"){ errors++; console.log("[console.error]", m.text()); } });
page.on("pageerror", e => { errors++; console.log("[pageerror]", e.message); });
const wait = ms => new Promise(r => setTimeout(r, ms));

await page.goto("http://localhost:8113/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

await page.evaluate(() => {
  const s = State.get(); s.coins = 400;
  UI.startWildBattleWord(Data.vocab[0]);
});
console.log("batalla forzada; monedas iniciales: 400");

// responde siempre la primera opción hasta caer (75% de fallar cada vez)
let inBattle = true;
for (let round = 0; round < 60 && inBattle; round++){
  await wait(1250);
  inBattle = await page.evaluate(() => {
    const scr = document.querySelector("#screen-battle");
    if (!scr || !scr.classList.contains("active")) return false;
    const b = document.querySelector("#battle-options .option:not(.mic-option)");
    if (b) b.click();
    return true;
  });
}
const after = await page.evaluate(() => ({
  coins: State.get().coins,
  debug: World.debug(),
}));
console.log("tras la derrota: monedas =", after.coins, "| modo =", after.debug.mode,
  "| jugador =", JSON.stringify(after.debug.player));

await wait(1500);
await page.screenshot({ path: path.join(root, "test-shots/defeat_respawn.png") });
console.log("  → defeat_respawn.png");

const okCoins = after.coins === 300;
const okMode = after.debug.mode === "over";
console.log(okCoins ? "OK  -25% monedas" : "FALLO monedas (esperaba 300)");
console.log(okMode ? "OK  respawn en overworld" : "FALLO modo");
console.log(errors ? `ERRORES DE CONSOLA: ${errors}` : "sin errores de consola");
await browser.close();
server.close();
process.exit((okCoins && okMode && !errors) ? 0 : 1);
