// Visor aislado del modelo SEA_HOUSE_MODEL: 4 ángulos → test-shots/model_*.png
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const html = `<!doctype html><html><body style="margin:0">
<script src="file://${path.join(root, "lib/three.min.js").replace(/\\/g, "/")}"></script>
<script src="file://${path.join(root, "js/seaHouse.js").replace(/\\/g, "/")}"></script>
<script>
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(900, 700);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color("#8ed8ff");
scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x8a9a5b, 1.0));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.0);
sun.position.set(30, 50, 20);
scene.add(sun);
function b64ToF32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Float32Array(u.buffer); }
function b64ToU32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Uint32Array(u.buffer); }
const grp = new THREE.Group();
SEA_HOUSE_MODEL.meshes.forEach(m => {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(b64ToF32(m.pos), 3));
  if (m.nor) g.setAttribute("normal", new THREE.BufferAttribute(b64ToF32(m.nor), 3));
  else g.computeVertexNormals();
  if (m.idx) g.setIndex(new THREE.BufferAttribute(b64ToU32(m.idx), 1));
  grp.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: m.color, side: THREE.DoubleSide })));
});
scene.add(grp);
// rejilla de referencia cada 250 u. y plano de agua
scene.add(new THREE.GridHelper(2400, 10, 0xff0000, 0xffffff));
const bb = SEA_HOUSE_MODEL.bbox;
const cam = new THREE.PerspectiveCamera(40, 900/700, 1, 20000);
const views = {
  front: [0, 400, 2600], side: [2600, 400, 0], top: [0, 3000, 1], persp: [1900, 1400, 1900],
};
window.renderView = (name) => {
  const v = views[name];
  cam.position.set(v[0], v[1], v[2]);
  cam.lookAt(0, 200, 0);
  renderer.render(scene, cam);
  return true;
};
window.modelReady = true;
</script></body></html>`;

fs.writeFileSync(path.join(root, "tools/viewer.html"), html);

const browser = await puppeteer.launch({ headless: "new", args: ["--allow-file-access-from-files"] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 700 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("file://" + path.join(root, "tools/viewer.html").replace(/\\/g, "/"), { waitUntil: "load" });
await page.waitForFunction("window.modelReady === true", { timeout: 15000 });
for (const v of ["front", "side", "top", "persp"]){
  await page.evaluate(n => window.renderView(n), v);
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: path.join(root, `test-shots/model_${v}.png`) });
}
await browser.close();
console.log("OK: test-shots/model_{front,side,top,persp}.png");
