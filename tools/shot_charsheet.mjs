// Vuelca los personajes que genera Paper.sheetCharacter, para verlos aparte.
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]==="/"?"/index.html":q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});s.end(d);});});
await new Promise(r=>server.listen(8126,r));
const b=await puppeteer.launch({headless:"new"}); const pg=await b.newPage();
pg.on("pageerror",e=>console.log("[err]",e.message));
await pg.goto("http://localhost:8126/index.html",{waitUntil:"load"});
await new Promise(r=>setTimeout(r,1500));
const out = await pg.evaluate(() => {
  const tints = ["#3fa9f5","#a259ff","#06d6a0","#f4a261","#e63946","#90be6d"];
  const hairs = ["#d62c38","#2d2a30","#d0d0d6","#ff80aa","#eec65c","#6a4834"];
  const pairs = tints.map((t,i) => Paper.sheetCharacter({ shirt:t, hair:hairs[i], pants:"#5b5470" }));
  const first = pairs[0];
  const W = first.front.width, H = first.front.height;
  const c = document.createElement("canvas");
  c.width = W*pairs.length; c.height = H*2 + 24;
  const x = c.getContext("2d");
  x.fillStyle = "#5aa04a"; x.fillRect(0,0,c.width,c.height);
  pairs.forEach((p,i) => { x.drawImage(p.front, i*W, 0); x.drawImage(p.back, i*W, H); });
  x.fillStyle="#fff"; x.font="bold 13px monospace";
  x.fillText(`lienzo ${W}x${H} · proporción ${first.aspect.toFixed(3)}`, 6, H*2+17);
  return { uri: c.toDataURL("image/png"), W, H, aspect: first.aspect,
    hoja: typeof PEOPLE_SHEET === "string" ? PEOPLE_SHEET.length : "NO CARGADA" };
});
fs.writeFileSync(path.join(root,"test-shots/charsheet.png"), Buffer.from(out.uri.split(",")[1],"base64"));
console.log(`lienzo ${out.W}x${out.H} · proporción ${out.aspect.toFixed(3)} · hoja ${out.hoja}`);
await b.close(); server.close();
