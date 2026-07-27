// Hoja de contactos de ENV_ASSETS (js/envAssets.js) → test-shots/envassets_sheet.png
import puppeteer from "puppeteer";
import path from "node:path";
import fs from "node:fs";
import http from "node:http";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".png":"image/png" };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(p, (err, data) => {
    if (err){ res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" });
    res.end(data);
  });
});
await new Promise(r => server.listen(8105, r));

const COLS = 6, CW = 200, CH = 200;
const html = `<!doctype html><html><body style="margin:0;background:#dbe6f2">
<canvas id="sheet"></canvas>
<script src="/lib/three.min.js"></script>
<script src="/js/envAssets.js"></script>
<script>
const N = ENV_ASSETS.objects.length;
const ROWS = Math.ceil(N/${COLS});
const sheet = document.getElementById("sheet");
sheet.width = ${COLS}*${CW}; sheet.height = ROWS*${CH};
const sctx = sheet.getContext("2d");
sctx.fillStyle = "#dbe6f2"; sctx.fillRect(0,0,sheet.width,sheet.height);
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
renderer.setSize(${CW}, ${CH});
renderer.outputColorSpace = THREE.SRGBColorSpace;
function b64ToF32(s){ const b=atob(s); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i); return new Float32Array(u.buffer); }
function b64ToU32(s){ const b=atob(s); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i); return new Uint32Array(u.buffer); }
const tex = new THREE.TextureLoader().load(ENV_ASSETS.foliageTex, () => { window.texReady = true; });
tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false;
const cam = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
window.run = () => {
  ENV_ASSETS.objects.forEach((o, i) => {
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x88a060, 1.2));
    const d = new THREE.DirectionalLight(0xfff2d8, 1.0); d.position.set(3,5,2); scene.add(d);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(b64ToF32(o.pos), 3));
    if (o.nor) g.setAttribute("normal", new THREE.BufferAttribute(b64ToF32(o.nor), 3));
    else g.computeVertexNormals();
    if (o.uv) g.setAttribute("uv", new THREE.BufferAttribute(b64ToF32(o.uv), 2));
    if (o.idx) g.setIndex(new THREE.BufferAttribute(b64ToU32(o.idx), 1));
    const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({
      color: o.color, map: o.tex ? tex : null, alphaTest: o.alphaTest || 0, side: THREE.DoubleSide }));
    scene.add(mesh);
    const dd = Math.max(o.size[0], o.size[1], o.size[2]);
    cam.position.set(dd*1.5, o.size[1]*0.8 + dd*0.8, dd*1.5);
    cam.lookAt(0, o.size[1]*0.45, 0);
    renderer.render(scene, cam);
    const cx = (i % ${COLS})*${CW}, cy = Math.floor(i/${COLS})*${CH};
    sctx.drawImage(renderer.domElement, cx, cy);
    sctx.fillStyle = "#123"; sctx.font = "bold 20px monospace";
    sctx.fillText(i + " " + o.name, cx+6, cy+22);
  });
  return sheet.toDataURL("image/png");
};
</script></body></html>`;
fs.writeFileSync(path.join(root, "tools/_sheet_tmp.html"), html);

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: COLS*CW, height: 600 });
page.on("pageerror", e => console.log("[pageerror]", e.message));
await page.goto("http://localhost:8105/tools/_sheet_tmp.html", { waitUntil: "load" });
await page.waitForFunction("window.texReady === true", { timeout: 20000 });
const uri = await page.evaluate(() => window.run());
fs.writeFileSync(path.join(root, "test-shots/envassets_sheet.png"), Buffer.from(uri.split(",")[1], "base64"));
fs.unlinkSync(path.join(root, "tools/_sheet_tmp.html"));
await browser.close();
server.close();
console.log("OK test-shots/envassets_sheet.png");
