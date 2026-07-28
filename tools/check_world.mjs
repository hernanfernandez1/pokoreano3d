// Verifica pueblos + banner de zona + minimapa con el mundo 3D real.
import puppeteer from "puppeteer";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".png":"image/png", ".glb":"model/gltf-binary", ".json":"application/json" };
const srv = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(0, r));
const port = srv.address().port;
const b = await puppeteer.launch({ headless: "new", protocolTimeout: 240000 });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await p.goto(`http://127.0.0.1:${port}/?autostart`, { waitUntil: "load", timeout: 90000 });
await new Promise(r => setTimeout(r, 12000));

const out = {};
out.debug = await p.evaluate(() => { try { return World.debug(); } catch(e){ return "ERR " + e.message; } });
out.mmSize = await p.evaluate(() => { const c = document.querySelector("#minimap-canvas"); return c.width + "x" + c.height; });
out.mmZone0 = await p.evaluate(() => document.querySelector("#minimap-zone").textContent);

// teleport al centro de Pueblo Hangul y caminar un paso para disparar onArrive
await p.evaluate(() => World.tp(12, 13));
await p.keyboard.down("ArrowDown");
await new Promise(r => setTimeout(r, 1200));
await p.keyboard.up("ArrowDown");
await new Promise(r => setTimeout(r, 400));
out.zoneTown = await p.evaluate(() => document.querySelector("#minimap-zone").textContent);
out.bannerShown = await p.evaluate(() => document.querySelector("#loc-banner").classList.contains("show") || document.querySelector("#loc-banner").textContent);
await p.screenshot({ path: "../test-shots/world_town.png" });
// close-up del minimapa
const mm = await p.$("#minimap");
await mm.screenshot({ path: "../test-shots/world_minimap.png" });

// teleport a ruta para ver cambio de zona
await p.evaluate(() => World.tp(40, 20));
await p.keyboard.down("ArrowDown");
await new Promise(r => setTimeout(r, 1200));
await p.keyboard.up("ArrowDown");
await new Promise(r => setTimeout(r, 400));
out.zoneRoute = await p.evaluate(() => document.querySelector("#minimap-zone").textContent);

// entrar al pueblo central (interior) para ver el minimapa de otro mapa
await p.evaluate(() => World.debugEnter("pueblo"));
await new Promise(r => setTimeout(r, 4000));
out.zonePueblo = await p.evaluate(() => document.querySelector("#minimap-zone").textContent);
out.mmSizePueblo = await p.evaluate(() => { const c = document.querySelector("#minimap-canvas"); return c.width + "x" + c.height; });
await p.screenshot({ path: "../test-shots/world_pueblo.png" });

console.log(JSON.stringify({
  mode: out.debug.mode, player: out.debug.player,
  mmSize: out.mmSize, zone0: out.mmZone0, zoneTown: out.zoneTown,
  banner: out.bannerShown, zoneRoute: out.zoneRoute,
  zonePueblo: out.zonePueblo, mmPueblo: out.mmSizePueblo,
}, null, 1));
console.log("errores:", errs.length ? errs.slice(0,8) : "ninguno");
await b.close();
srv.close();
