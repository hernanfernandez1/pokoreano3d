// Verifica que la copia funciona bajo file:// (sin servidor).
import puppeteer from "puppeteer";
const b = await puppeteer.launch({ headless: "new", protocolTimeout: 240000 });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await p.goto("file:///C:/Users/herna/Desktop/pokoreano%20-%20copia/index.html?autostart", { waitUntil: "load", timeout: 90000 });
await new Promise(r => setTimeout(r, 12000));
console.log("pantalla:", await p.evaluate(() => document.querySelector(".screen.active")?.id));
console.log("debug:", await p.evaluate(() => { try { return JSON.stringify(World.debug()).slice(0,140); } catch(e){ return "ERR " + e.message; } }));
console.log("zona:", await p.evaluate(() => document.querySelector("#minimap-zone").textContent));
await p.screenshot({ path: "../test-shots/file_proto.png" });
console.log("errores:", errs.length ? errs.slice(0,8) : "ninguno");
await b.close();
