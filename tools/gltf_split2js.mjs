// Divide el mesh "Props" de Garden.gltf en componentes conexos (árboles,
// helechos, puente, banco, piedras…) → js/envProps.js
// Uso: node tools/gltf_split2js.mjs
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "assets/uploads_files_7236724_StylisedEnv/StylisedEnv/Gltf/Gltf");
const OUT = path.join(root, "js/envProps.js");

globalThis.window = { innerWidth: 1920, innerHeight: 1080 };
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close(){} });
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || (() => "blob:stub");

// material → info (del JSON del gltf)
const spec = JSON.parse(fs.readFileSync(path.join(DIR, "Garden.gltf"), "utf8"));
const matInfo = {};
(spec.materials || []).forEach(m => {
  const pbr = m.pbrMetallicRoughness || {};
  matInfo[m.name] = {
    color: pbr.baseColorFactor
      ? "#" + new THREE.Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2]).getHexString()
      : "#ffffff",
  };
});

// GLB en memoria sin texturas (solo geometría)
const json = JSON.parse(fs.readFileSync(path.join(DIR, "Garden.gltf"), "utf8"));
const bin = fs.readFileSync(path.join(DIR, json.buffers[0].uri));
delete json.images; delete json.textures; delete json.samplers;
(json.materials || []).forEach(m => { if (m.pbrMetallicRoughness) delete m.pbrMetallicRoughness.baseColorTexture; });
json.buffers = [{ byteLength: bin.length }];
let jsonBuf = Buffer.from(JSON.stringify(json));
while (jsonBuf.length % 4) jsonBuf = Buffer.concat([jsonBuf, Buffer.from(" ")]);
const binPad = (4 - (bin.length % 4)) % 4;
const binBuf = binPad ? Buffer.concat([bin, Buffer.alloc(binPad)]) : bin;
const glbBuf = Buffer.concat([
  (() => { const h = Buffer.alloc(12); h.writeUInt32LE(0x46546C67, 0); h.writeUInt32LE(2, 4);
    h.writeUInt32LE(12 + 8 + jsonBuf.length + 8 + binBuf.length, 8); return h; })(),
  (() => { const h = Buffer.alloc(8); h.writeUInt32LE(jsonBuf.length, 0); h.writeUInt32LE(0x4E4F534A, 4); return h; })(),
  jsonBuf,
  (() => { const h = Buffer.alloc(8); h.writeUInt32LE(binBuf.length, 0); h.writeUInt32LE(0x004E4942, 4); return h; })(),
  binBuf,
]);
const gltf = await new GLTFLoader().parseAsync(glbBuf.buffer.slice(glbBuf.byteOffset, glbBuf.byteOffset + glbBuf.byteLength), "");
const scene = gltf.scene;
scene.updateMatrixWorld(true);

// localizar el mesh "Props"
let src = null;
scene.traverse(o => {
  if (!o.isMesh) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  if (mats[0] && mats[0].name === "Props") src = o;
});
if (!src) throw new Error("no se encontró el mesh Props");
const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);

// --- soldar vértices por posición (tolerancia 1e-4) ---
const pos = geo.attributes.position.array;
const nVerts = pos.length / 3;
const weld = new Int32Array(nVerts); // vert → id soldado
const key2id = new Map();
let nW = 0;
for (let i = 0; i < nVerts; i++){
  const k = `${Math.round(pos[i*3]*1e4)},${Math.round(pos[i*3+1]*1e4)},${Math.round(pos[i*3+2]*1e4)}`;
  let id = key2id.get(k);
  if (id === undefined){ id = nW++; key2id.set(k, id); }
  weld[i] = id;
}

