// Comprueba el HUD flotante del mapa: que no quede franja opaca, que el 3D
// ocupe toda la pantalla, que las islas no se pisen entre sí y que el mapa
// siga siendo clicable por debajo. Uso: node tools/check_maphud.mjs
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png"};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]==="/"?"/index.html":q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end("nf");return;}s.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});s.end(d);});});
await new Promise(r=>server.listen(8160,r));

const checks=[]; const check=(n,ok,x)=>checks.push((ok?"OK   ":"FALLA")+"  "+n+(x?"  "+x:""));
const errors=[];
const b=await puppeteer.launch({headless:"new"});

for (const [nombre, w, h, movil] of [["escritorio",1280,800,false], ["móvil",390,844,true]]){
  const pg=await b.newPage();
  if (movil) await pg.emulate({ name:nombre,
    userAgent:"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    viewport:{width:w,height:h,isMobile:true,hasTouch:true,deviceScaleFactor:2} });
  else await pg.setViewport({width:w,height:h});
  pg.on("dialog",d=>d.accept());
  pg.on("pageerror",e=>errors.push(nombre+": "+e.message));
  await pg.goto("http://localhost:8160/index.html",{waitUntil:"load"});
  await pg.click('[data-action="new-game"]');
  await pg.waitForFunction('typeof World!=="undefined" && World.debug().ready',{timeout:20000});
  await new Promise(r=>setTimeout(r,900));

  const r = await pg.evaluate(() => {
    const caja = s => { const e=document.querySelector(s); if(!e) return null;
      const b=e.getBoundingClientRect(); return {t:b.top,l:b.left,r:b.right,b:b.bottom,w:b.width,h:b.height}; };
    const hud = document.querySelector(".map-hud");
    const lienzo = document.getElementById("world-canvas").getBoundingClientRect();
    return {
      fondoHud: getComputedStyle(hud).backgroundColor,
      clicksHud: getComputedStyle(hud).pointerEvents,
      lienzo: { t: lienzo.top, h: lienzo.height },
      alto: window.innerHeight,
      izq: caja(".hud-left"), acc: caja(".map-hud .topbar-actions"),
      mini: caja(".minimap"), quest: caja(".quest-banner"),
      // el banner cuelga de .hud-left, así que se compara con su hermano de
      // arriba (las estadísticas), no con su propio contenedor
      stats: caja(".hud-left .stats"),
      zona: caja(".loc-banner"),
    };
  });

  const solapan = (a, c) => a && c && a.l < c.r && c.l < a.r && a.t < c.b && c.t < a.b;
  const transparente = /rgba\(0, 0, 0, 0\)|transparent/.test(r.fondoHud);
  check(`${nombre}: el HUD no tiene fondo`, transparente, r.fondoHud);
  check(`${nombre}: el HUD no captura clics`, r.clicksHud === "none", r.clicksHud);
  // el lienzo 3D tiene que llegar arriba del todo y ocupar casi la ventana
  check(`${nombre}: el 3D empieza en el borde superior`, r.lienzo.t <= 1, `top ${r.lienzo.t.toFixed(0)}`);
  check(`${nombre}: el 3D ocupa la altura`, r.lienzo.h >= r.alto - 2,
    `${r.lienzo.h.toFixed(0)} de ${r.alto}`);
  check(`${nombre}: chip y botones no se pisan`, !solapan(r.izq, r.acc));
  check(`${nombre}: botones y minimapa no se pisan`, !solapan(r.acc, r.mini));
  check(`${nombre}: estadísticas y misión no se pisan`, !solapan(r.stats, r.quest));
  check(`${nombre}: el cartel de zona no pisa el HUD`, !solapan(r.zona, r.izq) && !solapan(r.zona, r.mini));

  await pg.screenshot({ path: path.join(root, `test-shots/maphud_${movil?"movil":"escritorio"}.png`) });
  await pg.close();
}

console.log(checks.join("\n"));
console.log("errores de consola:", errors.length?errors:"ninguno");
await b.close(); server.close();
process.exit(checks.some(c=>c.startsWith("FALLA"))||errors.length?1:0);
