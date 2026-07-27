// Visor aislado del jardín ENV_GARDEN_MODEL (con texturas, vía HTTP).
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".png":"image/png", ".jpg":"image/jpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8100, r));

const html = `<!doctype html><html><body style="margin:0">
<script src="/lib/three.min.js"></script>
<script src="/js/envGarden.js"></script>
<script>
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(900, 700);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#8ed8ff");
scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x8a9a5b, 1.0));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
sun.position.set(30, 50, 20);
scene.add(sun);
function b64ToF32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Float32Array(u.buffer); }
function b64ToU32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Uint32Array(u.buffer); }
const tl = new THREE.TextureLoader();
const grp = new THREE.Group();
ENV_GARDEN_MODEL.meshes.forEach(m => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(b64ToF32(m.pos), 3));
  if (m.nor) g.setAttribute("normal", new THREE.BufferAttribute(b64ToF32(m.nor), 3));
  else g.computeVertexNormals();
  if (m.uv) g.setAttribute("uv", new THREE.BufferAttribute(b64ToF32(m.uv), 2));
  if (m.col) g.setAttribute("color", new THREE.BufferAttribute(b64ToF32(m.col), m.colSize));
  if (m.idx) g.setIndex(new THREE.BufferAttribute(b64ToU32(m.idx), 1));
  const opts = { color: m.tex ? "#ffffff" : m.color, side: THREE.DoubleSide };
  if (m.tex){ const t = tl.load("/assets/gfx/env/" + m.tex); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; opts.map = t; }
  if (m.alphaTest) opts.alphaTest = m.alphaTest;
  if (m.col && !m.tex) opts.vertexColors = true;
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial(opts));
  mesh.userData.mat = m.mat;
  grp.add(mesh);
});
scene.add(grp);
window.debugRaise = (matName, dy) => {
  grp.children.forEach(c => { if (c.userData.mat === matName) c.position.y += dy; });
};
window.grp = grp;
window.THREE = THREE;
const cam = new THREE.PerspectiveCamera(40, 900/700, 0.1, 100);
const views = { persp: [7, 6, 8], side: [9, 2.5, 0], top: [0, 11, 0.5], close: [3, 3, 5] };
window.renderView = (name) => {
  const v = views[name];
  cam.position.set(v[0], v[1], v[2]);
  cam.lookAt(0, 1.5, 0);
  renderer.render(scene, cam);
  return true;
};
window.modelReady = true;
</script></body></html>`;
fs.writeFileSync(path.join(root, "tools/viewer_garden.html"), html);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8100/tools/viewer_garden.html", { waitUntil: "load" });
await page.waitForFunction("window.modelReady === true", { timeout: 15000 });
await new Promise(r => setTimeout(r, 1200));
// diagnóstico: subir las flores +0.35 para ver si están enterradas
await page.evaluate(() => window.debugRaise("Flowers", 0.35));
for (const v of ["persp", "close"]){
  await page.evaluate(n => window.renderView(n), v);
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: path.join(root, `test-shots/garden_${v}.png`) });
}
await browser.close();
server.close();
console.log("OK");
