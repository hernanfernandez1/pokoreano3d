// Hornea una hoja de sprites PNG a un data URI dentro de un .js.
// Va incrustada por dos motivos: abrir index.html con doble clic (file://)
// no puede cargar PNG sueltos, y dibujar un PNG externo en un canvas lo
// "mancha" e impide leer sus píxeles, que es justo lo que hace falta para
// recolorear a los NPCs.
// Uso: node tools/sheet2js.mjs <ruta.png> <NOMBRE_CONST> <salida.js>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [src, name, out] = process.argv.slice(2);
if (!src || !name || !out){
  console.error("uso: node tools/sheet2js.mjs <ruta.png> <NOMBRE_CONST> <salida.js>");
  process.exit(1);
}
const png = fs.readFileSync(path.join(root, src));
const uri = "data:image/png;base64," + png.toString("base64");
const js = `/* ${src} horneado por tools/sheet2js.mjs — no editar a mano */\nconst ${name} = "${uri}";\n`;
fs.writeFileSync(path.join(root, out), js);
console.log(`${src} (${(png.length/1024).toFixed(1)} KB) → ${out} (${(js.length/1024).toFixed(1)} KB)`);
