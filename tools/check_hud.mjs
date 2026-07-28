// Prueba local del HUD sin arrancar el mundo 3D (Three.js satura headless).
import puppeteer from "puppeteer";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MIME = { ".html":"text/html", ".css":"text/css", ".js":"text/javascript", ".png":"image/png", ".glb":"model/gltf-binary", ".json":"application/json" };
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
const errs = [];
p.on("pageerror", e => errs.push("pageerror: " + e.message));
p.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text()); });
await p.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load", timeout: 60000 });

const r = await p.evaluate(async () => {
  const out = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // --- Topbar: XP + chips + bump/float (sin World) ---
  UI.refreshTopbar();
  out.xpText1 = document.querySelector("#xp-text")?.textContent;
  out.xpW1 = document.querySelector("#xp-fill")?.style.width;
  out.statChips = document.querySelectorAll(".stats .stat").length;
  State.addCoins(25); State.addXp(3);
  UI.refreshTopbar();
  const coinChip = document.querySelector("#stat-coins").closest(".stat");
  out.bump = coinChip.classList.contains("bump");
  out.float = coinChip.querySelector(".float-txt")?.textContent;
  out.xpText2 = document.querySelector("#xp-text")?.textContent;
  out.xpW2 = document.querySelector("#xp-fill")?.style.width;

  // --- Transición de pantalla ---
  UI.showScreen("screen-map");
  out.mapAnim = getComputedStyle(document.querySelector("#screen-map")).animationName;

  // --- Batalla: floats de daño, HP por color, combo hot ---
  UI.startWildBattleWord(Data.allWords[0]);
  out.battleScreen = document.querySelector(".screen.active")?.id;
  out.battleEntrance = getComputedStyle(document.querySelector("#enemy-sprite svg, #enemy-sprite img") || document.body).animationName;
  // responder bien (botón correcto)
  const q1ok = Array.from(document.querySelectorAll("#battle-options .option"))
    .find(b => b.textContent && b.className === "option" && b.textContent === (window.__q = null, b.textContent));
  // hallar la correcta desde el estado interno no es posible; usamos la del engine:
  const correctBtn = Array.from(document.querySelectorAll("#battle-options .option")).find(b => {
    // la pregunta correcta se reconoce porque al hacer clic el feedback dice Correcto
    return false;
  });
  // estrategia: probar cada botón en batallas nuevas hasta acertar
  let hitOk = false;
  for (let tries = 0; tries < 12 && !hitOk; tries++){
    const btns = Array.from(document.querySelectorAll("#battle-options .option"))
      .filter(b => b.className === "option" && !b.disabled);
    if (!btns.length) break;
    btns[0].click();
    await sleep(30);
    hitOk = document.querySelector("#battle-feedback").classList.contains("ok");
    if (!hitOk){ await sleep(950); } // siguiente pregunta
  }
  out.dmgFloat = !!document.querySelector("#enemy-sprite .float-txt");
  out.hpEnemyW = document.querySelector("#enemy-hp").style.width;
  // provocar fallo para ver daño al jugador
  let badDone = false;
  for (let tries = 0; tries < 12 && !badDone; tries++){
    await sleep(1000);
    const btns = Array.from(document.querySelectorAll("#battle-options .option"))
      .filter(b => b.className === "option" && !b.disabled);
    if (!btns.length) break;
    // si antes acertamos con btns[0] puede volver a acertar; da igual, buscamos un fallo
    btns[btns.length-1].click();
    await sleep(30);
    badDone = document.querySelector("#battle-feedback").classList.contains("bad");
  }
  out.playerDmgFloat = !!document.querySelector("#battle-player-sprite .float-txt");
  out.hpPlayerCls = document.querySelector("#player-hp").className;
  out.comboHot = document.querySelector(".player-side .label").classList.contains("hot");
  out.optAnim = getComputedStyle(document.querySelector("#battle-options .option")).animationName;

  // --- Toast + banner ---
  UI.toast("prueba");
  out.toastShown = document.querySelector("#toast").classList.contains("show");
  out.toastAnim = getComputedStyle(document.querySelector("#toast")).animationName;
  UI.updateQuestBanner();
  out.bannerPop = document.querySelector("#quest-banner").classList.contains("pop");
  return out;
});
console.log(JSON.stringify(r, null, 1));
console.log("errores:", errs.length ? errs.slice(0,6) : "ninguno");
await b.close();
srv.close();
