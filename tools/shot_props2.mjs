// Contact sheet: renderiza cada prop de js/envProps.js en una rejilla → test-shots/props_sheet.png
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
await new Promise(r => server.listen(8102, r));

const html = `<!doctype html><html><body style="margin:0;background:#dfe8f0">
<script src="/lib/three.min.js"></script>
<script src="/js/envProps.js"></script>
<script>
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(560, 420);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#cfe0f0");
scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a5b, 1.1));
const sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
sun.position.set(30, 50, 20);
scene.add(sun);
function b64ToF32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Float32Array(u.buffer); }
function b64ToU32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Uint32Array(u.buffer); }
const cam = new THREE.PerspectiveCamera(35, 560/420, 0.1, 50);
const objs = ENV_PROPS.objects;
const COLS = 10, CW = 140, CH = 105;
window.renderCell = (i) => {
  scene.clear();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a5b, 1.1));
  const s2 = new THREE.DirectionalLight(0xfff2d8, 0.9); s2.position.set(3,5,2); scene.add(s2);
  const o = objs[i];
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(b64ToF32(o.pos), 3));
  if (o.nor) g.setAttribute("normal", new THREE.BufferAttribute(b64ToF32(o.nor), 3));
  else g.computeVertexNormals();
  if (o.col) g.setAttribute("color", new THREE.BufferAttribute(b64ToF32(o.col), 3));
  g.setIndex(new THREE.BufferAttribute(b64ToU32(o.idx), 1));
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: !!o.col, color: o.col ? "#ffffff" : o.color, side: THREE.DoubleSide }));
  scene.add(mesh);
  const d = Math.max(o.size[0], o.size[1], o.size[2]);
  cam.position.set(d*1.3, o.size[1]*0.9 + d*0.5, d*1.3);
  cam.lookAt(0, o.size[1]*0.45, 0);
  renderer.render(scene, cam);
  const ctx = renderer.getContext("2d");
  return { i, name: o.name };
};
window.count = objs.length;
window.modelReady = true;
</script></body></html>`;
fs.writeFileSync(path.join(root, "tools/viewer_props.html"), html);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 140, height: 105, deviceScaleFactor: 2 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8102/tools/viewer_props.html", { waitUntil: "load" });
await page.waitForFunction("window.modelReady === true", { timeout: 20000 });
const n = await page.evaluate("window.count");
const COLS = 10, ROWS = Math.ceil(n / COLS), CW = 280, CH = 210, LABEL = 34;
const { PNG } = await import("pngjs").catch(() => ({}));
// componer con screenshots individuales + canvas en la página
await page.setViewport({ width: 560, height: 420, deviceScaleFactor: 1 });
const sheet = [];
for (let i = 0; i < n; i++){
  await page.evaluate(i => window.renderCell(i), i);
  const buf = await page.screenshot();
  sheet.push(buf);
}
await browser.close();
server.close();
// montar la rejilla con PIL vía archivo temporal (más simple: guardar celdas y montar con python)
const dir = path.join(root, "test-shots/props_cells2");
fs.mkdirSync(dir, { recursive: true });
sheet.forEach((b, i) => fs.writeFileSync(path.join(dir, `cell_${String(i).padStart(3,"0")}.png`), b));
console.log("celdas guardadas:", sheet.length, "en", dir);
