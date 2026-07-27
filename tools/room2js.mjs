// Hornea una habitación del pack isométrico → js/homeRoom.js
// La geometría va en base64 y la textura base 4K se reduce a 1024 JPEG, que es
// lo único que hace falta (el juego usa materiales Lambert, no PBR).
// Uso: node tools/room2js.mjs [indiceHabitacion]
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOM = Number(process.argv[2] ?? 0);
const OUT = path.join(root, "js/homeRoom.js");
const TEX_SIZE = 1024, TEX_Q = 0.85;

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
await new Promise(r => server.listen(8111, r));

const gltf = JSON.parse(fs.readFileSync(path.join(root, "assets/rooms_gltf/rooms.gltf"), "utf8"));
const mat = gltf.materials[gltf.meshes[ROOM].primitives[0].material];
const texUri = gltf.images[gltf.textures[mat.pbrMetallicRoughness.baseColorTexture.index].source].uri;

const html = `<!doctype html><html><body>
<script type="importmap">{"imports":{"three":"/tools/node_modules/three/build/three.module.js","three/addons/":"/tools/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const b64 = buf => {
  const u = new Uint8Array(buf);
  let s = "";
  for (let i=0; i<u.length; i+=0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i+0x8000));
  return btoa(s);
};
window.bake = (index) => {
  const obj = window.rooms[index];
  obj.updateMatrixWorld(true);
  const meshes = [];
  const box = new THREE.Box3();
  obj.traverse(m => {
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);   // hornea la transformación del nodo
    if (!g.attributes.normal) g.computeVertexNormals();
    const idx = g.index ? new Uint32Array(g.index.array) : null;
    meshes.push({
      pos: b64(new Float32Array(g.attributes.position.array).buffer),
      nor: b64(new Float32Array(g.attributes.normal.array).buffer),
      uv:  g.attributes.uv ? b64(new Float32Array(g.attributes.uv.array).buffer) : null,
      idx: idx ? b64(idx.buffer) : null,
    });
    g.computeBoundingBox();
    box.union(g.boundingBox);
  });
  return { meshes, bbox: { min: box.min.toArray(), max: box.max.toArray() } };
};
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
fs.writeFileSync(path.join(root, "tools/_room_tmp.html"), html);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8111/tools/_room_tmp.html", { waitUntil: "load" });
await page.waitForFunction("window.ready === true || window.loadError", { timeout: 120000 });
const err = await page.evaluate(() => window.loadError);
if (err) throw new Error("GLTFLoader: " + err);

const model = await page.evaluate(i => window.bake(i), ROOM);
model.tex = await page.evaluate((u, s, q) => window.shrink(u, s, q),
  "/assets/rooms_gltf/" + encodeURIComponent(texUri), TEX_SIZE, TEX_Q);

const js = `/* Habitación isométrica ${ROOM} del pack free-isometric-rooms, horneada por
   tools/room2js.mjs. Geometría en base64 y la textura base reducida a
   ${TEX_SIZE}px JPEG (el juego sombrea con Lambert, los mapas PBR no se usan). */
const HOME_ROOM_MODEL = ${JSON.stringify(model)};
`;
fs.writeFileSync(OUT, js);
fs.unlinkSync(path.join(root, "tools/_room_tmp.html"));
console.log("bbox:", JSON.stringify(model.bbox.min.map(v=>+v.toFixed(3))), "→", JSON.stringify(model.bbox.max.map(v=>+v.toFixed(3))));
console.log("mallas:", model.meshes.length, "· js/homeRoom.js:", (fs.statSync(OUT).size/1024/1024).toFixed(2), "MB");
await browser.close();
server.close();
