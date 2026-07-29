// Amplía una hoja de sprites con una rejilla y las coordenadas de cada celda,
// para poder elegir qué fotogramas usar.
// Uso: node tools/sheet_grid.mjs <ruta.png> <celda> [salida.png] [zoom]
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, cellArg, outArg, zoomArg] = process.argv.slice(2);
if (!src){ console.error("uso: node tools/sheet_grid.mjs <ruta.png> <celda> [salida.png] [zoom]"); process.exit(1); }
const CELL = Number(cellArg) || 32;
const ZOOM = Number(zoomArg) || 4;
const out = outArg || "test-shots/sheet_grid.png";

const MIME = { ".html":"text/html", ".png":"image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8122, r));

const html = `<!doctype html><html><body style="margin:0;background:#2a2a33">
<canvas id="c"></canvas>
<script>
window.run = (url, cell, zoom) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => {
    const cols = Math.ceil(img.width/cell), rows = Math.ceil(img.height/cell);
    const c = document.getElementById("c");
    c.width = img.width*zoom; c.height = img.height*zoom;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    // damero para ver la transparencia
    for (let j=0;j<rows;j++) for (let i=0;i<cols;i++){
      x.fillStyle = (i+j)%2 ? "#3c3c46" : "#33333c";
      x.fillRect(i*cell*zoom, j*cell*zoom, cell*zoom, cell*zoom);
    }
    x.drawImage(img, 0, 0, c.width, c.height);
    x.strokeStyle = "rgba(255,80,80,.75)"; x.lineWidth = 1;
    x.font = "bold 11px monospace"; x.fillStyle = "#ff6a6a";
    for (let j=0;j<rows;j++) for (let i=0;i<cols;i++){
      x.strokeRect(i*cell*zoom, j*cell*zoom, cell*zoom, cell*zoom);
      x.fillText(i + "," + j, i*cell*zoom+3, j*cell*zoom+12);
    }
    res({ uri: c.toDataURL("image/png"), cols, rows, w: img.width, h: img.height });
  };
  img.onerror = () => rej(new Error("no cargó " + url));
  img.src = url;
});
</script></body></html>`;
fs.writeFileSync(path.join(root, "tools/_sheet_tmp2.html"), html);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 900 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8122/tools/_sheet_tmp2.html", { waitUntil: "load" });
const r = await page.evaluate((u, c, z) => window.run(u, c, z), "/" + src.replace(/\\/g, "/"), CELL, ZOOM);
fs.writeFileSync(path.join(root, out), Buffer.from(r.uri.split(",")[1], "base64"));
fs.unlinkSync(path.join(root, "tools/_sheet_tmp2.html"));
console.log(`${src}: ${r.w}x${r.h} · celda ${CELL} → ${r.cols}x${r.rows} fotogramas → ${out}`);
await browser.close();
server.close();
