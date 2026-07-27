// Hornea Assets.obj (StylisedEnv, 22 objetos individuales) → js/envAssets.js
// Cada objeto queda separado, centrado XZ, base en y=0, con su bbox.
// La textura Foliage.png va embebida como data URI (funciona desde file://).
// Uso: node tools/obj_assets2js.mjs
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OBJ = path.join(root, "assets/uploads_files_7236724_StylisedEnv/StylisedEnv/Obj/Obj/Assets.obj");
const FOLIAGE = path.join(root, "assets/gfx/env/Foliage.png");
const OUT = path.join(root, "js/envAssets.js");

// materiales del pack (Assets.mtl): Flowers → Foliage.png (con alfa),
// Props → roca gris (su Kd verde es basura de exportación)
const MAT_STYLE = {
  Flowers: { tex: true,  alphaTest: 0.5, color: "#ffffff" },
  Props:   { tex: false, alphaTest: 0,   color: "#a9b2a4" },
  Ground:  { tex: false, alphaTest: 0,   color: "#7ecb54" },
  Water:   { tex: false, alphaTest: 0,   color: "#33b0c7" },
};

const group = new OBJLoader().parse(fs.readFileSync(OBJ, "utf8"));
group.updateMatrixWorld(true);

const objects = [];
group.traverse(o => {
  if (!o.isMesh) return;
  const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  g.translate(-cx, -bb.min.y, -cz);
  g.computeBoundingBox();
  const matName = (Array.isArray(o.material) ? o.material[0] : o.material).name || "Props";
  const style = MAT_STYLE[matName] || MAT_STYLE.Props;
  objects.push({
    name: o.name,
    mat: matName,
    size: g.boundingBox.getSize(new THREE.Vector3()).toArray(),
    pos: g.attributes.position.array,
    nor: g.attributes.normal ? g.attributes.normal.array : null,
    uv: g.attributes.uv ? g.attributes.uv.array : null,
    idx: g.index ? Array.from(g.index.array) : null,
    ...style,
  });
});
objects.sort((a, b) => a.name.localeCompare(b.name));
objects.forEach(o => console.log(o.name.padEnd(14), o.mat.padEnd(8),
  "verts:", String(o.pos.length/3).padStart(5),
  "size:", o.size.map(v => v.toFixed(2)).join(" x ")));

const b64 = arr => Buffer.from(new Float32Array(arr).buffer).toString("base64");
const b64u32 = arr => Buffer.from(new Uint32Array(arr).buffer).toString("base64");
const foliageURI = "data:image/png;base64," + fs.readFileSync(FOLIAGE).toString("base64");

const data = {
  foliageTex: foliageURI,
  objects: objects.map(o => ({
    name: o.name, mat: o.mat,
    size: o.size,
    pos: b64(o.pos),
    nor: o.nor ? b64(o.nor) : null,
    uv: o.uv ? b64(o.uv) : null,
    idx: o.idx ? b64u32(o.idx) : null,
    n: o.pos.length / 3,
    color: o.color, tex: o.tex, alphaTest: o.alphaTest,
  })),
};

const js = `/* StylisedEnv — 22 assets individuales (Assets.obj) horneados por tools/obj_assets2js.mjs
   Cada objeto: centrado XZ, base en y=0, size = bbox. Foliage.png embebida (data URI). */
const ENV_ASSETS = ${JSON.stringify(data)};
`;
fs.writeFileSync(OUT, js);
console.log("escrito", OUT, (fs.statSync(OUT).size/1024).toFixed(0) + " KB");
