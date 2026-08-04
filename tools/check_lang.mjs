// Comprueba la selección de idioma y nivel de la portada.
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png"};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]==="/"?"/index.html":q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end("nf");return;}s.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});s.end(d);});});
await new Promise(r=>server.listen(8140,r));
const checks=[]; const check=(n,ok,x)=>checks.push((ok?"OK   ":"FALLA")+"  "+n+(x?"  "+x:""));
const b=await puppeteer.launch({headless:"new"}); const errors=[];
const pg=await b.newPage(); await pg.setViewport({width:1280,height:900});
pg.on("dialog",d=>d.accept());
pg.on("pageerror",e=>errors.push(e.message));
pg.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });
await pg.goto("http://localhost:8140/index.html",{waitUntil:"load"});

check("hay selector de idioma", await pg.$$eval("#pick-lang .chip", n=>n.length)===2);
check("hay selector de nivel",  await pg.$$eval("#pick-level .chip", n=>n.length)===3);
check("título renombrado", (await pg.$eval("h1", n=>n.textContent)).includes("GUARDIANES"));

// elegir inglés + principiante y arrancar
await pg.click('#pick-lang .chip[data-lang="en"]');
await pg.click('#pick-level .chip[data-level="basico"]');
const hint = await pg.$eval("#setup-hint", n=>n.textContent);
check("el aviso refleja la elección", hint.includes("Inglés") && hint.includes("Principiante"), hint);
await pg.type("#trainer-name", "Test");
await pg.click('[data-action="new-game"]');
await pg.waitForFunction('typeof World!=="undefined" && World.debug().ready',{timeout:20000});

const r = await pg.evaluate(() => ({
  lang: Data.langCode(), level: Data.levelKey(),
  guardado: { lang: State.get().lang, level: State.get().level },
  gimnasios: Data.gyms.map(g => g.name),
  claves: Data.gyms.map(g => g.key).join(","),
  palabras: Data.byLevel(Data.allWords).length,
  muestra: Data.vocab.slice(0,3).map(w => w.han + "=" + w.es),
}));
check("Data en inglés", r.lang==="en", r.lang);
check("nivel aplicado", r.level==="basico", r.level);
check("se guardó en la partida", r.guardado.lang==="en" && r.guardado.level==="basico", JSON.stringify(r.guardado));
check("gimnasios en inglés", r.gimnasios[0].includes("Fonética"), r.gimnasios.slice(0,3).join(" / "));
check("mismas claves de gimnasio", r.claves==="hangul,numeros,particulas,verbos,honor,topik1,topik2,maestro");
check("vocabulario filtrado por nivel", r.palabras>0 && r.palabras<142, r.palabras+" palabras");
console.log("  muestra:", r.muestra.join(" · "));

// recargar y continuar: tiene que seguir en inglés
await pg.reload({waitUntil:"load"});
await pg.click('[data-action="continue"]');
await pg.waitForFunction('typeof World!=="undefined" && World.debug().ready',{timeout:20000});
const tras = await pg.evaluate(()=>Data.langCode()+"/"+Data.levelKey());
check("al continuar mantiene idioma y nivel", tras==="en/basico", tras);

console.log(checks.join("\n"));
console.log("errores de consola:", errors.length?errors.slice(0,4):"ninguno");
await b.close(); server.close();
process.exit(checks.some(c=>c.startsWith("FALLA"))||errors.length?1:0);
