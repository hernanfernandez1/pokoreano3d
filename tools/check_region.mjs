// Valida la región partida en zonas:
//  1. que la región entera esté conectada a pie (BFS sobre el mapa maestro)
//  2. que se llegue a los 7 gimnasios, a cada servicio, a la cueva y al muelle
//  3. que cada zona tenga abiertas las fronteras que le tocan, para poder
//     recorrer las 9 zonas saliendo por los bordes
// Uso: node tools/check_region.mjs
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
await new Promise(r => server.listen(8115, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on("dialog", d => d.accept());
const errors = [];
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", e => errors.push("pageerror: " + e.message));

await page.goto("http://localhost:8115/index.html", { waitUntil: "load" });
await page.click('[data-action="new-game"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 30000 });

const info = await page.evaluate(() => World.regionInfo());
const fails = [];

// --- 1 y 2: conectividad de la región sobre el mapa maestro ---
const { W, H, walk } = info;
const start = info.player;
const seen = new Set([`${start.x},${start.y}`]);
const q = [[start.x, start.y]];
while (q.length){
  const [x, y] = q.shift();
  for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx = x+dx, ny = y+dy, k = `${nx},${ny}`;
    if (nx<0 || ny<0 || nx>=W || ny>=H || seen.has(k)) continue;
    seen.add(k);
    if (walk[ny][nx] === ".") q.push([nx, ny]);
  }
}
const nextTo = (x, y) => [[0,1],[0,-1],[1,0],[-1,0],[0,0]].some(([dx,dy]) => seen.has(`${x+dx},${y+dy}`));
console.log(`región ${W}x${H} · ${seen.size} casillas alcanzables desde ${start.x},${start.y}\n`);
for (const d of info.doors){
  const ok = nextTo(d.x, d.y);
  if (!ok) fails.push("inalcanzable: " + d.what);
  console.log(`  ${ok ? "OK   " : "FALLA"}  ${d.what.padEnd(22)} (${d.x},${d.y})  ${d.zone}`);
}

// --- 2b: nada tapando la calzada ni edificios partidos entre dos zonas ---
console.log("");
const roadOk = !info.blockedRoad.length;
if (!roadOk) fails.push(`${info.blockedRoad.length} casillas de calzada tapadas`);
console.log(`  ${roadOk ? "OK   " : "FALLA"}  carreteras despejadas` +
  (roadOk ? "" : ` — tapadas en ${info.blockedRoad.slice(0,6).map(p => `${p.x},${p.y}`).join(" ")}`));
const strOk = !info.straddling.length;
if (!strOk) fails.push(`${info.straddling.length} edificios a caballo entre zonas`);
console.log(`  ${strOk ? "OK   " : "FALLA"}  ningún edificio parte una frontera` +
  (strOk ? "" : ` — ${info.straddling.slice(0,6).map(p => `${p.sprite}@${p.x},${p.y}`).join(" ")}`));

// --- 3: grafo de zonas, entrando en cada una y mirando sus salidas ---
console.log("\nfronteras entre zonas:");
const sides = { "-1,0":"O", "1,0":"E", "0,-1":"N", "0,1":"S" };
const adj = {};
for (let j=0; j<3; j++) for (let i=0; i<3; i++){
  const exits = await page.evaluate((i, j) => {
    World.debugZone(i, j);
    const e = World.zoneExits();
    const uniq = {};
    e.forEach(o => { uniq[o.dx + "," + o.dy] = (uniq[o.dx + "," + o.dy] || 0) + 1; });
    return { name: World.regionInfo().zone.name, uniq };
  }, i, j);
  adj[`${i},${j}`] = Object.keys(exits.uniq);
  const label = Object.entries(exits.uniq).map(([k, n]) => `${sides[k]}×${n}`).join(" ");
  console.log(`  [${i},${j}] ${exits.name.padEnd(16)} salidas: ${label || "NINGUNA"}`);
  if (!label) fails.push(`zona ${exits.name} sin salidas`);
}
// ¿se recorren las 9 zonas saliendo por los bordes?
const zseen = new Set(["0,0"]);
const zq = [[0,0]];
while (zq.length){
  const [i, j] = zq.shift();
  for (const dir of adj[`${i},${j}`] || []){
    const [dx, dy] = dir.split(",").map(Number);
    const ni = i+dx, nj = j+dy, k = `${ni},${nj}`;
    if (ni<0 || nj<0 || ni>2 || nj>2 || zseen.has(k)) continue;
    zseen.add(k); zq.push([ni, nj]);
  }
}
const zonesOk = zseen.size === 9;
if (!zonesOk) fails.push(`solo se alcanzan ${zseen.size} de 9 zonas`);
console.log(`\n  ${zonesOk ? "OK   " : "FALLA"}  se recorren ${zseen.size}/9 zonas desde el pueblo inicial`);

// --- 4: cruzar una frontera andando de verdad (no con el teletransporte) ---
console.log("\ncruce a pie:");
await page.evaluate(() => World.debugZone(0, 0));
const before = await page.evaluate(() => {
  // buscar la salida sur y ponerse tres casillas por encima
  const e = World.zoneExits().find(o => o.dy === 1);
  if (!e) return null;
  World.tp(e.x, e.y - 3);
  return { zone: World.regionInfo().zone.name, exit:[e.x, e.y] };
});
if (!before){
  fails.push("la zona inicial no tiene salida sur");
} else {
  await page.focus("body");
  for (let k = 0; k < 6; k++){
    await page.keyboard.down("ArrowDown");
    await new Promise(r => setTimeout(r, 420));
    await page.keyboard.up("ArrowDown");
    await new Promise(r => setTimeout(r, 120));
  }
  const after = await page.evaluate(() => World.regionInfo().zone.name);
  const moved = after !== before.zone;
  if (!moved) fails.push(`no se cruzó la frontera andando (sigue en ${after})`);
  console.log(`  ${moved ? "OK   " : "FALLA"}  ${before.zone} → ${after}  (salida ${before.exit})`);
}

// --- 5: la partida guardada recuerda en qué zona estabas ---
console.log("\nguardado entre zonas:");
const saved = await page.evaluate(() => {
  World.debugZone(2, 2);           // Pueblo Jondae, la esquina opuesta
  World.tp(20, 12);
  State.save();
  return { zone: World.regionInfo().zone.name, pos: State.get().playerPos };
});
await page.reload({ waitUntil: "load" });
await page.click('[data-action="continue"]');
await page.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 30000 });
const restored = await page.evaluate(() => World.regionInfo().zone.name);
const kept = restored === saved.zone;
if (!kept) fails.push(`al recargar volvió a ${restored} en vez de ${saved.zone}`);
console.log(`  ${kept ? "OK   " : "FALLA"}  guardado en ${saved.zone} (${saved.pos?.gx},${saved.pos?.gy}) → recarga en ${restored}`);

console.log("\nerrores de consola:", errors.length ? errors.slice(0,5) : "ninguno");
if (fails.length) console.log("FALLOS:\n  " + fails.join("\n  "));
await browser.close();
server.close();
process.exit(fails.length || errors.length ? 1 : 0);