// --- union-find sobre triángulos ---
const idxArr = geo.index ? geo.index.array : (() => { const a = new Uint32Array(nVerts); for (let i=0;i<nVerts;i++) a[i]=i; return a; })();
const nTris = idxArr.length / 3;
const parent = new Int32Array(nTris); for (let i=0;i<nTris;i++) parent[i]=i;
const find = i => { while (parent[i]!==i){ parent[i]=parent[parent[i]]; i=parent[i]; } return i; };
const unite = (a,b) => { a=find(a); b=find(b); if (a!==b) parent[a]=b; };
const v2t = new Map(); // vert soldado → primer triángulo
for (let t = 0; t < nTris; t++){
  for (let e = 0; e < 3; e++){
    const v = weld[idxArr[t*3+e]];
    const prev = v2t.get(v);
    if (prev === undefined) v2t.set(v, t);
    else unite(prev, t);
  }
}
const comps = new Map(); // raíz → [triángulos]
for (let t = 0; t < nTris; t++){
  const r = find(t);
  if (!comps.has(r)) comps.set(r, []);
  comps.get(r).push(t);
}
console.log("triángulos:", nTris, "| componentes:", comps.size);

// --- exportar componentes con al menos MIN_TRIS triángulos ---
const MIN_TRIS = 6;
const nor = geo.attributes.normal ? geo.attributes.normal.array : null;
const uv = geo.attributes.uv ? geo.attributes.uv.array : null;
const colA = geo.attributes.color ? geo.attributes.color.array : null;
const info = matInfo.Props || { color: "#ffffff" };
const b64 = arr => Buffer.from(new Float32Array(arr).buffer).toString("base64");
const b64u32 = arr => Buffer.from(new Uint32Array(arr).buffer).toString("base64");

const objects = [];
[...comps.values()].forEach(tris => {
  if (tris.length < MIN_TRIS) return;
  const vmap = new Map(); // vert orig → nuevo índice
  const P = [], N = [], U = [], C = [], I = [];
  tris.forEach(t => {
    for (let e = 0; e < 3; e++){
      const vi = idxArr[t*3+e];
      let ni = vmap.get(vi);
      if (ni === undefined){
        ni = vmap.size; vmap.set(vi, ni);
        P.push(pos[vi*3], pos[vi*3+1], pos[vi*3+2]);
        if (nor) N.push(nor[vi*3], nor[vi*3+1], nor[vi*3+2]);
        if (uv) U.push(uv[vi*2], uv[vi*2+1]);
        if (colA) C.push(colA[vi*3], colA[vi*3+1], colA[vi*3+2]);
      }
      I.push(ni);
    }
  });
  // bbox + recentrado (centro XZ, base y=0)
  let minX=1e9,minY=1e9,minZ=1e9,maxX=-1e9,maxY=-1e9,maxZ=-1e9;
  for (let i = 0; i < P.length; i += 3){
    minX=Math.min(minX,P[i]); maxX=Math.max(maxX,P[i]);
    minY=Math.min(minY,P[i+1]); maxY=Math.max(maxY,P[i+1]);
    minZ=Math.min(minZ,P[i+2]); maxZ=Math.max(maxZ,P[i+2]);
  }
  const cx=(minX+maxX)/2, cz=(minZ+maxZ)/2;
  for (let i = 0; i < P.length; i += 3){ P[i]-=cx; P[i+1]-=minY; P[i+2]-=cz; }
  objects.push({
    size: [maxX-minX, maxY-minY, maxZ-minZ], tris: tris.length,
    pos: b64(P), nor: N.length ? b64(N) : null, uv: U.length ? b64(U) : null,
    col: C.length ? b64(C) : null, idx: b64u32(I),
    color: info.color, tex: null, alphaTest: 0,
  });
});

// ordenar de mayor a menor y nombrar
objects.sort((a,b) => b.tris - a.tris);
objects.forEach((o, i) => { o.name = "part" + String(i).padStart(2, "0"); });
console.log("exportados:", objects.length);
objects.forEach(o => console.log(" ", o.name, "| tris:", o.tris, "| size:", o.size.map(v => v.toFixed(2)).join("x")));

const js = `/* Props StylisedEnv separados por componentes conexos — tools/gltf_split2js.mjs
   Cada prop recentrado (centro XZ en origen, base y=0), con colores de vértice. */
const ENV_PROPS = ${JSON.stringify({ objects })};
`;
fs.writeFileSync(OUT, js);
console.log("escrito", OUT, (fs.statSync(OUT).size/1024).toFixed(0) + " KB");
