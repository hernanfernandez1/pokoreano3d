// Recorta y amplía una región de una captura, para mirar el detalle.
// Uso: node tools/crop_zoom.mjs <png> <x> <y> <w> <h> [zoom] [salida]
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, X, Y, W, H, Z=4, out="test-shots/crop.png"] = process.argv.slice(2);
const MIME={'.html':'text/html','.png':'image/png'};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});s.end(d);});});
await new Promise(r=>server.listen(8129,r));
const html=`<!doctype html><html><body><canvas id="c"></canvas><script>
window.run=(u,x,y,w,h,z)=>new Promise(res=>{const i=new Image();i.onload=()=>{
 const c=document.getElementById("c");c.width=w*z;c.height=h*z;const g=c.getContext("2d");
 g.imageSmoothingEnabled=false;g.drawImage(i,x,y,w,h,0,0,w*z,h*z);res(c.toDataURL("image/png"));};i.src=u;});
</script></body></html>`;
fs.writeFileSync(path.join(root,"tools/_crop.html"), html);
const b=await puppeteer.launch({headless:"new"}); const pg=await b.newPage();
await pg.goto("http://localhost:8129/tools/_crop.html",{waitUntil:"load"});
const uri=await pg.evaluate((u,x,y,w,h,z)=>window.run(u,x,y,w,h,z), "/"+src.split("\\").join("/"), +X,+Y,+W,+H,+Z);
fs.writeFileSync(path.join(root,out), Buffer.from(uri.split(",")[1],"base64"));
fs.unlinkSync(path.join(root,"tools/_crop.html"));
console.log("OK "+out);
await b.close(); server.close();
