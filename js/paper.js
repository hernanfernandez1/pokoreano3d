/* ==========================================================
   POKOREANO 3D — Paper: fábrica de assets "papel" (Paper Mario)
   Todo procedural: canvas 2D → THREE.CanvasTexture o geometrías
   low-poly de colores planos. Sin assets externos (CC0).
   ========================================================== */
const Paper = (() => {

  function canvas(w, h){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return c;
  }

  // ---------- 1. Borde blanco tipo recorte de papel ----------
  function outline(src, thickness = 6){
    const out = canvas(src.width + thickness*2, src.height + thickness*2);
    const x = out.getContext("2d");
    // silueta blanca del alpha del original
    const sil = canvas(src.width, src.height);
    const sx = sil.getContext("2d");
    sx.drawImage(src, 0, 0);
    sx.globalCompositeOperation = "source-in";
    sx.fillStyle = "#ffffff";
    sx.fillRect(0, 0, sil.width, sil.height);
    const STEPS = 16;
    for (let i = 0; i < STEPS; i++){
      const a = (i / STEPS) * Math.PI * 2;
      x.drawImage(sil, thickness + Math.cos(a)*thickness, thickness + Math.sin(a)*thickness);
    }
    x.drawImage(src, thickness, thickness);
    return out;
  }

  function rr(x, px, py, w, h, r){
    x.beginPath();
    x.moveTo(px+r, py);
    x.arcTo(px+w, py, px+w, py+h, r);
    x.arcTo(px+w, py+h, px, py+h, r);
    x.arcTo(px, py+h, px, py, r);
    x.arcTo(px, py, px+w, py, r);
    x.closePath();
  }

  // ---------- 2. Personaje de papel (jugador / NPCs) ----------
  // Devuelve { front, back } canvases con borde blanco.
  function character(opts = {}){
    const {
      shirt = "#1d3557", sleeves = null, pants = "#457b9d",
      shoes = "#f1a208", skin = "#f4c9a1",
      hair = null,           // { main, shadow, style:"short"|"long"|"bald" }
      cap = null,            // color de gorra o null
    } = opts;
    const sleeveCol = sleeves || shirt;

    const RES = 3; // dibujar a triple resolución: personajes más nítidos en pantalla
    const draw = (back) => {
      const c = canvas(64*RES, 80*RES);
      const x = c.getContext("2d");
      x.scale(RES, RES);
      // piernas
      x.fillStyle = pants;
      rr(x, 24, 56, 7, 16, 3); x.fill();
      rr(x, 33, 56, 7, 16, 3); x.fill();
      // zapatos
      x.fillStyle = shoes;
      x.beginPath(); x.ellipse(27, 73, 5.5, 3.5, 0, 0, Math.PI*2); x.fill();
      x.beginPath(); x.ellipse(37, 73, 5.5, 3.5, 0, 0, Math.PI*2); x.fill();
      // brazos
      x.fillStyle = sleeveCol;
      rr(x, 15, 39, 7, 15, 3.5); x.fill();
      rr(x, 42, 39, 7, 15, 3.5); x.fill();
      // manos
      x.fillStyle = skin;
      x.beginPath(); x.arc(18.5, 55.5, 3.4, 0, Math.PI*2); x.fill();
      x.beginPath(); x.arc(45.5, 55.5, 3.4, 0, Math.PI*2); x.fill();
      // cuerpo
      x.fillStyle = shirt;
      rr(x, 21, 36, 22, 22, 7); x.fill();
      // cuello
      x.fillStyle = skin;
      x.fillRect(28, 33, 8, 5);
      // cabeza
      x.beginPath(); x.arc(32, 21, 13, 0, Math.PI*2); x.fill();
      // pelo
      const hStyle = hair ? hair.style : "short";
      if (hair && hStyle !== "bald"){
        x.fillStyle = hair.main;
        if (back){
          // vista trasera: el pelo cubre toda la cabeza
          x.beginPath(); x.arc(32, 21, 13.5, 0, Math.PI*2); x.fill();
          if (hStyle === "long"){
            rr(x, 19, 24, 26, 26, 9); x.fill();
          }
          x.fillStyle = hair.shadow;
          x.beginPath(); x.arc(32, 25, 13.5, 0.25, Math.PI-0.25); x.fill();
          if (hStyle === "long"){ rr(x, 19, 38, 26, 12, 6); x.fill(); }
        } else {
          // flequillo
          x.beginPath(); x.arc(32, 18, 13.2, Math.PI*1.02, Math.PI*1.98); x.fill();
          x.beginPath(); x.arc(24, 15, 6, Math.PI*0.9, Math.PI*1.9); x.fill();
          x.beginPath(); x.arc(40, 15, 6, Math.PI*1.1, Math.PI*2.1); x.fill();
          if (hStyle === "long"){
            rr(x, 17, 18, 7, 26, 3.5); x.fill();
            rr(x, 40, 18, 7, 26, 3.5); x.fill();
          }
        }
      }
      // gorra
      if (cap){
        x.fillStyle = cap;
        if (back){
          x.beginPath(); x.arc(32, 18, 13.4, Math.PI, Math.PI*2); x.fill();
          x.beginPath(); x.arc(32, 16, 13.4, Math.PI*1.15, Math.PI*1.85); x.fill();
        } else {
          x.beginPath(); x.arc(32, 17, 13.4, Math.PI*1.05, Math.PI*1.95); x.fill();
          rr(x, 22, 15, 20, 5, 2.5); x.fill(); // visera
        }
      }
      if (!back){
        // ojos
        x.fillStyle = "#2a2733";
        x.beginPath(); x.arc(27, 22, 2.1, 0, Math.PI*2); x.fill();
        x.beginPath(); x.arc(37, 22, 2.1, 0, Math.PI*2); x.fill();
        x.fillStyle = "#fff";
        x.beginPath(); x.arc(27.7, 21.3, 0.8, 0, Math.PI*2); x.fill();
        x.beginPath(); x.arc(37.7, 21.3, 0.8, 0, Math.PI*2); x.fill();
        // mejillas
        x.fillStyle = "rgba(255,120,140,.45)";
        x.beginPath(); x.arc(23.5, 26.5, 2.4, 0, Math.PI*2); x.fill();
        x.beginPath(); x.arc(40.5, 26.5, 2.4, 0, Math.PI*2); x.fill();
        // sonrisa
        x.strokeStyle = "#2a2733"; x.lineWidth = 1.6; x.lineCap = "round";
        x.beginPath(); x.arc(32, 26, 3.6, 0.35, Math.PI-0.35); x.stroke();
      }
      return c;
    };

    const front = outline(draw(false), 5*RES);
    const backC = outline(draw(true), 5*RES);
    return { front, back: backC };
  }

  /* ==========================================================
     PERSONAJES DE PIXEL-ART (hoja js/peopleSheet.js)
     Los muñecos dibujados por código quedaban pobres al lado del resto del
     mundo. Ahora los NPCs salen del sprite de verdad y se recolorean por
     paleta exacta: la hoja usa solo 11 colores, así que se cambian camiseta,
     pelo y pantalón sin tocar la piel ni el contorno.
     Se mantiene el recorte de papel (borde blanco) que da el estilo.
     ========================================================== */
  const SHEET = { FW:16, FH:32, front:0, side:32, back:64 };
  // paleta original de la hoja → qué representa cada color
  const SHEET_PAL = {
    shirt:      "#c43c3c", shirtDark: "#882e2e", shirtDarkest:"#681c1c",
    hair:       "#6a4834", hairDark:  "#432e27",
    pants:      "#65659b", pantsLit:  "#5586b9",
    skin:       "#e8d4b2", skinDark:  "#bfa787",
  };
  let sheetImg = null, sheetReady = false;
  const sheetWatchers = [];
  (function loadPeopleSheet(){
    if (typeof PEOPLE_SHEET !== "string") return;
    const im = new Image();
    im.onload = () => { sheetImg = im; sheetReady = true; sheetWatchers.forEach(f => f()); };
    im.src = PEOPLE_SHEET;
  })();
  function onSheetReady(fn){ if (sheetReady) fn(); else sheetWatchers.push(fn); }

  const hex2rgb = h => {
    const v = h.replace("#","");
    return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
  };
  // multiplica un color manteniendo su tono: sirve para sacar las sombras
  function tone(hex, f){
    const [r,g,b] = hex2rgb(hex.startsWith("#") ? hex : "#"+hex);
    const c = v => Math.max(0, Math.min(255, Math.round(v*f)));
    return [c(r), c(g), c(b)];
  }

  /* Recorta un fotograma de la hoja, cambia la paleta y lo agranda con vecino
     más cercano (el pixel-art tiene que seguir duro al escalar). */
  function sheetFrame(col, band, opts, up = 3){
    const { FW, FH } = SHEET;
    const c = canvas(FW*up, FH*up);
    const x = c.getContext("2d", { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    if (!sheetImg) return c;
    x.drawImage(sheetImg, col*FW, band, FW, FH, 0, 0, FW*up, FH*up);
    const shirt = opts.shirt || SHEET_PAL.shirt;
    const hair  = opts.hair  || SHEET_PAL.hair;
    const pants = opts.pants || SHEET_PAL.pants;
    const map = [
      [SHEET_PAL.shirt,        tone(shirt, 1.0)],
      [SHEET_PAL.shirtDark,    tone(shirt, 0.70)],
      [SHEET_PAL.shirtDarkest, tone(shirt, 0.52)],
      [SHEET_PAL.hair,         tone(hair, 1.0)],
      [SHEET_PAL.hairDark,     tone(hair, 0.64)],
      [SHEET_PAL.pants,        tone(pants, 1.0)],
      [SHEET_PAL.pantsLit,     tone(pants, 1.28)],
    ].map(([from, to]) => [hex2rgb(from), to]);
    const d = x.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    for (let i=0;i<p.length;i+=4){
      if (p[i+3] < 128) continue;
      for (const [from, to] of map){
        if (p[i] === from[0] && p[i+1] === from[1] && p[i+2] === from[2]){
          p[i] = to[0]; p[i+1] = to[1]; p[i+2] = to[2];
          break;
        }
      }
    }
    x.putImageData(d, 0, 0);
    return c;
  }

  /* Recorta un canvas a lo que de verdad tiene pintado. El muñeco no llena su
     celda de 16x32, así que sin recortar acaba diminuto dentro del plano. */
  function trim(src){
    const x = src.getContext("2d", { willReadFrequently: true });
    const d = x.getImageData(0, 0, src.width, src.height).data;
    let x0 = src.width, y0 = src.height, x1 = -1, y1 = -1;
    for (let y=0; y<src.height; y++) for (let px=0; px<src.width; px++){
      if (d[(y*src.width + px)*4 + 3] < 16) continue;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (x1 < 0) return src;
    const c = canvas(x1-x0+1, y1-y0+1);
    const cx = c.getContext("2d");
    cx.imageSmoothingEnabled = false;
    cx.drawImage(src, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    return c;
  }

  /* Personaje de papel a partir de la hoja: {front, back} ya con borde.
     El resultado tiene SIEMPRE el mismo tamaño de lienzo, con la figura
     centrada y ajustada dentro: así el plano 3D puede fijar su proporción
     sin esperar a que la hoja termine de cargar. */
  /* La caja es deliberadamente ancha: el muñeco recortado mide ~45x66, así
     que con una caja estrecha el ajuste lo limitaba el ANCHO y el personaje
     se quedaba a dos tercios de altura, mucho más bajo que Karol. Sobrando
     ancho, manda la altura y todos miden lo mismo; el hueco lateral es
     transparente y no molesta. */
  const CHAR_BOX = { w: 76, h: 104, pad: 6 };
  const sheetCache = new Map();
  function sheetCharacter(opts = {}){
    const key = JSON.stringify(opts);
    if (sheetCache.has(key)) return sheetCache.get(key);
    const W = CHAR_BOX.w + CHAR_BOX.pad*2, H = CHAR_BOX.h + CHAR_BOX.pad*2;
    const pair = { front: canvas(W, H), back: canvas(W, H), _sheet: true, aspect: W/H };
    const fit = (band) => {
      const t = trim(sheetFrame(0, band, opts));
      const s = Math.min(CHAR_BOX.w / t.width, CHAR_BOX.h / t.height);
      const dw = Math.round(t.width*s), dh = Math.round(t.height*s);
      const c = canvas(CHAR_BOX.w, CHAR_BOX.h);
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      x.drawImage(t, (CHAR_BOX.w-dw)/2 | 0, CHAR_BOX.h-dh, dw, dh); // apoyado abajo
      return outline(c, CHAR_BOX.pad);
    };
    const paint = () => {
      [["front", SHEET.front], ["back", SHEET.back]].forEach(([k, band]) => {
        const src = fit(band);
        const c = pair[k];
        const x = c.getContext("2d");
        x.clearRect(0, 0, c.width, c.height);
        x.imageSmoothingEnabled = false;
        x.drawImage(src, 0, 0);
      });
      (pair._watchers || []).forEach(t => { t.needsUpdate = true; });
    };
    pair._watchers = [];
    onSheetReady(paint);
    sheetCache.set(key, pair);
    return pair;
  }
  // permite que una textura 3D se entere cuando la hoja termina de cargar
  function watchPair(pair, tex){ if (pair && pair._watchers) pair._watchers.push(tex); }

  // Paleta por defecto del jugador (espejo de sprites.js playerPalette)
  const SKIN_DEFAULTS = {
    K:"#111", S:"#f4c9a1", H:"#d62c38", R:"#e63946",
    W:"#ffffff", B:"#1d3557", J:"#457b9d", T:"#f1a208", O:"#a9d6e5"
  };
  function characterFromSkin(skinName){
    const defs = (typeof Sprites !== "undefined" && Sprites.skinDefs) || {};
    const pal = Object.assign({}, SKIN_DEFAULTS, defs[skinName] || {});
    return sheetCharacter({ shirt: pal.B, hair: pal.H, pants: pal.J });
  }

  function shade(hex, f){
    const m = hex.replace("#","");
    const v = m.length === 3 ? m.split("").map(c=>c+c).join("") : m;
    const r = Math.min(255, parseInt(v.slice(0,2),16)*f|0);
    const g = Math.min(255, parseInt(v.slice(2,4),16)*f|0);
    const b = Math.min(255, parseInt(v.slice(4,6),16)*f|0);
    return `rgb(${r},${g},${b})`;
  }

  // Peinados de NPC (espejo de HAIRS del world 2D)
  const NPC_HAIRS = {
    red:   { main:"#d62c38", shadow:"#8e1a28" },
    black: { main:"#2d2a30", shadow:"#1a181e" },
    gray:  { main:"#d0d0d6", shadow:"#9898a0" },
    pink:  { main:"#ff80aa", shadow:"#c64e7a" },
    blond: { main:"#eec65c", shadow:"#bc943e" },
    bald:  { main:"#e8d4b2", shadow:"#bfa787", bald:true },
  };
  // Paletas de pantalón, para que los vecinos no vayan todos iguales
  const NPC_PANTS = ["#5b5470", "#3f5a8a", "#6a5a3a", "#4a6b52", "#7a4a5e"];
  function npcCharacter(npc){
    const h = NPC_HAIRS[npc.hair] || NPC_HAIRS.black;
    const seed = (npc.key || "").length + (npc.tint || "").length;
    return sheetCharacter({
      shirt: npc.tint || "#3fa9f5",
      hair: h.main,
      pants: NPC_PANTS[seed % NPC_PANTS.length],
    });
  }

  // ---------- 3. SVG → canvas con borde (guardianes, mascotas) ----------
  const svgCache = new Map();
  function hashStr(s){
    let h = 5381;
    for (let i=0;i<s.length;i++) h = ((h<<5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  // Devuelve un canvas (se repinta solo cuando el SVG termina de cargar).
  // Usa Paper.watch(canvas, texture) para que la textura 3D se actualice.
  function svgCanvas(svg, size = 128, outlinePx = 8){
    const key = hashStr(svg) + "|" + size + "|" + outlinePx;
    if (svgCache.has(key)) return svgCache.get(key);
    const c = canvas(size + outlinePx*2, size + outlinePx*2);
    c._watchers = [];
    c._ready = false;
    const img = new Image();
    img.onload = () => {
      const tmp = canvas(size, size);
      const tx = tmp.getContext("2d");
      tx.imageSmoothingEnabled = false;
      tx.drawImage(img, 0, 0, size, size);
      const out = outline(tmp, outlinePx);
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(out, 0, 0);
      c._ready = true;
      c._watchers.forEach(t => { t.needsUpdate = true; });
    };
    let s = svg;
    if (!/width\s*=/.test(s.slice(0, 140))) s = s.replace("<svg ", `<svg width="${size}" height="${size}" `);
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(s);
    svgCache.set(key, c);
    return c;
  }
  function watch(canvasObj, texture){
    if (canvasObj._ready) texture.needsUpdate = true;
    else if (canvasObj._watchers) canvasObj._watchers.push(texture);
  }

  // ---------- 4. Etiqueta de texto flotante (píldora) ----------
  function textLabel(text, { bg = "#fffdf4", fg = "#33314e", font = 26 } = {}){
    const pad = 16;
    const meas = canvas(1,1).getContext("2d");
    meas.font = `900 ${font}px 'Malgun Gothic','Apple SD Gothic Neo','Trebuchet MS',sans-serif`;
    const w = Math.ceil(meas.measureText(text).width) + pad*2;
    const h = font + pad*1.4;
    const c = canvas(w, h);
    const x = c.getContext("2d");
    x.fillStyle = bg;
    rr(x, 3, 3, w-6, h-6, (h-6)/2); x.fill();
    x.lineWidth = 5; x.strokeStyle = "#33314e";
    rr(x, 3, 3, w-6, h-6, (h-6)/2); x.stroke();
    x.font = meas.font;
    x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = fg;
    x.fillText(text, w/2, h/2 + 1);
    return c;
  }

  // ---------- 5. Bocadillo "…" de NPC ----------
  function bubble(){
    const c = canvas(60, 46);
    const x = c.getContext("2d");
    x.fillStyle = "#fff";
    rr(x, 4, 4, 52, 28, 12); x.fill();
    x.lineWidth = 4; x.strokeStyle = "#33314e";
    rr(x, 4, 4, 52, 28, 12); x.stroke();
    x.fillStyle = "#fff";
    x.beginPath(); x.moveTo(24, 30); x.lineTo(36, 30); x.lineTo(30, 42); x.closePath(); x.fill();
    x.strokeStyle = "#33314e"; x.lineWidth = 3;
    x.beginPath(); x.moveTo(25, 32); x.lineTo(30, 42); x.lineTo(35, 32); x.stroke();
    x.fillStyle = "#33314e";
    [20, 30, 40].forEach(cx => { x.beginPath(); x.arc(cx, 18, 3, 0, Math.PI*2); x.fill(); });
    return c;
  }

  // ---------- 6. Texturas pequeñas de ambiente ----------
  function grassBladeTexture(){
    const c = canvas(64, 64);
    const x = c.getContext("2d");
    const cols = ["#2f7a3c", "#3f9e4d", "#54b45f", "#2a6e38"];
    for (let i = 0; i < 15; i++){
      const bx = 4 + i*4 + (i%3);
      const hgt = 26 + (i*7)%22;
      x.strokeStyle = cols[i % cols.length];
      x.lineWidth = 3; x.lineCap = "round";
      x.beginPath();
      x.moveTo(bx, 62);
      x.quadraticCurveTo(bx + (i%2 ? 5 : -5), 62 - hgt*0.6, bx + (i%2 ? 8 : -8), 62 - hgt);
      x.stroke();
    }
    return c;
  }

  function cloudTexture(){
    const c = canvas(128, 72);
    const x = c.getContext("2d");
    x.fillStyle = "rgba(255,255,255,.95)";
    [[38,44,22],[64,34,26],[90,44,20],[64,48,24]].forEach(([cx,cy,r]) => {
      x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.fill();
    });
    return c;
  }

  function starTexture(){
    const c = canvas(64, 64);
    const x = c.getContext("2d");
    x.fillStyle = "#ffd94a";
    x.strokeStyle = "#e8a20c"; x.lineWidth = 3;
    x.beginPath();
    for (let i = 0; i < 10; i++){
      const r = i % 2 ? 10 : 26;
      const a = -Math.PI/2 + i*Math.PI/5;
      const px = 32 + Math.cos(a)*r, py = 32 + Math.sin(a)*r;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath(); x.fill(); x.stroke();
    return c;
  }

  function exitMatTexture(){
    const c = canvas(64, 64);
    const x = c.getContext("2d");
    x.fillStyle = "#ffd94a";
    rr(x, 2, 2, 60, 60, 10); x.fill();
    x.strokeStyle = "#b8860b"; x.lineWidth = 4;
    rr(x, 2, 2, 60, 60, 10); x.stroke();
    x.fillStyle = "#7a5a10";
    x.beginPath(); x.moveTo(32, 46); x.lineTo(18, 30); x.lineTo(26, 30); x.lineTo(26, 16);
    x.lineTo(38, 16); x.lineTo(38, 30); x.lineTo(46, 30); x.closePath(); x.fill();
    return c;
  }

  function rugTexture(){
    const c = canvas(64, 64);
    const x = c.getContext("2d");
    x.fillStyle = "#c8503c"; x.fillRect(0, 0, 64, 64);
    x.strokeStyle = "#ffd166"; x.lineWidth = 4;
    x.strokeRect(6, 6, 52, 52);
    x.strokeStyle = "#933a2c"; x.lineWidth = 2;
    x.beginPath(); x.arc(32, 32, 12, 0, Math.PI*2); x.stroke();
    return c;
  }

  // ---------- 7. Animales de granja (papel, vista lateral) ----------
  function animal(kind){
    const ARES = 2; // doble resolución: animales más nítidos
    const c = canvas(72*ARES, 56*ARES);
    const x = c.getContext("2d");
    x.scale(ARES, ARES);
    const eye = (cx, cy) => {
      x.fillStyle = "#2a2733";
      x.beginPath(); x.arc(cx, cy, 1.8, 0, Math.PI*2); x.fill();
    };
    if (kind === "cow"){
      x.fillStyle = "#fdfdf8";
      x.beginPath(); x.ellipse(36, 32, 22, 14, 0, 0, Math.PI*2); x.fill(); // cuerpo
      x.fillStyle = "#333";
      x.beginPath(); x.ellipse(28, 28, 6, 4, .5, 0, Math.PI*2); x.fill();
      x.beginPath(); x.ellipse(44, 36, 5, 3.5, -.4, 0, Math.PI*2); x.fill();
      x.fillStyle = "#fdfdf8";
      x.beginPath(); x.arc(56, 22, 9, 0, Math.PI*2); x.fill(); // cabeza
      x.fillStyle = "#f2b8c6";
      x.beginPath(); x.ellipse(60, 26, 6, 4.5, 0, 0, Math.PI*2); x.fill(); // hocico
      x.fillStyle = "#333";
      x.fillRect(58, 25, 1.6, 1.6); x.fillRect(62, 25, 1.6, 1.6);
      eye(54, 19);
      x.fillStyle = "#e8d8a8"; // cuernos
      x.fillRect(50, 10, 3, 5); x.fillRect(58, 10, 3, 5);
      x.fillStyle = "#333"; // patas
      [22, 32, 42, 50].forEach(px => x.fillRect(px, 42, 4, 10));
    } else if (kind === "pig"){
      x.fillStyle = "#f7a8b8";
      x.beginPath(); x.ellipse(36, 33, 21, 13, 0, 0, Math.PI*2); x.fill();
      x.beginPath(); x.arc(56, 25, 9.5, 0, Math.PI*2); x.fill();
      x.fillStyle = "#e88a9e";
      x.beginPath(); x.ellipse(62, 28, 4.5, 3.6, 0, 0, Math.PI*2); x.fill(); // hocico
      x.fillStyle = "#c06";
      x.fillRect(61, 27, 1.5, 1.5); x.fillRect(64, 27, 1.5, 1.5);
      eye(53, 22);
      x.fillStyle = "#f7a8b8"; // oreja
      x.beginPath(); x.moveTo(50, 16); x.lineTo(56, 12); x.lineTo(57, 19); x.closePath(); x.fill();
      x.strokeStyle = "#e88a9e"; x.lineWidth = 2.4; // cola rizada
      x.beginPath(); x.arc(14, 30, 4, Math.PI*0.2, Math.PI*1.8); x.stroke();
      x.fillStyle = "#e88a9e";
      [24, 34, 44, 52].forEach(px => x.fillRect(px, 42, 4, 9));
    } else if (kind === "chicken"){
      x.fillStyle = "#fdfdf8";
      x.beginPath(); x.ellipse(34, 34, 15, 11, 0, 0, Math.PI*2); x.fill(); // cuerpo
      x.beginPath(); x.arc(50, 20, 8, 0, Math.PI*2); x.fill(); // cabeza
      x.fillStyle = "#e63946"; // cresta
      [46, 50, 54].forEach((cx, i) => { x.beginPath(); x.arc(cx, 11 - (i===1?2:0), 2.6, 0, Math.PI*2); x.fill(); });
      x.fillStyle = "#f28c28"; // pico
      x.beginPath(); x.moveTo(57, 19); x.lineTo(64, 21.5); x.lineTo(57, 24); x.closePath(); x.fill();
      eye(51, 19);
      x.fillStyle = "#e8e8e0"; // ala
      x.beginPath(); x.ellipse(30, 34, 8, 6, -.3, 0, Math.PI*2); x.fill();
      x.strokeStyle = "#f28c28"; x.lineWidth = 2.4; x.lineCap = "round"; // patas
      x.beginPath(); x.moveTo(32, 44); x.lineTo(32, 52); x.moveTo(40, 44); x.lineTo(40, 52); x.stroke();
    } else { // sheep
      x.fillStyle = "#f4f2ea";
      [[24,32,9],[34,26,10],[44,30,9],[36,36,10],[50,36,7]].forEach(([cx,cy,r]) => {
        x.beginPath(); x.arc(cx, cy, r, 0, Math.PI*2); x.fill();
      });
      x.fillStyle = "#3a3640";
      x.beginPath(); x.ellipse(56, 24, 7, 6.5, 0, 0, Math.PI*2); x.fill(); // cara
      x.fillStyle = "#f4f2ea";
      x.beginPath(); x.arc(53, 17, 5, 0, Math.PI*2); x.fill(); // copete
      x.fillStyle = "#fff";
      x.beginPath(); x.arc(56, 22, 2.2, 0, Math.PI*2); x.fill();
      x.fillStyle = "#2a2733";
      x.beginPath(); x.arc(56.5, 22, 1.1, 0, Math.PI*2); x.fill();
      x.fillStyle = "#3a3640";
      [24, 34, 44, 52].forEach(px => x.fillRect(px, 42, 4, 10));
    }
    return outline(c, 5*ARES);
  }

  // ---------- 8. Geometrías / materiales 3D reutilizables ----------
  const geoCache = {}, matCache = {};
  function geo(key, make){ return geoCache[key] || (geoCache[key] = make()); }
  function mat(key, make){ return matCache[key] || (matCache[key] = make()); }
  function lambert(color){
    const key = "L" + color;
    return mat(key, () => new THREE.MeshLambertMaterial({ color }));
  }
  function toon(color){
    const key = "T" + color;
    return mat(key, () => new THREE.MeshToonMaterial({ color }));
  }
  function canvasTex(c, { nearest = false, sharp = false } = {}){
    const t = new THREE.CanvasTexture(c);
    if (nearest){ t.magFilter = THREE.NearestFilter; }
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 16; // menos borroso al minificar en ángulo (sprites papel)
    if (sharp){
      // Los personajes se ven en pantalla algo más pequeños que su textura, y
      // con mipmaps el filtro se llevaba el detalle: sin mipmaps se muestrea
      // siempre el nivel completo y el sprite queda nítido.
      t.generateMipmaps = false;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    }
    return t;
  }

  // Árbol de papel: tronco + copas redondas (datos para instancing)
  const TREE_GREENS = ["#3f9e4d", "#54b45f", "#2f8f4a", "#46a857", "#5cbf6a"];
  function treeData(){
    // devuelve parámetros aleatorios para un árbol instanciado
    return {
      trunkH: 0.9 + Math.random()*0.25,
      blobs: [
        { dx: 0, dy: 1.35 + Math.random()*0.15, dz: 0, s: 0.75 + Math.random()*0.2, col: TREE_GREENS[Math.random()*TREE_GREENS.length|0] },
        { dx: -0.42 + Math.random()*0.2, dy: 1.0, dz: 0.15 - Math.random()*0.3, s: 0.5 + Math.random()*0.15, col: TREE_GREENS[Math.random()*TREE_GREENS.length|0] },
        { dx: 0.42 - Math.random()*0.2, dy: 1.05, dz: 0.1 - Math.random()*0.2, s: 0.45 + Math.random()*0.15, col: TREE_GREENS[Math.random()*TREE_GREENS.length|0] },
      ],
    };
  }

  // Casa de papel (grupo). variant: "blue" | "warm" | "cold"
  const HOUSE_VARIANTS = {
    blue: { walls:"#f5efe2", roof:"#3f6fb5", trim:"#2c4f86", door:"#6b4a2f" },
    warm: { walls:"#fff0d8", roof:"#e8894a", trim:"#b45f28", door:"#7a5230" },
    cold: { walls:"#e8ecf5", roof:"#6070a0", trim:"#45538a", door:"#5a4632" },
  };
  function house(variant = "blue"){
    const v = HOUSE_VARIANTS[variant] || HOUSE_VARIANTS.blue;
    const g = new THREE.Group();
    const W = 4.4, H = 2.3, D = 3.4;
    const walls = new THREE.Mesh(geo("houseW", () => new THREE.BoxGeometry(W, H, D)), lambert(v.walls));
    walls.position.y = H/2;
    g.add(walls);
    // tejado piramidal
    const roof = new THREE.Mesh(geo("houseR", () => {
      const c = new THREE.ConeGeometry(3.4, 1.7, 4);
      c.rotateY(Math.PI/4);
      return c;
    }), lambert(v.roof));
    roof.position.y = H + 0.85;
    roof.scale.set(1.06, 1, 0.86);
    g.add(roof);
    // puerta (mira al sur, +Z) — centrada en la fachada
    const door = new THREE.Mesh(geo("houseD", () => new THREE.BoxGeometry(0.9, 1.4, 0.12)), lambert(v.door));
    door.position.set(0, 0.7, D/2 + 0.03);
    g.add(door);
    const knob = new THREE.Mesh(geo("knob", () => new THREE.SphereGeometry(0.06, 6, 6)), lambert("#ffd166"));
    knob.position.set(0.3, 0.7, D/2 + 0.11);
    g.add(knob);
    // ventanas (simétricas a ambos lados de la puerta)
    const winMat = lambert("#bfe6ff");
    [-1.45, 1.45].forEach(wx => {
      const win = new THREE.Mesh(geo("houseWin", () => new THREE.BoxGeometry(0.8, 0.7, 0.1)), winMat);
      win.position.set(wx, 1.35, D/2 + 0.03);
      g.add(win);
      const frame = new THREE.Mesh(geo("houseWinF", () => new THREE.BoxGeometry(0.94, 0.84, 0.06)), lambert(v.trim));
      frame.position.set(wx, 1.35, D/2 + 0.01);
      g.add(frame);
    });
    g.traverse(m => { if (m.isMesh){ m.castShadow = true; } });
    return g;
  }

  function bushGroup(){
    const g = new THREE.Group();
    const cols = ["#1e7038", "#2f8f4a", "#14522a"];
    [[0,0.32,0,0.42],[-0.3,0.24,0.1,0.3],[0.3,0.26,-0.08,0.32]].forEach(([dx,dy,dz,s], i) => {
      const m = new THREE.Mesh(geo("bushS", () => new THREE.SphereGeometry(1, 10, 8)), lambert(cols[i]));
      m.position.set(dx, dy, dz);
      m.scale.set(s, s*0.85, s);
      m.castShadow = true;
      g.add(m);
    });
    return g;
  }

  function chestMesh(){
    const g = new THREE.Group();
    const base = new THREE.Mesh(geo("chB", () => new THREE.BoxGeometry(0.7, 0.4, 0.5)), lambert("#a05e1c"));
    base.position.y = 0.2;
    const lid = new THREE.Mesh(geo("chL", () => new THREE.BoxGeometry(0.74, 0.22, 0.54)), lambert("#c48b3e"));
    lid.position.y = 0.5;
    const band = new THREE.Mesh(geo("chBd", () => new THREE.BoxGeometry(0.76, 0.1, 0.12)), lambert("#ffd166"));
    band.position.y = 0.38;
    g.add(base, lid, band);
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  function fenceMesh(horizontal = true){
    const g = new THREE.Group();
    const wood = lambert("#b08954");
    [-0.4, 0.4].forEach(off => {
      const post = new THREE.Mesh(geo("fP", () => new THREE.BoxGeometry(0.1, 0.62, 0.1)), wood);
      post.position.set(off, 0.31, 0);
      g.add(post);
    });
    [0.24, 0.46].forEach(h => {
      const rail = new THREE.Mesh(geo("fR", () => new THREE.BoxGeometry(0.95, 0.08, 0.06)), wood);
      rail.position.set(0, h, 0);
      g.add(rail);
    });
    if (!horizontal) g.rotation.y = Math.PI/2;
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  function lampMesh(){
    const g = new THREE.Group();
    const pole = new THREE.Mesh(geo("lP", () => new THREE.CylinderGeometry(0.045, 0.06, 1.5, 8)), lambert("#33314e"));
    pole.position.y = 0.75;
    const bulb = new THREE.Mesh(geo("lB", () => new THREE.SphereGeometry(0.16, 10, 8)),
      mat("lampGlow", () => new THREE.MeshBasicMaterial({ color: "#ffe9a8" })));
    bulb.position.y = 1.6;
    const capTop = new THREE.Mesh(geo("lC", () => new THREE.ConeGeometry(0.2, 0.16, 8)), lambert("#33314e"));
    capTop.position.y = 1.78;
    g.add(pole, bulb, capTop);
    pole.castShadow = true;
    return g;
  }

  function fountainMesh(){
    const g = new THREE.Group();
    const base = new THREE.Mesh(geo("ftB", () => new THREE.CylinderGeometry(1.15, 1.3, 0.42, 14)), lambert("#c8c4d4"));
    base.position.y = 0.21;
    const water = new THREE.Mesh(geo("ftW", () => new THREE.CylinderGeometry(0.95, 0.95, 0.1, 14)),
      mat("ftWater", () => new THREE.MeshPhongMaterial({ color:"#5ec2ee", shininess:90 })));
    water.position.y = 0.44;
    const pillar = new THREE.Mesh(geo("ftP", () => new THREE.CylinderGeometry(0.16, 0.22, 0.7, 10)), lambert("#c8c4d4"));
    pillar.position.y = 0.75;
    const jet = new THREE.Mesh(geo("ftJ", () => new THREE.ConeGeometry(0.16, 0.55, 8)),
      mat("ftJet", () => new THREE.MeshPhongMaterial({ color:"#bdeaff", transparent:true, opacity:.75 })));
    jet.position.y = 1.35;
    g.add(base, water, pillar, jet);
    base.castShadow = true; pillar.castShadow = true;
    g.userData.jet = jet; g.userData.water = water;
    return g;
  }

  function caveArchMesh(){
    const g = new THREE.Group();
    const rockM = lambert("#7a7486");
    // pilares de roca y dintel
    [[-1.1, 0.8, 0, 0.7], [1.1, 0.8, 0, 0.7], [0, 1.9, 0, 0.85], [-0.75, 1.55, 0, 0.55], [0.75, 1.55, 0, 0.55]].forEach(([dx, dy, dz, s]) => {
      const r = new THREE.Mesh(geo("cvR", () => new THREE.DodecahedronGeometry(1, 0)), rockM);
      r.position.set(dx, dy, dz);
      r.scale.set(s, s*1.25, s*0.8);
      r.castShadow = true;
      g.add(r);
    });
    const portal = new THREE.Mesh(geo("cvP", () => new THREE.PlaneGeometry(1.7, 2.1)),
      mat("cvPortal", () => new THREE.MeshBasicMaterial({ color:"#0c0a14" })));
    portal.position.set(0, 1.05, -0.15);
    g.add(portal);
    return g;
  }

  // tablones de madera: horizontal = el camino cruza el eje X
  function planksMesh(len = 3, across = "x"){
    const g = new THREE.Group();
    const wood = lambert("#b08954");
    const wood2 = lambert("#9c7443");
    const n = Math.round(len*3);
    for (let i = 0; i < n; i++){
      const p = new THREE.Mesh(geo("plk", () => new THREE.BoxGeometry(0.96, 0.08, 0.3)), i%2 ? wood : wood2);
      const t = (i + 0.5)/n - 0.5;
      if (across === "x") p.position.set(0, 0.04, t*len);
      else { p.rotation.y = Math.PI/2; p.position.set(t*len, 0.04, 0); }
      p.receiveShadow = true;
      g.add(p);
    }
    // barandillas
    [-0.52, 0.52].forEach(off => {
      const rail = new THREE.Mesh(geo("plr" + len, () => new THREE.BoxGeometry(0.08, 0.3, len)), wood2);
      if (across === "x") rail.position.set(off, 0.22, 0);
      else { rail.rotation.y = Math.PI/2; rail.position.set(0, 0.22, off); }
      g.add(rail);
    });
    return g;
  }

  function butterfly(color){
    const g = new THREE.Group();
    const wingMat = mat("bf" + color, () => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    const wingGeo = geo("bfW", () => { const p = new THREE.PlaneGeometry(0.22, 0.16); p.translate(0.11, 0, 0); return p; });
    const wl = new THREE.Mesh(wingGeo, wingMat);
    const wr = new THREE.Mesh(wingGeo, wingMat);
    wr.rotation.y = Math.PI;
    const body = new THREE.Mesh(geo("bfB", () => new THREE.BoxGeometry(0.04, 0.04, 0.14)), lambert("#2a2733"));
    body.rotation.x = Math.PI/2;
    g.add(wl, wr, body);
    g.userData.wings = [wl, wr];
    return g;
  }

  function saveSparkle(){
    const tex = canvasTex(starTexture());
    const m = new THREE.Group();
    const matS = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    [0, Math.PI/2].forEach(ry => {
      const p = new THREE.Mesh(geo("spark", () => new THREE.PlaneGeometry(0.55, 0.55)), matS);
      p.rotation.y = ry;
      m.add(p);
    });
    m.position.y = 0.6;
    return m;
  }

  // ---------- 9. Assets extra de ambiente (pradera/pueblo) ----------

  // Banco de parque de madera
  function benchMesh(){
    const g = new THREE.Group();
    const wood = lambert("#b08954"), wood2 = lambert("#9c7443"), iron = lambert("#33314e");
    [-0.42, 0.42].forEach(dx => {
      const legF = new THREE.Mesh(geo("bnL", () => new THREE.BoxGeometry(0.08, 0.34, 0.08)), iron);
      legF.position.set(dx, 0.17, 0.14);
      const legB = new THREE.Mesh(geo("bnL", () => new THREE.BoxGeometry(0.08, 0.34, 0.08)), iron);
      legB.position.set(dx, 0.17, -0.14);
      const back = new THREE.Mesh(geo("bnB", () => new THREE.BoxGeometry(0.08, 0.42, 0.08)), iron);
      back.position.set(dx, 0.5, -0.18);
      g.add(legF, legB, back);
    });
    const seat = new THREE.Mesh(geo("bnS", () => new THREE.BoxGeometry(1.05, 0.07, 0.4)), wood);
    seat.position.y = 0.37;
    const rest = new THREE.Mesh(geo("bnR", () => new THREE.BoxGeometry(1.05, 0.24, 0.06)), wood2);
    rest.position.set(0, 0.66, -0.2);
    g.add(seat, rest);
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  // Señal de madera con flecha (cartel de caminos)
  function signpostMesh(){
    const g = new THREE.Group();
    const wood = lambert("#a0763f"), wood2 = lambert("#8a5a2b");
    const post = new THREE.Mesh(geo("sgP", () => new THREE.CylinderGeometry(0.05, 0.06, 1.1, 7)), wood2);
    post.position.y = 0.55;
    const arrow = new THREE.Mesh(geo("sgA", () => new THREE.BoxGeometry(0.72, 0.2, 0.06)), wood);
    arrow.position.set(0.14, 0.98, 0);
    const tip = new THREE.Mesh(geo("sgT", () => new THREE.ConeGeometry(0.14, 0.2, 4)), wood);
    tip.rotation.z = -Math.PI/2; tip.rotation.y = Math.PI/4;
    tip.position.set(0.56, 0.98, 0);
    g.add(post, arrow, tip);
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  // Tronco caído
  function logMesh(){
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(geo("lgT", () => new THREE.CylinderGeometry(0.2, 0.22, 1.2, 9)), lambert("#8a5a2b"));
    trunk.rotation.z = Math.PI/2;
    trunk.position.y = 0.2;
    const cut = new THREE.Mesh(geo("lgC", () => new THREE.CylinderGeometry(0.19, 0.19, 0.03, 9)), lambert("#d9b382"));
    cut.rotation.z = Math.PI/2;
    cut.position.set(0.61, 0.2, 0);
    g.add(trunk, cut);
    trunk.castShadow = true;
    return g;
  }

  // Farol de piedra coreano (석등)
  function stoneLanternMesh(){
    const g = new THREE.Group();
    const stone = lambert("#b8b4c4"), stone2 = lambert("#9d99ac");
    const base = new THREE.Mesh(geo("slB", () => new THREE.CylinderGeometry(0.2, 0.26, 0.14, 8)), stone2);
    base.position.y = 0.07;
    const pole = new THREE.Mesh(geo("slP", () => new THREE.CylinderGeometry(0.07, 0.09, 0.42, 8)), stone);
    pole.position.y = 0.35;
    const box = new THREE.Mesh(geo("slX", () => new THREE.BoxGeometry(0.3, 0.24, 0.3)), stone2);
    box.position.y = 0.68;
    const glow = new THREE.Mesh(geo("slG", () => new THREE.BoxGeometry(0.32, 0.12, 0.32)),
      mat("slGlow", () => new THREE.MeshBasicMaterial({ color:"#ffe9a8" })));
    glow.position.y = 0.68;
    const roof = new THREE.Mesh(geo("slR", () => new THREE.ConeGeometry(0.3, 0.2, 4)), stone);
    roof.rotation.y = Math.PI/4;
    roof.position.y = 0.9;
    g.add(base, pole, box, glow, roof);
    base.castShadow = true; box.castShadow = true;
    return g;
  }

  // Molinillo de viento de papel (gira con el viento — muy Paper Mario)
  function pinwheelMesh(hue = 0){
    const g = new THREE.Group();
    const stick = new THREE.Mesh(geo("pwS", () => new THREE.CylinderGeometry(0.025, 0.03, 1.0, 6)), lambert("#d9b382"));
    stick.position.y = 0.5;
    g.add(stick);
    const wheel = new THREE.Group();
    const colors = ["#ff6b6b", "#ffd94a", "#5ec2ee", "#a259ff", "#06d6a0", "#ff70a6"];
    for (let i = 0; i < 4; i++){
      const blade = new THREE.Mesh(geo("pwB", () => {
        const p = new THREE.PlaneGeometry(0.13, 0.3);
        p.translate(0, 0.18, 0);
        return p;
      }), mat("pwM" + ((hue + i) % colors.length), () => new THREE.MeshBasicMaterial({
        color: colors[(hue + i) % colors.length], side: THREE.DoubleSide })));
      blade.rotation.z = i * Math.PI/2;
      blade.rotation.y = 0.5; // plegado como papel real
      wheel.add(blade);
    }
    const hub = new THREE.Mesh(geo("pwH", () => new THREE.SphereGeometry(0.045, 8, 6)), lambert("#fffdf4"));
    wheel.add(hub);
    wheel.position.set(0, 1.02, 0.06);
    g.add(wheel);
    g.userData.wheel = wheel;
    return g;
  }

  // Macizo de flores de papel (3-5 florecillas juntas)
  function flowerPatchMesh(){
    const g = new THREE.Group();
    const cols = ["#ff6b6b", "#ffd94a", "#ffffff", "#ff70a6", "#a259ff"];
    const n = 3 + (Math.random()*3|0);
    for (let i = 0; i < n; i++){
      const col = cols[Math.random()*cols.length|0];
      const stem = new THREE.Mesh(geo("fpS", () => new THREE.CylinderGeometry(0.02, 0.02, 0.22, 5)), lambert("#3f8b4b"));
      const dx = (Math.random()-0.5)*0.5, dz = (Math.random()-0.5)*0.5;
      stem.position.set(dx, 0.11, dz);
      // flor de papel: 5 pétalos planos alrededor del centro
      const head = new THREE.Group();
      const petalMat = mat("fpP" + col, () => new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
      for (let p = 0; p < 5; p++){
        const petal = new THREE.Mesh(geo("fpPt", () => {
          const pl = new THREE.PlaneGeometry(0.09, 0.13);
          pl.translate(0, 0.08, 0);
          return pl;
        }), petalMat);
        petal.rotation.y = p * Math.PI*2/5;
        petal.rotation.x = -0.7;
        head.add(petal);
      }
      const core = new THREE.Mesh(geo("fpC", () => new THREE.SphereGeometry(0.045, 7, 5)), lambert("#ffd94a"));
      head.add(core);
      head.position.set(dx, 0.24, dz);
      g.add(stem, head);
    }
    return g;
  }

  return {
    outline, character, characterFromSkin, npcCharacter, sheetCharacter, watchPair,
    svgCanvas, watch, textLabel, bubble,
    grassBladeTexture, cloudTexture, starTexture, exitMatTexture, rugTexture,
    animal, treeData, TREE_GREENS, house, bushGroup, chestMesh, fenceMesh,
    lampMesh, fountainMesh, caveArchMesh, planksMesh, butterfly, saveSparkle,
    benchMesh, signpostMesh, logMesh, stoneLanternMesh, pinwheelMesh, flowerPatchMesh,
    canvasTex, lambert, toon, geo, mat, shade,
  };
})();
