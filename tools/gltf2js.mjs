// Hornea Garden.gltf (StylisedEnv) → js/envGarden.js (buffers base64 + texturas).
// Uso: node tools/gltf2js.mjs
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(root, "assets/uploads_files_7236724_StylisedEnv/StylisedEnv/Gltf/Gltf");
const OUT = path.join(root, "js/envGarden.js");

globalThis.window = { innerWidth: 1920, innerHeight: 1080 };
globalThis.self = globalThis;
globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close(){} });
globalThis.URL.createObjectURL = globalThis.URL.createObjectURL || (() => "blob:stub");

// material → textura / alphaMode, leído directo del JSON del gltf
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
console.log("materiales:", JSON.stringify(matInfo, null, 1));
// El pack exportó Flowers como opaco, pero sus tarjetas usan el canal alfa
// del atlas (fondo negro = transparente). Forzamos el recorte por alfa.
if (matInfo.Flowers) matInfo.Flowers.alphaTest = 0.5;

// GLTFLoader en Node no puede cargar Garden.bin (FileLoader usa fetch/XHR).
// Empaquetamos JSON+BIN como GLB en memoria y le quitamos las referencias a
// texturas (ya las extrajimos arriba; aquí solo nos interesa la geometría).
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
const group = gltf.scene;
group.updateMatrixWorld(true);

const entries = [];
group.traverse(obj => {
  if (!obj.isMesh) return;
  const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
  const g = obj.geometry.clone().applyMatrix4(obj.matrixWorld);
  if (g.groups && g.groups.length > 1 && mats.length > 1){
    g.groups.forEach(gr => {
      const m = mats[gr.materialIndex] || mats[0];
      let idx;
      if (g.index) idx = g.index.array.slice(gr.start, gr.start + gr.count);
      else { idx = new Uint32Array(gr.count); for (let i = 0; i < gr.count; i++) idx[i] = gr.start + i; }
      entries.push(makeEntry(g, idx, m));
    });
  } else {
    entries.push(makeEntry(g, g.index ? g.index.array : null, mats[0]));
  }
});

// --- parche: el campo de flores del GLTF salió con TODOS los triángulos
// degenerados (fallo de exportación del pack). Lo sustituimos por el objeto
// "Flowers" de Environment.obj, que sí viene con geometría realizada.
for (let i = entries.length - 1; i >= 0; i--){
  if (entries[i].matName === "Flowers") entries.splice(i, 1);
}
{
  const objText = fs.readFileSync(path.join(root, "assets/uploads_files_7236724_StylisedEnv/StylisedEnv/Obj/Obj/Environment.obj"), "utf8");
  const objGroup = new OBJLoader().parse(objText);
  objGroup.updateMatrixWorld(true);
  let found = false;
  objGroup.traverse(o => {
    if (!o.isMesh || found) return;
    if (!/flowers/i.test(o.name) && !/flowers/i.test(o.parent?.name || "")) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    entries.push(makeEntry(g, g.index ? g.index.array : null, { name: "Flowers" }));
    found = true;
  });
  if (!found) console.warn("¡no se encontró el objeto Flowers en el OBJ!");
}

function makeEntry(g, index, m){
  const info = matInfo[(m && m.name) || ""] || { tex: null, alphaTest: 0, color: "#ffffff" };
  // colores de vértice (COLOR_0): aquí vive la paleta real del pack
  let col = null, colSize = 0;
  const ca = g.attributes.color;
  if (ca){
    colSize = ca.itemSize;
    col = new Float32Array(ca.count * colSize);
    for (let i = 0; i < ca.count; i++){
      col[i*colSize]   = ca.getX(i);
      col[i*colSize+1] = ca.getY(i);
      col[i*colSize+2] = ca.getZ(i);
      if (colSize === 4) col[i*colSize+3] = ca.getW(i);
    }
  }
  return {
    pos: g.attributes.position.array,
    nor: g.attributes.normal ? g.attributes.normal.array : null,
    uv: g.attributes.uv ? g.attributes.uv.array : null,
    col, colSize,
    idx: index ? Array.from(index) : null,
    color: info.color,
    tex: info.tex,
    alphaTest: info.alphaTest,
    matName: (m && m.name) || "?",
  };
}

// bbox y recentrado: centro XZ en origen, base en y=0
const box = new THREE.Box3();
entries.forEach(e => {
  for (let i = 0; i < e.pos.length; i += 3)
    box.expandByPoint(new THREE.Vector3(e.pos[i], e.pos[i+1], e.pos[i+2]));
});
const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
entries.forEach(e => {
  for (let i = 0; i < e.pos.length; i += 3){
    e.pos[i] -= cx; e.pos[i+1] -= box.min.y; e.pos[i+2] -= cz;
  }
});
const w = box.max.x - box.min.x, d = box.max.z - box.min.z, h = box.max.y - box.min.y;
console.log("meshes:", entries.length, "| size:", w.toFixed(1), "x", h.toFixed(1), "x", d.toFixed(1));

const b64 = arr => Buffer.from(new Float32Array(arr).buffer).toString("base64");
const b64u32 = arr => Buffer.from(new Uint32Array(arr).buffer).toString("base64");

const data = {
  bbox: { min: [-w/2, 0, -d/2], max: [w/2, h, d/2] },
  meshes: entries.map(e => ({
    pos: b64(e.pos),
    nor: e.nor ? b64(e.nor) : null,
    uv: e.uv ? b64(e.uv) : null,
    col: e.col ? b64(e.col) : null,
    colSize: e.colSize,
    idx: e.idx ? b64u32(e.idx) : null,
    n: e.pos.length / 3,
    color: e.color,
    tex: e.tex,
    alphaTest: e.alphaTest,
    mat: e.matName,
  })),
};

const js = `/* Jardín StylisedEnv — horneado por tools/gltf2js.mjs desde Garden.gltf
   Centro XZ en origen, base en y=0. Texturas en assets/gfx/env/.
   Buffers Float32/Uint32 en base64. */
const ENV_GARDEN_MODEL = ${JSON.stringify(data)};
`;
fs.writeFileSync(OUT, js);
console.log("escrito", OUT, (fs.statSync(OUT).size/1024).toFixed(0) + " KB");
