import puppeteer from "puppeteer";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".png":"image/png", ".glb":"model/gltf-binary" };
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
p.on("pageerror", e => errs.push(e.message));
await p.goto(`http://127.0.0.1:${port}/?autostart`, { waitUntil: "load", timeout: 90000 });
await new Promise(r => setTimeout(r, 12000));
// Frente a la puerta del gimnasio de Pueblo Hangul (12,16 es camino)
await p.evaluate(() => World.tp(12, 17));
await p.keyboard.down("ArrowUp");
await new Promise(r => setTimeout(r, 500));
await p.keyboard.up("ArrowUp");
await new Promise(r => setTimeout(r, 600));
console.log("zona:", await p.evaluate(() => document.querySelector("#minimap-zone").textContent));
await p.screenshot({ path: "../test-shots/world_hangul.png" });
console.log("errores:", errs.length ? errs : "ninguno");
await b.close(); srv.close();
