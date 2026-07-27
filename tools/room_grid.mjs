// Vista cenital del cuarto de Karol con la rejilla de tiles encima, para
// saber qué casillas ocupan los muebles. → test-shots/room_grid.png
// Uso: node tools/room_grid.mjs [scale] [x] [z] [rotYenGrados]
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [SC = 5.2, PX = 3.5, PZ = 5.2, ROT = 180] = process.argv.slice(2).map(Number);
const MW = 7, MH = 8;

const MIME = { ".html":"text/html", ".js":"text/javascript", ".png":"image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8113, r));

const PPT = 90; // píxeles por tile en la imagen final
const html = `<!doctype html><html><body style="margin:0">
<canvas id="out" width="${MW*PPT}" height="${MH*PPT}"></canvas>
<script src="/lib/three.min.js"></script>
<script src="/js/homeRoom.js"></script>
<script>
function b64ToF32(s){const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Float32Array(u.buffer);}
function b64ToU32(s){const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new Uint32Array(u.buffer);}
const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true, alpha:true });
renderer.setSize(${MW*PPT}, ${MH*PPT});
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a70, 1.5));
const dl = new THREE.DirectionalLight(0xfff2d8, 0.9); dl.position.set(2,8,3); scene.add(dl);
const tex = new THREE.TextureLoader().load(HOME_ROOM_MODEL.tex, () => { window.texReady = true; });
tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
const mat = new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide });
const g = new THREE.Group();
HOME_ROOM_MODEL.meshes.forEach(m => {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(b64ToF32(m.pos), 3));
  if (m.nor) geo.setAttribute("normal", new THREE.BufferAttribute(b64ToF32(m.nor), 3));
  if (m.uv) geo.setAttribute("uv", new THREE.BufferAttribute(b64ToF32(m.uv), 2));
  if (m.idx) geo.setIndex(new THREE.BufferAttribute(b64ToU32(m.idx), 1));
  g.add(new THREE.Mesh(geo, mat));
});
const bb = HOME_ROOM_MODEL.bbox;
const inner = new THREE.Group();
inner.position.set(-(bb.min[0]+bb.max[0])/2, -bb.min[1], -(bb.min[2]+bb.max[2])/2);
inner.add(g);
const outer = new THREE.Group();
outer.add(inner);
outer.scale.set(${SC}, ${SC}*0.82, ${SC});
outer.rotation.y = ${ROT} * Math.PI/180;
outer.position.set(${PX}, 0, ${PZ});
scene.add(outer);
// cámara ortográfica cenital cubriendo el mapa de tiles completo
const cam = new THREE.OrthographicCamera(0, ${MW}, 0, -${MH}, 0.1, 100);
cam.position.set(0, 40, 0);
cam.rotation.x = -Math.PI/2;
window.run = () => {
  renderer.render(scene, cam);
  const out = document.getElementById("out");
  const x = out.getContext("2d");
  x.fillStyle = "#20242c"; x.fillRect(0,0,out.width,out.height);
  x.drawImage(renderer.domElement, 0, 0);
  x.strokeStyle = "rgba(255,60,60,.75)"; x.lineWidth = 1.5;
  x.font = "bold 15px monospace"; x.fillStyle = "#ff4040";
  for (let ty=0; ty<${MH}; ty++) for (let tx=0; tx<${MW}; tx++){
    x.strokeRect(tx*${PPT}, ty*${PPT}, ${PPT}, ${PPT});
    x.fillText(tx + "," + ty, tx*${PPT}+5, ty*${PPT}+18);
  }
  return out.toDataURL("image/png");
};
</script></body></html>`;
fs.writeFileSync(path.join(root, "tools/_grid_tmp.html"), html);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: MW*PPT + 40, height: MH*PPT + 40 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8113/tools/_grid_tmp.html", { waitUntil: "load" });
await page.waitForFunction("window.texReady === true", { timeout: 60000 });
const uri = await page.evaluate(() => window.run());
fs.writeFileSync(path.join(root, "test-shots/room_grid.png"), Buffer.from(uri.split(",")[1], "base64"));
fs.unlinkSync(path.join(root, "tools/_grid_tmp.html"));
console.log(`OK test-shots/room_grid.png (escala ${SC}, centro ${PX},${PZ}, rot ${ROT}°)`);
await browser.close();
server.close();
