// Captura NPCs de cerca para juzgar el arte de los personajes.
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]==="/"?"/index.html":q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});s.end(d);});});
await new Promise(r=>server.listen(8125,r));
const b=await puppeteer.launch({headless:"new"});
const pg=await b.newPage(); await pg.setViewport({width:1280,height:800});
pg.on("dialog",d=>d.accept());
pg.on("pageerror",e=>console.log("[err]",e.message));
pg.on("console",m=>{if(m.type()==="error")console.log("[console]",m.text());});
await pg.goto("http://localhost:8125/index.html",{waitUntil:"load"});
await pg.click('[data-action="new-game"]');
await pg.waitForFunction('typeof World!=="undefined" && World.debug().ready',{timeout:20000});
// ir junto a un NPC de la zona inicial
const info = await pg.evaluate(() => {
  const d = World.debug();
  const n = d.npcs[0];
  if (n) World.tp(n.x + 1, n.y);
  return { npcs: d.npcs.map(o=>o.name), zona: World.regionInfo().zone.name };
});
console.log("zona:", info.zona, "· NPCs:", info.npcs.join(", "));
await new Promise(r=>setTimeout(r,2500));
await pg.screenshot({path: path.join(root,"test-shots/npcs.png")});
await b.close(); server.close();
