// Captura del juego publicado en GitHub Pages → test-shots/live.png
import puppeteer from "puppeteer";
import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const URL = process.argv[2] || "https://hernanfernandez1.github.io/pokoreano3d/";
const b = await puppeteer.launch({ headless: "new" });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
p.on("dialog", d => d.accept());
await p.goto(URL, { waitUntil: "load", timeout: 120000 });
await p.click('[data-action="new-game"]');
await p.waitForFunction('typeof World !== "undefined" && World.debug().ready', { timeout: 30000 });
await new Promise(r => setTimeout(r, 2500));
await p.screenshot({ path: path.join(root, "test-shots/live.png") });
console.log("captura de", URL);
await b.close();
