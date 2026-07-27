// Hornea tools/casa.glb (assimp) → js/seaHouse.js (buffers base64).
// Mismo filtrado/paleta que antes. Uso: node tools/glb2js.mjs
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GLB = path.join(root, "tools/casa.glb");
const OUT = path.join(root, "js/seaHouse.js");

// stubs mínimos de DOM para GLTFLoader en Node
globalThis.window = { innerWidth: 1920, innerHeight: 1080 };
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close(){} });
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || (() => "blob:stub");

const glb = fs.readFileSync(GLB);
const gltf = await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength), "");
const group = gltf.scene;
group.updateMatrixWorld(true);

const SKIP_MAT = new Set(["CESPED", "agua"]);
const SKIP_MESH = /^(Sea|Water|Ocean)/i;

// paleta por nombre de material (los colores del FBX eran basura)
const PALETTE = {
  madera: "#9c7443", teja1: "#e8894a", teja2: "#c96f35", pared: "#f5efe2",
  ROCA: "#9aa0a8", Verde: "#7ecb54", SUB: "#b09468",
  VIDRIO: "#bfe6ff", LAMPARA: "#33314e", Material: "#bfe6ff",
};

const entries = [];
let seaLevel = 0;
const names = new Set();
group.traverse(obj => {
  if (!obj.isMesh) return;
  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
  mats.forEach(m => names.add(m.name));
  if (SKIP_MESH.test(obj.name)){
    const b = new THREE.Box3().setFromObject(obj);
    seaLevel = b.max.y;
    return;
  }
  if (mats.every(m => SKIP_MAT.has(m.name))) return;
  const g = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
  if (g.groups && g.groups.length > 1 && mats.length > 1){
    g.groups.forEach(gr => {
      const m = mats[gr.materialIndex] || mats[0];
      if (SKIP_MAT.has(m.name)) return;
      let idx;
      if (g.index) idx = g.index.array.slice(gr.start, gr.start + gr.count);
      else { idx = new Uint32Array(gr.count); for (let i = 0; i < gr.count; i++) idx[i] = gr.start + i; }
      entries.push(makeEntry(g, idx, m));
    });
  } else {
    entries.push(makeEntry(g, g.index ? g.index.array : null, mats[0]));
  }
});
console.log("materiales:", [...names].join(", "));

function makeEntry(g, index, m){
  return {
    pos: g.attributes.position.array,
    nor: g.attributes.normal ? g.attributes.normal.array : null,
    idx: index ? Array.from(index) : null,
    color: PALETTE[(m && m.name) || ""] || (m && m.color ? "#" + m.color.getHexString() : "#cccccc"),
    matName: (m && m.name) || "?",
  };
}

const box = new THREE.Box3();
entries.forEach(e => {
  for (let i = 0; i < e.pos.length; i += 3)
    box.expandByPoint(new THREE.Vector3(e.pos[i], e.pos[i+1], e.pos[i+2]));
});
const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
entries.forEach(e => {
  for (let i = 0; i < e.pos.length; i += 3){
    e.pos[i] -= cx; e.pos[i+1] -= seaLevel; e.pos[i+2] -= cz;
  }
});
box.min.x -= cx; box.max.x -= cx; box.min.z -= cz; box.max.z -= cz;
box.min.y -= seaLevel; box.max.y -= seaLevel;

const size = new THREE.Vector3(); box.getSize(size);
console.log("meshes:", entries.length,
  "| size:", size.toArray().map(v => v.toFixed(0)).join("x"),
  "| y:", box.min.y.toFixed(0), "..", box.max.y.toFixed(0));

const b64 = arr => Buffer.from(new Float32Array(arr).buffer).toString("base64");
const b64u32 = arr => Buffer.from(new Uint32Array(arr).buffer).toString("base64");

const data = {
  bbox: { min: box.min.toArray(), max: box.max.toArray() },
  meshes: entries.map(e => ({
    pos: b64(e.pos),
    nor: e.nor ? b64(e.nor) : null,
    idx: e.idx ? b64u32(e.idx) : null,
    n: e.pos.length / 3,
    color: e.color,
    mat: e.matName,
  })),
};

const js = `/* Casa en el mar — casa.fbx → GLB (assimp) → horneado por tools/glb2js.mjs
   Sin mar ni césped del asset. Centro XZ en origen, nivel del mar en y=0.
   Buffers Float32/Uint32 en base64. */
const SEA_HOUSE_MODEL = ${JSON.stringify(data)};
`;
fs.writeFileSync(OUT, js);
console.log("escrito", OUT, (fs.statSync(OUT).size/1024).toFixed(0) + " KB");
