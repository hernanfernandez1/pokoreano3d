// Convierte casa.fbx → GLB con assimp (WASM) y lo pasa por el mismo
// pipeline de horneado que fbx2js.mjs (vía GLTFLoader de three).
// Uso: node tools/fbx2glb.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assimpjs from "assimpjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FBX = path.join(root, "assets/47-house-in-the-seacorrected_blendfbx/casa.fbx");
const OUT = path.join(root, "tools/casa.glb");

const ajs = await assimpjs();
const fl = new ajs.FileList();
fl.AddFile("casa.fbx", new Uint8Array(fs.readFileSync(FBX)));
const result = ajs.ConvertFileList(fl, "glb2");
if (!result.IsSuccess() || result.FileCount() === 0){
  console.error("fallo assimp:", result.GetErrorCode ? result.GetErrorCode() : result);
  process.exit(1);
}
fs.writeFileSync(OUT, Buffer.from(result.GetFile(0).GetContent()));
console.log("GLB escrito:", OUT, (fs.statSync(OUT).size/1024).toFixed(0) + " KB");
