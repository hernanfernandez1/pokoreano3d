// Vuelca la paleta de una hoja de sprites (colores distintos y su frecuencia),
// para poder mapear exactamente camiseta / pelo / piel al recolorear.
// Uso: node tools/sheet_palette.mjs <ruta.png> [x] [y] [w] [h]
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, sx=0, sy=0, sw=0, sh=0] = process.argv.slice(2);
const MIME={'.html':'text/html','.png':'image/png'};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end();return;}s.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});s.end(d);});});
await new Promise(r=>server.listen(8124,r));
const html=`<!doctype html><html><body><canvas id="c"></canvas><script>
window.run = (url, sx, sy, sw, sh) => new Promise(res => {
  const img=new Image();
  img.onload=()=>{
    const w = sw||img.width, h = sh||img.height;
    const c=document.getElementById("c"); c.width=w; c.height=h;
    const x=c.getContext("2d",{willReadFrequently:true});
    x.imageSmoothingEnabled=false;
    x.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    const d=x.getImageData(0,0,w,h).data;
    const count={};
    for(let i=0;i<d.length;i+=4){
      if(d[i+3]<128) continue;
      const k="#"+[d[i],d[i+1],d[i+2]].map(v=>v.toString(16).padStart(2,"0")).join("");
      count[k]=(count[k]||0)+1;
    }
    res(Object.entries(count).sort((a,b)=>b[1]-a[1]));
  };
  img.src=url;
});
</script></body></html>`;
fs.writeFileSync(path.join(root,"tools/_pal.html"), html);
const b=await puppeteer.launch({headless:"new"}); const pg=await b.newPage();
await pg.goto("http://localhost:8124/tools/_pal.html",{waitUntil:"load"});
const pal=await pg.evaluate((u,a,b2,c,d)=>window.run(u,a,b2,c,d), "/"+src.split("\\").join("/"), +sx, +sy, +sw, +sh);
fs.unlinkSync(path.join(root,"tools/_pal.html"));
console.log(`${src} · ${pal.length} colores`);
pal.forEach(([hex,n]) => console.log(`  ${hex}  ${String(n).padStart(6)} px`));
await b.close(); server.close();
