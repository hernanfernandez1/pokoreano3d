// Mide lo ancha que es cada puerta: desde cuántas casillas de la fila de
// delante se entra caminando hacia el edificio. Con una sola casilla había
// que clavar el tile exacto, que en el móvil es una lotería.
// Uso: node tools/check_doors.mjs
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png"};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]==="/"?"/index.html":q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end("nf");return;}s.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});s.end(d);});});
await new Promise(r=>server.listen(8165,r));

const b=await puppeteer.launch({headless:"new"}); const pg=await b.newPage();
pg.on("dialog",d=>d.accept()); pg.on("pageerror",e=>console.log("[err]",e.message));
await pg.goto("http://localhost:8165/index.html",{waitUntil:"load"});
await pg.click('[data-action="new-game"]');
await pg.waitForFunction('typeof World!=="undefined" && World.debug().ready',{timeout:20000});

// el conteo se hace sobre regionInfo.doorWidths, que expone world.js
const w = await pg.evaluate(() => World.regionInfo().doorWidths || null);
if (!w){ console.log("world.js no expone doorWidths"); await b.close(); server.close(); process.exit(1); }
const fails = [];
Object.entries(w).forEach(([que, n]) => {
  const ok = n >= 3;
  if (!ok) fails.push(`${que} solo tiene ${n} casilla(s) de entrada`);
  console.log(`  ${ok ? "OK   " : "FALLA"}  ${que.padEnd(22)} ${n} casillas de aproximación`);
});
/* Prueba de verdad: colocarse en cada casilla del umbral y subir. Antes solo
   valía la del centro; ahora las tres tienen que meterte dentro. */
const entradas = await pg.evaluate(async () => {
  const info = World.regionInfo();
  const casa = info.doors.find(d => d.what === "casa");
  const res = [];
  for (const dx of [-1, 0, 1]){
    World.debugZone(0, 0);
    const lx = casa.x - info.cols[0] + dx, ly = casa.y - info.rows[0] + 1;
    if (!World.tp(lx, ly)){ res.push({ dx, ok:false, why:"no se puede pisar" }); continue; }
    res.push({ dx, puede: !!World.tp(lx, ly - 1) });   // ¿la casilla del umbral es transitable?
  }
  World.debugZone(0, 0);
  return res;
});
entradas.forEach(e => {
  const ok = e.puede === true;
  if (!ok) fails.push(`umbral de la casa: la casilla ${e.dx} no deja pasar`);
  console.log(`  ${ok ? "OK   " : "FALLA"}  casa · entrar desde la casilla ${e.dx > 0 ? "+" : ""}${e.dx}`);
});

console.log("\n" + (fails.length ? "FALLOS:\n  " + fails.join("\n  ") : "OK   todas las puertas se aciertan sin precisión de tile"));
await b.close(); server.close();
process.exit(fails.length ? 1 : 0);
