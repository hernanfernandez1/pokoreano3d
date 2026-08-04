// Sondeo: ¿hay hierba alta en Jondae (2,2)? ¿de qué color la pinta el minimapa?
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
await new Promise(r => server.listen(8114, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8114/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });
await page.evaluate(() => World.debugZone(2, 2));
await new Promise(r => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const cv = document.getElementById("minimap-canvas");
  const x = cv.getContext("2d");
  const img = x.getImageData(0, 0, cv.width, cv.height).data;
  const colors = {};
  for (let k = 0; k < img.length; k += 4){
    const hex = "#" + [img[k], img[k+1], img[k+2]].map(v => v.toString(16).padStart(2, "0")).join("");
    colors[hex] = (colors[hex] || 0) + 1;
  }
  const top = Object.entries(colors).sort((a, b) => b[1]-a[1]).slice(0, 14);
  return { w: cv.width, h: cv.height, top, has57a04b: !!colors["#57a04b"] };
});
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: path.join(root, "test-shots/probe_jondae.png") });
await browser.close();
server.close();
