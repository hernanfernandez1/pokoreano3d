/* ==========================================================
   POKOREANO — Mobiliario procedural de interiores (Three.js)
   Piezas simples estilo papel (colores planos Lambert), en la
   misma escala que el resto del juego: 1 casilla = 1 unidad.
   Cada pieza se ancla por el CENTRO de su huella en el suelo.
   Geometrías y materiales se cachean: las escenas se tiran y
   se reconstruyen al entrar/salir y no queremos fugas.
   ========================================================== */
const Furn = (() => {
  const geoCache = {}, matCache = {};
  const G = (key, make) => geoCache[key] || (geoCache[key] = make());
  const M = (color) => matCache[color] || (matCache[color] = Paper.lambert(color));
  const box = (w, h, d, color, x=0, y=0, z=0) => {
    const m = new THREE.Mesh(G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), M(color));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const cyl = (rt, rb, h, seg, color, x=0, y=0, z=0) => {
    const m = new THREE.Mesh(G(`c${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), M(color));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const ball = (r, color, x=0, y=0, z=0, w=10, h=8) => {
    const m = new THREE.Mesh(G(`s${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h)), M(color));
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    return m;
  };
  const group = (...parts) => {
    const g = new THREE.Group();
    parts.forEach(p => g.add(p));
    return g;
  };
  // textura de cartel con texto (cacheada por contenido)
  const texCache = {};
  function textTex(key, w, h, draw){
    if (texCache[key]) return texCache[key];
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    return texCache[key] = Paper.canvasTex(c);
  }

  // ---------- tienda ----------
  const shelf = (w=2) => {
    const g = group(
      box(w, 1.9, 0.42, "#8a5a2b", 0, 0.95, 0),                 // bastidor
      box(w-0.14, 1.74, 0.36, "#6b4226", 0, 0.98, 0.02),        // fondo
    );
    const GOODS = ["#e63946","#ffd166","#06d6a0","#3fa9f5","#ff9770","#a259ff"];
    for (let s=0; s<3; s++){
      g.add(box(w-0.1, 0.05, 0.4, "#a06a35", 0, 0.55 + s*0.55, 0.03)); // balda
      const n = Math.max(2, Math.round(w*2.2));
      for (let i=0; i<n; i++){
        const bx = -w/2 + 0.18 + i * ((w-0.36)/(n-1));
        g.add(box(0.16, 0.3 + (i%2)*0.08, 0.2, GOODS[(i + s*3) % GOODS.length], bx, 0.72 + s*0.55, 0.06));
      }
    }
    return g;
  };
  const counter = (w=3) => group(
    box(w, 0.85, 0.68, "#8a5a2b", 0, 0.425, 0),
    box(w+0.16, 0.09, 0.84, "#c48b5e", 0, 0.89, 0),
    box(w-0.5, 0.3, 0.05, "#6b4226", 0, 0.45, 0.36),           // panel frontal
  );
  const crate = () => group(
    box(0.78, 0.78, 0.78, "#b98d5e", 0, 0.39, 0),
    box(0.84, 0.1, 0.84, "#8a5a2b", 0, 0.74, 0),
    box(0.84, 0.1, 0.84, "#8a5a2b", 0, 0.06, 0),
  );
  const fridge = () => group(
    box(0.9, 1.85, 0.8, "#e8f0f2", 0, 0.925, 0),
    box(0.86, 0.04, 0.76, "#b9c8cc", 0, 1.2, 0),               // junta del freezer
    box(0.06, 0.5, 0.06, "#7a8a90", 0.32, 0.85, 0.42),         // manija
  );

  // ---------- café ----------
  const tableRound = () => group(
    cyl(0.58, 0.58, 0.07, 14, "#c48b5e", 0, 0.74, 0),
    cyl(0.07, 0.1, 0.72, 8, "#8a5a2b", 0, 0.37, 0),
    cyl(0.3, 0.34, 0.05, 12, "#8a5a2b", 0, 0.03, 0),
    cyl(0.09, 0.09, 0.1, 8, "#fffdf4", 0.16, 0.82, 0.1),       // tacita
  );
  const chair = (rotY=0) => {
    const g = group(
      box(0.44, 0.08, 0.44, "#a0653a", 0, 0.42, 0),
      box(0.44, 0.5, 0.08, "#a0653a", 0, 0.7, -0.18),
      box(0.07, 0.42, 0.07, "#7a4a28", -0.16, 0.21, -0.16),
      box(0.07, 0.42, 0.07, "#7a4a28", 0.16, 0.21, -0.16),
      box(0.07, 0.42, 0.07, "#7a4a28", -0.16, 0.21, 0.16),
      box(0.07, 0.42, 0.07, "#7a4a28", 0.16, 0.21, 0.16),
    );
    g.rotation.y = rotY;
    return g;
  };
  const menuBoard = () => {
    const tex = textTex("menu", 256, 192, (x, w, h) => {
      x.fillStyle = "#3a2e26"; x.fillRect(0, 0, w, h);
      x.fillStyle = "#f7ecd8"; x.textAlign = "center";
      x.font = "900 44px sans-serif"; x.fillText("MENU", w/2, 56);
      x.font = "28px sans-serif";
      x.fillText("커피  café  50", w/2, 100);
      x.fillText("케이크  torta  80", w/2, 136);
      x.fillText("주스  jugo  40", w/2, 170);
    });
    const scr = new THREE.Mesh(G("menuScr", () => new THREE.BoxGeometry(2.2, 1.6, 0.08)),
      new THREE.MeshLambertMaterial({ map: tex }));
    scr.position.y = 1.7; scr.castShadow = true;
    return group(box(2.4, 1.8, 0.06, "#6b4226", 0, 1.7, -0.05), scr);
  };

  // ---------- academia ----------
  const blackboard = (w=3.4) => {
    const tex = textTex("board", 512, 256, (x, w2, h2) => {
      x.fillStyle = "#2e5d4b"; x.fillRect(0, 0, w2, h2);
      x.fillStyle = "#f4f9f4"; x.textAlign = "center";
      x.font = "900 84px sans-serif"; x.fillText("한국어", w2/2, 110);
      x.font = "44px sans-serif"; x.fillText("안녕하세요!  ·  화이팅!", w2/2, 190);
    });
    const board = new THREE.Mesh(G("bbScr", () => new THREE.BoxGeometry(1, 1, 0.07)),
      new THREE.MeshLambertMaterial({ map: tex }));
    board.scale.set(w, w/2, 1);
    board.position.y = 1.75; board.castShadow = true;
    return group(
      box(w+0.2, w/2+0.2, 0.06, "#8a5a2b", 0, 1.75, -0.05),
      board,
      box(w, 0.07, 0.16, "#c48b5e", 0, 0.72, 0.08),            // repisa de tizas
    );
  };
  const studentDesk = () => group(
    box(0.95, 0.07, 0.6, "#c48b5e", 0, 0.66, 0),
    box(0.08, 0.63, 0.5, "#8a5a2b", -0.4, 0.33, 0),
    box(0.08, 0.63, 0.5, "#8a5a2b", 0.4, 0.33, 0),
    box(0.34, 0.05, 0.24, "#3fa9f5", -0.18, 0.72, 0),          // libro
    box(0.3, 0.05, 0.22, "#e63946", 0.2, 0.72, 0.05),
  );
  const deskBig = (w=2.4) => group(
    box(w, 0.08, 0.9, "#7a4a28", 0, 0.78, 0),
    box(0.12, 0.76, 0.84, "#5d3a1e", -w/2+0.08, 0.39, 0),
    box(0.12, 0.76, 0.84, "#5d3a1e", w/2-0.08, 0.39, 0),
    box(w-0.5, 0.34, 0.06, "#6b4226", 0, 0.5, 0.42),
    box(0.3, 0.42, 0.06, "#f4f9f4", -w/4, 1.05, 0),            // papeles
  );

  // ---------- norebang ----------
  const stagePlat = (w=5, d=2.4) => group(
    box(w, 0.3, d, "#5d3a5e", 0, 0.15, 0),
    box(w, 0.06, d+0.1, "#e87ab0", 0, 0.32, 0),
  );
  const speaker = () => group(
    box(0.56, 1.2, 0.5, "#26242e", 0, 0.6, 0),
    cyl(0.16, 0.16, 0.06, 12, "#4a4658", 0, 0.85, 0.26),
    cyl(0.1, 0.1, 0.06, 10, "#4a4658", 0, 0.4, 0.26),
  );
  const karaokeScreen = () => {
    const tex = textTex("kara", 512, 288, (x, w, h) => {
      x.fillStyle = "#1a1030"; x.fillRect(0, 0, w, h);
      const grad = x.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, "#ff70a6"); grad.addColorStop(1, "#a259ff");
      x.fillStyle = grad; x.textAlign = "center";
      x.font = "900 92px sans-serif"; x.fillText("노래방", w/2, 130);
      x.fillStyle = "#ffe9f2"; x.font = "54px sans-serif";
      x.fillText("♪ ¡a cantar! ♪", w/2, 220);
    });
    const scr = new THREE.Mesh(G("karaScr", () => new THREE.BoxGeometry(3.4, 1.9, 0.1)),
      new THREE.MeshLambertMaterial({ map: tex, emissive: 0x443355 }));
    scr.position.y = 2.1; scr.castShadow = true;
    return group(box(3.6, 2.1, 0.08, "#26242e", 0, 2.1, -0.06), scr);
  };
  const discoBall = () => {
    const mat = new THREE.MeshLambertMaterial({ color: 0xdfe8ff, emissive: 0x555577 });
    const m = new THREE.Mesh(G("disco", () => new THREE.SphereGeometry(0.34, 12, 10)), mat);
    m.position.y = 2.6; m.castShadow = true;
    return group(cyl(0.02, 0.02, 0.5, 6, "#9aa0b0", 0, 2.95, 0), m);
  };
  const sofa = (w=2, color="#e87ab0") => group(
    box(w, 0.4, 0.8, color, 0, 0.28, 0),
    box(w, 0.55, 0.24, Paper.shade(color, 0.8), 0, 0.62, -0.3),
    box(0.24, 0.3, 0.8, Paper.shade(color, 0.8), -w/2+0.12, 0.6, 0),
    box(0.24, 0.3, 0.8, Paper.shade(color, 0.8), w/2-0.12, 0.6, 0),
  );

  // ---------- comunes ----------
  const plant = () => group(
    cyl(0.24, 0.18, 0.34, 10, "#b0563a", 0, 0.17, 0),
    ball(0.34, "#4e9a3f", 0, 0.68, 0),
    ball(0.24, "#6fbf4a", 0.18, 0.85, 0.08),
    ball(0.2, "#3f7a36", -0.16, 0.88, -0.06),
  );
  const flagKR = () => {
    const tex = textTex("kr", 192, 128, (x, w, h) => {
      x.fillStyle = "#fff"; x.fillRect(0, 0, w, h);
      x.fillStyle = "#e63946"; x.beginPath(); x.arc(w/2, h/2, 26, Math.PI, 0); x.fill();
      x.fillStyle = "#23408e"; x.beginPath(); x.arc(w/2, h/2, 26, 0, Math.PI); x.fill();
      x.fillStyle = "#111";
      [[36,26],[156,26],[36,102],[156,102]].forEach(([tx,ty]) => {
        x.fillRect(tx-12, ty-6, 24, 4); x.fillRect(tx-12, ty+2, 24, 4);
      });
    });
    const flag = new THREE.Mesh(G("flagKr", () => new THREE.PlaneGeometry(0.9, 0.6)),
      new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    flag.position.set(0.46, 1.75, 0);
    return group(cyl(0.035, 0.045, 2.3, 8, "#8a8a9a", 0, 1.15, 0), ball(0.06, "#ffd166", 0, 2.32, 0, 8, 6), flag);
  };
  const trophy = () => group(
    cyl(0.16, 0.22, 0.1, 10, "#8a5a2b", 0, 0.05, 0),
    cyl(0.06, 0.1, 0.18, 8, "#ffd166", 0, 0.19, 0),
    cyl(0.2, 0.12, 0.3, 12, "#ffd166", 0, 0.42, 0),
  );

  return { shelf, counter, crate, fridge, tableRound, chair, menuBoard,
           blackboard, studentDesk, deskBig, stagePlat, speaker, karaokeScreen,
           discoBall, sofa, plant, flagKR, trophy };
})();
