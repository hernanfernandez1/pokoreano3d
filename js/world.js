/* ==========================================================
   POKOREANO 3D — Overworld + interiores (Three.js, estilo papel)
   Toda la lógica del juego (mapas, NPCs, encuentros, puertas,
   mascota, animales, diálogos) se conserva del motor 2D;
   solo cambia el render: diorama 3D estilo Paper Mario con
   assets 100% procedurales (ver js/paper.js).
   ========================================================== */
const World = (() => {
  const TILE = 16;

  // ---------- Maps (con pila: overworld → cueva → interior) ----------
  let MW, MH, ground, solid, meta, decor, npcsCur, mode = "over";
  let mapStack = [];
  const roadTiles = new Set();   // casillas de calzada, para no construir encima

  const OW = { W:132, H:104 };

  /* ==========================================================
     LA REGIÓN
     El mapa se describe con datos, no con coordenadas sueltas repartidas
     por buildOverworld(): accidentes del terreno, malla de carreteras y
     pueblos. Mover un pueblo es cambiar un número aquí.

     Trazado: tres carreteras horizontales y tres verticales forman una
     cuadrícula; cada pueblo se planta en un cruce o en el extremo de una
     vertical, así que siempre se llega por camino. El río parte la región
     de norte a sur y solo se cruza por los puentes de las horizontales.
     ========================================================== */
  const REGION = {
    coastY: 94,        // línea base del mar (el sur es océano)
    beach: 8,          // ancho de la playa sobre la costa
    riverX: 88,        // río vertical, 3 tiles de ancho
    roadsH: [26, 56, 80],
    roadsV: [20, 64, 110],
    roadFromY: 14, roadToY: 80,   // extremos de las verticales
    roadFromX: 20, roadToX: 110,  // extremos de las horizontales
  };

  /* Pueblos. cx/cy es el centro de la plaza; los edificios se colocan
     alrededor con desplazamientos relativos, de modo que un pueblo entero
     se mueve cambiando su centro.
     `build` reparte los servicios: antes vivían todos dentro de un único
     mapa interior y no había nada que viajar. */
  /* Solares de un pueblo, en desplazamientos desde su centro. Un edificio
     ocupa 6 casillas de ancho y sus muros van 4 filas por debajo del ancla.
     Los solares están elegidos para que NINGUNO pise la calzada: la vertical
     corre por cx y cx+1, y la horizontal (en los pueblos que están sobre una)
     por cy y cy+1. Antes el gimnasio se plantaba justo encima del cruce y
     tapaba la carretera con la que se entra al pueblo. */
  const TOWN_SLOTS = {
    gym: [  3, -9],   // preside la plaza, al este de la calzada
    a:   [ -8, -9],   // servicio principal, al oeste
    b:   [ 11,  2],   // segundo servicio, al sureste
    h1:  [-15, -9],
    h2:  [ -8,  2],
    h3:  [  3,  2],
  };
  const TOWNS = [
    { gym:"hangul", name:"Pueblo Hangul", ko:"한글 마을", cx:20,  cy:14, sprite:"house", plaza:"fuente",
      build:[["casa","casadoor","a"], ["alcaldia","alcaldiadoor","b"]], houses:["h1","h2"] },
    { gym:"numeros", name:"Pueblo Sutja", ko:"숫자 마을", cx:64,  cy:14, sprite:"barn", plaza:"jardin",
      build:[["shop","shopdoor","a"]], houses:["h1","h2","h3"] },
    { gym:"particulas", name:"Pueblo Josa", ko:"조사 마을", cx:110, cy:14, sprite:"house", plaza:"fuente",
      build:[["academia","academiadoor","a"]], houses:["h1","h3"] },
    { gym:"verbos", name:"Pueblo Dongsa", ko:"동사 마을", cx:110, cy:46, sprite:"barn", plaza:"jardin",
      build:[["norebang","norebangdoor","a"]], houses:["h2","h3"] },
    { gym:"topik2", name:"Pueblo Topik", ko:"토픽 마을", cx:20,  cy:56, sprite:"house", plaza:"fuente",
      build:[], houses:["h1","h2","h3"] },
    { gym:"topik1", name:"Puerto Topik", ko:"토픽 항구", cx:64,  cy:80, sprite:"barn", plaza:"jardin",
      build:[], houses:["h1","h2"] },
    { gym:"honor", name:"Pueblo Jondae", ko:"존경 마을", cx:110, cy:80, sprite:"house", plaza:"fuente",
      build:[["cafe","cafedoor","a"]], houses:["h3"] },
    // "maestro" vive dentro de la cueva, no tiene pueblo
  ];
  const slotAt = (t, key) => ({ x: t.cx + TOWN_SLOTS[key][0], y: t.cy + TOWN_SLOTS[key][1] });
  // piezas de paisaje del pack, en la playa y en el mar
  const SEA_HOUSE_AT = { x:32, y:88 };   // casa en la playa oeste
  const GARDEN_AT    = { x:104, y:99 };  // isla-jardín en mar abierto

  const TOWN_W = 30, TOWN_H = 22;   // extensión del pueblo alrededor del centro
  const townRect = t => ({ x: t.cx - TOWN_W/2, y: t.cy - TOWN_H/2, w: TOWN_W, h: TOWN_H });
  const inTown = (x, y) => TOWNS.some(t => {
    const r = townRect(t);
    return x >= r.x-1 && x < r.x+r.w+1 && y >= r.y-1 && y < r.y+r.h+1;
  });

  // manchas de bosque, para el banner de zona y para sembrar los árboles
  const FORESTS = [
    { x:68, y:30, w:19, h:26 },   // bosque profundo, orilla oeste del río
    { x:68, y:58, w:19, h:18 },   // bosque del sur
    { x:34, y:60, w:24, h:14 },   // arboleda del suroeste
    { x:94, y:26, w:16, h:14 },   // bosquete del este
  ];
  // el gimnasio preside la plaza: su puerta mira al centro del pueblo
  const gymAnchor = t => slotAt(t, "gym");
  const gymHouses = TOWNS.map(t => ({ key: t.gym, sprite: t.sprite, ...gymAnchor(t) }));


  // Farola de papel: el decor va 2 filas arriba de su base sólida
  function putLamp(x, yBase){
    const dy = yBase - 2;
    if (dy < 0 || dy >= MH) return;
    if (decor[dy]?.[x] || solid[yBase]?.[x] || meta[yBase]?.[x]) return;
    decor[dy][x] = { sprite:"lamp" };
    solid[yBase][x] = true;
  }

  // Pavimenta la plaza del pueblo, quita árboles y planta farolas y letrero
  /* Levanta un pueblo entero alrededor de su centro: adoquina la plaza,
     planta el gimnasio presidiéndola, reparte los servicios que le tocan
     (cada uno con su puerta al interior que ya existía) y llena los huecos
     con casas de vecinos, farolas y el letrero de entrada. */
  const TOWN_HOUSE_SPRITES = ["house", "barn", "houseG"];
  // adoquina una casilla si es terreno natural (nunca pisa agua ni edificios)
  const PAVABLE = ["grass","flower","flower2","flower3","tuft","tallgrass","mush","rock","dirtA"];
  function pave(x, y){
    if (!ground[y] || ground[y][x] === undefined) return;
    if (solid[y][x] || decor[y][x] || meta[y][x]) return;
    if (!PAVABLE.includes(ground[y][x])) return;
    ground[y][x] = "path";
  }
  // sendero en L de 2 tiles de ancho, de una puerta a la plaza
  function paveWalk(x0, y0, x1, y1){
    const sx = Math.sign(x1-x0) || 1;
    for (let x=x0; x!==x1+sx; x+=sx){ pave(x, y0); pave(x, y0+1); }
    const sy = Math.sign(y1-y0) || 1;
    for (let y=y0; y!==y1+sy; y+=sy){ pave(x1, y); pave(x1+1, y); }
  }

  function buildTown(t){
    const r = townRect(t);
    clearTreesRect(r.x-2, r.y-2, r.x+r.w+1, r.y+r.h+1);

    /* Plaza central, no el pueblo entero: adoquinar los 30x22 completos
       convertía cada pueblo en un descampado de tierra. Ahora el césped se
       queda y solo se pavimenta la plaza y los senderos a las puertas. */
    const plaza = { x0:t.cx-7, x1:t.cx+7, y0:t.cy-3, y1:t.cy+4 };
    for (let y=plaza.y0;y<=plaza.y1;y++) for (let x=plaza.x0;x<=plaza.x1;x++){
      if (hsh(x,y)%9===0) continue;  // parterres de hierba entre el adoquín
      pave(x, y);
    }

    // gimnasio presidiendo la plaza, con farolas flanqueando la puerta
    const g = gymHouses.find(h => h.key === t.gym);
    if (g){
      putHouse(g);
      paveWalk(g.x+2, g.y+8, t.cx, plaza.y0);
      putLamp(g.x+1, g.y+8);
      putLamp(g.x+4, g.y+8);
    }
    // servicios repartidos: [tag, tipo de puerta, solar]
    (t.build || []).forEach(([tag, doorType, slot], i) => {
      const spr = tag === "casa" ? "house" : (i % 2 ? "barn" : "houseG");
      const p = slotAt(t, slot);
      putBuilding(p.x, p.y, spr, doorType, tag);
      paveWalk(p.x+2, p.y+8, p.x < t.cx ? plaza.x0 : plaza.x1, t.cy);
    });
    // casas de vecinos, sin puerta: dan volumen para que no sea una plaza pelada
    (t.houses || []).forEach((slot, i) => {
      const p = slotAt(t, slot);
      putBuilding(p.x, p.y, TOWN_HOUSE_SPRITES[(i + t.cx) % 3], null, null);
    });
    /* Toque propio de cada pueblo: sin esto los siete salían calcados. La
       pieza va apartada del eje de la calzada para no cortar el paso. */
    const fx = t.cx + 3, fy = t.cy;
    const freeSpot = (x, y, w, h) => {
      for (let j=0;j<h;j++) for (let i=0;i<w;i++)
        if (solid[y+j]?.[x+i] || decor[y+j]?.[x+i] || meta[y+j]?.[x+i]) return false;
      return true;
    };
    if (t.plaza === "fuente" && freeSpot(fx, fy, 3, 3)){
      decor[fy][fx] = { sprite:"fountain" };
      for (let j=0;j<3;j++) for (let i=0;i<3;i++) solid[fy+j][fx+i] = true;
    } else if (t.plaza === "jardin"){
      for (let j=0;j<3;j++) for (let i=0;i<5;i++){
        const x = fx+i-1, y = fy+j;
        if (ground[y]?.[x] === "path" && !solid[y][x]) ground[y][x] = (i+j)%2 ? "flower2" : "flower3";
      }
    }
    // farolas en las esquinas de la plaza
    [[plaza.x0+1, plaza.y0+1], [plaza.x1-1, plaza.y0+1],
     [plaza.x0+1, plaza.y1-1], [plaza.x1-1, plaza.y1-1]].forEach(([x,y]) => putLamp(x, y));

    // letrero de entrada, junto al camino que llega del sur
    const sx = t.cx - 3, sy = plaza.y1 + 2;
    if (!solid[sy]?.[sx] && !decor[sy]?.[sx] && !meta[sy]?.[sx]){
      decor[sy][sx] = { sprite:"townSign", text:t.name };
      solid[sy][sx] = true;
    }
  }

  // ---------- Overworld NPCs (wander around home) ----------
  const npcsOver = [
    {
      key:"abuela", name:"할머니 (Abuela)", x:24, y:27, dir:0, tint:"#a259ff", hair:"gray", long:true, wander:true,
      lines:[
        { ko:"안녕하세요! 반가워요.", rom:"annyeonghaseyo! bangawoyo.", es:"¡Hola! Encantada de verte." },
        { ko:"한국어 공부는 재미있어요?", rom:"hangugeo gongbuneun jaemiisseoyo?", es:"¿Es divertido estudiar coreano?" },
        { ko:"화이팅!", rom:"hwaiting!", es:"¡Ánimo!" },
      ]
    },
    {
      key:"nino", name:"아이 (Niño)", x:44, y:28, dir:0, tint:"#06d6a0", hair:"black", wander:true,
      lines:[
        { ko:"저는 학생이에요.", rom:"jeoneun haksaeng-ieyo.", es:"Yo soy estudiante." },
        { ko:"너는 이름이 뭐예요?", rom:"neoneun ireumi mwoyeyo?", es:"¿Cómo te llamas?" },
        { ko:"체육관은 저기에 있어요!", rom:"cheyukgwaneun jeogie isseoyo!", es:"¡El gimnasio está por allí!" },
      ]
    },
    {
      key:"vendedor", name:"상인 (Vendedor)", x:70, y:27, dir:0, tint:"#f4a261", wander:true,
      lines:[
        { ko:"어서 오세요!", rom:"eoseo oseyo!", es:"¡Bienvenido!" },
        { ko:"이거 얼마예요? 천 원이에요.", rom:"igeo eolmayeyo? cheon won-ieyo.", es:"¿Cuánto cuesta esto? Son mil wones." },
        { ko:"감사합니다. 또 오세요!", rom:"gamsahamnida. tto oseyo!", es:"Gracias. ¡Vuelve pronto!" },
      ]
    },
    {
      key:"pescador", name:"낚시꾼 (Pescador)", x:62, y:84, dir:0, tint:"#3fa9f5", hair:"black", wander:false,
      lines:[
        { ko:"물고기를 좋아해요?", rom:"mulgogireul joahaeyo?", es:"¿Te gustan los peces?" },
        { ko:"이 호수에는 물고기가 많아요.", rom:"i hosueneun mulgogiga manayo.", es:"En este lago hay muchos peces." },
        { ko:"물하고 불을 혼동하지 마세요!", rom:"mulhago bureul hondonghaji maseyo!", es:"물 (mul) es agua, 불 (bul) es fuego. ¡No los confundas!" },
      ]
    },
    {
      key:"monje", name:"스님 (Monje)", x:74, y:45, dir:0, tint:"#8d6e63", hair:"bald", wander:true,
      lines:[
        { ko:"천천히 하세요.", rom:"cheoncheonhi haseyo.", es:"Hazlo despacio (con calma)." },
        { ko:"매일 조금씩 공부하세요.", rom:"maeil jogeumssik gongbuhaseyo.", es:"Estudia un poco cada día." },
        { ko:"그러면 마스터가 될 거예요.", rom:"geureomyeon maseutoga doel geoyeyo.", es:"Así llegarás a ser un maestro." },
      ]
    },
    {
      key:"guardia", name:"경비원 (Guardia)", x:82, y:43, dir:0, tint:"#e63946", hair:"black", wander:false,
      lines:[
        { ko:"이 동굴 안에 마스터 체육관이 있어요.", rom:"i donggul ane maseuteo cheyukgwani isseoyo.", es:"Dentro de esta cueva está el Gimnasio Maestro." },
        { ko:"메달 일곱 개가 필요해요!", rom:"medal ilgop gaega piryohaeyo!", es:"¡Necesitas siete medallas!" },
        { ko:"동굴에는 도깨비가 살아요… 조심하세요!", rom:"donggureneun dokkaebiga sarayo... josimhaseyo!", es:"En la cueva viven dokkaebi… ¡ten cuidado!" },
      ]
    },
    {
      key:"granjero", name:"농부 (Granjero)", x:48, y:26, dir:0, tint:"#90be6d", hair:"blond", wander:true,
      lines:[
        { ko:"오늘 날씨가 좋아요!", rom:"oneul nalssiga joayo!", es:"¡Hoy hace buen tiempo!" },
        { ko:"저는 밭에서 일해요.", rom:"jeoneun bateseo ilhaeyo.", es:"Yo trabajo en el campo." },
        { ko:"사과 하나 먹을래요?", rom:"sagwa hana meogeullaeyo?", es:"¿Quieres comer una manzana?" },
      ]
    },
    {
      key:"fan", name:"팬 (Fan de K-pop)", x:104, y:50, dir:0, tint:"#ff70a6", hair:"pink", long:true, wander:true,
      lines:[
        { ko:"음악을 좋아해요?", rom:"eumageul joahaeyo?", es:"¿Te gusta la música?" },
        { ko:"콘서트에 가고 싶어요!", rom:"konseoteue gago sipeoyo!", es:"¡Quiero ir a un concierto!" },
        { ko:"같이 노래해요!", rom:"gachi noraehaeyo!", es:"¡Cantemos juntos!" },
      ]
    },
    // Vecinos que antes vivían en el mapa interior del pueblo: ahora reparten
    // por la región, cada uno en la plaza del pueblo que le corresponde.
    {
      key:"vecina", name:"이웃 (Vecina)", x:26, y:18, dir:0, tint:"#7fd8ff", hair:"black", long:true, wander:true,
      lines:[
        { ko:"우리 마을에 온 걸 환영해요!", rom:"uri maeure on geol hwanyeonghaeyo!", es:"¡Bienvenida a nuestro pueblo!" },
        { ko:"시청에서 알칼데사를 만나세요.", rom:"sicheongeseo alkaldesareul mannaseyo.", es:"Habla con la alcaldesa en el ayuntamiento." },
      ]
    },
    {
      key:"ninoPueblo", name:"소년 (Niño)", x:118, y:18, dir:0, tint:"#06d6a0", hair:"black", wander:true,
      lines:[
        { ko:"학원에서 한국어를 배워요.", rom:"hagwoneseo hangugeoreul baewoyo.", es:"En la academia se aprende coreano." },
        { ko:"재미있어요!", rom:"jaemiisseoyo!", es:"¡Es divertido!" },
      ]
    },
    {
      key:"abueloPueblo", name:"할아버지 (Abuelo)", x:26, y:60, dir:0, tint:"#c8a27a", hair:"gray", wander:false,
      lines:[
        { ko:"천천히 걸으세요.", rom:"cheoncheonhi georeuseyo.", es:"Camina con calma." },
        { ko:"길이 길어요… 좋은 여행 되세요.", rom:"giri gireoyo... joeun yeohaeng doeseyo.", es:"El camino es largo… buen viaje." },
      ]
    },
    // la rival de pronunciación, junto al norebang de Pueblo Dongsa
    {
      key:"rival", name:"리나 (Rina, rival)", x:100, y:48, dir:0, tint:"#b14aed", hair:"pink", long:true,
      wander:false, action:"duel", actionLabel:"🎤 ¡duelo de pronunciación!",
      lines:[
        { ko:"내 발음이 제일 좋아!", rom:"nae bareumi jeil joa!", es:"¡Mi pronunciación es la mejor!" },
        { ko:"나랑 대결할래?", rom:"narang daegyeolhallae?", es:"¿Quieres un duelo conmigo?" },
      ]
    },
  ];

  function initNpc(n){
    n.home = { x:n.x, y:n.y };
    n.px = n.x*TILE; n.py = n.y*TILE;
    n.tx = n.x; n.ty = n.y;
    n.moving = false; n.frame = 0; n.animT = 0;
    n.nextWander = performance.now() + 1500 + Math.random()*3000;
    return n;
  }
  npcsOver.forEach(initNpc);

  let grassPatches = [];

  // ---------- Build overworld ----------
  function buildOverworld(){
    MW = OW.W; MH = OW.H;
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<MH;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<MW;x++){
        const r = Math.random();
        ground[y][x] = r<0.90 ? "grass"
          : r<0.93 ? "flower" : r<0.95 ? "tuft"
          : r<0.965 ? "flower2" : r<0.98 ? "flower3"
          : r<0.99 ? "mush" : "rock";
        solid[y][x]=false; meta[y][x]=null; decor[y][x]=null;
      }
    }

    // praderas floridas (densidad extra de flores)
    const meadows = [[10,24,14,8],[36,26,12,8],[20,38,16,6],[64,36,14,8],[52,8,10,6]];
    meadows.forEach(([mx,my,mw,mh]) => {
      for (let y=my;y<my+mh&&y<MH;y++) for (let x=mx;x<mx+mw&&x<MW;x++){
        const r = Math.random();
        if (r<0.3) ground[y][x] = r<0.16 ? "flower" : "flower2";
      }
    });

    // borde: muro sólido + anillo de árboles (el mar cierra el sur)
    for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
      if (x<2 || y<2 || x>=MW-2 || y>=MH-2) solid[y][x]=true;
    }
    for (let x=0;x<MW-1;x+=3) putTree(x,0);
    for (let y=3;y<REGION.coastY-14;y+=3){ putTree(0,y); putTree(MW-2,y); }

    // BIOMA COSTA (sur): mar abierto + playa ancha, con la orilla ondulada
    // (una costa recta delataba la rejilla; así entra y sale como una bahía)
    const coastAt = x => REGION.coastY + Math.round(1.8*Math.sin(x*0.21) + 1.2*Math.sin(x*0.55 + 1.7));
    for (let x=0;x<MW;x++){
      const cy = coastAt(x);
      for (let y=cy;y<MH;y++){ ground[y][x]="water"; solid[y][x]=true; }
      for (let y=cy-REGION.beach;y<cy;y++){
        if (y < 2 || y >= MH) continue;
        if (!solid[y][x] && ground[y][x]!=="water") ground[y][x]="sand";
      }
    }

    // RÍO: baja de norte a sur y parte la región; solo se cruza por los
    // puentes de las carreteras horizontales
    const rx = REGION.riverX;
    for (let y=2;y<REGION.coastY;y++) for (let x=rx;x<rx+3;x++){ ground[y][x]="water"; solid[y][x]=true; }

    // lago de la pradera (esquinas mordidas para que no parezca una piscina)
    const lake = { x:40, y:36, w:11, h:8 };
    for (let y=lake.y;y<lake.y+lake.h;y++) for (let x=lake.x;x<lake.x+lake.w;x++){
      const edgeX = (x===lake.x || x===lake.x+lake.w-1), edgeY = (y===lake.y || y===lake.y+lake.h-1);
      if (edgeX && edgeY) continue;
      ground[y][x]="water"; solid[y][x]=true;
    }
    [[lake.x+1,lake.y],[lake.x+lake.w-2,lake.y+lake.h-1],[lake.x,lake.y+3],[lake.x+lake.w-1,lake.y+2]]
      .forEach(([x,y]) => { ground[y][x]="grass"; solid[y][x]=false; });

    // CARRETERAS: la malla que une los pueblos (2 tiles de ancho)
    roadTiles.clear();
    const road = (x, y) => { if (!solid[y]?.[x]){ ground[y][x]="path"; roadTiles.add(x + "," + y); } };
    const pathH = (y,x0,x1) => { for (let x=x0;x<=x1;x++){ road(x, y); road(x, y+1); } };
    const pathV = (x,y0,y1) => { for (let y=y0;y<=y1;y++){ road(x, y); road(x+1, y); } };
    REGION.roadsH.forEach(y => pathH(y, REGION.roadFromX, REGION.roadToX));
    REGION.roadsV.forEach(x => pathV(x, REGION.roadFromY, REGION.roadToY));
    // puentes de madera donde cada horizontal cruza el río
    REGION.roadsH.forEach(cy => {
      for (let x=rx;x<rx+3;x++){
        ground[cy-1][x]="briT"; ground[cy][x]="briM"; ground[cy+1][x]="briB";
        solid[cy-1][x]=false; solid[cy][x]=false; solid[cy+1][x]=false;
      }
    });

    // PUEBLOS: plaza, gimnasio, servicios, casas de vecinos y letrero.
    // Van antes que los árboles para que el bosque no invada las calles.
    TOWNS.forEach(buildTown);

    /* El corral se levanta más abajo, pero su hueco hay que reservarlo YA:
       los árboles se siembran antes y el interior de la cerca es hierba
       normal, así que se colaba uno dentro y taponaba el recinto. */
    const corral = { x:44, y:18, w:7, h:6 };
    treeKeepOut.length = 0;
    treeKeepOut.push({ x: corral.x-1, y: corral.y-1, w: corral.w+2, h: corral.h+2 });

    /* BOSQUES: se siembran comprobando la huella del árbol, así nunca tapan
       una carretera ni un pueblo (antes había que ir esquivando a mano con
       corredores codificados). */
    FORESTS.forEach(f => {
      for (let fy=f.y; fy<f.y+f.h; fy+=4) for (let fx=f.x; fx<f.x+f.w; fx+=5){
        putTree(fx + (Math.random()*3|0), fy + (Math.random()*2|0));
      }
    });
    // arboledas sueltas por la pradera, en cuadrícula desperdigada
    for (let y=6; y<REGION.coastY-12; y+=7) for (let x=6; x<MW-8; x+=9){
      if (Math.random() < 0.45) putTree(x + (Math.random()*4|0), y + (Math.random()*3|0));
    }

    // matas de hierba alta repartidas por los descampados
    for (let i=0;i<90;i++){
      const x = 4 + (Math.random()*(MW-10)|0), y = 4 + (Math.random()*(REGION.coastY-10)|0);
      if (inTown(x, y)) continue;
      if (!solid[y]?.[x] && !meta[y]?.[x] && !decor[y]?.[x] && ground[y][x]==="grass") ground[y][x]="tallgrass";
    }
    /* Garantía por zona: el reparto global de arriba es tan ralo que el azar
       podía dejar una ventana entera de la rejilla (Jondae, en la costa) sin
       una sola mata — y por tanto muda, sin batallas de palabras. Cada zona
       recibe su propia hierba alta. */
    for (let zj=0; zj<3; zj++) for (let zi=0; zi<3; zi++){
      const x0 = ZONE_COLS[zi]+3, x1 = ZONE_COLS[zi+1]-3;
      const y0 = ZONE_ROWS[zj]+3, y1 = Math.min(ZONE_ROWS[zj+1]-3, REGION.coastY-4);
      let placed = 0, tries = 0;
      while (placed < 10 && tries < 400){
        tries++;
        const x = x0 + (Math.random()*(x1-x0)|0), y = y0 + (Math.random()*(y1-y0)|0);
        if (inTown(x, y)) continue;
        if (solid[y]?.[x] || meta[y]?.[x] || decor[y]?.[x] || ground[y]?.[x] !== "grass") continue;
        ground[y][x] = "tallgrass";
        placed++;
      }
    }

    // Entrada a la CUEVA (claro del bosque profundo, entre las rutas 5 y 7)
    putCaveEntrance(78, 40);

    // MUELLE DE PESCA: sale del Puerto Topik hacia mar abierto
    const port = TOWNS.find(t => t.gym === "topik1");
    const pierX = port.cx - 1;
    for (let y=REGION.coastY-8; y<=REGION.coastY+6; y++){
      if (y >= MH) break;
      ground[y][pierX]="pierL"; ground[y][pierX+1]="pierM"; ground[y][pierX+2]="pierR";
      [pierX,pierX+1,pierX+2].forEach(x => { solid[y][x]=false; meta[y][x]=null; });
    }
    meta[REGION.coastY+6][pierX+1] = { type:"fishspot" };

    // CASA DEL MAR (asset 3D en la playa oeste; el modelo se añade en
    // buildSeaHouse — aquí solo reservamos su huella sólida)
    for (let y=SEA_HOUSE_AT.y-3;y<=SEA_HOUSE_AT.y+3;y++)
      for (let x=SEA_HOUSE_AT.x-3;x<=SEA_HOUSE_AT.x+3;x++){ solid[y][x]=true; meta[y][x]=null; }

    // CORRAL del granjero (cerca con animales, en la pradera central)
    for (let x=corral.x;x<corral.x+corral.w;x++){
      ground[corral.y][x] = x===corral.x?"fenceTL":(x===corral.x+corral.w-1?"fenceTR":"fenceH");
      solid[corral.y][x]=true;
      if (x === corral.x+3) continue; // portillo
      ground[corral.y+corral.h][x] = x===corral.x?"fenceBL":(x===corral.x+corral.w-1?"fenceBR":"fenceH");
      solid[corral.y+corral.h][x]=true;
    }
    for (let y=corral.y+1;y<corral.y+corral.h;y++){
      ground[y][corral.x]="fenceV"; solid[y][corral.x]=true;
      ground[y][corral.x+corral.w-1]="fenceV"; solid[y][corral.x+corral.w-1]=true;
    }
    spawnAnimals();

    // COFRES escondidos (monedas)
    [[8,8,"c1"],[124,60,"c2"],[76,34,"c3"],[10,86,"c4"],[124,8,"c5"],
     [52,48,"c6"],[96,88,"c7"]].forEach(([x,y,id]) => {
      if (solid[y]?.[x] || meta[y]?.[x] || decor[y]?.[x]) return;
      const s = State.get();
      if ((s.chests||[]).includes(id)) return;
      ground[y][x] = "chest";
      meta[y][x] = { type:"chest", id };
    });

    // ARBUSTOS de guardianes por bioma (aleatorios en zonas válidas)
    const tryBush = (biome,x,y) => {
      if (solid[y]?.[x] || meta[y]?.[x] || decor[y]?.[x]) return;
      const g = ground[y][x];
      if (!["grass","sand","flower","flower2","flower3","tuft"].includes(g)) return;
      ground[y][x] = (g==="sand") ? "bushSand" : "bush";
      meta[y][x]={type:"bush",biome};
    };
    for (let i=0;i<40;i++) tryBush("pradera", 6+(Math.random()*54|0), 6+(Math.random()*66|0));
    for (let i=0;i<30;i++) tryBush("bosque", 66+(Math.random()*44|0), 26+(Math.random()*50|0));
    for (let i=0;i<24;i++) tryBush("costa", 6+(Math.random()*(MW-14)|0), REGION.coastY-9+(Math.random()*8|0));

    /* Los NPCs llevan coordenadas escritas a mano, y mover un pueblo o una
       carretera puede dejar a alguno dentro de una casa o en el agua. En vez
       de cuadrar los números a ojo cada vez, se busca la casilla libre más
       cercana: el NPC se corre lo justo y nunca queda inalcanzable. */
    const relocate = (n) => {
      const free = (x, y) => ground[y]?.[x] !== undefined && !solid[y][x] &&
        !decor[y][x] && !meta[y][x] && ground[y][x] !== "water";
      if (free(n.x, n.y)) return;
      for (let r=1; r<=12; r++){
        for (let dy=-r; dy<=r; dy++) for (let dx=-r; dx<=r; dx++){
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = n.x+dx, ny = n.y+dy;
          if (!free(nx, ny)) continue;
          n.x = n.tx = nx; n.y = n.ty = ny;
          n.px = nx*TILE; n.py = ny*TILE;
          return;
        }
      }
    };
    /* Se les guarda la posición en coordenadas de la región (gx/gy); cada
       zona traduce después a las suyas al cargarse. */
    npcsOver.forEach(n => { relocate(n); n.gx = n.x; n.gy = n.y; });

    // HIERBA ALTA de encuentros: a lo largo de las rutas, para que el viaje
    // entre pueblos sea donde aparecen las palabras salvajes
    grassPatches = [
      { x:16, y:20, w:9,  h:5, pool: Data.routes[0].pool },  // Ruta 1
      { x:34, y:30, w:10, h:5, pool: Data.routes[0].pool },  // Ruta 2
      { x:76, y:22, w:8,  h:6, pool: Data.routes[1].pool },  // Ruta 3
      { x:96, y:30, w:9,  h:5, pool: Data.routes[1].pool },  // Ruta 3 este
      { x:16, y:36, w:8,  h:6, pool: Data.routes[2].pool },  // Ruta 4
      { x:34, y:52, w:10, h:5, pool: Data.routes[2].pool },  // Ruta 5
      { x:70, y:60, w:9,  h:6, pool: Data.routes[3].pool },  // Ruta 7 bosque
      { x:96, y:60, w:9,  h:5, pool: Data.routes[3].pool },  // Ruta 9
      { x:34, y:74, w:10, h:5, pool: Data.routes[4].pool },  // Ruta 8 oeste
      { x:78, y:82, w:9,  h:5, pool: Data.routes[4].pool },  // Ruta 8 este
      { x:16, y:66, w:8,  h:5, pool: Data.routes[5].pool },  // suroeste
      { x:72, y:36, w:8,  h:6, pool: Data.routes[5].pool },  // claro de la cueva
    ];
    /* La hierba alta crece AL LADO del camino, nunca encima: pintarla sobre
       la calzada no solo quedaba raro, es que borraba el "path" y con él los
       pasos que comunican unas zonas con otras. */
    const SOWABLE = ["grass","flower","flower2","flower3","tuft","mush"];
    grassPatches.forEach(p => {
      for (let y=p.y;y<p.y+p.h;y++) for (let x=p.x;x<p.x+p.w;x++){
        if (inTown(x, y)) continue;   // los encuentros son de ruta, no de plaza
        if (solid[y]?.[x] || meta[y]?.[x] || decor[y]?.[x]) continue;
        if (!SOWABLE.includes(ground[y][x])) continue;
        ground[y][x]="tallgrass"; meta[y][x]={type:"grass",pool:p.pool};
      }
    });

    // El mapa maestro queda listo; a partir de aquí el juego solo carga una
    // zona cada vez (ver loadZone).
    region = { W:MW, H:MH, ground, solid, meta, decor, npcs: npcsOver };
    mode = "over";
    const gp = State.get().playerPos;
    const gx = Number.isFinite(gp?.gx) ? gp.gx : START.x;
    const gy = Number.isFinite(gp?.gy) ? gp.gy : START.y;
    const z = zoneAt(gx, gy);
    loadZone(z.i, z.j, gx, gy);
    warmCharacters();
  }

  /* Dibujar el sprite de un vecino (recorte, recoloreo por paleta y borde)
     cuesta unos milisegundos, y hacerlo la primera vez que pisas cada zona se
     notaba como un tirón. Son doce en toda la región: se generan de una vez
     al arrancar, cuando el juego ya está mostrando la carga. */
  function warmCharacters(){
    const run = () => {
      npcsOver.forEach(n => {
        const pair = npcChars(n);
        // además de dibujarlos, subirlos ya a la GPU: si no, el coste se
        // traslada al primer frame de la zona donde vive cada vecino
        const tf = charTex(pair.front, pair), tb = charTex(pair.back, pair);
        if (renderer){ try { renderer.initTexture(tf); renderer.initTexture(tb); } catch(e){} }
      });
    };
    // se espera un poco a que la hoja de sprites esté cargada
    if (typeof requestIdleCallback === "function")
      requestIdleCallback(() => setTimeout(run, 0), { timeout: 2500 });
    else setTimeout(run, 400);
  }

  /* ==========================================================
     ZONAS
     La región se genera entera, pero nunca se juega entera: se recorta en
     una rejilla de zonas y solo vive en memoria la que pisas. Para pasar a
     la siguiente hay que salir por la carretera que cruza el borde, como en
     Pokémon. Los cortes caen justo entre las carreteras de la malla, así
     que cada frontera tiene exactamente un paso.
     ========================================================== */
  const ZONE_COLS = [0, 44, 88, 132];
  /* Los cortes horizontales dejan sitio de sobra por encima del centro de
     cada pueblo: el ancla de un edificio va 9 filas más arriba, y si cae en
     la zona vecina su parte sólida se queda aquí sin nada que dibujar — un
     muro invisible. */
  const ZONE_ROWS = [0, 34, 68, 104];
  const ZONE_NAMES = [
    ["Pueblo Hangul",  "Pueblo Sutja",  "Pueblo Josa"],
    ["Pueblo Topik",   "Valle del Lago", "Pueblo Dongsa"],
    ["Bosque del Sur", "Puerto Topik",  "Pueblo Jondae"],
  ];
  const ZONE_KO = [
    ["한글 마을", "숫자 마을", "조사 마을"],
    ["토픽 마을", "호수 골짜기", "동사 마을"],
    ["남쪽 숲",   "토픽 항구", "존경 마을"],
  ];
  const START = { x:20, y:20 };   // plaza de Pueblo Hangul

  let region = null;              // mapa maestro completo
  let curZone = { i:0, j:0 };     // zona cargada
  let zoneX0 = 0, zoneY0 = 0;     // su esquina en coordenadas de la región

  const zoneAt = (gx, gy) => {
    let i = 0, j = 0;
    while (i < 2 && gx >= ZONE_COLS[i+1]) i++;
    while (j < 2 && gy >= ZONE_ROWS[j+1]) j++;
    return { i, j };
  };
  const toGlobal = (x, y) => ({ x: x + zoneX0, y: y + zoneY0 });

  /* Carga una zona: recorta el maestro, sella el contorno con arboledas y
     abre paso solo por donde cruza una carretera. */
  function loadZone(i, j, gx, gy){
    curZone = { i, j };
    zoneX0 = ZONE_COLS[i]; zoneY0 = ZONE_ROWS[j];
    const W = ZONE_COLS[i+1] - zoneX0, H = ZONE_ROWS[j+1] - zoneY0;
    MW = W; MH = H;
    const taken = State.get().chests || [];
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<H;y++){
      ground[y] = region.ground[zoneY0+y].slice(zoneX0, zoneX0+W);
      solid[y]  = region.solid[zoneY0+y].slice(zoneX0, zoneX0+W);
      decor[y]  = region.decor[zoneY0+y].slice(zoneX0, zoneX0+W);
      meta[y]   = region.meta[zoneY0+y].slice(zoneX0, zoneX0+W).map(m => {
        // los cofres ya abiertos no reaparecen al volver a entrar en la zona
        if (m && m.type === "chest" && taken.includes(m.id)) return null;
        return m;
      });
      for (let x=0;x<W;x++) if (meta[y][x] === null && ground[y][x] === "chest") ground[y][x] = "grass";
    }

    /* Arboleda de cierre pegada al contorno, para que el límite de la zona sea
       un bosque y no una pared invisible. Va ANTES de sellar el borde: la
       huella del árbol incluye la última fila, y putTree() se niega a plantar
       sobre casilla sólida, así que sellando primero no crecía ni uno.
       Como también se niega sobre camino, los pasos quedan despejados solos. */
    for (let x=0;x<W-3;x+=2){ putTree(x, 0); putTree(x, H-5); }
    for (let y=0;y<H-5;y+=3){ putTree(0, y); putTree(W-3, y); }

    // contorno: sólido salvo donde la carretera sale hacia una zona vecina
    const hasNeighbour = (di, dj) => {
      const ni = i+di, nj = j+dj;
      return ni>=0 && nj>=0 && ni<3 && nj<3;
    };
    const OPEN = ["path","briT","briM","briB","pierL","pierM","pierR","sand"];
    const edge = (x, y, di, dj) => {
      if (hasNeighbour(di, dj) && OPEN.includes(ground[y][x]) && !decor[y][x]){
        solid[y][x] = false;
        meta[y][x] = { type:"zoneExit", dx:di, dy:dj };
      } else {
        solid[y][x] = true;
      }
    };
    for (let x=0;x<W;x++){ edge(x, 0, 0, -1); edge(x, H-1, 0, 1); }
    for (let y=0;y<H;y++){ edge(0, y, -1, 0); edge(W-1, y, 1, 0); }

    // NPCs y fauna de esta zona, en coordenadas locales
    npcsCur = region.npcs.filter(n => {
      const inZone = n.gx >= zoneX0 && n.gx < zoneX0+W && n.gy >= zoneY0 && n.gy < zoneY0+H;
      if (!inZone) return false;
      n.x = n.gx - zoneX0; n.y = n.gy - zoneY0;
      return true;
    });
    npcsCur.forEach(n => {
      if (solid[n.y][n.x] || meta[n.y][n.x]) return;
      initNpc(n);
      solid[n.y][n.x]=true; meta[n.y][n.x]={type:"npc",npc:n};
    });
    spawnAnimals();
    spawnButterflies();

    // el jugador entra donde le corresponda dentro de la zona
    const px = Math.min(W-2, Math.max(1, gx - zoneX0));
    const py = Math.min(H-2, Math.max(1, gy - zoneY0));
    player.x=player.tx=px; player.y=player.ty=py;
    player.px=px*TILE; player.py=py*TILE;
    player.moving=false;
    petTeleport();
    roomFurn = [];
    sceneDirty = true;
  }

  /* Cruzar una frontera: se entra dos casillas adentro para no caer sobre el
     borde de la zona nueva y rebotar de vuelta al instante. */
  function crossZone(dx, dy){
    const g = toGlobal(player.x, player.y);
    const gx = g.x + dx*2, gy = g.y + dy*2;
    const z = zoneAt(gx, gy);
    if (z.i === curZone.i && z.j === curZone.j) return;
    Sfx.play("door");
    loadZone(z.i, z.j, gx, gy);
    announceZone();
  }

  /* Planta un árbol si cabe. El tronco bloquea un 2x3 por debajo del ancla,
     así que hay que mirar esa huella entera: sin la comprobación, sembrar el
     bosque tapaba carreteras y puertas, y antes se esquivaba a mano con
     corredores codificados en las coordenadas. */
  const TREE_FREE = ["grass","flower","flower2","flower3","tuft","mush","rock","tallgrass"];
  /* Recintos donde no puede crecer un árbol. La comprobación de putTree mira
     la valla, pero el INTERIOR de un corral es hierba corriente: se colaba un
     árbol dentro y dejaba a los animales (y al jugador) sin paso, porque la
     única salida es el portillo. */
  const treeKeepOut = [];
  const inKeepOut = (x, y) => treeKeepOut.some(r =>
    x >= r.x && x < r.x+r.w && y >= r.y && y < r.y+r.h);

  function putTree(x,y){
    if (y+1>=MH || x+1>=MW || x<0 || y<0) return false;
    if (decor[y][x]) return false;
    for (let dy=2;dy<5;dy++) for (let dx=1;dx<3;dx++){
      const g = ground[y+dy]?.[x+dx];
      if (g === undefined) continue;                    // fuera del mapa: no estorba
      if (inKeepOut(x+dx, y+dy)) return false;
      if (meta[y+dy][x+dx] || decor[y+dy][x+dx] || solid[y+dy][x+dx]) return false;
      if (!TREE_FREE.includes(g)) return false;         // camino, agua, arena, puente…
    }
    decor[y][x] = { sprite:"tree" };
    for (let dy=2;dy<5;dy++) for (let dx=1;dx<3;dx++){
      if (solid[y+dy]?.[x+dx] !== undefined) solid[y+dy][x+dx]=true;
    }
    return true;
  }

  function clearTreesRect(x0,y0,x1,y1){
    for (let dy=y0;dy<=y1;dy++) for (let dx=x0;dx<=x1;dx++){
      if (decor[dy]?.[dx]?.sprite === "tree"){
        decor[dy][dx] = null;
        for (let ty=2;ty<5;ty++) for (let tx=1;tx<3;tx++){
          if (solid[dy+ty]?.[dx+tx] !== undefined) solid[dy+ty][dx+tx]=false;
        }
      }
    }
  }
  // Casa: base sólida = filas 4-7, puerta abajo al centro
  function putHouse(g){
    const x=g.x, y=g.y;
    clearTreesRect(x-4, y-5, x+7, y+9);
    decor[y][x] = { sprite:g.sprite, gym:g.key };
    for (let dy=4;dy<8;dy++) for (let dx=0;dx<6;dx++){
      if (solid[y+dy] === undefined || solid[y+dy][x+dx] === undefined) continue;
      solid[y+dy][x+dx]=true; meta[y+dy][x+dx]=null;
    }
    const doorX=x+2, doorY=y+7;
    solid[doorY][doorX]=false;
    meta[doorY][doorX]={type:"gymdoor", key:g.key};
    if (doorY+1 < MH){
      solid[doorY+1][doorX]=false;
      ground[doorY+1][doorX]="path";
      meta[doorY+1][doorX]=null;
    }
  }

  function putCaveEntrance(x,y){
    // los bosques se siembran antes que la cueva: si un árbol cayó justo en
    // la boca, su tronco quedaba dibujado (y medio sólido) sobre la entrada
    clearTreesRect(x-4, y-4, x+5, y+3);
    decor[y][x] = { sprite:"caveDoor" };
    for (let dy=0;dy<2;dy++) for (let dx=0;dx<4;dx++){
      if (solid[y+dy] === undefined || solid[y+dy][x+dx] === undefined) continue;
      solid[y+dy][x+dx]=true; meta[y+dy][x+dx]=null;
    }
    [x+1,x+2].forEach(dx0 => {
      solid[y+1][dx0]=false;
      meta[y+1][dx0]={type:"cavedoor"};
    });
    if (y+2 < MH){
      [x+1,x+2].forEach(dx0 => { solid[y+2][dx0]=false; ground[y+2][dx0]="dirtA"; meta[y+2][dx0]=null; });
    }
  }

  // ---------- Tienda ----------
  function putBuilding(x, y, sprite, doorType, tag){
    /* Un edificio sobre la calzada la corta en seco, y como la plaza está
       pavimentada alrededor el fallo no rompe la conectividad: se queda
       escondido hasta que alguien llega por esa carretera y se topa con el
       muro. Mejor cantarlo al construir. */
    for (let dy=4;dy<8;dy++) for (let dx=0;dx<6;dx++){
      if (roadTiles.has((x+dx) + "," + (y+dy))){
        console.warn(`[mapa] el edificio ${tag||sprite} en ${x},${y} pisa la carretera en ${x+dx},${y+dy}`);
        break;
      }
    }
    clearTreesRect(x-4, y-5, x+7, y+9);
    const d = { sprite }; if (tag) d[tag]=true;
    decor[y][x] = d;
    for (let dy=4;dy<8;dy++) for (let dx=0;dx<6;dx++){
      if (solid[y+dy] === undefined || solid[y+dy][x+dx] === undefined) continue;
      solid[y+dy][x+dx]=true; meta[y+dy][x+dx]=null;
    }
    if (!doorType) return; // casa de vecinos: se ve, pero no se entra
    const doorX=x+2, doorY=y+7;
    solid[doorY][doorX]=false;
    meta[doorY][doorX]={type:doorType};
    if (doorY+1 < MH){
      solid[doorY+1][doorX]=false;
      ground[doorY+1][doorX]="path";
      meta[doorY+1][doorX]=null;
    }
  }
  function putShop(x,y){ putBuilding(x, y, "houseG", "shopdoor", "shop"); }
  function putHome(x,y){ putBuilding(x, y, "house", "casadoor", "casa"); }

  function buildShopInterior(){
    const W=17, H=12;
    MW=W; MH=H;
    roomFurn = [];
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<H;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<W;x++){
        ground[y][x] = (x%2===0 ? (y%2===0?"floorA":"floorC") : (y%2===0?"floorB":"floorD"));
        solid[y][x]=false; meta[y][x]=null; decor[y][x]=null;
      }
    }
    for (let x=0;x<W;x++){
      ground[0][x]="wallTop"; solid[0][x]=true;
      ground[1][x]="wallFace"; solid[1][x]=true;
      ground[2][x]="wallFace2"; solid[2][x]=true;
    }
    for (let y=0;y<H;y++){
      solid[y][0]=true; solid[y][W-1]=true;
      if (y>0){ ground[y][0]="wallTop"; ground[y][W-1]="wallTop"; }
    }
    for (let x=0;x<W;x++){ if (x!==8){ ground[H-1][x]="wallTop"; solid[H-1][x]=true; } }
    // alfombra de la zona de mostrador
    for (let x=6;x<11;x++) ground[3][x]="rug";
    const keeper = initNpc({
      key:"tendero", name:"주인 아저씨 (Tendero)", x:8, y:4, dir:0, tint:"#f4a261", hair:"black",
      wander:false, isShop:true,
      lines:[
        { ko:"어서 오세요! 뭐 드릴까요?", rom:"eoseo oseyo! mwo deurilkkayo?", es:"¡Bienvenida! ¿Qué te doy?" },
      ]
    });
    npcsCur = [keeper];
    solid[keeper.y][keeper.x]=true;
    meta[keeper.y][keeper.x]={type:"npc", npc:keeper};

    // mostrador en dos tramos: el tendero atiende desde el hueco central
    addFurn(() => Furn.counter(3), 5, 4, 3, 1);
    addFurn(() => Furn.counter(3), 9, 4, 3, 1);
    // estanterías cargadas contra el muro norte y las paredes
    addFurn(() => Furn.shelf(2), 1, 3, 2, 1);
    addFurn(() => Furn.shelf(2), 14, 3, 2, 1);
    addFurn(() => Furn.shelf(2), 1, 6, 2, 1);
    addFurn(() => Furn.shelf(2), 14, 6, 2, 1);
    addFurn(() => Furn.fridge(), 1, 8);
    // cajas apiladas y plantas
    addFurn(() => Furn.crate(), 3, 9);
    addFurn(() => Furn.crate(), 14, 9);
    addFurn(() => Furn.crate(), 15, 8);
    addFurn(() => Furn.plant(), 1, 10);
    addFurn(() => Furn.plant(), 15, 10);

    // salida
    ground[H-1][8]="exitMat"; solid[H-1][8]=false;
    meta[H-1][8]={type:"exit"};

    player.x=player.tx=8; player.y=player.ty=H-2;
    player.px=player.x*TILE; player.py=player.y*TILE;
    player.dir=2;
    mode="tienda";
    petTeleport();
    sceneDirty = true;
  }
  function enterShop(){
    pushMap();
    Sfx.play("door");
    buildShopInterior();
  }

  // ---------- Pueblo (마을) ----------

  /* Mobiliario de interiores (js/furniture.js): las piezas se registran al
     montar la rejilla y se materializan en buildScene, porque worldGroup
     todavía no existe cuando se construye el mapa. Salvo `ghost`, la huella
     de la pieza queda sólida para que el jugador no la atraviese. */
  let roomFurn = [];
  function addFurn(make, x, y, w=1, h=1, opts={}){
    if (!opts.ghost) for (let dy=0; dy<h; dy++) for (let dx=0; dx<w; dx++){
      if (solid[y+dy]?.[x+dx] !== undefined){ solid[y+dy][x+dx] = true; meta[y+dy][x+dx] = null; }
    }
    roomFurn.push({ make, x: x + w/2, z: y + h/2, ...opts });
  }
  function buildRoomFurniture(){
    roomFurn.forEach(f => {
      const m = f.make();
      m.position.set(f.x, f.y0 || 0, f.z);
      if (f.rotY) m.rotation.y = f.rotY;
      worldGroup.add(m);
    });
  }

  // ---------- Helper: habitación interior simple ----------
  function buildRoom(W, H, npc, modeName, furnish){
    MW=W; MH=H;
    roomFurn = [];
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<H;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<W;x++){
        ground[y][x] = (x%2===0 ? (y%2===0?"floorA":"floorC") : (y%2===0?"floorB":"floorD"));
        solid[y][x]=false; meta[y][x]=null; decor[y][x]=null;
      }
    }
    for (let x=0;x<W;x++){
      ground[0][x]="wallTop"; solid[0][x]=true;
      ground[1][x]="wallFace"; solid[1][x]=true;
      ground[2][x]="wallFace2"; solid[2][x]=true;
    }
    for (let y=0;y<H;y++){
      solid[y][0]=true; solid[y][W-1]=true;
      if (y>0){ ground[y][0]="wallTop"; ground[y][W-1]="wallTop"; }
    }
    const doorX = (W>>1);
    for (let x=0;x<W;x++){ if (x!==doorX){ ground[H-1][x]="wallTop"; solid[H-1][x]=true; } }
    for (let x=doorX-1;x<=doorX+1;x++) if (ground[3][x]!==undefined) ground[3][x]="rug";

    npc.x = npc.x ?? doorX; npc.y = npc.y ?? 3;
    initNpc(npc);
    npcsCur = [npc];
    solid[npc.y][npc.x]=true;
    meta[npc.y][npc.x]={type:"npc",npc};

    if (furnish) furnish(); // mobiliario tras el NPC: no se lo puede pisar

    ground[H-1][doorX]="exitMat"; solid[H-1][doorX]=false;
    meta[H-1][doorX]={type:"exit"};

    player.x=player.tx=doorX; player.y=player.ty=H-2;
    player.px=player.x*TILE; player.py=player.y*TILE;
    player.dir=2;
    mode=modeName;
    petTeleport();
    sceneDirty = true;
  }

  // ---------- Café (카페) ----------
  function buildCafe(){
    buildRoom(16, 11, {
      key:"barista", name:"바리스타 (Barista)", dir:0, tint:"#c86b3c", hair:"black",
      wander:false, action:"cafe", actionLabel:"☕ ver el menú", x:2, y:4,
      lines:[
        { ko:"카페에 오신 걸 환영해요!", rom:"kapee osin geol hwanyeonghaeyo!", es:"¡Bienvenida al café!" },
        { ko:"뭐 주문하시겠어요?", rom:"mwo jumunhasigesseoyo?", es:"¿Qué desea ordenar?" },
      ]
    }, "cafe", () => {
      // barra con hueco: el barista atiende desde el medio
      addFurn(() => Furn.counter(1.6), 1, 4);
      addFurn(() => Furn.counter(1.6), 3, 4);
      addFurn(() => Furn.fridge(), 1, 3);
      addFurn(() => Furn.menuBoard(), 5, 2, 2, 1, { ghost:true });
      // mesitas con sillas
      [[7,5],[12,5],[7,8],[12,8]].forEach(([tx,ty]) => {
        addFurn(() => Furn.tableRound(), tx, ty);
        addFurn(() => Furn.chair(Math.PI/2), tx-1, ty);
        addFurn(() => Furn.chair(-Math.PI/2), tx+1, ty);
      });
      addFurn(() => Furn.sofa(2, "#a0653a"), 14, 5, 1, 2, { rotY:-Math.PI/2 });
      addFurn(() => Furn.plant(), 1, 9);
      addFurn(() => Furn.plant(), 14, 9);
    });
  }
  function enterCafe(){ pushMap(); Sfx.play("door"); buildCafe(); }

  // ---------- Academia (학원) ----------
  function buildAcademia(){
    buildRoom(17, 12, {
      key:"maestra", name:"선생님 (Maestra)", dir:0, tint:"#4361ee", hair:"black", long:true,
      wander:false, action:"class", actionLabel:"📚 tomar clase", x:8, y:4,
      lines:[
        { ko:"학원에 오신 걸 환영해요!", rom:"hagwone osin geol hwanyeonghaeyo!", es:"¡Bienvenida a la academia!" },
        { ko:"오늘 복습할까요?", rom:"oneul bokseuphalkkayo?", es:"¿Repasamos hoy?" },
      ]
    }, "academia", () => {
      addFurn(() => Furn.blackboard(3.4), 6, 2, 5, 1, { ghost:true }); // colgada en el muro norte
      addFurn(() => Furn.deskBig(2.2), 10, 4, 2, 1);                   // escritorio de la maestra
      // pupitres en dos filas, con pasillo central
      [2,4,6,10,12,14].forEach(dx => {
        addFurn(() => Furn.studentDesk(), dx, 6);
        addFurn(() => Furn.studentDesk(), dx, 8);
      });
      addFurn(() => Furn.shelf(2), 1, 3, 2, 1);
      addFurn(() => Furn.shelf(2), 14, 3, 2, 1);
      addFurn(() => Furn.flagKR(), 1, 5);
      addFurn(() => Furn.plant(), 15, 10);
      addFurn(() => Furn.plant(), 1, 10);
    });
  }
  function enterAcademia(){ pushMap(); Sfx.play("door"); buildAcademia(); }

  // ---------- Norebang (노래방 · karaoke) ----------
  function buildNorebang(){
    buildRoom(15, 11, {
      key:"dj", name:"디제이 (DJ)", dir:0, tint:"#ff70a6", hair:"pink",
      wander:false, action:"karaoke", actionLabel:"🎤 ¡a cantar!", x:10, y:5,
      lines:[
        { ko:"노래방에 오신 걸 환영해요!", rom:"noraebange osin geol hwanyeonghaeyo!", es:"¡Bienvenida al karaoke!" },
        { ko:"마이크 준비됐어요?", rom:"maikeu junbidwaesseoyo?", es:"¿Lista con el micrófono?" },
      ]
    }, "norebang", () => {
      // escenario walk-on-able con pantalla y bola de espejos
      addFurn(() => Furn.stagePlat(5, 2.4), 5, 3, 5, 2, { ghost:true });
      addFurn(() => Furn.karaokeScreen(), 5, 2, 5, 1, { ghost:true });
      addFurn(() => Furn.discoBall(), 7, 5, 1, 1, { ghost:true });
      addFurn(() => Furn.speaker(), 4, 4);
      addFurn(() => Furn.speaker(), 11, 4);
      addFurn(() => Furn.sofa(2, "#e87ab0"), 1, 5, 1, 2, { rotY:Math.PI/2 });
      addFurn(() => Furn.sofa(2, "#a259ff"), 13, 6, 1, 2, { rotY:-Math.PI/2 });
      addFurn(() => Furn.sofa(2, "#ff9770"), 3, 9, 2, 1);
      addFurn(() => Furn.plant(), 13, 9);
    });
  }
  function enterNorebang(){ pushMap(); Sfx.play("door"); buildNorebang(); }

  /* ---------- Casa de Karol (집) ----------
     El cuarto ya no es una sala procedural: es el modelo 3D del pack de
     habitaciones isométricas (js/homeRoom.js). Por eso la rejilla se monta al
     revés que en el resto de interiores — todo sólido de partida y solo se
     abren las casillas que en el modelo son suelo libre. El mapa de casillas
     sale de la vista cenital que genera tools/room_grid.mjs. */
  const HOME_W = 7, HOME_H = 8;
  const HOME_FREE = [[1,4],[1,5],[1,6],[2,4],[2,5],[2,6],[2,7],[3,7],[4,7]];
  const HOME_EXIT = [3, 7];
  const HOME_SAVE = [1, 6];
  const HOME_CAT  = [1, 4];
  const HOME_SPAWN = [2, 6];

  function buildHome(){
    MW = HOME_W; MH = HOME_H;
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<MH;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<MW;x++){
        ground[y][x]="floorA"; solid[y][x]=true; meta[y][x]=null; decor[y][x]=null;
      }
    }
    HOME_FREE.forEach(([x,y]) => { solid[y][x] = false; });

    const cat = initNpc({
      key:"gato_casa", name:"고양이 (Gato)", dir:0, tint:"#e8a24a", hair:"black",
      creature:"pgato", wander:false, action:null, actionLabel:"✕ cerrar",
      lines:[
        { ko:"야옹~ 집이 최고예요.", rom:"yaong~ jibi choegoyeyo.", es:"Miau~ el hogar es lo mejor." },
      ],
      x: HOME_CAT[0], y: HOME_CAT[1],
    });
    npcsCur = [cat];
    solid[cat.y][cat.x] = true;
    meta[cat.y][cat.x] = { type:"npc", npc:cat };

    meta[HOME_SAVE[1]][HOME_SAVE[0]] = { type:"save" };
    meta[HOME_EXIT[1]][HOME_EXIT[0]] = { type:"exit" };
    ground[HOME_EXIT[1]][HOME_EXIT[0]] = "exitMat";

    player.x=player.tx=HOME_SPAWN[0]; player.y=player.ty=HOME_SPAWN[1];
    player.px=player.x*TILE; player.py=player.y*TILE;
    player.dir=2;
    mode="casa";
    roomFurn = [];
    petTeleport();
    sceneDirty = true;
    Sfx.play("ok");
  }
  function enterHome(){ pushMap(); Sfx.play("door"); buildHome(); }

  // ---------- Alcaldía (interior) ----------
  function buildAlcaldia(){
    const W=15, H=11;
    MW=W; MH=H;
    roomFurn = [];
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<H;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<W;x++){
        ground[y][x] = (x%2===0 ? (y%2===0?"floorA":"floorC") : (y%2===0?"floorB":"floorD"));
        solid[y][x]=false; meta[y][x]=null; decor[y][x]=null;
      }
    }
    for (let x=0;x<W;x++){
      ground[0][x]="wallTop"; solid[0][x]=true;
      ground[1][x]="wallFace"; solid[1][x]=true;
      ground[2][x]="wallFace2"; solid[2][x]=true;
    }
    for (let y=0;y<H;y++){
      solid[y][0]=true; solid[y][W-1]=true;
      if (y>0){ ground[y][0]="wallTop"; ground[y][W-1]="wallTop"; }
    }
    for (let x=0;x<W;x++){ if (x!==7){ ground[H-1][x]="wallTop"; solid[H-1][x]=true; } }
    for (let x=5;x<10;x++){ ground[3][x]="rug"; ground[4][x]="rug"; }

    // La alcaldesa: sus líneas dependen de la misión actual
    const q = Quests.current();
    const lines = [
      { ko:"어서 오세요! 저는 시장이에요.", rom:"eoseo oseyo! jeoneun sijang-ieyo.", es:"¡Bienvenida! Yo soy la alcaldesa." },
    ];
    if (q){
      lines.push({ ko:"당신의 임무예요!", rom:"dangsinui immuyeyo!", es:`Tu misión (Cap. ${q.cap}): ${q.title} — ${q.desc}` });
      lines.push({ ko:"화이팅!", rom:"hwaiting!", es:"¡Ánimo! Vuelve cuando la termines." });
    } else {
      lines.push({ ko:"당신은 진정한 마스터예요!", rom:"dangsineun jinjeonghan maseuteoyeyo!", es:"¡Ya eres una verdadera maestra del coreano!" });
    }
    const alcaldesa = initNpc({
      key:"alcalde", name:"시장님 (Alcaldesa)", x:7, y:4, dir:0,
      tint:"#a259ff", hair:"gray", long:true, wander:false, lines,
    });
    npcsCur = [alcaldesa];
    solid[alcaldesa.y][alcaldesa.x]=true;
    meta[alcaldesa.y][alcaldesa.x]={type:"npc",npc:alcaldesa};

    // escritorio en dos alas con la alcaldesa en medio, banderas y estanterías
    addFurn(() => Furn.deskBig(2.2), 4, 4, 2, 1);
    addFurn(() => Furn.deskBig(2.2), 9, 4, 2, 1);
    addFurn(() => Furn.flagKR(), 4, 3);
    addFurn(() => Furn.flagKR(), 10, 3);
    addFurn(() => Furn.shelf(2), 1, 3, 2, 1);
    addFurn(() => Furn.shelf(2), 12, 3, 2, 1);
    addFurn(() => Furn.plant(), 1, 9);
    addFurn(() => Furn.plant(), 13, 9);
    addFurn(() => Furn.trophy(), 13, 5);

    ground[H-1][7]="exitMat"; solid[H-1][7]=false;
    meta[H-1][7]={type:"exit"};

    player.x=player.tx=7; player.y=player.ty=H-2;
    player.px=player.x*TILE; player.py=player.y*TILE;
    player.dir=2;
    mode="alcaldia";
    petTeleport();
    sceneDirty = true;
  }
  function enterAlcaldia(){
    pushMap();
    Sfx.play("door");
    buildAlcaldia();
  }

  // ---------- Cueva (bioma subterráneo, con el Gimnasio Maestro) ----------
  function buildCave(){
    const W=22, H=14;
    MW=W; MH=H;
    roomFurn = [];
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<H;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<W;x++){
        ground[y][x] = (x%2===0 ? (y%2===0?"caveFloorA":"caveFloorC") : (y%2===0?"caveFloorB":"caveFloorD"));
        solid[y][x]=false; meta[y][x]=null; decor[y][x]=null;
      }
    }
    for (let x=0;x<W;x++){
      ground[0][x]="caveWallTop"; solid[0][x]=true;
      ground[1][x]="caveWallFace"; solid[1][x]=true;
      ground[2][x]="caveWallFace2"; solid[2][x]=true;
    }
    for (let y=0;y<H;y++){
      ground[y][0]="caveWallTop"; solid[y][0]=true;
      ground[y][W-1]="caveWallTop"; solid[y][W-1]=true;
    }
    for (let x=0;x<W;x++){ if (x!==11){ ground[H-1][x]="caveWallTop"; solid[H-1][x]=true; } }

    // Puerta del Gimnasio Maestro (alfombra en el muro norte)
    ground[2][11] = "rug";
    solid[2][11] = false;
    meta[2][11] = { type:"gymdoor", key:"maestro" };

    // salida (sur)
    ground[H-1][11] = "exitMat";
    solid[H-1][11] = false;
    meta[H-1][11] = { type:"exit" };

    // rocas con guardianes de cueva
    [[4,5],[5,5],[9,8],[10,8],[15,5],[16,5],[18,10],[6,10],[13,10],[17,7]].forEach(([x,y]) => {
      if (solid[y]?.[x] || meta[y]?.[x]) return;
      ground[y][x] = "caveRock";
      meta[y][x] = { type:"bush", biome:"cueva" };
    });

    npcsCur = [];
    player.x=player.tx=11; player.y=player.ty=H-2;
    player.px=player.x*TILE; player.py=player.y*TILE;
    player.dir=2;
    mode="cueva";
    petTeleport();
    sceneDirty = true;
  }

  // ---------- Interior de gimnasio ----------
  function buildInterior(gym){
    curGymName = (gym && gym.name) ? gym.name : null;
    const W=15, H=12;
    MW=W; MH=H;
    roomFurn = [];
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<H;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<W;x++){
        ground[y][x] = (x%2===0 ? (y%2===0?"floorA":"floorC") : (y%2===0?"floorB":"floorD"));
        solid[y][x]=false; meta[y][x]=null; decor[y][x]=null;
      }
    }
    // walls
    for (let x=0;x<W;x++){
      ground[0][x]="wallTop"; solid[0][x]=true;
      ground[1][x]="wallFace"; solid[1][x]=true;
      ground[2][x]="wallFace2"; solid[2][x]=true;
    }
    for (let y=0;y<H;y++){
      solid[y][0]=true; solid[y][W-1]=true;
      if (y>0){ ground[y][0]="wallTop"; ground[y][W-1]="wallTop"; }
    }
    for (let x=0;x<W;x++){ ground[H-1][x] = x===7 ? ground[H-1][x] : "wallTop"; solid[H-1][x] = x!==7; }
    // rug in front of leader
    for (let y=4;y<6;y++) for (let x=6;x<9;x++) ground[y][x]="rug";
    // exit mat bottom center
    const ex=7, ey=H-1;
    ground[ey][ex]="exitMat"; solid[ey][ex]=false;
    meta[ey][ex]={type:"exit"};

    // leader NPC
    const leader = initNpc({
      name:`${gym.leader} — ${gym.name}`,
      x:7, y:4, dir:0, tint:"#ffd166", hair:"black", wander:false, isLeaderOf:gym,
      lines:[
        { ko:`안녕하세요! 저는 ${gym.leader}입니다.`, rom:"annyeonghaseyo! jeoneun ... imnida.", es:`¡Hola! Yo soy ${gym.leader}.` },
        { ko:"준비됐어요? 시험을 시작할까요?", rom:"junbidwaesseoyo? siheomeul sijakhalkkayo?", es:`¿Listo? ${gym.description} ¡Empecemos el examen!` },
      ]
    });
    npcsCur = [leader];
    solid[leader.y][leader.x]=true;
    meta[leader.y][leader.x]={type:"npc", npc:leader};

    // tarima del líder + farolillos de piedra y banderas ceremoniales
    addFurn(() => Furn.stagePlat(3, 2), 6, 3, 3, 2, { ghost:true });
    addFurn(() => Paper.stoneLanternMesh(), 2, 4);
    addFurn(() => Paper.stoneLanternMesh(), 12, 4);
    addFurn(() => Furn.flagKR(), 3, 3);
    addFurn(() => Furn.flagKR(), 11, 3);
    addFurn(() => Furn.trophy(), 1, 3);
    addFurn(() => Furn.trophy(), 13, 3);
    addFurn(() => Furn.plant(), 1, 10);
    addFurn(() => Furn.plant(), 13, 10);

    // place player at exit
    player.x=player.tx=ex; player.y=player.ty=ey-1;
    player.px=player.x*TILE; player.py=player.y*TILE;
    player.dir=2;
    mode="interior";
    petTeleport();
    sceneDirty = true;
  }

  // ---------- Pila de mapas ----------
  function pushMap(){
    mapStack.push({
      ground, solid, meta, decor, MW, MH, mode,
      npcs: npcsCur, grassPatches,
      pos: { x:player.x, y:player.y },
    });
  }
  function enterInterior(gym){
    pushMap();
    Sfx.play("door");
    buildInterior(gym);
  }
  function enterCave(){
    pushMap();
    Sfx.play("door");
    buildCave();
  }
  function exitMap(){
    const st = mapStack.pop();
    if (!st) return;
    ({ ground, solid, meta, decor, MW, MH, mode } = st);
    npcsCur = st.npcs;
    grassPatches = st.grassPatches;
    roomFurn = [];
    Sfx.play("door");
    const px = st.pos.x;
    const py = (st.pos.y+1 < MH && !solid[st.pos.y+1]?.[px]) ? st.pos.y+1 : st.pos.y;
    player.x=player.tx=px; player.y=player.ty=py;
    player.px=px*TILE; player.py=py*TILE;
    player.dir=0;
    petTeleport();
    sceneDirty = true;
  }

  /* Derrota en batalla: despertar en casa. Se limpia la pila de mapas por si
     la palabra pilló dentro de un sitio y se vuelve a la plaza del pueblo
     inicial, que es zona segura y la conoce todo el mundo. */
  function respawn(){
    mapStack.length = 0;
    mode = "over";
    loadZone(0, 0, START.x, START.y);
  }
  // qué tema de música toca donde estás (para volver de una batalla)
  const musicTheme = () => mode === "cueva" ? "cave" : "world";

  // ---------- Animales de granja (ambiente, lógica) ----------
  let farmAnimals = [];
  function spawnAnimals(){
    farmAnimals = [];
    const put = (kind, x, y, r) => farmAnimals.push({
      kind, x, y, px:x*TILE, py:y*TILE, tx:x, ty:y,
      home:{x,y}, radius:r, moving:false, facing:1,
      frame:0, t: Math.random()*4000, next: performance.now()+1000+Math.random()*4000,
    });
    // dentro del corral del granjero
    /* Coordenadas de la región: solo se sueltan los animales que caen en la
       zona cargada, ya convertidos a sus casillas locales. */
    const here = (kind, gx, gy, r) => {
      const x = gx - zoneX0, y = gy - zoneY0;
      if (x < 1 || y < 1 || x >= MW-1 || y >= MH-1) return;
      if (solid[y]?.[x] || meta[y]?.[x] || decor[y]?.[x]) return;
      put(kind, x, y, r);
    };
    here("cow", 46, 20, 2); here("pig", 48, 21, 2); here("chicken", 45, 22, 2); here("sheep", 48, 19, 2);
    // libres por la pradera
    here("sheep", 34, 34, 3); here("chicken", 52, 44, 3); here("cow", 30, 46, 3);
    here("sheep", 100, 60, 3); here("chicken", 24, 62, 3); here("cow", 70, 84, 3);
  }
  function updateAnimals(){
    if (mode!=="over") return;
    const now = performance.now();
    farmAnimals.forEach(a => {
      a.t++;
      if (a.moving){
        const gx=a.tx*TILE, gy=a.ty*TILE;
        a.px += Math.sign(gx-a.px)*0.6;
        a.py += Math.sign(gy-a.py)*0.6;
        if (a.t % 14 === 0) a.frame = (a.frame+1)%2;
        if (Math.abs(gx-a.px)<=0.8 && Math.abs(gy-a.py)<=0.8){
          a.px=gx; a.py=gy; a.x=a.tx; a.y=a.ty; a.moving=false; a.frame=0;
          a.next = now + 1500 + Math.random()*4500;
        }
        return;
      }
      if (now < a.next) return;
      a.next = now + 1500 + Math.random()*4500;
      const dirs = [[0,1],[0,-1],[-1,0],[1,0]];
      const [dx,dy] = dirs[Math.random()*4|0];
      const nx=a.x+dx, ny=a.y+dy;
      if (Math.abs(nx-a.home.x)>a.radius || Math.abs(ny-a.home.y)>a.radius) return;
      if (solid[ny]?.[nx] || meta[ny]?.[nx]) return;
      if (nx===player.x && ny===player.y) return;
      if (dx!==0) a.facing = dx>0 ? -1 : 1;
      a.tx=nx; a.ty=ny; a.moving=true;
    });
  }

  // ---------- Mariposas (ambiente, lógica) ----------
  const BFLY_COLORS = ["#ff9f43","#f8f4ff","#ff70a6","#7fd8ff"];
  let butterflies = [];
  function spawnButterflies(){
    butterflies = [];
    // revolotean por el mapa cargado, sea la zona que sea
    const zones = [
      { x:4, y:4, w:Math.max(4, MW-8), h:Math.max(4, MH-8), n:6 },
    ];
    zones.forEach(z => {
      for (let i=0;i<z.n;i++){
        const bx = (z.x + Math.random()*z.w) * TILE;
        const by = (z.y + Math.random()*z.h) * TILE;
        butterflies.push({
          px:bx, py:by, tx:bx, ty:by,
          zone:z, kind: Math.random()*BFLY_COLORS.length|0,
          t: Math.random()*200,
        });
      }
    });
  }
  function updateButterflies(){
    if (mode!=="over") return;
    butterflies.forEach(b => {
      b.t++;
      const dx = b.tx-b.px, dy = b.ty-b.py;
      const d = Math.hypot(dx,dy);
      if (d < 3 || b.t > 400){
        b.t = 0;
        b.tx = (b.zone.x + Math.random()*b.zone.w) * TILE;
        b.ty = (b.zone.y + Math.random()*b.zone.h) * TILE;
      } else {
        b.px += dx/d * 0.55 + Math.sin(b.t*0.15)*0.25;
        b.py += dy/d * 0.55 + Math.cos(b.t*0.11)*0.2;
      }
    });
  }

  // ---------- Dialogue ----------
  const Dialog = { open:false, npc:null, idx:0 };
  function openDialog(npc){
    Dialog.open=true; Dialog.npc=npc; Dialog.idx=0;
    npc.dir = player.x < npc.x ? 1 : (player.x > npc.x ? 3 : (player.y > npc.y ? 0 : 2));
    Sfx.play("blip");
    if (npc.key) Quests.notify("talk", npc.key);
    // la alcaldesa siempre describe la misión vigente
    if (npc.key === "alcalde"){
      const q = Quests.current();
      npc.lines = [
        { ko:"어서 오세요! 저는 시장이에요.", rom:"eoseo oseyo! jeoneun sijang-ieyo.", es:"¡Bienvenida! Yo soy la alcaldesa." },
        q ? { ko:"당신의 임무예요!", rom:"dangsinui immuyeyo!", es:`Tu misión (Cap. ${q.cap}): ${q.title} — ${q.desc}` }
          : { ko:"당신은 진정한 마스터예요!", rom:"dangsineun jinjeonghan maseuteoyeyo!", es:"¡Ya eres una verdadera maestra del coreano!" },
        { ko:"화이팅!", rom:"hwaiting!", es:"¡Ánimo!" },
      ];
    }
    renderDialog();
  }
  function advanceDialog(){
    if (!Dialog.open) return;
    Dialog.idx++;
    if (Dialog.idx >= Dialog.npc.lines.length){
      const npc = Dialog.npc;
      closeDialog();
      if (npc.isLeaderOf){ exitMap(); UI.startGymFromWorld(npc.isLeaderOf); }
      else if (npc.isShop || npc.action==="shop") UI.openShop();
      else if (npc.action==="cafe") UI.startCafe();
      else if (npc.action==="class") UI.startClass();
      else if (npc.action==="karaoke") UI.startKaraoke();
      else if (npc.action==="duel") UI.startDuel();
      return;
    }
    Sfx.play("blip");
    renderDialog();
  }
  function closeDialog(){
    Dialog.open=false; Dialog.npc=null;
    const el = document.getElementById("dialog");
    if (el) el.hidden = true;
  }
  function renderDialog(){
    const el = document.getElementById("dialog");
    const line = Dialog.npc.lines[Dialog.idx];
    el.hidden = false;
    el.querySelector(".dlg-name").textContent = Dialog.npc.name;
    el.querySelector(".dlg-ko").textContent = line.ko;
    el.querySelector(".dlg-rom").textContent = line.rom;
    el.querySelector(".dlg-es").textContent = line.es;
    el.querySelector(".dlg-more").textContent =
      Dialog.idx < Dialog.npc.lines.length-1 ? "▼ espacio / clic"
      : (Dialog.npc.isLeaderOf ? "⚔ ¡empezar examen!"
        : (Dialog.npc.actionLabel || (Dialog.npc.isShop ? "🛒 abrir tienda" : "✕ cerrar")));
    Engine.speak(line.ko);
  }

  // ---------- Player ----------
  const player = {
    x:20, y:20, px:20*TILE, py:20*TILE,
    dir:0, frame:0, animT:0,
    moving:false, tx:20, ty:20, speed:1.5,
  };
  const keys = {};
  let started = false;

  // ---------- Mascota que te sigue ----------
  let pet = null;
  function refreshPet(){
    const k = State.get().activePet;
    if (!k){ pet = null; return; }
    if (pet && pet.key === k) return;
    pet = { key:k, x:player.x, y:player.y, px:player.px, py:player.py,
            tx:player.x, ty:player.y, moving:false, bob:0 };
  }
  function petTeleport(){
    if (!pet) return;
    pet.x=pet.tx=player.x; pet.y=pet.ty=player.y;
    pet.px=player.px; pet.py=player.py;
    pet.moving=false;
  }
  function petFollowTo(x,y){
    if (!pet) return;
    if (pet.x===x && pet.y===y && !pet.moving) return;
    pet.tx=x; pet.ty=y; pet.moving=true;
  }
  function updatePet(){
    refreshPet();
    if (!pet) return;
    pet.bob++;
    if (pet.moving){
      const gx=pet.tx*TILE, gy=pet.ty*TILE;
      pet.px += Math.sign(gx-pet.px)*player.speed;
      pet.py += Math.sign(gy-pet.py)*player.speed;
      if (Math.abs(gx-pet.px)<=player.speed && Math.abs(gy-pet.py)<=player.speed){
        pet.px=gx; pet.py=gy; pet.x=pet.tx; pet.y=pet.ty; pet.moving=false;
      }
    }
  }

  function isActive(){
    const scr = document.getElementById("screen-map");
    return scr && scr.classList.contains("active");
  }

  function tryMove(dx,dy,dir){
    if (player.moving || Dialog.open) return;
    player.dir = dir;
    const nx=player.x+dx, ny=player.y+dy;
    if (nx<0||ny<0||nx>=MW||ny>=MH) return;
    const m = meta[ny][nx];
    if (m && m.type==="npc"){ openDialog(m.npc); return; }
    if (solid[ny][nx]) return;
    petFollowTo(player.x, player.y); // la mascota va a la casilla que dejas
    player.tx=nx; player.ty=ny; player.moving=true;
  }

  // la posición se apunta al guardar, mires donde mires (ver State.onBeforeSave)
  if (typeof State !== "undefined" && State.onBeforeSave) State.onBeforeSave(s => {
    if (mode !== "over" || !region) return;
    const g = toGlobal(player.x, player.y);
    s.playerPos = { gx:g.x, gy:g.y };
  });

  /* Reserva por terreno: la hierba alta y los arbustos spawnean AUNQUE nadie
     haya sembrado encuentros a mano en ese trozo de mapa. Antes los spawns
     vivían solo en unos rectángulos de coordenadas fijas (grassPatches y
     tryBush), así que las matas decorativas y cualquier lugar nuevo quedaban
     mudos. La reserva y el bioma se deducen de la zona actual. */
  const ZONE_ROUTE = [   // qué pool de Data.routes toca en cada zona
    [0, 1, 1],
    [2, 3, 3],
    [4, 4, 5],
  ];
  const ZONE_BIOME = [   // qué guardianes viven en cada zona
    ["pradera","pradera","bosque"],
    ["pradera","bosque","bosque"],
    ["bosque","costa", "costa"],
  ];
  function terrainEncounter(){
    const g = ground[player.y]?.[player.x];
    if (g === "tallgrass"){
      if (mode !== "over" || Math.random() >= 0.08) return;
      // en pleno pueblo no hay bichos: las plazas son zona segura
      const gg = toGlobal(player.x, player.y);
      if (inTown(gg.x, gg.y)) return;
      const pool = Data.routes[ZONE_ROUTE[curZone.j]?.[curZone.i] ?? 0].pool;
      Sfx.play("encounter");
      UI.startWildBattleWord(Engine.pickEncounter(pool));
    } else if (g === "bush" || g === "bushSand" || g === "caveRock"){
      if (Math.random() >= 0.35) return;
      const biome = mode === "cueva" ? "cueva" : (ZONE_BIOME[curZone.j]?.[curZone.i] || "pradera");
      UI.startCaptureFromWorld(biome);
    }
  }

  function onArrive(){
    const s = State.get();
    if (mode==="over"){ const g = toGlobal(player.x, player.y); s.playerPos = { gx:g.x, gy:g.y }; }
    announceZone();
    const m = meta[player.y][player.x];
    if (!m){ terrainEncounter(); return; }
    if (m.type==="grass"){
      // la hierba alta da batallas de palabras solo a veces
      if (Math.random() < 0.08){
        Sfx.play("encounter");
        const word = Engine.pickEncounter(m.pool);
        UI.startWildBattleWord(word);
      }
    } else if (m.type==="bush"){
      // arbustos estilo pokemon: aquí viven los guardianes
      if (Math.random() < 0.35){
        UI.startCaptureFromWorld(m.biome);
      }
    } else if (m.type==="cavedoor"){
      enterCave();
    } else if (m.type==="shopdoor"){
      enterShop();
    } else if (m.type==="zoneExit"){
      crossZone(m.dx, m.dy);
    } else if (m.type==="alcaldiadoor"){
      enterAlcaldia();
    } else if (m.type==="cafedoor"){
      enterCafe();
    } else if (m.type==="academiadoor"){
      enterAcademia();
    } else if (m.type==="norebangdoor"){
      enterNorebang();
    } else if (m.type==="casadoor"){
      enterHome();
    } else if (m.type==="save"){
      State.save();
      Sfx.play("ok");
      UI.toast("💾 Partida guardada en casa.");
    } else if (m.type==="chest"){
      const sc = State.get();
      sc.chests = sc.chests || [];
      if (!sc.chests.includes(m.id)){
        sc.chests.push(m.id);
        State.addCoins(30);
        State.save();
        Sfx.play("coin");
        UI.toast("🎁 ¡Cofre encontrado! +30 monedas");
        UI.refreshTopbar();
      }
      ground[player.y][player.x] = "grass";
      meta[player.y][player.x] = null;
      sceneDirty = true;
    } else if (m.type==="fishspot"){
      UI.startFishing();
    } else if (m.type==="gymdoor"){
      const g = Data.gyms.find(x=>x.key===m.key);
      if (s.badges.includes(g.key)) { UI.toast("Ya tienes esta medalla. 🏆"); stepBack(); return; }
      // modo historia: el gimnasio se abre con la misión + nivel mínimo
      if (!Quests.isGymUnlocked(g.key)){
        UI.toast(`🔒 Completa las misiones para abrir este gimnasio. (Habla con la alcaldesa)`, 2600);
        stepBack();
        return;
      }
      const lvlReq = Quests.gymLevelReq(g.key);
      if (Quests.level() < lvlReq){
        UI.toast(`🔒 Necesitas nivel ${lvlReq} (tienes ${Quests.level()}). ¡Estudia más palabras!`, 2600);
        stepBack();
        return;
      }
      enterInterior(g);
    } else if (m.type==="exit"){
      exitMap();
    }
  }
  function stepBack(){
    if (!solid[player.y+1]?.[player.x]){
      player.ty=player.y+1; player.tx=player.x; player.moving=true; player.dir=0;
    }
  }

  // ---------- Zonas (banner de lugar) + minimapa ----------
  let curGymName = null;
  function zoneInfo(){
    switch(mode){
      case "cueva":    return { name:"Cueva Maestra", ko:"마스터 동굴" };
      case "casa":     return { name:"Tu casa", ko:"우리 집" };
      case "tienda":   return { name:"Tienda", ko:"상점" };
      case "alcaldia": return { name:"Alcaldía", ko:"시청" };
      case "interior": return { name:curGymName || "Gimnasio", ko:"체육관" };
      case "cafe":     return { name:"Café", ko:"카페" };
      case "academia": return { name:"Academia", ko:"학원" };
      case "norebang": return { name:"Norebang", ko:"노래방" };
    }
    if (mode !== "over") return { name:"Interior", ko:"실내" };
    // cada zona es un mapa con nombre propio; dentro, el pueblo manda sobre
    // la ruta que lo atraviesa
    const g = toGlobal(player.x, player.y);
    for (const t of TOWNS){
      const r = townRect(t);
      if (g.x>=r.x && g.x<r.x+r.w && g.y>=r.y && g.y<r.y+r.h) return { name:t.name, ko:t.ko };
    }
    return { name: ZONE_NAMES[curZone.j][curZone.i], ko: ZONE_KO[curZone.j][curZone.i] };
  }

  let lastZoneKey = "";
  function announceZone(){
    const z = zoneInfo();
    if (z.name === lastZoneKey) return;
    lastZoneKey = z.name;
    const el = document.getElementById("loc-banner");
    if (el){
      el.innerHTML = `<b>${z.name}</b>` + (z.ko ? `<span>${z.ko}</span>` : "");
      el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
    }
    const mz = document.getElementById("minimap-zone");
    if (mz) mz.textContent = z.name + (z.ko ? " · " + z.ko : "");
  }

  // ---------- Minimapa ----------
  const MM_COLORS = {
    grass:"#8ecb6d", flower:"#9fd77f", flower2:"#9fd77f", flower3:"#9fd77f",
    tuft:"#8ecb6d", mush:"#a8c47a", rock:"#9a9a8a", water:"#5db8e8",
    sand:"#f0dfa0", path:"#dbb87e", tallgrass:"#57a04b", dirtA:"#b98d5e",
    briT:"#c99a5e", briM:"#c99a5e", briB:"#c99a5e",
    pierL:"#c99a5e", pierM:"#c99a5e", pierR:"#c99a5e", chest:"#e8b23a",
    bush:"#4e8f42", bushSand:"#c9bd7a", fenceH:"#a97c4a", fenceV:"#a97c4a",
    fenceTL:"#a97c4a", fenceTR:"#a97c4a", fenceBL:"#a97c4a", fenceBR:"#a97c4a",
    floorA:"#e8dcc0", floorB:"#e2d4b4", floorC:"#e8dcc0", floorD:"#e2d4b4",
    rug:"#d66a7a", exitMat:"#7a5a3a",
    wallTop:"#6a5a4a", wallFace:"#7a6a58", wallFace2:"#7a6a58",
    caveFloorA:"#6a6270", caveFloorB:"#655d6b", caveFloorC:"#6a6270", caveFloorD:"#655d6b",
    caveWallTop:"#3d3745", caveWallFace:"#484153", caveWallFace2:"#484153", caveRock:"#504a5c",
  };
  const MM_SCALE = 2;
  let mmBase = null, mmLast = 0;

  function buildMinimapBase(){
    const cv = document.getElementById("minimap-canvas");
    if (!cv) return;
    const S = MM_SCALE;
    cv.width = MW*S; cv.height = MH*S;
    mmBase = mmBase || document.createElement("canvas");
    mmBase.width = MW*S; mmBase.height = MH*S;
    const c = mmBase.getContext("2d");
    for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
      c.fillStyle = MM_COLORS[ground[y][x]] || "#8ecb6d";
      c.fillRect(x*S, y*S, S, S);
    }
    // decor: árboles, casas, cueva, fuente, letreros
    for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
      const d = decor[y][x];
      if (!d) continue;
      if (d.sprite === "tree"){ c.fillStyle="#3f7a36"; c.fillRect((x+1)*S, (y+2)*S, S*3, S*3); }
      else if (HOUSE_VARIANT[d.sprite]){ c.fillStyle="#a8622e"; c.fillRect(x*S, (y+4)*S, S*6, S*4); }
      else if (d.sprite === "caveDoor"){ c.fillStyle="#3d3745"; c.fillRect(x*S, y*S, S*4, S*2); }
      else if (d.sprite === "fountain"){ c.fillStyle="#7fd8ff"; c.fillRect(x*S, y*S, S*3, S*3); }
      else if (d.sprite === "townSign"){ c.fillStyle="#fffdf4"; c.fillRect(x*S, y*S, S, S); }
    }
    // marcas fijas del overworld: gimnasios (edificio en miniatura)
    if (mode === "over"){
      const s = State.get();
      gymHouses.forEach(g => {
        const has = s.badges.includes(g.key);
        const cx = (g.x+3)*S, cy = (g.y+5)*S;
        c.fillStyle = has ? "#ffb400" : "#e63946";
        c.strokeStyle = "#33314e"; c.lineWidth = 1;
        // tejado triangular + cuerpo con puerta: un gimnasio, no un punto
        c.beginPath();
        c.moveTo(cx-3.6, cy-0.4); c.lineTo(cx, cy-4.4); c.lineTo(cx+3.6, cy-0.4);
        c.closePath(); c.fill(); c.stroke();
        c.fillRect(cx-2.5, cy-0.4, 5, 4.2);
        c.strokeRect(cx-2.5, cy-0.4, 5, 4.2);
        c.fillStyle = "#33314e";
        c.fillRect(cx-0.8, cy+1.6, 1.6, 2.2);
      });
    }
  }

  function drawMinimap(){
    const cv = document.getElementById("minimap-canvas");
    if (!cv || !mmBase) return;
    const now = performance.now();
    if (now - mmLast < 100) return;
    mmLast = now;
    const S = MM_SCALE, c = cv.getContext("2d");
    c.drawImage(mmBase, 0, 0);
    // jugador: flecha GPS azul que apunta hacia donde miras (0↓ 1← 2↑ 3→)
    const px = (player.px/TILE + 0.5) * S, py = (player.py/TILE + 0.5) * S;
    const ang = [Math.PI, -Math.PI/2, 0, Math.PI/2][player.dir] || 0;
    c.save();
    c.translate(px, py);
    c.rotate(ang);
    c.fillStyle = "#3fa9f5"; c.strokeStyle = "#fff"; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(0, -5.2); c.lineTo(3.8, 3.8); c.lineTo(0, 1.9); c.lineTo(-3.8, 3.8);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
    // objetivo de la misión vigente: ❗ dorado pulsante (si cae en esta zona)
    const qt = (typeof Quests !== "undefined" && Quests.target) ? Quests.target() : null;
    if (qt && mode === "over"){
      const lx = qt.x - zoneX0, ly = qt.y - zoneY0;
      if (lx >= 0 && lx < MW && ly >= 0 && ly < MH){
        const mp = 1 + Math.sin(now*0.008)*0.14;
        c.font = `900 ${Math.round(12*mp)}px sans-serif`;
        c.textAlign = "center"; c.textBaseline = "middle";
        c.lineWidth = 2.6; c.strokeStyle = "#fff";
        c.strokeText("!", (lx+0.5)*S, (ly+0.5)*S);
        c.fillStyle = "#ffb400";
        c.fillText("!", (lx+0.5)*S, (ly+0.5)*S);
      }
    }
  }

  // ---------- NPC wandering ----------
  function updateNpcs(now){
    if (mode!=="over") return;
    npcsCur.forEach(n => {
      if (n.moving){
        const gx=n.tx*TILE, gy=n.ty*TILE;
        n.px += Math.sign(gx-n.px)*1.1;
        n.py += Math.sign(gy-n.py)*1.1;
        n.animT++;
        if (n.animT%10===0) n.frame=(n.frame+1)%4;
        if (Math.abs(gx-n.px)<=1.2 && Math.abs(gy-n.py)<=1.2){
          n.px=gx; n.py=gy; n.x=n.tx; n.y=n.ty; n.moving=false; n.frame=0;
          n.nextWander = now + 1800 + Math.random()*3500;
        }
        return;
      }
      if (!n.wander || Dialog.npc===n || now < n.nextWander) return;
      n.nextWander = now + 1800 + Math.random()*3500;
      const dirs = [[0,1,0],[-1,0,1],[0,-1,2],[1,0,3]];
      const [dx,dy,dir] = dirs[Math.random()*4|0];
      const nx=n.x+dx, ny=n.y+dy;
      if (nx<0||ny<0||nx>=MW||ny>=MH) return;
      if (Math.abs(nx-n.home.x)>2 || Math.abs(ny-n.home.y)>2) return;
      if (solid[ny][nx] || meta[ny][nx]) return;
      if (nx===player.x && ny===player.y) return;
      if (nx===player.tx && ny===player.ty) return;
      // move: update grid refs
      solid[n.y][n.x]=false; meta[n.y][n.x]=null;
      solid[ny][nx]=true; meta[ny][nx]={type:"npc",npc:n};
      n.dir=dir; n.tx=nx; n.ty=ny; n.moving=true;
    });
  }

  function update(){
    updateNpcs(performance.now());
    updateButterflies();
    updateAnimals();
    updatePet();
    if (Dialog.open){ player.frame=0; return; }
    if (!player.moving){
      if (keys["ArrowUp"]||keys["w"]) tryMove(0,-1,2);
      else if (keys["ArrowDown"]||keys["s"]) tryMove(0,1,0);
      else if (keys["ArrowLeft"]||keys["a"]) tryMove(-1,0,1);
      else if (keys["ArrowRight"]||keys["d"]) tryMove(1,0,3);
      else { player.frame=0; }
    }
    if (player.moving){
      const gx=player.tx*TILE, gy=player.ty*TILE;
      player.px += Math.sign(gx-player.px)*player.speed;
      player.py += Math.sign(gy-player.py)*player.speed;
      player.animT++;
      if (player.animT%8===0) player.frame=(player.frame+1)%4;
      if (Math.abs(gx-player.px)<=player.speed && Math.abs(gy-player.py)<=player.speed){
        player.px=gx; player.py=gy;
        player.x=player.tx; player.y=player.ty;
        player.moving=false;
        onArrive();
      }
    }
  }

  /* ==========================================================
     RENDERER 3D — diorama estilo Paper Mario (Three.js)
     ========================================================== */
  let canvas = null, renderer = null, scene = null, camera = null;
  let worldGroup = null, ready = false;
  let sceneDirty = true;
  let hemi = null, sun = null, caveLight = null;
  let sceneDisposables = [];
  let camOffset = new THREE.Vector3(0, 13, 9.5);
  const lookCur = new THREE.Vector3(), lookTgt = new THREE.Vector3(), desired = new THREE.Vector3();

  function own(d){ sceneDisposables.push(d); return d; }

  function disposeScene(){
    if (worldGroup) scene.remove(worldGroup);
    worldGroup = null;
    sceneDisposables.forEach(d => { try { d.dispose && d.dispose(); } catch(e){} });
    sceneDisposables = [];
    npcVis.clear();
    animalVis = []; butterflyVis = []; clouds = [];
    animFountains = []; animSparkles = []; animPinwheels = [];
    seaHouseVis = null;
    playerVis = null; petVis = null; waterMat = null; waterMatB = null;
    objectiveMark = null;
    // waterTexA/B están cacheadas por zona: se conservan a propósito
  }

  // ---------- caches de personajes (fuera de la escena) ----------
  const charCache = {};
  function playerChars(skin){
    const k = "P|" + skin;
    if (!charCache[k]) charCache[k] = Paper.characterFromSkin(skin);
    return charCache[k];
  }
  function npcChars(n){
    const k = "N|" + (n.tint||"") + "|" + (n.hair||"") + "|" + (n.long?"L":"");
    if (!charCache[k]) charCache[k] = Paper.npcCharacter(n);
    return charCache[k];
  }

  // ---------- sprites reales por hoja (embebidas en js/karol.js, js/urbanaSheet.js) ----------
  // Las skins con hoja usan su sprite auténtico; el resto de skins siguen
  // recoloreando al personaje de papel como antes.
  const SHEET_SKINS = {
    "clásico": { uri: () => (typeof KAROL_SHEET !== "undefined" ? KAROL_SHEET : null),
                 cols: 4, rows: 4, frontRow: 0, backRow: 0, up: 3, outline: 7 },
    "urbana":  { uri: () => (typeof URBANA_SHEET !== "undefined" ? URBANA_SHEET : null),
                 cols: 4, rows: 2, frontRow: 0, backRow: 1, up: 1, outline: 10 },
  };
  const sheetSkins = {}; // nombre -> {ready, front:[4 frames], back:[4 frames]}
  for (const name in SHEET_SKINS){
    const def = SHEET_SKINS[name];
    const entry = sheetSkins[name] = { ready: false, front: [], back: [] };
    const uri = def.uri();
    if (!uri) continue;
    const img = new Image();
    img.onload = () => {
      const FW = img.width/def.cols, FH = img.height/def.rows;
      // Se reescala con vecino más cercano antes de recortar el borde: el
      // pixel-art se mantiene duro y la textura tiene texeles de sobra, así
      // que en pantalla el personaje sale nítido en vez de emborronado.
      const cut = (row) => {
        const out = [];
        for (let f = 0; f < 4; f++){
          const c = document.createElement("canvas");
          c.width = FW*def.up; c.height = FH*def.up;
          const x = c.getContext("2d");
          x.imageSmoothingEnabled = false;
          x.drawImage(img, f*FW, row*FH, FW, FH, 0, 0, FW*def.up, FH*def.up);
          out.push(Paper.outline(c, def.outline*def.up));
        }
        return out;
      };
      entry.front = cut(def.frontRow);
      entry.back = cut(def.backRow);
      entry.ready = true;
      applySheetSkin(); // por si la escena ya estaba construida
    };
    img.src = uri;
  }
  function applySheetSkin(){
    if (!playerVis) return;
    const ss = sheetSkins[playerVis.skin];
    if (!ss || !ss.ready) return;
    playerVis.sheetTex = { front: ss.front.map(f => charTex(f)), back: ss.back.map(f => charTex(f)) };
    playerVis.mat.map = playerVis.sheetTex.front[0];
    playerVis.mat.needsUpdate = true;
    // si la UI (batalla/topbar) ya dibujó al personaje con el fallback, refrescarla
    try {
      const url = ss.front[0].toDataURL();
      document.querySelectorAll('img[alt="Karol"]').forEach(im => { im.src = url; });
    } catch(e){}
  }
  const animalCache = {};
  function animalCanvas(kind){
    if (!animalCache[kind]) animalCache[kind] = Paper.animal(kind);
    return animalCache[kind];
  }
  let grassTuftTexture = null, cloudTex = null;

  // ---------- estado visual ----------
  let playerVis = null;   // {group, plane, mat, texF, texB, skin, flip, flipT}
  let npcVis = new Map(); // npc -> {group, plane, bubble, flip, flipT}
  let petVis = null;
  let animalVis = [];     // alineado con farmAnimals
  let butterflyVis = [];  // {group, b}
  let clouds = [];
  let animFountains = [], animSparkles = [], animPinwheels = [];
  let seaHouseVis = null; // casa en el mar (js/seaHouse.js)
  let waterMat = null, waterMatB = null, waterTexA = null, waterTexB = null, waterT = 0;

  /* ==========================================================
     BIBLIOTECA 3D — pack StylisedEnv
     ENV_PROPS  (js/envProps.js)  piezas macizas con color por vértice:
                troncos, copas de árbol, arbustos, rocas, riscos,
                troncos caídos, losas y guijarros.
     ENV_ASSETS (js/envAssets.js) follaje con textura recortada
                (flores, helechos, matojos) y rocas sueltas.
     Las geometrías se cachean fuera de la escena: sobreviven a los
     rebuilds y nunca pasan por own()/disposeScene().
     ========================================================== */
  let propsRaw = null, assetsRaw = null;
  let foliageTex = null, propMat = null, foliageMat = null, plainMat = null;
  let envAssetsCount = 0, envPropsCount = 0, gardenCount = 0;
  const geoP = {}, geoA = {};

  function decodeParts(list){
    return list.map(o => ({
      pos: b64ToF32(o.pos),
      nor: o.nor ? b64ToF32(o.nor) : null,
      uv:  o.uv  ? b64ToF32(o.uv)  : null,
      col: o.col ? b64ToF32(o.col) : null,
      idx: o.idx ? b64ToU32(o.idx) : null,
      size: o.size,
    }));
  }
  function makeGeo(o){
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(o.pos, 3));
    if (o.nor) g.setAttribute("normal", new THREE.BufferAttribute(o.nor, 3));
    if (o.uv)  g.setAttribute("uv", new THREE.BufferAttribute(o.uv, 2));
    if (o.col) g.setAttribute("color", new THREE.BufferAttribute(o.col, 3));
    if (o.idx) g.setIndex(new THREE.BufferAttribute(o.idx, 1));
    if (!o.nor) g.computeVertexNormals();
    return g;
  }
  // geometría de un prop macizo (ENV_PROPS) por índice
  function propGeo(i){
    if (typeof ENV_PROPS === "undefined") return null;
    if (!propsRaw) propsRaw = decodeParts(ENV_PROPS.objects);
    return geoP[i] || (geoP[i] = makeGeo(propsRaw[i]));
  }
  function propSize(i){
    if (typeof ENV_PROPS === "undefined") return null;
    if (!propsRaw) propsRaw = decodeParts(ENV_PROPS.objects);
    return propsRaw[i].size;
  }
  // geometría de un asset con textura (ENV_ASSETS) por índice
  function assetGeo(i){
    if (typeof ENV_ASSETS === "undefined") return null;
    if (!assetsRaw) assetsRaw = decodeParts(ENV_ASSETS.objects);
    return geoA[i] || (geoA[i] = makeGeo(assetsRaw[i]));
  }
  function assetSize(i){
    if (typeof ENV_ASSETS === "undefined") return null;
    if (!assetsRaw) assetsRaw = decodeParts(ENV_ASSETS.objects);
    return assetsRaw[i].size;
  }
  // materiales compartidos (tampoco se destruyen entre escenas)
  function propMaterial(){
    return propMat || (propMat = new THREE.MeshLambertMaterial({ vertexColors: true }));
  }
  /* Las rocas de ENV_ASSETS no traen color por vértice (van con textura), así
     que necesitan un material liso: con vertexColors el atributo ausente se
     lee como negro. El tono real llega por instanceColor. */
  function plainMaterial(){
    return plainMat || (plainMat = new THREE.MeshLambertMaterial({ color: 0xffffff }));
  }
  function foliageMaterial(){
    if (foliageMat) return foliageMat;
    foliageTex = new THREE.TextureLoader().load(ENV_ASSETS.foliageTex);
    foliageTex.colorSpace = THREE.SRGBColorSpace;
    foliageTex.flipY = false;      // UVs con convención glTF/OBJ del pack
    foliageTex.anisotropy = 4;
    foliageMat = new THREE.MeshLambertMaterial({
      map: foliageTex, alphaTest: 0.5, side: THREE.DoubleSide,
    });
    return foliageMat;
  }

  /* Acumulador de instancias: se le van pidiendo piezas y al hacer flush()
     emite un InstancedMesh por geometría, así el mapa entero cuesta unas
     pocas decenas de draw calls en vez de miles de meshes sueltos. */
  function instancer(){
    const bins = new Map();
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
    const P = new THREE.Vector3(), S = new THREE.Vector3(), E = new THREE.Euler();
    return {
      // p = {x, y, z, s, sy, rot, tilt, color}
      // La altura del terreno se suma aquí, en un único punto: así cualquier
      // pieza sembrada se apoya sola en la loma que le toque.
      add(key, geo, mat, p){
        if (!geo) return;
        p.y = (p.y || 0) + terrainY(p.x, p.z);
        let bin = bins.get(key);
        if (!bin) bins.set(key, bin = { geo, mat, items: [] });
        bin.items.push(p);
      },
      flush(shadows){
        envAssetsCount = bins.size;
        bins.forEach(bin => {
          const inst = new THREE.InstancedMesh(bin.geo, bin.mat, bin.items.length);
          // instanceColor nace a cero (= negro): si alguna instancia del lote
          // lleva tinte, hay que darle blanco explícito a todas las demás.
          const anyTint = bin.items.some(p => p.color);
          bin.items.forEach((p, i) => {
            E.set(p.tilt || 0, p.rot || 0, p.roll || 0);
            Q.setFromEuler(E);
            const s = p.s === undefined ? 1 : p.s;
            M.compose(P.set(p.x, p.y || 0, p.z), Q, S.set(s, p.sy === undefined ? s : p.sy, s));
            inst.setMatrixAt(i, M);
            if (anyTint) inst.setColorAt(i, TMPCOL.set(p.color || "#ffffff"));
          });
          inst.castShadow = shadows !== false;
          inst.receiveShadow = true;
          inst.instanceMatrix.needsUpdate = true;
          if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
          own(inst);
          worldGroup.add(inst);
          envPropsCount += bin.items.length;
        });
        bins.clear();
      },
    };
  }
  const TMPCOL = new THREE.Color();

  /* Catálogo por familias (índices verificados en las hojas de contactos
     test-shots/props2_sheet_*.png y test-shots/envassets_sheet.png). */
  const P3 = {
    TRUNK:    1,                                    // tronco grande curvo
    CANOPY:   [19, 20, 22, 16, 17, 18, 21, 23],     // copas / bolas de hoja
    BUSH:     [16, 17, 18, 21, 23, 24],             // arbustos redondos
    BOULDER:  [5, 6, 7, 10, 11, 12, 28, 29, 30, 32],// rocas musgosas
    CRAG:     [3, 4, 13, 15, 25],                   // riscos grises altos
    DARKCRAG: [54, 55, 56, 57, 58, 59, 60, 61],     // riscos oscuros
    LOG:      [0, 2, 8, 9, 14, 26, 27, 37],         // troncos y ramas caídas
    SLAB:     [42, 43, 44, 45, 46, 47, 48, 49, 50, 51], // losas planas
    PEBBLE:   [63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81],
    DRIFT:    [38, 39, 52, 53, 88, 89, 90, 91, 92, 93, 96, 100, 101], // madera a la deriva
  };
  const A3 = {
    GROUNDCOVER: [0, 1, 10, 12],   // motas de hoja y pétalos a ras de suelo
    FLOWER:      [2, 3, 5, 7],     // flores con tallo (amarilla, tulipán, morada, rosa)
    FERN:        [4, 8, 9, 11],    // helechos y matojos frondosos
    ROCK_BIG:    [13, 18, 19, 20, 21],
    ROCK_SMALL:  [14, 15, 16, 17],
  };
  // hsh() llega hasta 2^32-1, así que un >> con signo puede dar negativos:
  // se normaliza el índice para no salirse nunca del catálogo.
  const pickFrom = (arr, h) => arr[(((h | 0) % arr.length) + arr.length) % arr.length];

  /* Escala nativa del pack: el diorama Garden mide 4.87 u de ancho y se
     coloca como una isla de 9 tiles, así que 1 unidad del pack ≈ 1.85 tiles.
     Usando ese factor los props conservan las proporciones del original. */
  const ES = 1.85;

  /* Racimo de copas de un árbol. dx/dz van en unidades de tronco (se
     multiplican por su escala) y dy es la fracción de la altura del tronco
     a la que se apoya la base de la copa. */
  const CANOPY_LAYOUT = [
    { dx:  0.00, dz:  0.00, dy: 0.74, s: 1.05 },
    { dx: -0.36, dz:  0.12, dy: 0.55, s: 0.82 },
    { dx:  0.34, dz: -0.14, dy: 0.58, s: 0.86 },
    { dx:  0.10, dz:  0.36, dy: 0.49, s: 0.74 },
    { dx: -0.13, dz: -0.34, dy: 0.52, s: 0.78 },
  ];
  // tintes casi blancos: multiplican el color de vértice del pack y dan
  // variedad de verdes sin ensuciar el sombreado plano del original
  const CANOPY_TINTS = ["#ffffff", "#eaffd0", "#d8f5c4", "#fbffe4", "#dff0e0"];

  // ---------- horneado del suelo ----------
  const PPS = 20;
  const GCOL = {
    // el césped ya no alterna tonos por tile (eso creaba un ajedrezado muy
    // visible): es un verde base sobre el que se pintan manchas suaves
    grass: "#6fc255",
    grassPatch: ["#84d365", "#62b44b", "#93dd74", "#57a944", "#a6e383", "#7ac95c"],
    grassDot: "#57a03e",
    tall: "#5aa84c", tallDark:"#3b8242", tallLight:"#8ad46a",
    sand: "#f3ddaa", sandPatch: ["#f8e7bd", "#e9cd95", "#f2d9a2"], sandDot:"#e2c68d",
    path: "#d9a870", pathPatch: ["#e2b57e", "#cb9a62", "#dcae78"], pathDot:"#c69158",
    waterDeep: "#2a72bd", waterShallow: "#4dbcdd",
    floorA:"#e8d9b8", floorB:"#dfcaa4",
    caveA:"#6a6478", caveB:"#736c80", caveWall:"#453f55",
    wallIn:"#b8a888",
    dirt: "#b09468",
  };
  // "#rrggbb" + alfa → rgba() para las manchas degradadas
  function rgba(hex, a){
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n>>16)&255) + "," + ((n>>8)&255) + "," + (n&255) + "," + a + ")";
  }
  /* Manchas orgánicas: degradados radiales sembrados con hsh(), así el suelo
     parece pintado a mano en vez de un tablero de casillas. */
  function paintPatches(x, w, h, cols, count, minR, maxR, alpha, seed){
    for (let i=0; i<count; i++){
      const a = hsh(i*7+seed, i*31+13), b = hsh(i*17+3, seed*5+i);
      const px = a % w, py = (a>>>10) % h;
      const r = minR + (b % Math.max(1, maxR-minR));
      const col = cols[(b>>>9) % cols.length];
      const grd = x.createRadialGradient(px, py, 0, px, py, r);
      grd.addColorStop(0, rgba(col, alpha));
      grd.addColorStop(0.6, rgba(col, alpha*0.55));
      grd.addColorStop(1, rgba(col, 0));
      x.fillStyle = grd;
      x.fillRect(px-r, py-r, r*2, r*2);
    }
  }
  function hsh(x, y){ return ((x*73856093) ^ (y*19349663)) >>> 0; }
  const isWaterish = n => n === undefined || n === "water" || (typeof n === "string" && (n.indexOf("bri")===0 || n.indexOf("pier")===0));
  const isSandLike = n => n === undefined || n==="sand" || n==="bushSand" || n==="path" || isWaterish(n);
  const isPathLike = n => n === undefined || n==="path" || n==="sand" || isWaterish(n) || n==="dirtA";

  function tileBaseColor(name, tx, ty){
    const h = hsh(tx, ty);
    if (name === undefined) return GCOL.grass;
    if (name === "tallgrass") return GCOL.tall;
    if (name === "sand" || name === "bushSand" || name.indexOf("sand")===0) return GCOL.sand;
    if (name === "path" || name === "plank") return GCOL.path;
    if (name === "dirtA") return GCOL.dirt;
    if (name === "water" || isWaterish(name)) return GCOL.waterDeep;
    if (name === "rug") return "#c8503c";
    if (name === "exitMat") return "#ffd94a";
    if (name === "floorA" || name === "floorC") return GCOL.floorA;
    if (name === "floorB" || name === "floorD") return GCOL.floorB;
    if (name === "wallTop" || name === "wallFace" || name === "wallFace2") return GCOL.wallIn;
    if (name === "caveFloorA" || name === "caveFloorC") return GCOL.caveA;
    if (name === "caveFloorB" || name === "caveFloorD") return GCOL.caveB;
    if (name === "caveWallTop" || name === "caveWallFace" || name === "caveWallFace2" || name === "caveRock") return GCOL.caveWall;
    return GCOL.grass; // grass, flower*, tuft, mush, rock, bush, chest, fence*
  }

  /* Profundidad del agua en tiles (distancia a la tierra más cercana).
     Sirve para el degradado del mar y para la espuma de la orilla. */
  let depthField = null;
  function waterDepth(){
    if (depthField) return depthField;
    const d = new Int16Array(MW*MH).fill(-1);
    const q = [];
    for (let y=0; y<MH; y++) for (let x=0; x<MW; x++){
      if (ground[y][x] !== "water"){ d[y*MW+x] = 0; q.push(y*MW+x); }
    }
    for (let qi=0; qi<q.length; qi++){
      const i = q[qi], x = i % MW, y = (i/MW)|0, nd = d[i]+1;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
        const nx = x+dx, ny = y+dy;
        if (nx<0 || ny<0 || nx>=MW || ny>=MH) return;
        const j = ny*MW+nx;
        if (d[j] !== -1) return;
        d[j] = nd; q.push(j);
      });
    }
    return (depthField = d);
  }

  const GRASSY = ["grass","flower","flower2","flower3","tuft","mush","rock","bush","chest"];
  function bakeGroundCanvas(){
    const c = document.createElement("canvas");
    c.width = MW*PPS; c.height = MH*PPS;
    const x = c.getContext("2d");
    // 1) todo el lienzo de verde base y encima manchas suaves: el degradado
    //    continuo se ve luego a través de la hierba y rompe la retícula
    x.fillStyle = GCOL.grass;
    x.fillRect(0, 0, c.width, c.height);
    if (mode === "over" || mode === "pueblo"){
      const n = Math.round(MW*MH/26);
      paintPatches(x, c.width, c.height, GCOL.grassPatch, n, PPS*2, PPS*8, 0.5, 11);
      paintPatches(x, c.width, c.height, GCOL.grassPatch, n>>1, PPS*6, PPS*16, 0.28, 77);
    }
    // 2) tiles que no son césped: se pintan encima y tapan las manchas
    for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
      const name = ground[ty][tx];
      const grassy = name === undefined || GRASSY.includes(name);
      if (!grassy){
        x.fillStyle = tileBaseColor(name, tx, ty);
        x.fillRect(tx*PPS, ty*PPS, PPS, PPS);
      }
      const h = hsh(tx, ty);
      // motitas de textura
      if (grassy){
        x.fillStyle = GCOL.grassDot;
        x.globalAlpha = 0.45;
        x.fillRect(tx*PPS + (h%13)+2, ty*PPS + ((h>>4)%13)+2, 2, 2);
        x.fillRect(tx*PPS + ((h>>8)%15)+1, ty*PPS + ((h>>12)%15)+1, 2, 2);
        x.globalAlpha = 1;
        // florecillas silvestres diminutas, muy esparcidas por el césped
        if (h % 9 === 0){
          x.fillStyle = ["#fffdf4", "#ffd9e8", "#fff3a3"][(h>>5) % 3];
          x.globalAlpha = 0.85;
          x.fillRect(tx*PPS + ((h>>7)%15)+2, ty*PPS + ((h>>11)%15)+2, 2, 2);
          x.globalAlpha = 1;
        }
      } else if (name === "tallgrass"){
        // briznas en dos tonos: con un solo color oscuro el tile se leía
        // como un bloque sólido en vez de hierba alta
        x.lineWidth = 1.6; x.lineCap = "round";
        for (let i=0;i<7;i++){
          x.strokeStyle = (i % 2) ? GCOL.tallDark : GCOL.tallLight;
          const bx = tx*PPS + 3 + ((h>>(i*3))%14);
          x.beginPath();
          x.moveTo(bx, ty*PPS + PPS-2);
          x.quadraticCurveTo(bx+2, ty*PPS + 8, bx+4, ty*PPS + 3 + (h>>(i*2))%5);
          x.stroke();
        }
      } else if (name === "sand" || name === "bushSand"){
        x.fillStyle = GCOL.sandDot; x.globalAlpha = .7;
        x.fillRect(tx*PPS + (h%14)+2, ty*PPS + ((h>>5)%14)+2, 2, 2);
        x.globalAlpha = 1;
      } else if (name === "path"){
        x.fillStyle = GCOL.pathDot; x.globalAlpha = .7;
        x.fillRect(tx*PPS + (h%13)+2, ty*PPS + ((h>>6)%13)+2, 3, 2);
        x.globalAlpha = 1;
      } else if (name === "rug"){
        x.strokeStyle = "#ffd166"; x.lineWidth = 2;
        x.strokeRect(tx*PPS+3, ty*PPS+3, PPS-6, PPS-6);
      } else if (name === "exitMat"){
        x.fillStyle = "#7a5a10";
        x.beginPath();
        x.moveTo(tx*PPS+10, ty*PPS+14);
        x.lineTo(tx*PPS+4, ty*PPS+8);
        x.lineTo(tx*PPS+8, ty*PPS+8);
        x.lineTo(tx*PPS+8, ty*PPS+3);
        x.lineTo(tx*PPS+12, ty*PPS+3);
        x.lineTo(tx*PPS+12, ty*PPS+8);
        x.lineTo(tx*PPS+16, ty*PPS+8);
        x.closePath(); x.fill();
      }
    }
    // esquinas redondeadas de camino y arena (papel recortado)
    const roundCorners = (name, likeFn) => {
      for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
        if (ground[ty][tx] !== name) continue;
        const N = likeFn(ground[ty-1]?.[tx]), S = likeFn(ground[ty+1]?.[tx]);
        const W = likeFn(ground[ty]?.[tx-1]), E = likeFn(ground[ty]?.[tx+1]);
        const corners = [
          [!N && !W, 0, 0, ground[ty-1]?.[tx] ?? ground[ty]?.[tx-1]],
          [!N && !E, PPS, 0, ground[ty-1]?.[tx] ?? ground[ty]?.[tx+1]],
          [!S && !W, 0, PPS, ground[ty+1]?.[tx] ?? ground[ty]?.[tx-1]],
          [!S && !E, PPS, PPS, ground[ty+1]?.[tx] ?? ground[ty]?.[tx+1]],
        ];
        corners.forEach(([hit, cx, cy, nb]) => {
          if (!hit) return;
          x.fillStyle = tileBaseColor(nb, tx, ty);
          x.beginPath();
          x.arc(tx*PPS+cx, ty*PPS+cy, 7, 0, Math.PI*2);
          x.fill();
        });
      }
    };
    roundCorners("path", isPathLike);
    roundCorners("sand", isSandLike);
    // 3) manchas de arena y de tierra batida, recortadas a sus propios tiles
    const patchInside = (pred, cols, seed) => {
      x.save();
      x.beginPath();
      let any = false;
      for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
        if (!pred(ground[ty][tx])) continue;
        x.rect(tx*PPS-1, ty*PPS-1, PPS+2, PPS+2);
        any = true;
      }
      if (any){ x.clip(); paintPatches(x, c.width, c.height, cols, Math.round(MW*MH/40), PPS*2, PPS*7, 0.5, seed); }
      x.restore();
    };
    patchInside(n => n === "sand" || n === "bushSand", GCOL.sandPatch, 41);
    patchInside(n => n === "path", GCOL.pathPatch, 91);
    // 4) arena mojada: la franja de playa que toca el agua va más oscura
    x.fillStyle = "rgba(150,120,80,.22)";
    for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
      const n = ground[ty][tx];
      if (n !== "sand" && n !== "bushSand") continue;
      const near = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]
        .some(([dx,dy]) => ground[ty+dy] && ground[ty+dy][tx+dx] === "water");
      if (near) x.fillRect(tx*PPS, ty*PPS, PPS, PPS);
    }
    // 5) el mar, con exactamente la misma silueta que la lámina animada
    let hasWater = false;
    for (let ty=0; ty<MH && !hasWater; ty++) for (let tx=0; tx<MW; tx++) if (isWaterTile(tx, ty)){ hasWater = true; break; }
    if (hasWater) x.drawImage(bakeSea(false, false), 0, 0);
    return c;
  }

  /* ---------- mar ----------
     El suelo horneado y la lámina de agua tienen que recortar la orilla
     EXACTAMENTE igual; si no, asoma por debajo una silueta azul oscura. Por
     eso ambas usan la misma máscara y el mismo degradado de profundidad. */
  let seaMaskCanvas = null, seaColorCanvas = null;
  const isWaterTile = (tx, ty) => ground[ty] !== undefined && ground[ty][tx] === "water";

  /* Silueta del agua. Se dibuja a 4 px por tile y se amplía interpolando: el
     reescalado redondea las esquinas y deja un borde degradado de un cuarto
     de casilla, así la orilla no baja en escalones y el agua se funde con la
     arena como una lengua de marea. El segundo pase reafirma el interior. */
  const MASK_RES = 4;
  function seaMask(){
    if (seaMaskCanvas) return seaMaskCanvas;
    const small = document.createElement("canvas");
    small.width = MW*MASK_RES; small.height = MH*MASK_RES;
    const sx = small.getContext("2d");
    sx.fillStyle = "#fff";
    for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
      if (isWaterTile(tx, ty)) sx.fillRect(tx*MASK_RES, ty*MASK_RES, MASK_RES, MASK_RES);
    }
    const c = document.createElement("canvas");
    c.width = MW*PPS; c.height = MH*PPS;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.drawImage(small, 0, 0, c.width, c.height);
    x.drawImage(small, 0, 0, c.width, c.height);
    return (seaMaskCanvas = c);
  }

  // degradado de profundidad (turquesa de orilla → azul hondo) con la espuma
  // de la rompiente horneada; se pinta a 1 px por tile y se reescala
  function seaColor(){
    if (seaColorCanvas) return seaColorCanvas;
    const depth = waterDepth();
    const low = document.createElement("canvas");
    low.width = MW; low.height = MH;
    const lx = low.getContext("2d");
    const shallow = new THREE.Color(GCOL.waterShallow), deep = new THREE.Color(GCOL.waterDeep);
    const foamCol = new THREE.Color("#ffffff"), col = new THREE.Color();
    // la espuma solo rompe contra la arena: en las orillas de hierba (lago,
    // río) un borde blanco parecía niebla en vez de agua
    const beachy = (tx, ty) => [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]
      .some(([dx,dy]) => { const g = ground[ty+dy] && ground[ty+dy][tx+dx]; return g === "sand" || g === "bushSand"; });
    for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
      const dt = depth[ty*MW+tx];
      const d = Math.min(1, dt / 7);
      col.copy(shallow).lerp(deep, d*d);
      if (dt <= 1 && beachy(tx, ty)) col.lerp(foamCol, 0.45);
      lx.fillStyle = "#" + col.getHexString();
      lx.fillRect(tx, ty, 1, 1);
    }
    const c = document.createElement("canvas");
    c.width = MW*PPS; c.height = MH*PPS;
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.drawImage(low, 0, 0, c.width, c.height);
    return (seaColorCanvas = c);
  }

  // mar recortado a su silueta; con olas si se pide (la capa animada)
  function bakeSea(phase, waves){
    const c = document.createElement("canvas");
    c.width = MW*PPS; c.height = MH*PPS;
    const x = c.getContext("2d");
    x.drawImage(seaColor(), 0, 0);
    if (waves){
      const depth = waterDepth();
      x.strokeStyle = "rgba(232,250,255,.5)"; x.lineCap = "round";
      for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
        if (!isWaterTile(tx, ty) || depth[ty*MW+tx] < 3) continue;
        const h = hsh(tx*3+1, ty*5+2);
        if (h % 5) continue;
        const off = phase ? 6 : 0;
        const ax = tx*PPS + ((h + off*3) % 12);
        const ay = ty*PPS + 4 + ((h>>>3) % 10) + (phase ? 3 : 0);
        const r = 4 + (h>>>7) % 4;
        const a0 = Math.PI*(1.05 + ((h>>>11) % 20)/100);
        x.lineWidth = 1.8 + ((h>>>15) % 12)/10;
        x.beginPath(); x.arc(ax+6, ay, r, a0, a0 + Math.PI*0.7); x.stroke();
      }
    }
    x.globalCompositeOperation = "destination-in";
    x.drawImage(seaMask(), 0, 0);
    x.globalCompositeOperation = "source-over";
    return c;
  }
  const bakeWaterCanvas = phase => bakeSea(phase, true);

  /* ==========================================================
     RELIEVE DEL TERRENO
     El mapa sigue siendo una rejilla plana para la lógica (colisiones y
     encuentros no cambian), pero el suelo se ondula: alturas guardadas en
     las esquinas de los tiles y consultadas con terrainY() para apoyar
     encima props, personajes y cámara.

     Se aplana a cero en caminos, arena, agua, puentes, edificios y puertas:
     así nada queda torcido ni flotando y el mar no muerde la costa. La
     máscara se difumina, de modo que la llanura sube en cuestas suaves.
     ========================================================== */
  const RELIEF = 1.8;         // altura máxima, en tiles
  const RELIEF_CELL = 11;     // tamaño de las lomas
  let heightMap = null;       // Float32Array (MW+1)*(MH+1)

  function terrainY(wx, wz){
    if (!heightMap) return 0;
    const W = MW+1;
    const x = Math.min(MW, Math.max(0, wx)), z = Math.min(MH, Math.max(0, wz));
    const i0 = Math.min(MW-1, x|0), j0 = Math.min(MH-1, z|0);
    const tx = x-i0, tz = z-j0;
    const a = heightMap[j0*W+i0],       b = heightMap[j0*W+i0+1];
    const c = heightMap[(j0+1)*W+i0],   d = heightMap[(j0+1)*W+i0+1];
    return (a*(1-tx) + b*tx)*(1-tz) + (c*(1-tx) + d*tx)*tz;
  }

  const FLAT_GROUND = ["water","sand","bushSand","path","dirtA","plank"];
  function buildHeightMap(){
    const W = MW+1, H = MH+1;
    heightMap = new Float32Array(W*H);
    if (mode !== "over") return; // solo el mundo exterior tiene lomas

    // 1) ruido de valor en dos octavas: lomas anchas más ondulaciones cortas
    const ss = t => t*t*(3-2*t);
    const octave = (cell, seed) => {
      const gw = Math.ceil(MW/cell)+2, gh = Math.ceil(MH/cell)+2;
      const g = new Float32Array(gw*gh);
      for (let j=0;j<gh;j++) for (let i=0;i<gw;i++) g[j*gw+i] = (hsh(i*13+seed, j*29+seed*3) % 1000)/1000;
      return (x, y) => {
        const fx = x/cell, fy = y/cell;
        const i0 = fx|0, j0 = fy|0;
        const tx = ss(fx-i0), ty = ss(fy-j0);
        const a = g[j0*gw+i0], b = g[j0*gw+i0+1];
        const c = g[(j0+1)*gw+i0], d = g[(j0+1)*gw+i0+1];
        return (a*(1-tx)+b*tx)*(1-ty) + (c*(1-tx)+d*tx)*ty;
      };
    };
    const oct1 = octave(RELIEF_CELL, 5), oct2 = octave(RELIEF_CELL/2.6, 61);
    const raw = (x, y) => oct1(x, y)*0.72 + oct2(x, y)*0.28;
    // el ruido de valor se queda cerca de la media: se reescala al rango real
    // para que las lomas lleguen de verdad arriba y abajo
    let lo = 1, hi = 0;
    for (let j=0;j<H;j++) for (let i=0;i<W;i++){
      const v = raw(i, j);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    const span = Math.max(0.001, hi-lo);
    const noise = (x, y) => (raw(x, y) - lo) / span;

    // 2) qué tiles deben quedarse a nivel
    const flatTile = (x, y) => {
      if (x<0 || y<0 || x>=MW || y>=MH) return true;
      const gt = ground[y][x];
      if (gt === undefined) return true;
      if (FLAT_GROUND.includes(gt)) return true;
      if (gt.indexOf("bri")===0 || gt.indexOf("pier")===0 || gt.indexOf("fence")===0) return true;
      if (solid[y][x] || decor[y][x]) return true;
      const m = meta[y][x];
      if (m && m.type !== "bush") return true;
      return false;
    };
    // el agua manda: se aplana también su entorno para que no aparezcan
    // taludes cortados justo en la orilla
    const near = new Uint8Array(MW*MH);
    for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
      if (ground[y][x] !== "water") continue;
      for (let dy=-2;dy<=2;dy++) for (let dx=-2;dx<=2;dx++){
        const nx=x+dx, ny=y+dy;
        if (nx>=0 && ny>=0 && nx<MW && ny<MH) near[ny*MW+nx] = 1;
      }
    }
    // máscara por esquina: 1 solo si los cuatro tiles vecinos admiten cuesta
    let mask = new Float32Array(W*H);
    for (let j=0;j<H;j++) for (let i=0;i<W;i++){
      let ok = 1;
      for (let dy=-1; dy<=0 && ok; dy++) for (let dx=-1; dx<=0; dx++){
        const tx = i+dx, ty = j+dy;
        if (flatTile(tx, ty) || (tx>=0 && ty>=0 && tx<MW && ty<MH && near[ty*MW+tx])){ ok = 0; break; }
      }
      mask[j*W+i] = ok;
    }
    // difuminar la máscara: la transición llano→loma pasa a ser una rampa
    const blur = (src, passes) => {
      let a = src, b = new Float32Array(W*H);
      for (let p=0; p<passes; p++){
        for (let j=0;j<H;j++) for (let i=0;i<W;i++){
          let s = 0, n = 0;
          for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++){
            const ii=i+dx, jj=j+dy;
            if (ii<0||jj<0||ii>=W||jj>=H) continue;
            s += a[jj*W+ii]; n++;
          }
          b[j*W+i] = s/n;
        }
        const t = a; a = b; b = t;
      }
      return a;
    };
    mask = blur(mask, 4);
    for (let j=0;j<H;j++) for (let i=0;i<W;i++) heightMap[j*W+i] = noise(i, j) * mask[j*W+i] * RELIEF;
    heightMap = blur(heightMap, 2);
  }

  /* Texturas de suelo y agua cacheadas por zona. Hornearlas cuesta poco, pero
     cada una es un lienzo de ~880x720 y volver a subirla a la GPU en cada
     cambio de zona era la mayor parte del parón. Al volver a una zona ya
     visitada se reutiliza tal cual. */
  const zoneTexCache = new Map();
  const zoneKey = () => mode + "|" + curZone.i + "," + curZone.j;
  function cachedTex(kind, make){
    const k = zoneKey() + "|" + kind;
    let t = zoneTexCache.get(k);
    if (t) return t;
    t = new THREE.CanvasTexture(make());
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    // cada lienzo ocupa varios MB en la GPU: se guardan solo los últimos
    if (zoneTexCache.size >= 24){
      const viejo = zoneTexCache.keys().next().value;
      const tv = zoneTexCache.get(viejo);
      zoneTexCache.delete(viejo);
      try { tv.dispose(); } catch(e){}
    }
    zoneTexCache.set(k, t);
    return t;
  }

  function buildGroundMesh(){
    const tex = cachedTex("suelo", bakeGroundCanvas);
    const mat = own(new THREE.MeshLambertMaterial({ map: tex }));
    // una celda por tile para poder levantar el relieve vértice a vértice
    const geoM = own(new THREE.PlaneGeometry(MW, MH, MW, MH));
    const pos = geoM.attributes.position;
    for (let k=0; k<pos.count; k++){
      // tras rotar -90° en X, la Z local del plano es la altura del mundo
      pos.setZ(k, terrainY(MW/2 + pos.getX(k), MH/2 - pos.getY(k)));
    }
    geoM.computeVertexNormals();
    const mesh = new THREE.Mesh(geoM, mat);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(MW/2, 0, MH/2);
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
    // Faldón: una llanura enorme justo por debajo del mapa para que el borde
    // no se recorte contra el vacío; la niebla la funde con el fondo.
    if (mode === "over" || mode === "pueblo"){
      /* Antes era un plano de un verde plano distinto al del mapa y se veía
         como una alfombra cortada a cuchillo. Ahora se hornea con la MISMA
         hierba del suelo (base + manchas) y se repite 6x6, así el borde del
         mapa se confunde con la llanura hasta que la niebla se la lleva. */
      const tex = cachedTex("faldon", () => {
        const c = document.createElement("canvas");
        c.width = c.height = 512;
        const x = c.getContext("2d");
        x.fillStyle = GCOL.grass;
        x.fillRect(0, 0, 512, 512);
        paintPatches(x, 512, 512, GCOL.grassPatch, 46, 20, 90, 0.5, 11);
        paintPatches(x, 512, 512, GCOL.grassPatch, 22, 60, 160, 0.28, 77);
        return c;
      });
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 6);
      const skirt = new THREE.Mesh(
        own(new THREE.PlaneGeometry(MW*6, MH*6)),
        own(new THREE.MeshLambertMaterial({ map: tex })));
      skirt.rotation.x = -Math.PI/2;
      skirt.position.set(MW/2, -0.08, MH/2);
      worldGroup.add(skirt);
    } else if (mode === "cueva"){
      const skirt = new THREE.Mesh(
        own(new THREE.PlaneGeometry(MW*6, MH*6)),
        own(new THREE.MeshLambertMaterial({ color: "#3a3348" })));
      skirt.rotation.x = -Math.PI/2;
      skirt.position.set(MW/2, -0.08, MH/2);
      worldGroup.add(skirt);
    }
  }

  /* ---------- cielo ----------
     Cúpula con degradado vertical que acompaña a la cámara. Da el azul
     limpio y el horizonte lechoso de los juegos de Pokémon; la niebla usa
     el mismo tono bajo para que el mundo se disuelva sin línea de corte. */
  let skyDome = null;
  const SKY_STOPS = [[0, "#2f9fe8"], [0.4, "#79cef8"], [0.72, "#bfe8ff"], [1, "#e8f6ff"]];
  const SKY_HORIZON = "#cfeaff";
  function buildSkyDome(){
    const c = document.createElement("canvas");
    c.width = 4; c.height = 256;
    const x = c.getContext("2d");
    const grd = x.createLinearGradient(0, 0, 0, 256);
    SKY_STOPS.forEach(([p, col]) => grd.addColorStop(p, col));
    x.fillStyle = grd;
    x.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(140, 24, 16),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }));
    dome.renderOrder = -1;
    return dome;
  }

  function buildWaterMesh(){
    // ¿hay agua en este mapa?
    let has = false;
    for (let y=0; y<MH && !has; y++) for (let x=0; x<MW; x++) if (ground[y][x]==="water"){ has = true; break; }
    if (!has) return;
    waterTexA = cachedTex("aguaA", () => bakeWaterCanvas(false));
    waterTexB = cachedTex("aguaB", () => bakeWaterCanvas(true));
    /* Dos láminas apiladas: la de arriba (fase B) sube y baja su opacidad en
       un vaivén continuo, así el agua ondula suave en vez de cambiar de
       golpe cada medio segundo. */
    waterMat = own(new THREE.MeshPhongMaterial({
      map: waterTexA, transparent: true, opacity: 0.92,
      shininess: 110, specular: 0x99ddff,
    }));
    waterMatB = own(new THREE.MeshPhongMaterial({
      map: waterTexB, transparent: true, opacity: 0,
      shininess: 110, specular: 0x99ddff,
    }));
    const geoW = own(new THREE.PlaneGeometry(MW, MH));
    const mesh = new THREE.Mesh(geoW, waterMat);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(MW/2, 0.03, MH/2);
    worldGroup.add(mesh);
    const meshB = new THREE.Mesh(geoW, waterMatB);
    meshB.rotation.x = -Math.PI/2;
    meshB.position.set(MW/2, 0.036, MH/2);
    worldGroup.add(meshB);
  }

  // ---------- construcción de decorados ----------
  const HOUSE_VARIANT = { house:"blue", barn:"cold", houseG:"warm" };
  function addLabel(text, wx, wy, wz, opts){
    const cv = Paper.textLabel(text, opts);
    const tex = own(Paper.canvasTex(cv));
    const sm = own(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const sp = new THREE.Sprite(sm);
    sp.scale.set(cv.width/46, cv.height/46, 1);
    sp.position.set(wx, wy, wz);
    worldGroup.add(sp);
  }

  function makeCrossedQuad(){
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array([
      -0.35,0,0,   0.35,0,0,   0.35,0.62,0,  -0.35,0.62,0,
      0,0,-0.35,   0,0,0.35,   0,0.62,0.35,  0,0.62,-0.35,
    ]);
    const uv = new Float32Array([0,0, 1,0, 1,1, 0,1,  0,0, 1,0, 1,1, 0,1]);
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex([0,1,2, 0,2,3, 4,5,6, 4,6,7]);
    g.computeVertexNormals();
    return g;
  }

  function scanAndBuildDecor(){
    const trees = [], tufts = [], flowers = [], mushs = [], rocks = [], bushes = [];
    const chests = [], fencesH = [], fencesV = [];
    const planks = [], rails = [];
    const caveRocks = [], caveWallRocks = [];
    const smallBushes = [], logs = [], shore = [];
    let saveSpot = null;

    // --- decor (objetos anclados) ---
    for (let y=0; y<MH; y++) for (let x=0; x<MW; x++){
      const d = decor[y][x];
      if (!d) continue;
      if (d.sprite === "tree"){
        trees.push({ x: x+2, z: y+3.5, h: hsh(x, y) });
      } else if (HOUSE_VARIANT[d.sprite]){
        const variant = HOUSE_VARIANT[d.sprite];
        const h = buildHouseMesh(variant, d);
        h.position.set(x+3, 0, y+6);
        worldGroup.add(h);
        const labelY = (houseHeight || 4.4) + 0.6;
        // etiquetas
        if (d.gym){
          const g = Data.gyms.find(k => k.key === d.gym);
          const s = State.get();
          const cleared = s.badges.includes(g.key);
          const locked = !Quests.isGymUnlocked(g.key) || Quests.level() < Quests.gymLevelReq(g.key);
          const label = cleared ? "🏆 " + g.icon : (locked ? "🔒 " + g.icon : g.icon);
          addLabel(label, x+3, labelY, y+5.6,
            cleared ? { bg:"#fff3c9", fg:"#b8860b" } : locked ? { bg:"#e8e6f0", fg:"#7a7790" } : { bg:"#fffdf4", fg:"#33314e" });
        }
        else if (d.shop)     addLabel("상점 🛒", x+3, labelY, y+5.6, { fg:"#2f9e5b" });
        else if (d.alcaldia) addLabel("시청 🏛", x+3, labelY, y+5.6, { fg:"#b8860b" });
        else if (d.casa)     addLabel("집 Casa", x+3, labelY, y+5.6, { fg:"#e05575" });
        else if (d.cafe)     addLabel("카페 ☕", x+3, labelY, y+5.6, { fg:"#a0653a" });
        else if (d.academia) addLabel("학원 📚", x+3, labelY, y+5.6, { fg:"#4361ee" });
        else if (d.norebang) addLabel("노래방 🎤", x+3, labelY, y+5.6, { fg:"#d6336c" });
      } else if (d.sprite === "caveDoor"){
        const arch = Paper.caveArchMesh();
        arch.position.set(x+2, 0, y+1.2);
        worldGroup.add(arch);
        if (d.pueblo) addLabel("마을 Pueblo", x+2, 3.4, y+1.2, { fg:"#3fa9f5" });
      } else if (d.sprite === "fountain"){
        const f = Paper.fountainMesh();
        f.position.set(x+1.5, 0, y+1.5);
        worldGroup.add(f);
        animFountains.push(f);
      } else if (d.sprite === "lamp"){
        const l = Paper.lampMesh();
        l.position.set(x+0.5, 0, y+2.2);
        worldGroup.add(l);
      } else if (d.sprite === "townSign"){
        const sp = Paper.signpostMesh();
        sp.position.set(x+0.5, 0, y+0.5);
        worldGroup.add(sp);
        addLabel(d.text, x+0.5, 1.85, y+0.5, { fg:"#8a5a2b" });
      }
    }

    /* Arboleda EXTERIOR: más allá del borde solo había el faldón de hierba
       plano, y el límite del mapa se veía como una llanura verde pelada.
       Se siembra una franja de árboles solo visuales al otro lado del
       contorno, donde la REGIÓN tiene suelo plantable (así las carreteras,
       el río y la playa quedan limpios solos). */
    if (mode === "over" && region){
      const PLANTABLE = ["grass","flower","flower2","flower3","tuft","tallgrass","mush","rock"];
      const tryOuter = (gx, gy) => {
        if (!PLANTABLE.includes(region.ground[gy]?.[gx])) return;
        if (region.decor[gy]?.[gx] || region.meta[gy]?.[gx]) return;
        if (inTown(gx, gy)) return;
        trees.push({ x: gx - zoneX0 + 0.5, z: gy - zoneY0 + 0.5, h: hsh(gx, gy) });
      };
      const B = 9; // profundidad de la franja
      for (let x = -B; x < MW+B; x += 2){
        for (let d = 2; d <= B; d += 2){
          const jx = ((x + d) % 3) * 0.4; // desorden para que no se note la rejilla
          tryOuter(zoneX0 + x + jx, zoneY0 - d);
          tryOuter(zoneX0 + x + jx, zoneY0 + MH - 1 + d);
        }
      }
      for (let y = -B; y < MH+B; y += 2){
        for (let d = 2; d <= B; d += 2){
          tryOuter(zoneX0 - d, zoneY0 + y);
          tryOuter(zoneX0 + MW - 1 + d, zoneY0 + y);
        }
      }
    }

    for (let y=0; y<MH; y++) for (let x=0; x<MW; x++){
      const g = ground[y][x];
      const cx = x+0.5, cz = y+0.5;
      const m = meta[y][x];
      const th = hsh(x, y);
      if (g === "tallgrass") tufts.push({ x:cx, z:cz, s: 0.95 + (th%40)/100, h:th, tall:true });
      else if (g === "tuft") tufts.push({ x:cx, z:cz, s: 0.55, h:th });
      else if (g === "flower")  flowers.push({ x:cx, z:cz, h:th });
      else if (g === "flower2") flowers.push({ x:cx, z:cz, h:th+1 });
      else if (g === "flower3") flowers.push({ x:cx, z:cz, h:th+2 });
      else if (g === "mush") mushs.push({ x:cx, z:cz, h:th });
      else if (g === "rock") rocks.push({ x:cx, z:cz, s: 0.7 + (th%50)/100, h:th });
      else if (g === "caveRock") caveRocks.push({ x:cx, z:cz, h:th });
      else if (g === "bush" || g === "bushSand") bushes.push({ x:cx, z:cz, h:th });
      else if (g === "chest") chests.push({ x:cx, z:cz });
      else if (g === "fenceV") fencesV.push({ x:cx, z:cz });
      else if (g && g.indexOf("fence")===0) fencesH.push({ x:cx, z:cz });
      else if (g === "briT" || g === "briM" || g === "briB"){
        planks.push({ x:cx, z:cz });
        if (g === "briT") rails.push({ x:cx, z: y+0.06, horiz:true });
        if (g === "briB") rails.push({ x:cx, z: y+1-0.06, horiz:true });
      }
      else if (g === "pierL" || g === "pierM" || g === "pierR"){
        planks.push({ x:cx, z:cz });
        if (g === "pierL") rails.push({ x: x+0.06, z:cz, horiz:false });
        if (g === "pierR") rails.push({ x: x+1-0.06, z:cz, horiz:false });
      }
      if (m && m.type === "save") saveSpot = { x:cx, z:cz };
    }

    // cueva: roca en todos los bordes
    if (mode === "cueva"){
      for (let y=0; y<MH; y++) for (let x=0; x<MW; x++){
        if (x===0 || y===0 || x===MW-1 || y===MH-1 || y===1 || y===2)
          caveWallRocks.push({ x:x+0.5, z:y+0.5, s: 1.0 + (hsh(x,y)%40)/100, h: hsh(x,y) });
      }
    }

    // --- siembra procedural: el mundo se siente más vivo y poblado ---
    // Solo en césped libre (sin colisión, sin decor, sin meta, sin NPC):
    // no altera caminos, puertas, encuentros ni la lógica del juego.
    if (mode === "over" || mode === "pueblo"){
      const npcAt = new Set(npcsCur.map(n => n.x + "," + n.y));
      const walkable = (x, y) =>
        ground[y] && !solid[y][x] && !decor[y][x] && !meta[y][x] &&
        !npcAt.has(x + "," + y) &&
        !(saveSpot && saveSpot.x === x+0.5 && saveSpot.z === y+0.5);
      const free = (x, y) => walkable(x, y) && ground[y][x] === "grass";
      // playa: madera a la deriva, riscos y guijarros del pack
      for (let y=1; y<MH-1; y++) for (let x=1; x<MW-1; x++){
        if (!walkable(x, y) || ground[y][x] !== "sand") continue;
        const h = hsh(x*5+11, y*7+3) % 1000;
        const cx = x+0.5, cz = y+0.5;
        if (h < 26)      shore.push({ x:cx, z:cz, h, kind:"crag" });
        else if (h < 60) shore.push({ x:cx, z:cz, h, kind:"drift" });
        else if (h < 130) shore.push({ x:cx, z:cz, h, kind:"pebble" });
        else if (h < 150) tufts.push({ x:cx, z:cz, s: 0.5 + (h%30)/100, h });
      }
      let specialCount = 0;
      const maxSpecials = mode === "over" ? 26 : 10;
      for (let y=1; y<MH-1; y++) for (let x=1; x<MW-1; x++){
        if (!free(x, y)) continue;
        const h = hsh(x, y) % 1000;
        const cx = x+0.5, cz = y+0.5;
        if (h < 130) flowers.push({ x:cx, z:cz, h });                       // 13% flores
        else if (h < 215) tufts.push({ x:cx, z:cz, s: 0.4 + (h%30)/100, h }); // 8.5% hierbecilla
        else if (h < 240) mushs.push({ x:cx, z:cz, h });                    // 2.5% setas
        else if (h < 272) rocks.push({ x:cx, z:cz, s: 0.35 + (h%25)/100, h }); // 3% piedritas
        else if (h < 288) smallBushes.push({ x:cx, z:cz, h });              // 1.6% matas
        else if (h < 300) logs.push({ x:cx, z:cz, h });                     // 1.2% troncos caídos
        else if (h < 324 && specialCount < maxSpecials && free(x+1, y)){    // 2.4% piezas especiales
          // bancos, señales, troncos, faroles de piedra, peñascos
          const kind = hsh(x*3+1, y*7+5) % 5;
          // las piezas voluminosas solo en zonas muy abiertas (8 alrededor libres
          // o césped sin nada) y se vuelven sólidas para no atravesarlas
          const bulky = kind <= 3;
          const openAround = [1,0,-1].every(dy => [1,0,-1].every(dx =>
            (dx===0&&dy===0) || (ground[y+dy] && (ground[y+dy][x+dx] === "grass" || ground[y+dy][x+dx] === "tuft" || ground[y+dy][x+dx] === "flower" || ground[y+dy][x+dx] === "flower2" || ground[y+dy][x+dx] === "flower3") && !decor[y+dy][x+dx] && !meta[y+dy][x+dx] && !npcAt.has((x+dx) + "," + (y+dy)))));
          if (bulky && !openAround) continue;
          let m2 = null;
          if (kind === 0) m2 = Paper.benchMesh();
          else if (kind === 1) m2 = Paper.signpostMesh();
          else if (kind === 2) m2 = Paper.stoneLanternMesh();
          else if (kind === 3){ logs.push({ x:cx, z:cz, h: hsh(x,y) }); specialCount++; continue; }
          else { rocks.push({ x:cx, z:cz, s: 1.4, h: hsh(x,y) }); specialCount++; continue; }
          m2.position.set(cx, terrainY(cx, cz), cz);
          m2.rotation.y = (hsh(x+9, y+9) % 628) / 100;
          worldGroup.add(m2);
          if (bulky) solid[y][x] = 1;
          specialCount++;
        }
      }
    }

    // --- instanciados con los modelos del pack StylisedEnv ---
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
    const Euler = new THREE.Euler();
    const has3D = typeof ENV_PROPS !== "undefined" && typeof ENV_ASSETS !== "undefined";
    const batch = instancer();
    const pm = has3D ? propMaterial() : null;
    const fm = has3D ? foliageMaterial() : null;
    const rot = h => ((h % 628) / 100);
    envPropsCount = 0;

    // Árboles: tronco curvo del pack + racimo de copas, como en el diorama
    // original. La copa se apoya sobre el tronco y varía en tamaño y tono.
    if (trees.length && has3D){
      const trunkH = propSize(P3.TRUNK)[1];
      trees.forEach(t => {
        const h = t.h;
        const s = ES * (0.82 + (h % 26)/100);
        batch.add("trunk", propGeo(P3.TRUNK), pm, { x:t.x, z:t.z, s, rot: rot(h) });
        const top = trunkH * s;
        CANOPY_LAYOUT.forEach((b, j) => {
          const hh = hsh(h + j*7, j*13);
          const idx = pickFrom(P3.CANOPY, hh);
          const cs = s * b.s * (0.92 + (hh % 18)/100);
          batch.add("canopy" + idx, propGeo(idx), pm, {
            x: t.x + b.dx*s, z: t.z + b.dz*s, y: top*b.dy,
            s: cs, rot: rot(hh), color: CANOPY_TINTS[hh % CANOPY_TINTS.length],
          });
        });
      });
    } else if (trees.length){
      // sin el pack cargado: árbol de emergencia (esferas) para no dejar el mapa pelado
      const trunk = new THREE.InstancedMesh(Paper.geo("trunk", () => new THREE.CylinderGeometry(0.12, 0.18, 1, 7)), Paper.lambert("#8a5a2b"), trees.length);
      const blobMat = own(new THREE.MeshLambertMaterial({ color: 0x6fbf4a }));
      const blobs = new THREE.InstancedMesh(Paper.geo("canopy", () => new THREE.SphereGeometry(1, 10, 8)), blobMat, trees.length);
      trees.forEach((t, i) => {
        M.compose(P.set(t.x, 0.5, t.z), Q, S.set(1, 1, 1));
        trunk.setMatrixAt(i, M);
        M.compose(P.set(t.x, 1.4, t.z), Q, S.set(0.9, 0.75, 0.9));
        blobs.setMatrixAt(i, M);
      });
      trunk.castShadow = blobs.castShadow = true;
      own(trunk); own(blobs);
      worldGroup.add(trunk, blobs);
    }

    // Hierba: las briznas recortadas siguen dando la silueta clásica de
    // "hierba alta" de Pokémon; encima se siembran helechos del pack.
    if (tufts.length){
      if (!grassTuftTexture) grassTuftTexture = Paper.canvasTex(Paper.grassBladeTexture());
      const tm = own(new THREE.MeshLambertMaterial({ map: grassTuftTexture, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
      const blades = [];
      tufts.forEach(t => {
        blades.push({ x:t.x, z:t.z, s:t.s, r: rot(t.h || 0) });
        if (t.tall){ // las matas de encuentro son más densas y altas
          blades.push({ x: t.x + 0.26, z: t.z - 0.2, s: t.s*0.8, r: rot((t.h||0)+31) });
          blades.push({ x: t.x - 0.24, z: t.z + 0.22, s: t.s*0.75, r: rot((t.h||0)+59) });
        }
      });
      const inst = new THREE.InstancedMesh(Paper.geo("tuftX", makeCrossedQuad), tm, blades.length);
      blades.forEach((b, i) => {
        Euler.set(0, b.r, 0); Q.setFromEuler(Euler);
        M.compose(P.set(b.x, terrainY(b.x, b.z), b.z), Q, S.set(b.s, b.s*1.25, b.s));
        inst.setMatrixAt(i, M);
      });
      Q.identity();
      own(inst);
      worldGroup.add(inst);
      if (has3D) tufts.forEach(t => {
        const h = t.h || 0;
        if (h % 3) return; // solo un tercio lleva helecho, para no recargar
        const idx = pickFrom(A3.FERN, h >>> 2);
        batch.add("fern" + idx, assetGeo(idx), fm, {
          x: t.x + ((h>>>5)%14 - 7)/40, z: t.z + ((h>>>9)%14 - 7)/40,
          s: ES*0.62*t.s, sy: ES*0.95*t.s, rot: rot(h),
        });
      });
    }

    // Flores del pack (con su textura recortada) + pétalos a ras de suelo
    if (flowers.length && has3D){
      flowers.forEach(f => {
        const h = f.h;
        const idx = pickFrom(A3.FLOWER, h);
        batch.add("flow" + idx, assetGeo(idx), fm, {
          x: f.x + ((h>>>4)%16 - 8)/45, z: f.z + ((h>>>8)%16 - 8)/45,
          s: ES * (0.75 + (h % 30)/100), rot: rot(h),
        });
        if (h % 4 === 0){
          const gi = pickFrom(A3.GROUNDCOVER, h >>> 3);
          batch.add("gcov" + gi, assetGeo(gi), fm, {
            x: f.x + ((h>>>11)%20 - 10)/32, z: f.z + ((h>>>15)%20 - 10)/32,
            s: ES * 0.9, rot: rot(h*3),
          });
        }
      });
    }

    // Setas: sombrerito rojo con lunares sobre pie crema
    if (mushs.length){
      const capMat = own(new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const caps = new THREE.InstancedMesh(Paper.geo("mushCap", () => {
        const g = new THREE.SphereGeometry(0.11, 9, 6, 0, Math.PI*2, 0, Math.PI/2);
        g.scale(1, 0.8, 1);
        return g;
      }), capMat, mushs.length);
      const stems = new THREE.InstancedMesh(
        Paper.geo("mushStem", () => new THREE.CylinderGeometry(0.035, 0.05, 0.13, 6)),
        Paper.lambert("#f6ecd8"), mushs.length);
      const MC = ["#d4604a", "#c4566e", "#dd8f4a", "#b8515f"];
      mushs.forEach((t, i) => {
        const h = t.h || i, gy = terrainY(t.x, t.z);
        M.compose(P.set(t.x, gy+0.065, t.z), Q, S.set(1, 1, 1));
        stems.setMatrixAt(i, M);
        M.compose(P.set(t.x, gy+0.12, t.z), Q, S.set(1, 1, 1));
        caps.setMatrixAt(i, M);
        caps.setColorAt(i, TMPCOL.set(MC[h % MC.length]));
      });
      caps.castShadow = stems.castShadow = true;
      own(caps); own(stems);
      worldGroup.add(caps, stems);
    }

    // Piedras y peñascos: guijarros, losas y rocas del pack según el tamaño
    if (has3D){
      rocks.forEach(t => {
        const h = t.h || 0, s = t.s || 1;
        let idx, sc;
        if (s < 0.5){ idx = pickFrom(P3.PEBBLE, h);   sc = ES * (1.0 + (h%40)/100); }
        else if (s < 0.9){ idx = pickFrom(A3.ROCK_SMALL, h); sc = ES * (0.8 + (h%40)/100);
          batch.add("arock" + idx, assetGeo(idx), plainMaterial(), { x:t.x, z:t.z, s:sc, rot: rot(h), color:"#b3baad" });
          return;
        }
        else { idx = pickFrom(P3.BOULDER, h); sc = ES * (0.55 + (h%35)/100); }
        batch.add("rock" + idx, propGeo(idx), pm, { x:t.x, z:t.z, s:sc, rot: rot(h) });
      });
      // riscos del borde de la cueva
      caveWallRocks.forEach(t => {
        const h = t.h || 0;
        const idx = pickFrom(h % 2 ? P3.CRAG : P3.DARKCRAG, h >> 2);
        batch.add("crag" + idx, propGeo(idx), pm, {
          x:t.x, z:t.z, s: ES * (0.7 + (h%50)/100) * (t.s||1), rot: rot(h), color:"#c9c2e8",
        });
      });
      // rocas-guarida de guardianes dentro de la cueva
      caveRocks.forEach(t => {
        const h = t.h || 0;
        const idx = pickFrom(P3.BOULDER, h);
        batch.add("crock" + idx, propGeo(idx), pm, {
          x:t.x, z:t.z, s: ES*0.8, rot: rot(h), color:"#d6c7ff",
        });
      });
      // orilla: riscos, madera a la deriva y guijarros
      shore.forEach(t => {
        const h = t.h;
        if (t.kind === "crag"){
          const idx = pickFrom(P3.CRAG, h);
          batch.add("crag" + idx, propGeo(idx), pm, { x:t.x, z:t.z, s: ES*(0.45+(h%30)/100), rot: rot(h) });
        } else if (t.kind === "drift"){
          const idx = pickFrom(P3.DRIFT, h);
          batch.add("drift" + idx, propGeo(idx), pm, { x:t.x, z:t.z, s: ES*(0.7+(h%40)/100), rot: rot(h) });
        } else {
          const idx = pickFrom(P3.PEBBLE, h);
          batch.add("rock" + idx, propGeo(idx), pm, { x:t.x, z:t.z, s: ES*(0.9+(h%50)/100), rot: rot(h) });
        }
      });
      // troncos caídos de la pradera
      logs.forEach(t => {
        const idx = pickFrom(P3.LOG, t.h);
        batch.add("log" + idx, propGeo(idx), pm, { x:t.x, z:t.z, s: ES*(0.7+(t.h%40)/100), rot: rot(t.h) });
      });
      // matas sueltas
      smallBushes.forEach(t => {
        const idx = pickFrom(P3.BUSH, t.h);
        batch.add("sbush" + idx, propGeo(idx), pm, {
          x:t.x, z:t.z, s: ES*(0.5+(t.h%35)/100), rot: rot(t.h),
          color: CANOPY_TINTS[t.h % CANOPY_TINTS.length],
        });
      });
    } else {
      const allRocks = rocks.concat(caveWallRocks);
      if (allRocks.length){
        const inst = new THREE.InstancedMesh(Paper.geo("rock", () => new THREE.DodecahedronGeometry(0.32, 0)), Paper.lambert(mode==="cueva" ? "#6a6478" : "#9aa0a8"), allRocks.length);
        allRocks.forEach((t, i) => {
          Euler.set(0, rot(t.h || i), 0); Q.setFromEuler(Euler);
          const s = t.s || 1;
          M.compose(P.set(t.x, 0.16*s, t.z), Q, S.set(s, s*0.75, s));
          inst.setMatrixAt(i, M);
        });
        Q.identity();
        inst.castShadow = true;
        own(inst);
        worldGroup.add(inst);
      }
    }

    // Arbustos de guardianes: mata de tres bolas del pack, en verde intenso
    // para que se distingan de la vegetación de adorno.
    if (bushes.length){
      const BLOBS = [[0, 0, 0, 0.62], [-0.3, 0.06, 0.1, 0.44], [0.3, 0.07, -0.08, 0.46]];
      const BC = ["#e8ffcf", "#cdf2a8", "#b6e594"];
      bushes.forEach((t, i) => {
        BLOBS.forEach(([dx, dy, dz, s], j) => {
          const h = (t.h || i) + j*17;
          if (has3D){
            const idx = pickFrom(P3.BUSH, h);
            batch.add("gbush" + idx, propGeo(idx), pm, {
              x: t.x+dx, y: dy, z: t.z+dz, s: ES*s, rot: rot(h), color: BC[j],
            });
          }
        });
      });
      if (!has3D){
        const bushMat = own(new THREE.MeshLambertMaterial({ color: 0x2f8f4a }));
        const inst = new THREE.InstancedMesh(Paper.geo("canopy", () => new THREE.SphereGeometry(1, 10, 8)), bushMat, bushes.length);
        bushes.forEach((t, i) => {
          M.compose(P.set(t.x, 0.3, t.z), Q, S.set(0.45, 0.4, 0.45));
          inst.setMatrixAt(i, M);
        });
        inst.castShadow = true;
        own(inst);
        worldGroup.add(inst);
      }
    }

    batch.flush();

    chests.forEach(t => {
      const c = Paper.chestMesh();
      c.position.set(t.x, terrainY(t.x, t.z), t.z);
      worldGroup.add(c);
    });
    fencesH.forEach(t => { const f = Paper.fenceMesh(true);  f.position.set(t.x, 0, t.z); worldGroup.add(f); });
    fencesV.forEach(t => { const f = Paper.fenceMesh(false); f.position.set(t.x, 0, t.z); worldGroup.add(f); });

    if (planks.length){
      const pg = Paper.geo("plank1", () => new THREE.BoxGeometry(0.98, 0.09, 0.98));
      planks.forEach((t, i) => {
        const p = new THREE.Mesh(pg, Paper.lambert(i%2 ? "#b08954" : "#9c7443"));
        p.position.set(t.x, 0.045, t.z);
        p.receiveShadow = true;
        worldGroup.add(p);
      });
    }
    if (rails.length){
      const rg = Paper.geo("rail1", () => new THREE.BoxGeometry(1.0, 0.26, 0.08));
      rails.forEach(t => {
        const r = new THREE.Mesh(rg, Paper.lambert("#8a6a44"));
        r.position.set(t.x, 0.2, t.z);
        if (!t.horiz) r.rotation.y = Math.PI/2;
        worldGroup.add(r);
      });
    }

    if (saveSpot){
      const sp = Paper.saveSparkle();
      sp.position.set(saveSpot.x, terrainY(saveSpot.x, saveSpot.z), saveSpot.z);
      worldGroup.add(sp);
      animSparkles.push(sp);
    }
  }

  // ---------- paredes de interiores ----------
  const WALL_COLORS = {
    tienda:"#d9a066", cafe:"#b07a4f", academia:"#7a9fd4",
    norebang:"#e87ab0", casa:"#f0e0c8", alcaldia:"#b08ad4", interior:"#e8d49a",
  };
  function buildInteriorWalls(){
    if (mode === "over" || mode === "pueblo" || mode === "cueva") return;
    const col = WALL_COLORS[mode] || "#d9c8a8";
    const wallMat = Paper.lambert(col);
    // muro norte (3 filas)
    const north = new THREE.Mesh(own(new THREE.BoxGeometry(MW+1.5, 2.9, 3.6)), wallMat);
    north.position.set(MW/2, 1.45, 1.0);
    // muros laterales
    const west = new THREE.Mesh(own(new THREE.BoxGeometry(1.6, 2.9, MH+1)), wallMat);
    west.position.set(-0.3, 1.45, MH/2);
    const east = west.clone();
    east.position.set(MW+0.3, 1.45, MH/2);
    [north, west, east].forEach(w => { w.castShadow = true; w.receiveShadow = true; worldGroup.add(w); });
    // zócalo
    const skirt = new THREE.Mesh(own(new THREE.BoxGeometry(MW+1.5, 0.3, 3.8)), Paper.lambert(Paper.shade(col, 0.75)));
    skirt.position.set(MW/2, 0.15, 1.0);
    worldGroup.add(skirt);
    // (el mostrador de la tienda y la tarima del gimnasio ahora son
    //  mobiliario registrado con addFurn en cada build*)
  }

  // ---------- personajes ----------
  function makeBlobShadow(){
    const m = new THREE.Mesh(
      Paper.geo("blob", () => new THREE.CircleGeometry(0.34, 14)),
      Paper.mat("blobM", () => new THREE.MeshBasicMaterial({ color: 0x1a2a1a, transparent: true, opacity: 0.25, depthWrite: false }))
    );
    m.rotation.x = -Math.PI/2;
    m.position.y = 0.015;
    return m;
  }
  /* Las texturas de personaje viven FUERA de la escena. Antes se creaban y
     se destruían en cada reconstrucción, así que cambiar de zona resubía a la
     GPU la lámina de todos los vecinos: ~95 ms de parón. Ahora se cachean
     contra su propio lienzo y sobreviven a los rebuilds. */
  const charTexCache = new WeakMap();
  let bubbleCv = null;
  const bubbleCanvas = () => bubbleCv || (bubbleCv = Paper.bubble());
  function charTex(cv, pair){
    let t = charTexCache.get(cv);
    if (t) return t;
    t = Paper.canvasTex(cv, { sharp: true });
    if (pair && pair._sheet) Paper.watchPair(pair, t);
    charTexCache.set(cv, t);
    return t;
  }
  function makeCharPlane(pair, w, h){
    const texF = charTex(pair.front, pair);
    const texB = charTex(pair.back, pair);
    // el sprite de la hoja es alto y estrecho; sin esto se achata
    if (pair._sheet) w = h * pair.aspect;
    const mat = own(new THREE.MeshBasicMaterial({ map: texF, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
    const plane = new THREE.Mesh(Paper.geo("charPlane", () => new THREE.PlaneGeometry(1, 1)), mat);
    plane.scale.set(w, h, 1);
    plane.position.y = h/2;
    return { plane, mat, texF, texB };
  }

  function buildCharacters(){
    // jugador (sprite de hoja si la skin lo tiene; personaje de papel si no)
    const skin = State.get().activeSkin;
    const ss = sheetSkins[skin];
    const useSheet = ss && ss.ready;
    const pair = useSheet ? { front: ss.front[0], back: ss.back[0] } : playerChars(skin);
    const g = new THREE.Group();
    g.add(makeBlobShadow());
    const cp = useSheet
      ? (skin === "clásico" ? makeCharPlane(pair, 1.0, 1.3) : makeCharPlane(pair, 0.98, 1.34))
      : makeCharPlane(pair, 0.95, 1.25);
    g.add(cp.plane);
    worldGroup.add(g);
    playerVis = { group: g, ...cp, skin, flip: 0, flipT: 0 };
    if (useSheet) applySheetSkin();

    // NPCs
    npcsCur.forEach((n, i) => {
      const ng = new THREE.Group();
      ng.add(makeBlobShadow());
      let ncp;
      if (n.creature){
        // NPCs que no son personas (el gato de casa): se dibujan con su
        // sprite de criatura en vez del muñeco de papel
        const cv = Paper.svgCanvas(Creatures.petSprite(n.creature), 192, 14);
        const tex = charTex(cv);
        Paper.watch(cv, tex);
        const mat = own(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
        const plane = new THREE.Mesh(Paper.geo("charPlane", () => new THREE.PlaneGeometry(1, 1)), mat);
        plane.scale.set(0.66, 0.66, 1);
        plane.position.y = 0.34;
        ncp = { plane, mat, texF: tex, texB: tex };
      } else {
        ncp = makeCharPlane(npcChars(n), 0.9, 1.2);
      }
      ng.add(ncp.plane);
      // bocadillo "…"
      const btex = charTex(bubbleCanvas());
      const bmat = own(new THREE.SpriteMaterial({ map: btex, transparent: true, depthWrite: false }));
      const bub = new THREE.Sprite(bmat);
      bub.scale.set(0.62, 0.48, 1);
      bub.position.y = 1.68;
      ng.add(bub);
      worldGroup.add(ng);
      npcVis.set(n, { group: ng, plane: ncp.plane, bubble: bub, flip: 0, flipT: 0, idx: i });
    });

    // mascota
    refreshPetVis();
  }

  function refreshPetVis(){
    if (petVis){ worldGroup.remove(petVis.group); petVis = null; }
    if (!pet) return;
    const c = Paper.svgCanvas(Creatures.petSprite(pet.key), 192, 14);
    const tex = charTex(c);
    Paper.watch(c, tex);
    const mat = own(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
    const g = new THREE.Group();
    g.add(makeBlobShadow());
    const plane = new THREE.Mesh(Paper.geo("charPlane", () => new THREE.PlaneGeometry(1, 1)), mat);
    plane.scale.set(0.62, 0.62, 1);
    plane.position.y = 0.32;
    g.add(plane);
    worldGroup.add(g);
    petVis = { group: g, plane, key: pet.key };
  }

  // ---------- ambiente: animales, mariposas, nubes ----------
  function buildAmbient(){
    if (mode === "over"){
      farmAnimals.forEach(a => {
        const c = animalCanvas(a.kind);
        const tex = charTex(c);
        const mat = own(new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
        const g = new THREE.Group();
        g.add(makeBlobShadow());
        const plane = new THREE.Mesh(Paper.geo("charPlane", () => new THREE.PlaneGeometry(1, 1)), mat);
        plane.scale.set(0.95, 0.75, 1);
        plane.position.y = 0.4;
        g.add(plane);
        worldGroup.add(g);
        animalVis.push({ group: g, plane, a });
      });
      butterflies.forEach(b => {
        const g = Paper.butterfly(BFLY_COLORS[b.kind % BFLY_COLORS.length]);
        worldGroup.add(g);
        butterflyVis.push({ group: g, b });
      });
    }
    if (mode === "over" || mode === "pueblo"){
      if (!cloudTex) cloudTex = Paper.canvasTex(Paper.cloudTexture());
      for (let i=0; i<8; i++){
        const m = own(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false }));
        const sp = new THREE.Sprite(m);
        const s = 3.2 + (hsh(i, 99)%40)/10;
        sp.scale.set(s, s*0.55, 1);
        sp.position.set((hsh(i, 7) % (MW*10))/10, 15 + (hsh(i, 13)%60)/10, (hsh(i, 21) % (MH*10))/10 - 6);
        worldGroup.add(sp);
        clouds.push({ sp, speed: 0.3 + (hsh(i, 31)%40)/100 });
      }
    }
  }

  // ---------- casa en el mar (asset FBX horneado en js/seaHouse.js) ----------
  let seaHouseRaw = null; // buffers decodificados (se decodifica una sola vez)
  function b64ToF32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Float32Array(u.buffer); }
  function b64ToU32(s){ const b = atob(s); const u = new Uint8Array(b.length); for (let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return new Uint32Array(u.buffer); }
  function buildSeaHouse(){
    if (mode !== "over" || typeof SEA_HOUSE_MODEL === "undefined") return;
    /* La casa vive en coordenadas de la REGIÓN (playa oeste, 32,88). Al
       partir el mapa en zonas se seguía dibujando en esas coordenadas en
       TODAS las zonas, o sea fuera del mapa en todas: parecía quitada. Solo
       se planta si la zona cargada la contiene, traducida a local. */
    const lx = SEA_HOUSE_AT.x - zoneX0, lz = SEA_HOUSE_AT.y - zoneY0;
    if (lx < -8 || lz < -8 || lx > MW+8 || lz > MH+8) return;
    if (!seaHouseRaw){
      seaHouseRaw = SEA_HOUSE_MODEL.meshes.map(m => ({
        pos: b64ToF32(m.pos), nor: m.nor ? b64ToF32(m.nor) : null,
        idx: m.idx ? b64ToU32(m.idx) : null, color: m.color,
      }));
    }
    const g = new THREE.Group();
    seaHouseRaw.forEach(m => {
      const geo = own(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(m.pos, 3));
      if (m.nor) geo.setAttribute("normal", new THREE.BufferAttribute(m.nor, 3));
      else geo.computeVertexNormals();
      if (m.idx) geo.setIndex(new THREE.BufferAttribute(m.idx, 1));
      const mesh = new THREE.Mesh(geo, own(new THREE.MeshLambertMaterial({ color: m.color, side: THREE.DoubleSide })));
      mesh.castShadow = true;
      g.add(mesh);
    });
    // escala: la isla-base del asset (~2134 u.) pasa a ocupar ~7.5 tiles
    const w = SEA_HOUSE_MODEL.bbox.max[0] - SEA_HOUSE_MODEL.bbox.min[0];
    const s = 7.5 / w;
    g.scale.set(s, s, s);
    // en la playa, al este del muelle de pesca; base de la isla a nivel del
    // suelo y la pasarela del asset mirando de frente (sur, hacia el mar)
    g.position.set(lx, -SEA_HOUSE_MODEL.bbox.min[1] * s, lz);
    g.rotation.y = -Math.PI/2;
    worldGroup.add(g);
    seaHouseVis = g;
  }

  /* ---------- cuarto de Karol (pack free-isometric-rooms) ----------
     Habitación completa con cama, escritorio y ventana: sustituye al suelo
     y las paredes procedurales cuando estamos dentro de casa. El modelo trae
     dos muros y se gira 180° para que la parte abierta mire a la cámara. */
  const HOME_ROOM = {
    scale: 5.2,       // tiles por unidad del modelo
    squash: 0.82,     // los muros del asset son muy altos para la escala del juego
    x: 3.5, z: 5.2,   // centro del cuarto en tiles
    floor: 0.115,     // altura de la tarima sobre la base del modelo
    rotY: Math.PI,
  };
  let homeRoomRaw = null;
  function buildHomeRoom(){
    if (mode !== "casa" || typeof HOME_ROOM_MODEL === "undefined") return false;
    if (!homeRoomRaw){
      homeRoomRaw = HOME_ROOM_MODEL.meshes.map(m => ({
        pos: b64ToF32(m.pos), nor: m.nor ? b64ToF32(m.nor) : null,
        uv: m.uv ? b64ToF32(m.uv) : null,
        idx: m.idx ? b64ToU32(m.idx) : null,
      }));
    }
    const tex = own(new THREE.TextureLoader().load(HOME_ROOM_MODEL.tex));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;      // convención glTF
    tex.anisotropy = 8;
    const mat = own(new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    const g = new THREE.Group();
    homeRoomRaw.forEach(m => {
      const geo = own(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(m.pos, 3));
      if (m.nor) geo.setAttribute("normal", new THREE.BufferAttribute(m.nor, 3));
      else geo.computeVertexNormals();
      if (m.uv) geo.setAttribute("uv", new THREE.BufferAttribute(m.uv, 2));
      if (m.idx) geo.setIndex(new THREE.BufferAttribute(m.idx, 1));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
    });
    // el modelo viene desplazado del origen: se recentra por su caja
    const bb = HOME_ROOM_MODEL.bbox;
    const inner = new THREE.Group();
    inner.position.set(-(bb.min[0]+bb.max[0])/2, -bb.min[1], -(bb.min[2]+bb.max[2])/2);
    inner.add(g);
    const outer = new THREE.Group();
    outer.add(inner);
    outer.scale.set(HOME_ROOM.scale, HOME_ROOM.scale*HOME_ROOM.squash, HOME_ROOM.scale);
    outer.rotation.y = HOME_ROOM.rotY;
    // se baja el modelo hasta que su tarima quede justo en y=0, que es donde
    // caminan el jugador y el gato
    outer.position.set(HOME_ROOM.x, -HOME_ROOM.floor*HOME_ROOM.scale*HOME_ROOM.squash, HOME_ROOM.z);
    worldGroup.add(outer);

    // felpudo de salida: el suelo horneado queda tapado por el modelo, así que
    // la marca de la puerta se dibuja como una placa propia sobre la tarima
    const mtex = own(Paper.canvasTex(Paper.exitMatTexture()));
    const mmat = own(new THREE.MeshBasicMaterial({ map: mtex, transparent: true, depthWrite: false }));
    const matMesh = new THREE.Mesh(Paper.geo("charPlane", () => new THREE.PlaneGeometry(1, 1)), mmat);
    matMesh.rotation.x = -Math.PI/2;
    matMesh.position.set(HOME_EXIT[0]+0.5, 0.03, HOME_EXIT[1]+0.5);
    worldGroup.add(matMesh);
    return true;
  }

  /* ---------- casas de verdad (cabaña del asset casa.fbx) ----------
     El modelo de la casa en el mar trae, además de la isla y el muelle, una
     cabaña completa (muros de estuco, tejas, vigas y ventanas). Las mallas
     3..51 son justo el edificio: se fusionan por color, se orientan con la
     fachada al sur y se reutilizan para todos los edificios del juego,
     recoloreando muros y tejado según el tipo. */
  const HOUSE_MESH_RANGE = [3, 51];
  const HOUSE_TARGET_W = 4.5;      // ancho en tiles (la base sólida mide 6)
  let houseGeoCache = null;        // { color: BufferGeometry } ya orientadas
  let houseHeight = 0;             // altura resultante, para colocar el cartel

  // fusiona varias mallas (pos/nor/idx) en una sola geometría
  function mergeParts(parts){
    let nv = 0, ni = 0;
    parts.forEach(p => { nv += p.pos.length/3; ni += p.idx ? p.idx.length : p.pos.length/3; });
    const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3);
    const idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    parts.forEach(p => {
      pos.set(p.pos, vo*3);
      if (p.nor) nor.set(p.nor, vo*3);
      const n = p.pos.length/3;
      if (p.idx) for (let k=0; k<p.idx.length; k++) idx[io++] = p.idx[k] + vo;
      else for (let k=0; k<n; k++) idx[io++] = k + vo;
      vo += n;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    return g;
  }

  function houseGeos(){
    if (houseGeoCache) return houseGeoCache;
    if (typeof SEA_HOUSE_MODEL === "undefined") return (houseGeoCache = {});
    if (!seaHouseRaw){
      seaHouseRaw = SEA_HOUSE_MODEL.meshes.map(m => ({
        pos: b64ToF32(m.pos), nor: m.nor ? b64ToF32(m.nor) : null,
        idx: m.idx ? b64ToU32(m.idx) : null, color: m.color,
      }));
    }
    const parts = seaHouseRaw.slice(HOUSE_MESH_RANGE[0], HOUSE_MESH_RANGE[1] + 1);
    // caja envolvente del edificio en coordenadas del asset
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    parts.forEach(p => {
      for (let k=0; k<p.pos.length; k+=3) for (let a=0; a<3; a++){
        const v = p.pos[k+a];
        if (v < mn[a]) mn[a] = v;
        if (v > mx[a]) mx[a] = v;
      }
    });
    // la fachada del asset mira a +X; al girar -90° pasa a mirar al sur (+Z),
    // así que el ancho visible del edificio es su profundidad original.
    const s = HOUSE_TARGET_W / (mx[2] - mn[2]);
    houseHeight = (mx[1] - mn[1]) * s;
    const T = new THREE.Matrix4().makeTranslation(-(mn[0]+mx[0])/2, -mn[1], -(mn[2]+mx[2])/2);
    const R = new THREE.Matrix4().makeRotationY(-Math.PI/2);
    const S = new THREE.Matrix4().makeScale(s, s, s);
    const M = new THREE.Matrix4().multiplyMatrices(S, new THREE.Matrix4().multiplyMatrices(R, T));
    const byColor = {};
    parts.forEach(p => (byColor[p.color] = byColor[p.color] || []).push(p));
    houseGeoCache = {};
    Object.keys(byColor).forEach(col => {
      const g = mergeParts(byColor[col]);
      g.applyMatrix4(M);
      houseGeoCache[col] = g;
    });
    return houseGeoCache;
  }

  // recoloreado por tipo de edificio: muros, tejas (dos tonos) y madera
  const HOUSE_SKINS = {
    blue:   { "#f5efe2":"#fbf5e8", "#c96f35":"#3f6fb5", "#e8894a":"#5c8fd6", "#9c7443":"#7d5f3e" },
    warm:   { "#f5efe2":"#fff4de", "#c96f35":"#d4732f", "#e8894a":"#f0a057", "#9c7443":"#9c7443" },
    cold:   { "#f5efe2":"#eef1f8", "#c96f35":"#5f6fa8", "#e8894a":"#8391c6", "#9c7443":"#7a6a55" },
    rose:   { "#f5efe2":"#fff0f2", "#c96f35":"#c9455a", "#e8894a":"#e8697f", "#9c7443":"#8f6350" },
    green:  { "#f5efe2":"#f4f8e6", "#c96f35":"#3f8f52", "#e8894a":"#63b273", "#9c7443":"#7d6a45" },
    purple: { "#f5efe2":"#f6f0fb", "#c96f35":"#7b5bb5", "#e8894a":"#9d80d0", "#9c7443":"#7a6a7d" },
  };
  // cada edificio con carácter propio, como los pueblos de Pokémon
  const HOUSE_SKIN_BY_TAG = {
    shop:"green", alcaldia:"purple", casa:"rose", cafe:"warm",
    academia:"blue", norebang:"rose",
  };

  function buildHouseMesh(variant, d){
    const geos = houseGeos();
    const keys = Object.keys(geos);
    if (!keys.length) return Paper.house(variant); // sin el asset: casa de papel
    let skinKey = variant;
    Object.keys(HOUSE_SKIN_BY_TAG).forEach(tag => { if (d && d[tag]) skinKey = HOUSE_SKIN_BY_TAG[tag]; });
    if (d && d.gym) skinKey = ["blue","warm","cold","green","purple","rose"][(d.gym.length*7) % 6];
    const skin = HOUSE_SKINS[skinKey] || HOUSE_SKINS.blue;
    const g = new THREE.Group();
    keys.forEach(col => {
      const mesh = new THREE.Mesh(geos[col], own(new THREE.MeshLambertMaterial({
        color: skin[col] || col, side: THREE.DoubleSide,
      })));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    });
    return g;
  }


  // ---------- jardín-isla StylisedEnv (js/envGarden.js) ----------
  // Diorama completo del pack (estanque, árboles, helechos, flores, puente,
  // banco) emergiendo del mar al suroeste: pura belleza de fondo estilo Pokémon.
  let gardenRaw = null;
  function buildGarden(){
    if (mode !== "over" || typeof ENV_GARDEN_MODEL === "undefined") return;
    // igual que la casa del mar: GARDEN_AT es de la REGIÓN (mar abierto al
    // sur, 104,99) y hay que plantarla solo en su zona, traducida a local
    const lx = GARDEN_AT.x - zoneX0, lz = GARDEN_AT.y - zoneY0;
    if (lx < -10 || lz < -10 || lx > MW+10 || lz > MH+10) return;
    if (!gardenRaw){
      gardenRaw = ENV_GARDEN_MODEL.meshes.map(m => ({
        pos: b64ToF32(m.pos), nor: m.nor ? b64ToF32(m.nor) : null,
        uv: m.uv ? b64ToF32(m.uv) : null,
        col: m.col ? b64ToF32(m.col) : null,
        idx: m.idx ? b64ToU32(m.idx) : null,
        color: m.color, tex: m.tex, alphaTest: m.alphaTest, mat: m.mat,
      }));
    }
    const texCache = {};
    const texFor = name => {
      if (!name) return null;
      if (texCache[name]) return texCache[name];
      let uri = null;
      if (name === "Foliage.png" && typeof ENV_ASSETS !== "undefined") uri = ENV_ASSETS.foliageTex;
      if (name === "Ground.png" && typeof ENV_GROUND_TEX !== "undefined") uri = ENV_GROUND_TEX;
      if (!uri) return null;
      const t = own(new THREE.TextureLoader().load(uri));
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = false; // UVs con convención glTF
      t.anisotropy = 4;
      return (texCache[name] = t);
    };
    const g = new THREE.Group();
    gardenRaw.forEach(m => {
      const geo = own(new THREE.BufferGeometry());
      geo.setAttribute("position", new THREE.BufferAttribute(m.pos, 3));
      if (m.nor) geo.setAttribute("normal", new THREE.BufferAttribute(m.nor, 3));
      else geo.computeVertexNormals();
      if (m.uv) geo.setAttribute("uv", new THREE.BufferAttribute(m.uv, 2));
      if (m.col) geo.setAttribute("color", new THREE.BufferAttribute(m.col, 3));
      if (m.idx) geo.setIndex(new THREE.BufferAttribute(m.idx, 1));
      const isWater = m.mat === "Water";
      const mesh = new THREE.Mesh(geo, own(new THREE.MeshLambertMaterial({
        color: m.color, map: texFor(m.tex), vertexColors: !!m.col,
        alphaTest: m.alphaTest || 0, side: THREE.DoubleSide,
        transparent: isWater, opacity: isWater ? 0.88 : 1,
      })));
      if (!isWater && m.mat !== "Flowers") mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    });
    // escala: el diorama (~4.9 u de ancho) pasa a ~9 tiles de isla
    const w = ENV_GARDEN_MODEL.bbox.max[0] - ENV_GARDEN_MODEL.bbox.min[0];
    const s = 9 / w;
    g.scale.set(s, s, s);
    /* En el mar al oeste del muelle. El diorama es una peana de roca con el
       césped arriba (a y≈1.87 del modelo): si se apoya en la superficie se ve
       el pedrusco entero al aire y parece flotar, así que se hunde hasta dejar
       la orilla apenas medio tile sobre el agua, como una isla de verdad. */
    const GRASS_Y = 1.87;   // nivel del césped en el modelo
    const SHORE_OVER_SEA = 0.55; // cuánto asoma la orilla
    g.position.set(lx, SHORE_OVER_SEA - GRASS_Y*s, lz);
    g.rotation.y = Math.PI*0.15;
    worldGroup.add(g);
    gardenCount = g.children.length;
  }

  /* ---------- marcador de misión ----------
     Rombo dorado flotante sobre el objetivo de la misión vigente, como el
     "▼" de los RPG: si el objetivo cae en esta zona lo corona; si está en
     otra, señala el borde por el que hay que salir para acercarse. */
  let objectiveMark = null;
  /* Marca del objetivo. Antes, si el objetivo estaba en OTRA zona, se recortaba
     su posición al borde de la zona actual: el "!" acababa plantado en sitios
     sin sentido (dentro del corral, encima de un árbol) y parecía un fallo.
     Ahora solo se muestra si el objetivo está de verdad en este mapa; para
     saber hacia dónde ir ya están el minimapa y el banner de misión. */
  function objectiveLocal(){
    const t = (typeof Quests !== "undefined" && Quests.target) ? Quests.target() : null;
    if (!t) return null;
    const lx = t.x - zoneX0, lz = t.y - zoneY0;
    if (lx < 1 || lx >= MW-1 || lz < 1 || lz >= MH-1) return null;
    return { x: lx, z: lz };
  }
  function buildObjectiveMark(){
    objectiveMark = null;
    if (mode !== "over") return;
    const p = objectiveLocal();
    if (!p) return;
    const cv = document.createElement("canvas"); cv.width = cv.height = 64;
    const x = cv.getContext("2d");
    x.font = "900 46px sans-serif";
    x.textAlign = "center"; x.textBaseline = "middle";
    x.lineWidth = 10; x.strokeStyle = "#fff";
    x.strokeText("!", 32, 34);
    x.fillStyle = "#ffb400";
    x.fillText("!", 32, 34);
    const tex = own(Paper.canvasTex(cv));
    const sp = new THREE.Sprite(own(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })));
    sp.scale.set(1.2, 1.2, 1);
    // sobre el relieve, no a una altura fija: en una loma quedaba enterrado y
    // en una hondonada, flotando en el aire
    sp.userData.baseY = terrainY(p.x, p.z) + 2.6;
    sp.position.set(p.x, sp.userData.baseY, p.z);
    worldGroup.add(sp);
    objectiveMark = sp;
  }

  // ---------- ambiente por modo (cielo, luces, niebla) ----------
  const INTERIOR_BG = {
    tienda:"#f7e8d0", cafe:"#f2e0cc", academia:"#dce8f7", norebang:"#f7d8e8",
    casa:"#f7ecd8", alcaldia:"#eadcf7", interior:"#f7e8c0",
  };
  function applyModeAmbience(){
    // banda sonora del contexto: la cueva suena a cueva, el resto al aire libre
    if (typeof Sfx !== "undefined" && Sfx.setTheme) Sfx.setTheme(mode === "cueva" ? "cave" : "world");
    camOffset = mode === "casa"
      // el cuarto de Karol es pequeño pero de muros altos: la cámara se aleja
      // y se descentra para que quepa entero sin recortar la cama
      ? new THREE.Vector3(1.1, 12.5, 10.2)
      : Math.max(MW, MH) <= 26
        ? new THREE.Vector3(0, 9.5, 7.6)
        : new THREE.Vector3(0, 16.5, 12.2);
    if (skyDome) skyDome.visible = (mode === "over" || mode === "pueblo");
    if (mode === "cueva"){
      scene.background = new THREE.Color("#17131f");
      scene.fog = new THREE.Fog(0x17131f, 14, 40);
      hemi.color.set("#6f6699"); hemi.groundColor.set("#2a2438"); hemi.intensity = 0.95;
      sun.intensity = 0.35;
      caveLight.intensity = 2.1;
      caveLight.distance = 14;
    } else if (mode === "over" || mode === "pueblo"){
      scene.background = new THREE.Color(SKY_HORIZON);
      // el pueblo es un mapa pequeño: la niebla entra antes para que el
      // faldón del horizonte no se vea como una alfombra verde plana
      scene.fog = mode === "pueblo"
        ? new THREE.Fog(new THREE.Color(SKY_HORIZON).getHex(), 22, 52)
        : new THREE.Fog(new THREE.Color(SKY_HORIZON).getHex(), 42, 105);
      hemi.color.set("#d2efff"); hemi.groundColor.set("#7ba85c"); hemi.intensity = 0.85;
      sun.intensity = 1.25;
      caveLight.intensity = 0;
    } else {
      scene.background = new THREE.Color(INTERIOR_BG[mode] || "#f2e6d0");
      scene.fog = null;
      hemi.color.set("#fff6e8"); hemi.groundColor.set("#8a7a5b"); hemi.intensity = 1.0;
      sun.intensity = 0.75;
      caveLight.intensity = 0;
    }
  }

  // ---------- escena completa ----------
  function buildScene(){
    sceneDirty = false;
    // profundidad y silueta del mar son propias de cada mapa
    depthField = null; seaMaskCanvas = null; seaColorCanvas = null;
    disposeScene();
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    applyModeAmbience();
    buildHeightMap(); // antes que nada: todo lo demás se apoya en el relieve
    if (mode !== "casa") buildGroundMesh(); // en casa el suelo lo pone el modelo
    buildWaterMesh();
    scanAndBuildDecor();
    // el cuarto de Karol es un modelo entero: trae su propio suelo y muros
    if (!buildHomeRoom()) buildInteriorWalls();
    buildRoomFurniture();
    buildCharacters();
    buildAmbient();
    buildSeaHouse();
    buildGarden();
    buildObjectiveMark();
    snapCamera();
    buildMinimapBase();
    announceZone();
  }

  function snapCamera(){
    const tx = player.px/TILE + 0.5, tz = player.py/TILE + 0.5;
    const gy = terrainY(tx, tz); // la cámara sube y baja con la loma
    desired.set(tx + camOffset.x, gy + camOffset.y, tz + camOffset.z);
    camera.position.copy(desired);
    lookCur.set(tx, gy + 0.9, tz);
    camera.lookAt(lookCur);
    sun.position.set(tx+16, 26, tz+11);
    sun.target.position.set(tx, 0, tz);
    sun.target.updateMatrixWorld();
  }

  // ---------- sincronización visual por frame ----------
  function updateVisuals(dt){
    const now = performance.now();
    const camX = camera.position.x, camZ = camera.position.z;

    // jugador
    if (playerVis){
      const pv = playerVis;
      const skin = State.get().activeSkin;
      if (pv.skin !== skin){
        pv.skin = skin;
        const ss = sheetSkins[skin];
        if (ss && ss.ready){
          pv.sheetTex = { front: ss.front.map(f => charTex(f)), back: ss.back.map(f => charTex(f)) };
        } else {
          pv.sheetTex = null;
          const pair = playerChars(skin);
          pv.texF.image = pair.front; pv.texF.needsUpdate = true;
          pv.texB.image = pair.back;  pv.texB.needsUpdate = true;
        }
      }
      const gx = player.px/TILE + 0.5, gz = player.py/TILE + 0.5;
      pv.group.position.set(gx, terrainY(gx, gz), gz);
      const hop = player.moving ? Math.abs(Math.sin(player.animT*0.5))*0.09 : 0;
      pv.plane.position.y = pv.plane.scale.y/2 + hop;
      pv.mat.map = pv.sheetTex
        ? (player.dir === 2 ? pv.sheetTex.back : pv.sheetTex.front)[player.moving ? (player.frame % 4) : 0]
        : (player.dir === 2) ? pv.texB : pv.texF;
      if (player.dir === 1) pv.flipT = Math.PI;
      else if (player.dir === 3 || player.dir === 0) pv.flipT = 0;
      pv.flip += (pv.flipT - pv.flip) * Math.min(1, dt*0.014);
      pv.plane.rotation.y = Math.atan2(camX - gx, camZ - gz) + pv.flip;
    }

    // NPCs
    npcsCur.forEach(n => {
      const vis = npcVis.get(n);
      if (!vis) return;
      const gx = n.px/TILE + 0.5, gz = n.py/TILE + 0.5;
      vis.group.position.set(gx, terrainY(gx, gz), gz);
      const hop = n.moving ? Math.abs(Math.sin(n.animT*0.5))*0.07 : 0;
      vis.plane.position.y = 0.6 + hop;
      if (n.dir === 1) vis.flipT = Math.PI;
      else if (n.dir === 3 || n.dir === 0) vis.flipT = 0;
      vis.flip += (vis.flipT - vis.flip) * Math.min(1, dt*0.014);
      vis.plane.rotation.y = Math.atan2(camX - gx, camZ - gz) + vis.flip;
      vis.bubble.visible = Dialog.npc !== n;
      vis.bubble.position.y = 1.68 + Math.sin(now*0.003 + vis.idx)*0.05;
    });

    // mascota
    if (pet && (!petVis || petVis.key !== pet.key)) refreshPetVis();
    if (!pet && petVis){ worldGroup.remove(petVis.group); petVis = null; }
    if (petVis && pet){
      const gx = pet.px/TILE + 0.5, gz = pet.py/TILE + 0.5;
      petVis.group.position.set(gx, terrainY(gx, gz), gz);
      petVis.plane.position.y = 0.32 + (pet.moving ? Math.abs(Math.sin(pet.bob*0.3))*0.14 : Math.sin(now*0.004)*0.02);
      petVis.plane.rotation.y = Math.atan2(camX - gx, camZ - gz);
    }

    // agua: la fase B respira sobre la A en un vaivén de ~4 segundos
    if (waterMat){
      waterT += dt;
      if (waterMatB) waterMatB.opacity = 0.92 * (0.5 + 0.5*Math.sin(waterT*0.0016));
    }

    // fuentes
    animFountains.forEach(f => {
      if (f.userData.jet){
        f.userData.jet.scale.y = 1 + Math.sin(now*0.006)*0.18;
        f.userData.jet.rotation.y += dt*0.002;
      }
    });
    // puntos de guardado
    animSparkles.forEach(s => {
      s.rotation.y += dt*0.003;
      const sc = 1 + Math.sin(now*0.005)*0.12;
      s.scale.set(sc, sc, sc);
    });
    // molinillos de viento
    animPinwheels.forEach((p, i) => {
      if (p.userData.wheel) p.userData.wheel.rotation.z += dt*(0.004 + (i%5)*0.0012);
    });

    // mariposas
    butterflyVis.forEach((vo, i) => {
      const b = vo.b;
      const gx = b.px/TILE + 0.5, gz = b.py/TILE + 0.5;
      vo.group.position.set(gx, terrainY(gx, gz) + 1.15 + Math.sin(b.t*0.1)*0.15, gz);
      vo.group.rotation.y = Math.atan2(camX - gx, camZ - gz);
      const f = Math.sin(now*0.022 + i*1.7)*0.75;
      const wings = vo.group.userData.wings;
      if (wings){ wings[0].rotation.z = f; wings[1].rotation.z = -f; }
    });

    // animales
    animalVis.forEach(vo => {
      const a = vo.a;
      const gx = a.px/TILE + 0.5, gz = a.py/TILE + 0.5;
      vo.group.position.set(gx, terrainY(gx, gz), gz);
      vo.plane.position.y = 0.4 + (a.moving ? Math.abs(Math.sin(a.t*0.3))*0.05 : 0);
      vo.plane.rotation.y = Math.atan2(camX - gx, camZ - gz);
      vo.plane.scale.x = (a.facing === 1 ? 1 : -1) * 0.95;
    });

    // nubes
    clouds.forEach(c => {
      c.sp.position.x += c.speed * dt * 0.001;
      if (c.sp.position.x > MW + 8) c.sp.position.x = -8;
    });

    // la cúpula del cielo viaja con la cámara: nunca se alcanza el horizonte
    if (skyDome && skyDome.visible) skyDome.position.copy(camera.position);
    // marcador de misión: vaivén flotante con pulso
    if (objectiveMark){
      objectiveMark.position.y = objectiveMark.userData.baseY + Math.sin(now*0.004)*0.22;
      const pulse = 1.2 + Math.sin(now*0.005)*0.08;
      objectiveMark.scale.set(pulse, pulse, 1);
    }
    // luz de cueva sigue al jugador
    const tx = player.px/TILE + 0.5, tz = player.py/TILE + 0.5;
    caveLight.position.set(tx, terrainY(tx, tz) + 1.9, tz);

    // sol y sombras siguen al jugador
    sun.position.set(tx+16, 26, tz+11);
    sun.target.position.set(tx, 0, tz);
    sun.target.updateMatrixWorld();

    // cámara (acompaña la altura del terreno bajo el jugador)
    const camGy = terrainY(tx, tz);
    desired.set(tx + camOffset.x, camGy + camOffset.y, tz + camOffset.z);
    camera.position.lerp(desired, Math.min(1, dt*0.008));
    lookTgt.set(tx, camGy + 0.9, tz);
    lookCur.lerp(lookTgt, Math.min(1, dt*0.012));
    camera.lookAt(lookCur);
  }

  // ---------- loop principal ----------
  let lastTick = 0, lastFrame = 0;
  function tick(){
    if (!isActive() || !ready) return;
    const wrap = canvas.parentElement;
    if (canvas.width !== wrap.clientWidth * renderer.getPixelRatio() ||
        canvas.height !== wrap.clientHeight * renderer.getPixelRatio()) resize();
    const now = performance.now();
    const steps = lastTick ? Math.min(30, Math.max(1, Math.round((now-lastTick)/16.7))) : 1;
    lastTick = now;
    const dt = lastFrame ? Math.min(100, now - lastFrame) : 16.7;
    lastFrame = now;
    for (let i=0; i<steps; i++) update();
    if (sceneDirty) buildScene();
    updateVisuals(dt);
    drawMinimap();
    renderer.render(scene, camera);
  }
  function loop(){
    requestAnimationFrame(loop);
    tick();
  }

  function resize(){
    if (!renderer) return;
    const wrap = canvas.parentElement;
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w/h;
    camera.updateProjectionMatrix();
  }

  function ensureRenderer(){
    canvas = document.getElementById("world-canvas");
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
    hemi = new THREE.HemisphereLight(0xd2efff, 0x7ba85c, 0.85);
    sun = new THREE.DirectionalLight(0xfff4dd, 1.25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.0015;
    sun.shadow.normalBias = 0.02;
    caveLight = new THREE.PointLight(0xffd9a0, 0, 9, 1.2);
    skyDome = buildSkyDome();
    scene.add(hemi, sun, sun.target, caveLight, skyDome);
    ready = true;
  }

  async function start(){
    if (started){ sceneDirty = true; resize(); return; }
    started = true;
    buildOverworld();
    ensureRenderer();


    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", e => {
      if (!isActive()) return;
      if (Dialog.open && (e.key===" "||e.key==="Enter"||e.key==="Escape")){
        e.preventDefault();
        if (e.key==="Escape") closeDialog(); else advanceDialog();
        return;
      }
      keys[e.key]=true;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    });
    window.addEventListener("keyup", e => { keys[e.key]=false; });
    document.getElementById("dialog").addEventListener("click", advanceDialog);

    setupJoystick();
    loop();
    setInterval(() => { if (document.hidden) tick(); }, 50);
    UI.refreshTopbar();
  }

  /* ==========================================================
     JOYSTICK TÁCTIL
     Sustituye a las flechas en pantalla. Solo se muestra en dispositivos de
     puntero grueso (dedo): con ratón estorbaba y ya está el teclado.

     El movimiento del juego es por casillas, así que el joystick no da un
     vector continuo: traduce la dirección dominante del arrastre a la misma
     tecla que usaría el teclado, y así comparte toda la lógica de avance.
     ========================================================== */
  const JOY_DEAD = 0.28;   // fracción del radio que se ignora, para no derivar
  function setupJoystick(){
    const pad = document.getElementById("joystick");
    const knob = document.getElementById("joy-knob");
    if (!pad || !knob) return;
    // en escritorio no se dibuja: sobra con el teclado
    const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (!touch) return;
    pad.hidden = false;

    const DIRS = { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight" };
    let active = null, cx = 0, cy = 0, radius = 1;

    const release = () => {
      Object.values(DIRS).forEach(k => { keys[k] = false; });
      knob.style.transform = "";
      pad.classList.remove("grabbed");
      active = null;
    };
    const aim = (px, py) => {
      const dx = px - cx, dy = py - cy;
      const d = Math.hypot(dx, dy);
      // la bola no se sale del aro
      const cap = Math.min(d, radius) || 0;
      const ux = d ? dx/d : 0, uy = d ? dy/d : 0;
      knob.style.transform = `translate(${ux*cap}px, ${uy*cap}px)`;
      Object.values(DIRS).forEach(k => { keys[k] = false; });
      if (d < radius * JOY_DEAD) return;
      // una sola dirección a la vez: el mapa es una rejilla, no un plano libre
      if (Math.abs(dx) > Math.abs(dy)) keys[dx > 0 ? DIRS.right : DIRS.left] = true;
      else keys[dy > 0 ? DIRS.down : DIRS.up] = true;
    };

    pad.addEventListener("pointerdown", e => {
      e.preventDefault();
      if (Dialog.open){ advanceDialog(); return; }
      const r = pad.getBoundingClientRect();
      cx = r.left + r.width/2; cy = r.top + r.height/2;
      // recorrido de la bola: hasta el aro menos su propio radio (44%/2), en
      // proporción, para que valga igual sea cual sea el tamaño del pad
      radius = r.width * 0.28;
      active = e.pointerId;
      pad.classList.add("grabbed");
      pad.setPointerCapture(e.pointerId);
      aim(e.clientX, e.clientY);
    });
    pad.addEventListener("pointermove", e => {
      if (active !== e.pointerId) return;
      e.preventDefault();
      aim(e.clientX, e.clientY);
    });
    ["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
      pad.addEventListener(ev, e => { if (active === e.pointerId) release(); }));
    // si la pantalla cambia de mano o se pierde el foco, soltar
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", () => { if (document.hidden) release(); });
  }

  // Frame del personaje (con la skin activa) para UI de batalla/topbar
  function playerFrameURL(row=0){
    try {
      const skin = State.get().activeSkin;
      const ss = sheetSkins[skin];
      if (ss && ss.ready) return (row === 2 ? ss.back[0] : ss.front[0]).toDataURL();
      const pair = playerChars(skin);
      return (row === 2 ? pair.back : pair.front).toDataURL();
    } catch(e){ return null; }
  }

  // Frame frontal de una skin con hoja (para previsualizarla en la tienda)
  function sheetFrameURL(skin){
    const ss = sheetSkins[skin];
    return (ss && ss.ready) ? ss.front[0].toDataURL() : null;
  }

  function debug(){
    return {
      mode,
      player: { x:player.x, y:player.y, moving:player.moving, dir:player.dir },
      keys: Object.keys(keys).filter(k=>keys[k]),
      ready, started, dialogOpen: Dialog.open,
      props3d: envPropsCount, batches: envAssetsCount, gardenMeshes: gardenCount,
      relief: heightMap ? +Math.max.apply(null, Array.from(heightMap)).toFixed(2) : 0,
      npcs: npcsCur.map(n=>({name:n.name.split(" ")[0], x:n.x, y:n.y, moving:n.moving})),
    };
  }

  /* Inventario de puertas y puntos clave del overworld, para que
     tools/check_region.mjs pueda comprobar por BFS que se llega a todos. */
  /* Radiografía de la región entera (no solo de la zona cargada), para que
     tools/check_region.mjs pueda comprobar por BFS que todo es alcanzable y
     que ninguna frontera entre zonas se quedó sellada. */
  function regionInfo(){
    if (!region) return { doors: [], zones: [] };
    const doors = [];
    for (let y=0;y<region.H;y++) for (let x=0;x<region.W;x++){
      const m = region.meta[y][x];
      if (!m) continue;
      const z = zoneAt(x, y);
      const at = { x, y, zone: ZONE_NAMES[z.j][z.i] };
      if (m.type === "gymdoor") doors.push({ what:"gimnasio " + m.key, ...at });
      else if (m.type === "cavedoor" && x % 2 === 1) doors.push({ what:"cueva", ...at });
      else if (m.type === "fishspot") doors.push({ what:"muelle de pesca", ...at });
      else if (["shopdoor","casadoor","alcaldiadoor","cafedoor","academiadoor","norebangdoor"]
        .includes(m.type)) doors.push({ what: m.type.replace("door",""), ...at });
    }
    // rejilla transitable de la región, para el BFS del validador
    const walk = [];
    for (let y=0;y<region.H;y++){
      let row = "";
      for (let x=0;x<region.W;x++) row += region.solid[y][x] ? "#" : ".";
      walk.push(row);
    }
    // calzada tapada por algo (un edificio encima corta la ruta de acceso)
    const blockedRoad = [];
    roadTiles.forEach(k => {
      const [x, y] = k.split(",").map(Number);
      if (region.solid[y]?.[x]) blockedRoad.push({ x, y });
    });
    /* Edificios a caballo entre dos zonas: el ancla se dibuja en una y los
       muros bloquean en la otra, así que del lado sin ancla queda un muro
       invisible. */
    const straddling = [];
    for (let y=0;y<region.H;y++) for (let x=0;x<region.W;x++){
      const d = region.decor[y][x];
      if (!d || !HOUSE_VARIANT[d.sprite]) continue;
      const a = zoneAt(x, y), b = zoneAt(x+5, y+7);
      if (a.i !== b.i || a.j !== b.j) straddling.push({ x, y, sprite:d.sprite });
    }
    return {
      W: region.W, H: region.H, mode, doors, walk,
      blockedRoad, straddling,
      cols: ZONE_COLS, rows: ZONE_ROWS,
      zone: { ...curZone, name: ZONE_NAMES[curZone.j][curZone.i] },
      player: toGlobal(player.x, player.y),
    };
  }

  // salidas abiertas de la zona cargada, por lado
  function zoneExits(){
    const out = [];
    for (let y=0;y<MH;y++) for (let x=0;x<MW;x++){
      const m = meta[y][x];
      if (m && m.type === "zoneExit") out.push({ x, y, dx:m.dx, dy:m.dy });
    }
    return out;
  }
  function debugZone(i, j){
    if (!region || mode !== "over") return false;
    loadZone(i, j, ZONE_COLS[i] + 4, ZONE_ROWS[j] + 4);
    return true;
  }

  // teleport (debug/trucos)
  function tp(x,y){
    if (solid[y]?.[x]) return false;
    player.x=player.tx=x; player.y=player.ty=y;
    player.px=x*TILE; player.py=y*TILE;
    player.moving=false;
    petTeleport();
    return true;
  }

  // hook de pruebas: permite entrar a interiores sin interacción
  function debugEnter(name){
    const table = { shop:enterShop, cafe:enterCafe, academia:enterAcademia,
      norebang:enterNorebang, home:enterHome, alcaldia:enterAlcaldia,
      gym:()=>enterInterior(true), cave:enterCave, exit:exitMap };
    const fn = table[name];
    if (!fn) return false;
    fn();
    return true;
  }

  return { start, debug, debugEnter, playerFrameURL, sheetFrameURL, tp, regionInfo, zoneExits, debugZone, respawn, musicTheme };
})();
