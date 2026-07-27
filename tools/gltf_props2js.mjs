// Hornea Garden.gltf (StylisedEnv) → js/envProps.js
// A diferencia de gltf2js.mjs (que fusiona por material), aquí cada NODO
// nombrado del glTF se exporta como un prop individual, recentrado
// (centro XZ en origen, base en y=0), con colores de vértice y UVs.
// Uso: node tools/gltf_props2js.mjs
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

// material → textura / alphaMode / color, leído directo del JSON del gltf
const spec = JSON.parse(fs.readFileSync(path.join(DIR, "Garden.gltf"), "utf8"));
const matInfo = {};
(spec.materials || []).forEach(m => {
  const pbr = m.pbrMetallicRoughness || {};
  let tex = null;
  if (pbr.baseColorTexture !== undefined){
    const src = spec.textures[pbr.baseColorTexture.index].source;
    tex = path.basename(spec.images[src].uri);
  }
  matInfo[m.name] = {
    tex,
    alphaTest: m.alphaMode === "MASK" ? (m.alphaCutoff ?? 0.5) : 0,
    color: pbr.baseColorFactor
      ? "#" + new THREE.Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2]).getHexString()
      : "#ffffff",
  };
});
if (matInfo.Flowers) matInfo.Flowers.alphaTest = 0.5; // tarjetas con alfa en el atlas

// Empaquetar JSON+BIN como GLB en memoria sin texturas (solo geometría)
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

// Cada mesh-nodo = un prop. Los troceamos por grupo de material si hace falta.
const props = [];
scene.traverse(obj => {
  if (!obj.isMesh) return;
  const name = obj.name || obj.parent?.name || "prop";
  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
  const g = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
  if (g.groups && g.groups.length > 1 && mats.length > 1){
    g.groups.forEach((gr, gi) => {
      const m = mats[gr.materialIndex] || mats[0];
      let idx;
      if (g.index) idx = g.index.array.slice(gr.start, gr.start + gr.count);
      else { idx = new Uint32Array(gr.count); for (let i = 0; i < gr.count; i++) idx[i] = gr.start + i; }
      props.push(makeEntry(g, idx, m, name + "." + gi));
    });
  } else {
    props.push(makeEntry(g, g.index ? g.index.array : null, mats[0], name));
  }
});

function makeEntry(g, index, m, name){
  const info = matInfo[(m && m.name) || ""] || { tex: null, alphaTest: 0, color: "#ffffff" };
  let col = null;
  const ca = g.attributes.color;
  if (ca){
    col = new Float32Array(ca.count * 3);
    for (let i = 0; i < ca.count; i++){
      col[i*3] = ca.getX(i); col[i*3+1] = ca.getY(i); col[i*3+2] = ca.getZ(i);
    }
  }
  return {
    name, mat: (m && m.name) || "?",
    pos: g.attributes.position.array,
    nor: g.attributes.normal ? g.attributes.normal.array : null,
    uv: g.attributes.uv ? g.attributes.uv.array : null,
    col,
    idx: index ? Array.from(index) : null,
    color: info.color, tex: info.tex, alphaTest: info.alphaTest,
  };
}

// Recentrar CADA prop: centro XZ en origen, base en y=0
const b64 = arr => Buffer.from(new Float32Array(arr).buffer).toString("base64");
const b64u32 = arr => Buffer.from(new Uint32Array(arr).buffer).toString("base64");
const out = props.map(p => {
  const box = new THREE.Box3();
  for (let i = 0; i < p.pos.length; i += 3)
    box.expandByPoint(new THREE.Vector3(p.pos[i], p.pos[i+1], p.pos[i+2]));
  const cx = (box.min.x + box.max.x)/2, cz = (box.min.z + box.max.z)/2;
  for (let i = 0; i < p.pos.length; i += 3){ p.pos[i] -= cx; p.pos[i+1] -= box.min.y; p.pos[i+2] -= cz; }
  const size = [box.max.x-box.min.x, box.max.y-box.min.y, box.max.z-box.min.z];
  return {
    name: p.name, mat: p.mat, size,
    pos: b64(p.pos), nor: p.nor ? b64(p.nor) : null, uv: p.uv ? b64(p.uv) : null,
    col: p.col ? b64(p.col) : null, idx: p.idx ? b64u32(p.idx) : null,
    color: p.color, tex: p.tex, alphaTest: p.alphaTest,
  };
});

console.log("props exportados:");
out.forEach(p => console.log(" ", p.name, "| mat:", p.mat, "| tex:", p.tex, "| size:", p.size.map(v => v.toFixed(2)).join("x"), "| verts base64:", p.pos.length));

const js = `/* Props individuales StylisedEnv — horneado por tools/gltf_props2js.mjs desde Garden.gltf
   Cada prop recentrado (centro XZ en origen, base y=0). Texturas: ENV_ASSETS.foliageTex / ENV_GROUND_TEX. */
const ENV_PROPS = ${JSON.stringify({ objects: out })};
`;
fs.writeFileSync(OUT, js);
console.log("escrito", OUT, (fs.statSync(OUT).size/1024).toFixed(0) + " KB");
