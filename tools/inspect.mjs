// Inspecciona casa.fbx: nombres de nodos, tamaños, materiales.
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

globalThis.window = { innerWidth: 1920, innerHeight: 1080 };
const texUrls = [];
THREE.TextureLoader.prototype.load = function (url) {
  const t = new THREE.Texture(); t.name = decodeURIComponent(url);
  texUrls.push(t.name); return t;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const buf = fs.readFileSync(path.join(root, "assets/47-house-in-the-seacorrected_blendfbx/casa.fbx"));
const group = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
group.updateMatrixWorld(true);

const warn = console.warn; let ngons = 0;
console.log("=== jerarquía ===");
group.traverse(o => {
  if (!o.isMesh) { if (o !== group) console.log("nodo:", o.name, o.type); return; }
  const b = new THREE.Box3().setFromObject(o);
  const s = new THREE.Vector3(); b.getSize(s);
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  console.log(
    "mesh:", (o.name || "(sin nombre)").padEnd(28),
    "verts:", String(o.geometry.attributes.position.count).padStart(6),
    "size:", s.toArray().map(v => v.toFixed(0)).join("x").padEnd(20),
    "mats:", mats.map(m => (m.name||"?") + (m.map?("[T:" + m.map.name + "]"):"") + "(" + (m.color?m.color.getHexString():"-") + ")").join("|")
  );
});
console.log("texturas:", texUrls);
