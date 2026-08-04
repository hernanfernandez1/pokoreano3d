// Recorta los 6 sprites de la fila inferior de la foto de WhatsApp y compone
// una hoja 4x2 (frentes / espaldas) con fondo transparente para la skin "urbana".
// El fondo crema y la sombra gris se eliminan por inundación desde los bordes
// de cada celda: todo lo que no es alcanzable (el muñeco, encerrado en su
// contorno oscuro) se conserva, incluidos los pantalones color crema.
// Uso: node tools/make_urbana_sheet.mjs
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "assets/WhatsApp Image 2026-07-31 at 17.07.56.jpeg";
const OUT = "assets/gfx/urbana_sheet.png";

const MIME = { ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".png":"image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end("nf"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8111, r));

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8111/assets/gfx/karol_sheet.png", { waitUntil: "load" });

const dataUrl = await page.evaluate(async (src) => {
  const img = await new Promise((ok, no) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = no;
    i.src = src;
  });
  const W = img.width, H = img.height;
  const full = document.createElement("canvas");
  full.width = W; full.height = H;
  const fx = full.getContext("2d", { willReadFrequently: true });
  fx.drawImage(img, 0, 0);
  const data = fx.getImageData(0, 0, W, H).data;

  const px = (x, y) => {
    const o = (y*W + x) * 4;
    return [data[o], data[o+1], data[o+2]];
  };
  // color de fondo = esquina superior izquierda (crema)
  const bg = px(4, 4);
  const bgLike = (x, y) => {
    const [r, g, b] = px(x, y);
    const dr = r-bg[0], dg = g-bg[1], db = b-bg[2];
    if (Math.sqrt(dr*dr + dg*dg + db*db) < 55) return true;        // crema
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), lum = (r+g+b)/3;
    if (mx-mn < 22 && lum > 110 && lum < 235) return true;         // sombra gris
    return false;
  };

  // fila inferior: mitad baja de la foto, 6 celdas iguales
  const y0 = Math.round(H*0.47), y1 = H;
  const cols = 6, cw = W/cols;
  const sprites = [];
  for (let c = 0; c < cols; c++){
    const x0 = Math.round(c*cw), x1 = Math.round((c+1)*cw);
    const w = x1-x0, h = y1-y0;
    // inundación desde el borde de la celda a través de píxeles "de fondo"
    const seen = new Uint8Array(w*h);
    const stack = [];
    const push = (x, y) => {
      if (x<0 || y<0 || x>=w || y>=h) return;
      const i = y*w+x;
      if (seen[i] || !bgLike(x0+x, y0+y)) return;
      seen[i] = 1; stack.push(i);
    };
    for (let x = 0; x < w; x++){ push(x, 0); push(x, h-1); }
    for (let y = 0; y < h; y++){ push(0, y); push(w-1, y); }
    while (stack.length){
      const i = stack.pop(), x = i%w, y = (i/w)|0;
      push(x+1,y); push(x-1,y); push(x,y+1); push(x,y-1);
    }
    // segunda pasada: barre restos de sombra (el fondo oscurecido conserva el
    // matiz crema: cada canal es ~el mismo porcentaje del color de fondo)
    const shadowOfBg = (x, y) => {
      const [r, g, b] = px(x0+x, y0+y);
      const kr = r/bg[0], kg = g/bg[1], kb = b/bg[2];
      const k = (kr+kg+kb)/3;
      if (k < 0.45 || k > 0.93) return false;
      return Math.abs(kr-k) < 0.12 && Math.abs(kg-k) < 0.12 && Math.abs(kb-k) < 0.12;
    };
    const seen2 = new Uint8Array(w*h);
    const stack2 = [];
    const push2 = (x, y) => {
      if (x<0 || y<0 || x>=w || y>=h) return;
      const i = y*w+x;
      if (seen2[i]) return;
      if (!seen[i] && !shadowOfBg(x, y)) return;
      seen2[i] = 1; stack2.push(i);
    };
    for (let x = 0; x < w; x++){ push2(x, 0); push2(x, h-1); }
    for (let y = 0; y < h; y++){ push2(0, y); push2(w-1, y); }
    while (stack2.length){
      const i = stack2.pop(), x = i%w, y = (i/w)|0;
      push2(x+1,y); push2(x-1,y); push2(x,y+1); push2(x,y-1);
    }
    for (let i = 0; i < w*h; i++) if (seen2[i]) seen[i] = 1;
    // primer plano = no alcanzado; recorte al bounding box
    let minX=w, minY=h, maxX=-1, maxY=-1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      if (!seen[y*w+x]){
        if (x<minX) minX=x; if (x>maxX) maxX=x;
        if (y<minY) minY=y; if (y>maxY) maxY=y;
      }
    }
    if (maxX < 0){ sprites.push(null); continue; }
    minX = Math.max(0, minX-4); minY = Math.max(0, minY-4);
    maxX = Math.min(w-1, maxX+4); maxY = Math.min(h-1, maxY+4);
    const sw = maxX-minX+1, sh = maxY-minY+1;
    const cv = document.createElement("canvas");
    cv.width = sw; cv.height = sh;
    const cx = cv.getContext("2d");
    cx.drawImage(full, x0+minX, y0+minY, sw, sh, 0, 0, sw, sh);
    // pone transparente lo que la inundación marcó como fondo
    const id = cx.getImageData(0, 0, sw, sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++){
      if (seen[(minY+y)*w + (minX+x)]) id.data[(y*sw+x)*4+3] = 0;
    }
    cx.putImageData(id, 0, 0);
    sprites.push(cv);
  }
  if (sprites.some(s => !s)) return { error: "no se encontraron los 6 sprites" };

  // hoja 4x2: frentes [0,1,2,1] arriba, espaldas [3,4,5,4] abajo
  const CELL_W = 220, CELL_H = 380;
  const sheet = document.createElement("canvas");
  sheet.width = CELL_W*4; sheet.height = CELL_H*2;
  const sx = sheet.getContext("2d");
  sx.imageSmoothingEnabled = false;
  const order = [0,1,2,1, 3,4,5,4];
  order.forEach((si, i) => {
    const sp = sprites[si];
    const scale = Math.min((CELL_W-20)/sp.width, (CELL_H-20)/sp.height);
    const dw = Math.round(sp.width*scale), dh = Math.round(sp.height*scale);
    const dx = (i%4)*CELL_W + Math.round((CELL_W-dw)/2);
    const dy = ((i/4)|0)*CELL_H + (CELL_H-10-dh); // pies apoyados abajo
    sx.drawImage(sp, dx, dy, dw, dh);
  });
  return { png: sheet.toDataURL("image/png"), sizes: sprites.map(s => s.width+"x"+s.height) };
}, "/" + SRC.replace(/ /g, "%20"));

if (dataUrl.error){ console.error("FALLO:", dataUrl.error); process.exit(1); }
console.log("sprites recortados:", dataUrl.sizes.join("  "));
fs.writeFileSync(path.join(root, OUT), Buffer.from(dataUrl.png.split(",")[1], "base64"));
console.log("→", OUT);

await browser.close();
server.close();
