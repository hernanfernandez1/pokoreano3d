// Vuelca preguntas reales de cada gimnasio en los dos idiomas, para revisar
// que tengan sentido como ejercicio. Uso: node tools/check_questions.mjs
import puppeteer from "puppeteer";
import path from "node:path"; import fs from "node:fs"; import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png"};
const server=http.createServer((q,s)=>{const p=path.join(root,decodeURIComponent(q.url.split("?")[0]==="/"?"/index.html":q.url.split("?")[0]));fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end("nf");return;}s.writeHead(200,{"Content-Type":MIME[path.extname(p)]||"application/octet-stream"});s.end(d);});});
await new Promise(r=>server.listen(8155,r));
const b=await puppeteer.launch({headless:"new"}); const pg=await b.newPage();
pg.on("dialog",d=>d.accept()); pg.on("pageerror",e=>console.log("[err]",e.message));
await pg.goto("http://localhost:8155/index.html",{waitUntil:"load"});

const fails = [];
for (const lang of ["ko","en"]){
  const r = await pg.evaluate((lang) => {
    Data.setLang(lang); Data.setLevel("medio");
    const out = [];
    Data.gyms.forEach(g => {
      const pool = Data.byLevel(g.pool);
      for (let i=0;i<3;i++){
        const w = pool[Math.floor(Math.random()*pool.length)];
        const q = Engine.buildQuestion(w, Data.byLevel(Data.allWords), g.questionMode);
        out.push({ gym:g.key, modo:q.mode,
          enunciado: q.prompt.text || (q.prompt.han + (q.prompt.hint ? "  ["+q.prompt.hint+"]" : "")),
          correcta: q.correct, opciones: q.options });
      }
    });
    return { nombre: Data.lang().name, modos: Data.lang().modes, out };
  }, lang);

  console.log(`\n===== ${r.nombre} (modos: ${r.modos.join(", ")}) =====`);
  const porGym = {};
  r.out.forEach(q => { (porGym[q.gym] = porGym[q.gym] || []).push(q); });
  Object.entries(porGym).forEach(([g, qs]) => {
    const q = qs[0];
    console.log(`  ${g.padEnd(11)} [${q.modo}]  ${q.enunciado}`);
    console.log(`              → ${q.opciones.map(o => o === q.correcta ? "✓"+o : o).join("   ")}`);
  });

  // en inglés no debe preguntarse la pronunciación de una palabra corriente
  const malas = r.out.filter(q => lang === "en" && q.modo === "han-to-rom" && q.gym !== "hangul");
  if (malas.length) fails.push(`${malas.length} preguntas de pronunciación fuera del gimnasio de fonética`);
  // ninguna opción debe repetirse ni faltar la correcta
  r.out.forEach(q => {
    if (!q.opciones.includes(q.correcta)) fails.push(`${lang}/${q.gym}: falta la respuesta correcta`);
    if (new Set(q.opciones).size !== q.opciones.length) fails.push(`${lang}/${q.gym}: opciones repetidas`);
  });
}
console.log("\n" + (fails.length ? "FALLOS:\n  " + [...new Set(fails)].join("\n  ") : "OK   preguntas coherentes en los dos idiomas"));
await b.close(); server.close();
process.exit(fails.length ? 1 : 0);
