import puppeteer from "puppeteer";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { fileURLToPath } from "url";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript" };
const srv = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const data = await readFile(join(ROOT, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => srv.listen(0, r));
const port = srv.address().port;
const b = await puppeteer.launch({ headless: "new", protocolTimeout: 60000 });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 800 });
await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load", timeout: 60000 });
await p.evaluate(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  State.addCoins(25); State.addXp(9);
  UI.refreshTopbar();
  UI.showScreen("screen-map");
  UI.startWildBattleWord(Data.allWords[0]);
  // bajar algo de HP para ver colores
  for (let t = 0; t < 14; t++){
    const btns = Array.from(document.querySelectorAll("#battle-options .option")).filter(b => b.className === "option" && !b.disabled);
    if (!btns.length) break;
    btns[0].click();
    await sleep(1000);
    if (document.querySelector("#battle-feedback").classList.contains("ok")) break;
  }
});
await new Promise(r => setTimeout(r, 120));
await p.screenshot({ path: "../test-shots/hud_battle.png" });
await p.evaluate(() => { UI.showScreen("screen-map"); UI.refreshTopbar(); });
await new Promise(r => setTimeout(r, 450));
await p.screenshot({ path: "../test-shots/hud_topbar.png", clip: { x:0, y:0, width:1280, height:120 } });
await b.close();
srv.close();
console.log("shots ok");
