// Reduce las texturas 4K del pack de habitaciones y renderiza una vista de
// cada una → test-shots/room_0.png … room_2.png
// Uso: node tools/rooms_preview.mjs
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "assets/rooms_gltf");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".png":"image/png",
  ".gltf":"model/gltf+json", ".bin":"application/octet-stream" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8110, r));

const gltf = JSON.parse(fs.readFileSync(path.join(DIR, "rooms.gltf"), "utf8"));
const texOf = i => {
  const m = gltf.materials[gltf.meshes[i].primitives[0].material];
  return gltf.images[gltf.textures[m.pbrMetallicRoughness.baseColorTexture.index].source].uri;
};

const html = `<!doctype html><html><body style="margin:0;background:#f0e6d2">
<script type="importmap">{"imports":{"three":"/tools/node_modules/three/build/three.module.js","three/addons/":"/tools/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
renderer.setSize(700, 560);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const cam = new THREE.PerspectiveCamera(35, 700/560, 0.01, 100);
window.shot = (index) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#e8dcc6");
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8a70, 1.4));
  const d = new THREE.DirectionalLight(0xfff2d8, 1.1); d.position.set(3,6,4); scene.add(d);
  const obj = window.rooms[index].clone();
  const box = new THREE.Box3().setFromObject(obj);
  const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
  obj.position.sub(c);
  scene.add(obj);
  const r = Math.max(sz.x, sz.y, sz.z);
  cam.position.set(r*1.5, r*1.2, r*1.5);
  cam.lookAt(0, 0, 0);
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL("image/png");
};
// reduce una textura a 1024 y devuelve JPEG en data URI
window.shrink = (url, size, q) => new Promise((res, rej) => {
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const x = cv.getContext("2d");
    x.imageSmoothingQuality = "high";
    x.drawImage(img, 0, 0, size, size);
    res(cv.toDataURL("image/jpeg", q));
  };
  img.onerror = () => rej(new Error("no cargó " + url));
  img.src = url;
});
new GLTFLoader().load("/assets/rooms_gltf/rooms.gltf", g => {
  window.rooms = g.scene.children.slice();
  window.ready = true;
}, undefined, e => { window.loadError = String(e); });
</script></body></html>`;
fs.writeFileSync(path.join(root, "tools/_rooms_tmp.html"), html);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 720, height: 600 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
page.on("console", m => { if (m.type() === "error") console.log("[console]", m.text()); });
await page.goto("http://localhost:8110/tools/_rooms_tmp.html", { waitUntil: "load" });
await page.waitForFunction("window.ready === true || window.loadError", { timeout: 120000 });
const err = await page.evaluate(() => window.loadError);
if (err) throw new Error("GLTFLoader: " + err);

for (let i = 0; i < 3; i++){
  const uri = await page.evaluate(i => window.shot(i), i);
  fs.writeFileSync(path.join(root, `test-shots/room_${i}.png`), Buffer.from(uri.split(",")[1], "base64"));
  const tex = texOf(i);
  const jpg = await page.evaluate((u) => window.shrink(u, 1024, 0.84), "/assets/rooms_gltf/" + encodeURIComponent(tex));
  const bytes = Buffer.from(jpg.split(",")[1], "base64");
  fs.writeFileSync(path.join(DIR, `room_${i}_1024.jpg`), bytes);
  console.log(`room_${i}: preview OK · textura ${tex} → ${(bytes.length/1024).toFixed(0)} KB`);
}
fs.unlinkSync(path.join(root, "tools/_rooms_tmp.html"));
await browser.close();
server.close();
