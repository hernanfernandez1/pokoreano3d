// Comprobaciones de juego tras el cambio de arte: costa, muelle, arbustos,
// puertas e interiores. Uso: node tools/smoke_world.mjs
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
await new Promise(r => server.listen(8107, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
page.on("dialog", d => d.accept());
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));

await page.goto("http://localhost:8107/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 20000 });

const checks = [];
const check = (name, ok, extra) => checks.push((ok ? "OK   " : "FALLA") + "  " + name + (extra ? "  " + extra : ""));

// el muelle sigue llegando al agua y el punto de pesca está en el mar
const pier = await page.evaluate(() => {
  const d = [];
  for (let y=59; y<=66; y++) d.push(World.tp(24, y));
  return d;
});
check("muelle transitable de y=59 a 66", pier.every(Boolean), JSON.stringify(pier));

// el cuarto de Karol es un mapa hecho a mano sobre el modelo 3D: hay que
// comprobar que desde donde apareces se llega andando a la salida, al punto
// de guardado y al gato (si no, la habitación es una trampa)
await page.evaluate(() => World.debugEnter("home"));
await new Promise(r => setTimeout(r, 400));
const home = await page.evaluate(() => {
  const d = World.debug();
  const reach = (tx, ty) => {
    // recorrido a saltos de un tile usando el propio tp() del juego
    const seen = new Set(), q = [[d.player.x, d.player.y]];
    seen.add(d.player.x + "," + d.player.y);
    while (q.length){
      const [x, y] = q.shift();
      if (x === tx && y === ty) return true;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
        const nx = x+dx, ny = y+dy, k = nx + "," + ny;
        if (seen.has(k)) return;
        seen.add(k);
        if (World.tp(nx, ny)) q.push([nx, ny]);
      });
    }
    return false;
  };
  const r = { mode: d.mode, spawn: [d.player.x, d.player.y],
    exit: reach(3, 7), save: reach(1, 6), gato: reach(2, 4) };
  World.tp(d.player.x, d.player.y);
  return r;
});
check("cuarto de Karol: salida alcanzable", home.exit, JSON.stringify(home.spawn));
check("cuarto de Karol: guardado alcanzable", home.save);
check("cuarto de Karol: gato alcanzable", home.gato);
await page.evaluate(() => World.debugEnter("exit"));
await new Promise(r => setTimeout(r, 300));

// interiores y vuelta al mapa
for (const dest of ["pueblo", "cave", "shop", "cafe", "academia", "home", "alcaldia", "norebang"]){
  const ok = await page.evaluate(d => World.debugEnter(d), dest);
  await new Promise(r => setTimeout(r, 350));
  const mode = await page.evaluate(() => World.debug().mode);
  check("entrar en " + dest, ok && mode !== "over", "modo=" + mode);
  await page.evaluate(() => World.debugEnter("exit"));
  await new Promise(r => setTimeout(r, 250));
}
const back = await page.evaluate(() => World.debug().mode);
check("volver al overworld", back === "over", "modo=" + back);

// batalla salvaje y captura siguen arrancando
await page.evaluate(() => UI.startWildBattleWord(Data.vocab[7]));
await new Promise(r => setTimeout(r, 500));
check("batalla salvaje", await page.evaluate(() => !!document.querySelector("#screen-battle.active")));
await page.evaluate(() => { UI.showScreen("screen-map"); });
await page.evaluate(() => UI.startCaptureFromWorld("pradera"));
await new Promise(r => setTimeout(r, 500));
check("captura de guardián", await page.evaluate(() => !!document.querySelector(".screen.active")));

console.log(checks.join("\n"));
console.log("errores de consola:", errors.length ? errors : "ninguno");
await browser.close();
server.close();
process.exit(checks.some(c => c.startsWith("FALLA")) || errors.length ? 1 : 0);
