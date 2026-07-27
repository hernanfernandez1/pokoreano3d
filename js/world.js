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

  const OW = { W:96, H:72 };

  const gymHouses = [
    { key:"hangul",     x: 10, y: 8,  sprite:"house" },  // pradera NO
    { key:"numeros",    x: 34, y: 6,  sprite:"barn"  },  // pradera N
    { key:"particulas", x: 66, y: 12, sprite:"house" },  // bosque O
    { key:"verbos",     x: 84, y: 22, sprite:"barn"  },  // bosque profundo
    { key:"honor",      x: 72, y: 48, sprite:"house" },  // SE, cerca de la costa
    { key:"topik1",     x: 34, y: 50, sprite:"barn"  },  // costa (puerta a la playa)
    { key:"topik2",     x: 10, y: 36, sprite:"house" },  // pradera O
    // "maestro" vive dentro de la cueva (bioma bosque, NE)
  ];

  // ---------- Overworld NPCs (wander around home) ----------
  const npcsOver = [
    {
      key:"abuela", name:"할머니 (Abuela)", x:33, y:25, dir:0, tint:"#a259ff", hair:"gray", long:true, wander:true,
      lines:[
        { ko:"안녕하세요! 반가워요.", rom:"annyeonghaseyo! bangawoyo.", es:"¡Hola! Encantada de verte." },
        { ko:"한국어 공부는 재미있어요?", rom:"hangugeo gongbuneun jaemiisseoyo?", es:"¿Es divertido estudiar coreano?" },
        { ko:"화이팅!", rom:"hwaiting!", es:"¡Ánimo!" },
      ]
    },
    {
      key:"nino", name:"아이 (Niño)", x:24, y:21, dir:0, tint:"#06d6a0", hair:"black", wander:true,
      lines:[
        { ko:"저는 학생이에요.", rom:"jeoneun haksaeng-ieyo.", es:"Yo soy estudiante." },
        { ko:"너는 이름이 뭐예요?", rom:"neoneun ireumi mwoyeyo?", es:"¿Cómo te llamas?" },
        { ko:"체육관은 저기에 있어요!", rom:"cheyukgwaneun jeogie isseoyo!", es:"¡El gimnasio está por allí!" },
      ]
    },
    {
      key:"vendedor", name:"상인 (Vendedor)", x:31, y:47, dir:0, tint:"#f4a261", wander:true,
      lines:[
        { ko:"어서 오세요!", rom:"eoseo oseyo!", es:"¡Bienvenido!" },
        { ko:"이거 얼마예요? 천 원이에요.", rom:"igeo eolmayeyo? cheon won-ieyo.", es:"¿Cuánto cuesta esto? Son mil wones." },
        { ko:"감사합니다. 또 오세요!", rom:"gamsahamnida. tto oseyo!", es:"Gracias. ¡Vuelve pronto!" },
      ]
    },
    {
      key:"pescador", name:"낚시꾼 (Pescador)", x:16, y:57, dir:0, tint:"#3fa9f5", hair:"black", wander:false,
      lines:[
        { ko:"물고기를 좋아해요?", rom:"mulgogireul joahaeyo?", es:"¿Te gustan los peces?" },
        { ko:"이 호수에는 물고기가 많아요.", rom:"i hosueneun mulgogiga manayo.", es:"En este lago hay muchos peces." },
        { ko:"물하고 불을 혼동하지 마세요!", rom:"mulhago bureul hondonghaji maseyo!", es:"물 (mul) es agua, 불 (bul) es fuego. ¡No los confundas!" },
      ]
    },
    {
      key:"monje", name:"스님 (Monje)", x:58, y:49, dir:0, tint:"#8d6e63", hair:"bald", wander:true,
      lines:[
        { ko:"천천히 하세요.", rom:"cheoncheonhi haseyo.", es:"Hazlo despacio (con calma)." },
        { ko:"매일 조금씩 공부하세요.", rom:"maeil jogeumssik gongbuhaseyo.", es:"Estudia un poco cada día." },
        { ko:"그러면 마스터가 될 거예요.", rom:"geureomyeon maseutoga doel geoyeyo.", es:"Así llegarás a ser un maestro." },
      ]
    },
    {
      key:"guardia", name:"경비원 (Guardia)", x:75, y:10, dir:0, tint:"#e63946", hair:"black", wander:false,
      lines:[
        { ko:"이 동굴 안에 마스터 체육관이 있어요.", rom:"i donggul ane maseuteo cheyukgwani isseoyo.", es:"Dentro de esta cueva está el Gimnasio Maestro." },
        { ko:"메달 일곱 개가 필요해요!", rom:"medal ilgop gaega piryohaeyo!", es:"¡Necesitas siete medallas!" },
        { ko:"동굴에는 도깨비가 살아요… 조심하세요!", rom:"donggureneun dokkaebiga sarayo... josimhaseyo!", es:"En la cueva viven dokkaebi… ¡ten cuidado!" },
      ]
    },
    {
      key:"granjero", name:"농부 (Granjero)", x:45, y:12, dir:0, tint:"#90be6d", hair:"blond", wander:true,
      lines:[
        { ko:"오늘 날씨가 좋아요!", rom:"oneul nalssiga joayo!", es:"¡Hoy hace buen tiempo!" },
        { ko:"저는 밭에서 일해요.", rom:"jeoneun bateseo ilhaeyo.", es:"Yo trabajo en el campo." },
        { ko:"사과 하나 먹을래요?", rom:"sagwa hana meogeullaeyo?", es:"¿Quieres comer una manzana?" },
      ]
    },
    {
      key:"fan", name:"팬 (Fan de K-pop)", x:66, y:56, dir:0, tint:"#ff70a6", hair:"pink", long:true, wander:true,
      lines:[
        { ko:"음악을 좋아해요?", rom:"eumageul joahaeyo?", es:"¿Te gusta la música?" },
        { ko:"콘서트에 가고 싶어요!", rom:"konseoteue gago sipeoyo!", es:"¡Quiero ir a un concierto!" },
        { ko:"같이 노래해요!", rom:"gachi noraehaeyo!", es:"¡Cantemos juntos!" },
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
    for (let y=3;y<52;y+=3){ putTree(0,y); putTree(MW-2,y); }

    // BIOMA COSTA (sur): mar abierto + playa ancha
    for (let y=62;y<MH;y++) for (let x=0;x<MW;x++){ ground[y][x]="water"; solid[y][x]=true; }
    for (let y=54;y<62;y++) for (let x=2;x<MW-2;x++){
      if (!solid[y][x] && ground[y][x]!=="water") ground[y][x]="sand";
    }

    // río (x 48-50) que baja hasta el mar
    for (let y=2;y<62;y++) for (let x=48;x<51;x++){ ground[y][x]="water"; solid[y][x]=true; }

    // lago de la pradera
    for (let y=28;y<34;y++) for (let x=14;x<21;x++){ ground[y][x]="water"; solid[y][x]=true; }

    // caminos (blob autotile)
    const pathH = (y) => { for (let x=2;x<MW-2;x++){ if (!solid[y][x]) ground[y][x]="path"; if (!solid[y+1][x]) ground[y+1][x]="path"; } };
    const pathV = (x,y0,y1) => { for (let y=y0;y<y1;y++){ if (!solid[y][x]) ground[y][x]="path"; if (!solid[y][x+1]) ground[y][x+1]="path"; } };
    pathH(20); pathH(46);
    pathV(30,2,54); pathV(62,2,54);
    // puentes de madera sobre el río (E-O)
    [20, 46].forEach(cy => {
      for (let x=48;x<=50;x++){
        ground[cy-1][x]="briT"; ground[cy][x]="briM"; ground[cy+1][x]="briB";
        solid[cy-1][x]=false; solid[cy][x]=false; solid[cy+1][x]=false;
      }
    });

    // árboles dispersos por la pradera y la costa alta
    [[8,14],[20,10],[26,16],[40,10],[14,22],[24,26],[40,30],[10,42],[24,43],[42,40],
     [6,30],[34,36],[44,22],[18,34],[36,16],[6,50],[26,50],[44,50],[56,38],[70,42],
     [86,43],[90,34],[56,50],[80,50],[12,50]]
      .forEach(([x,y]) => putTree(x,y));

    // BIOMA BOSQUE (NE): denso, con claro hacia la cueva y corredores en los caminos
    for (let fy=3; fy<32; fy+=4){
      for (let fx=56; fx<92; fx+=5){
        const jx = fx + (Math.random()*3|0), jy = fy + (Math.random()*2|0);
        if (jx>=72 && jx<=84 && jy<=20) continue;       // claro de la cueva
        if (jy>=18 && jy<=21) continue;                 // corredor del camino y=20
        if (jx>=60 && jx<=63) continue;                 // corredor del camino x=62
        if (decor[jy]?.[jx]) continue;
        putTree(jx,jy);
      }
    }
    // matas entre los árboles del bosque
    for (let i=0;i<40;i++){
      const x = 56 + (Math.random()*36|0), y = 3 + (Math.random()*29|0);
      if (!solid[y]?.[x] && !meta[y]?.[x] && !decor[y]?.[x] && ground[y][x]==="grass") ground[y][x]="tallgrass";
    }
    // matas dispersas en pradera/costa
    for (let i=0;i<30;i++){
      const x = 4 + (Math.random()*44|0), y = 4 + (Math.random()*48|0);
      if (!solid[y]?.[x] && !meta[y]?.[x] && !decor[y]?.[x] && ground[y][x]==="grass") ground[y][x]="tallgrass";
    }

    gymHouses.forEach(g => putHouse(g));

    // TIENDA (junto al cruce de caminos)
    putShop(38, 12);

    // CASA DE KAROL (base, en la pradera noroeste)
    putHome(18, 10);

    // Entrada a la CUEVA (claro del bosque, NE)
    putCaveEntrance(76, 6);

    // PUERTA DEL PUEBLO (arco al oeste, sobre el camino y=20)
    decor[18][3] = { sprite:"caveDoor", pueblo:true };
    for (let dy=0;dy<2;dy++) for (let dx=0;dx<4;dx++){
      if (solid[18+dy]?.[3+dx] === undefined) continue;
      solid[18+dy][3+dx]=true; meta[18+dy][3+dx]=null;
    }
    [4,5].forEach(x => { solid[19][x]=false; meta[19][x]={type:"pueblodoor"}; });

    // MUELLE DE PESCA (puente vertical hacia el mar, 3 tiles de ancho)
    for (let y=59;y<=66;y++){
      ground[y][23]="pierL"; ground[y][24]="pierM"; ground[y][25]="pierR";
      [23,24,25].forEach(x => { solid[y][x]=false; meta[y][x]=null; });
    }
    meta[66][24] = { type:"fishspot" };

    // CASA DEL MAR (asset 3D en la playa, al este del muelle; el modelo 3D
    // se añade en buildSeaHouse — aquí solo reservamos su huella sólida)
    for (let y=55;y<=61;y++) for (let x=27;x<=33;x++){ solid[y][x]=true; meta[y][x]=null; }

    // CORRAL del granjero (cerca con animales)
    for (let x=42;x<=48;x++){ ground[9][x] = x===42?"fenceTL":(x===48?"fenceTR":"fenceH"); solid[9][x]=true; }
    for (let x=42;x<=48;x++){ if (x===45) continue; ground[14][x] = x===42?"fenceBL":(x===48?"fenceBR":"fenceH"); solid[14][x]=true; }
    for (let y=10;y<14;y++){ ground[y][42]="fenceV"; solid[y][42]=true; ground[y][48]="fenceV"; solid[y][48]=true; }
    spawnAnimals();

    // COFRES escondidos (monedas)
    [[6,6,"c1"],[90,50,"c2"],[68,32,"c3"],[8,58,"c4"],[90,8,"c5"]].forEach(([x,y,id]) => {
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
    for (let i=0;i<26;i++) tryBush("pradera", 4+(Math.random()*44|0), 4+(Math.random()*46|0));
    for (let i=0;i<20;i++) tryBush("bosque", 54+(Math.random()*38|0), 3+(Math.random()*30|0));
    for (let i=0;i<18;i++) tryBush("costa", 3+(Math.random()*90|0), 54+(Math.random()*8|0));

    npcsCur = npcsOver;
    npcsCur.forEach(n => { solid[n.y][n.x]=true; meta[n.y][n.x]={type:"npc",npc:n}; });

    grassPatches = [
      { x:16, y:4,  w:8, h:4, pool: Data.routes[0].pool },  // NO (hangul)
      { x:38, y:5,  w:7, h:4, pool: Data.routes[1].pool },  // N (numeros)
      { x:86, y:26, w:6, h:5, pool: Data.routes[2].pool },  // E bosque (verbos)
      { x:66, y:44, w:7, h:4, pool: Data.routes[3].pool },  // SE (honor)
      { x:20, y:48, w:8, h:4, pool: Data.routes[4].pool },  // S (topik1)
      { x:4,  y:20, w:5, h:7, pool: Data.routes[5].pool },  // O (topik2)
      { x:36, y:32, w:6, h:5, pool: Data.routes[2].pool },  // centro
      { x:54, y:34, w:6, h:4, pool: Data.routes[1].pool },  // centro-este
      { x:8,  y:44, w:7, h:3, pool: Data.routes[5].pool },  // SO
      { x:76, y:14, w:6, h:4, pool: Data.routes[3].pool },  // claro de la cueva
    ];
    grassPatches.forEach(p => {
      for (let y=p.y;y<p.y+p.h;y++) for (let x=p.x;x<p.x+p.w;x++){
        if (!solid[y]?.[x] && !meta[y]?.[x]) { ground[y][x]="tallgrass"; meta[y][x]={type:"grass",pool:p.pool}; }
      }
    });

    spawnButterflies();
    mode = "over";
    sceneDirty = true;
  }

  function putTree(x,y){
    if (y+1>=MH || x+1>=MW) return;
    decor[y][x] = { sprite:"tree" };
    // sólo el tronco bloquea (2x2 abajo al centro)
    for (let dy=2;dy<5;dy++) for (let dx=1;dx<3;dx++){
      if (solid[y+dy]?.[x+dx] !== undefined) solid[y+dy][x+dx]=true;
    }
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
    clearTreesRect(x-4, y-5, x+7, y+9);
    const d = { sprite }; if (tag) d[tag]=true;
    decor[y][x] = d;
    for (let dy=4;dy<8;dy++) for (let dx=0;dx<6;dx++){
      if (solid[y+dy] === undefined || solid[y+dy][x+dx] === undefined) continue;
      solid[y+dy][x+dx]=true; meta[y+dy][x+dx]=null;
    }
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
    const W=11, H=8;
    MW=W; MH=H;
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
    for (let x=0;x<W;x++){ if (x!==5){ ground[H-1][x]="wallTop"; solid[H-1][x]=true; } }
    // mostrador + tendero
    for (let x=4;x<7;x++) ground[3][x]="rug";
    const keeper = initNpc({
      key:"tendero", name:"주인 아저씨 (Tendero)", x:5, y:3, dir:0, tint:"#f4a261", hair:"black",
      wander:false, isShop:true,
      lines:[
        { ko:"어서 오세요! 뭐 드릴까요?", rom:"eoseo oseyo! mwo deurilkkayo?", es:"¡Bienvenida! ¿Qué te doy?" },
      ]
    });
    npcsCur = [keeper];
    solid[keeper.y][keeper.x]=true;
    meta[keeper.y][keeper.x]={type:"npc", npc:keeper};
    // salida
    ground[H-1][5]="exitMat"; solid[H-1][5]=false;
    meta[H-1][5]={type:"exit"};

    player.x=player.tx=5; player.y=player.ty=H-2;
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
  function buildPueblo(){
    const W=34, H=24;
    MW=W; MH=H;
    ground=[]; solid=[]; meta=[]; decor=[];
    for (let y=0;y<H;y++){
      ground[y]=[]; solid[y]=[]; meta[y]=[]; decor[y]=[];
      for (let x=0;x<W;x++){
        const r = Math.random();
        ground[y][x] = r<0.9 ? "grass" : (r<0.94 ? "flower" : (r<0.97 ? "tuft" : "flower2"));
        solid[y][x]=false; meta[y][x]=null; decor[y][x]=null;
      }
    }
    // borde con árboles
    for (let y=0;y<H;y++) for (let x=0;x<W;x++){
      if (x<2 || y<2 || x>=W-2 || y>=H-2) solid[y][x]=true;
    }
    for (let x=0;x<W-1;x+=3){ if (x<15 || x>19) putTree(x,H-4); }
    for (let y=2;y<H-4;y+=4){ putTree(0,y); putTree(W-4,y); }

    // calle principal (cruz) + plaza con fuente
    for (let x=2;x<W-2;x++){ ground[15][x]="path"; ground[16][x]="path"; }
    for (let y=8;y<H-2;y++){ ground[y][16]="path"; ground[y][17]="path"; }
    for (let y=12;y<19;y++) for (let x=13;x<21;x++) ground[y][x]="path";
    decor[12][15] = { sprite:"fountain" };
    for (let dy=0;dy<3;dy++) for (let dx=0;dx<3;dx++) solid[12+dy][15+dx]=true;
    decor[10][12] = { sprite:"lamp" };  solid[12][12]=true;
    decor[10][21] = { sprite:"lamp" };  solid[12][21]=true;

    const placeBuilding = (spr, x, y, doorType, extra) => {
      decor[y][x] = Object.assign({ sprite:spr }, extra||{});
      for (let dy=4;dy<8;dy++) for (let dx=0;dx<6;dx++){
        if (solid[y+dy]?.[x+dx] === undefined) continue;
        solid[y+dy][x+dx]=true; meta[y+dy][x+dx]=null;
      }
      if (doorType){
        solid[y+7][x+2]=false; meta[y+7][x+2]={type:doorType};
        if (y+8<H){ solid[y+8][x+2]=false; ground[y+8][x+2]="path"; meta[y+8][x+2]=null; }
      }
    };

    // ALCALDÍA (norte centro)
    placeBuilding("houseG", 14, 0, "alcaldiadoor", { alcaldia:true });
    // CAFÉ (oeste)
    placeBuilding("house", 4, 3, "cafedoor", { cafe:true });
    // ACADEMIA (este)
    placeBuilding("barn", 24, 3, "academiadoor", { academia:true });
    // casa decorativa + NOREBANG (karaoke 노래방)
    placeBuilding("house", 4, 15);
    placeBuilding("barn", 24, 15, "norebangdoor", { norebang:true });

    // NPCs del pueblo
    const npcs = [];
    npcs.push(initNpc({
      key:"vecina", name:"이웃 (Vecina)", x:12, y:18, dir:0, tint:"#7fd8ff", hair:"black", long:true, wander:true,
      lines:[
        { ko:"우리 마을에 온 걸 환영해요!", rom:"uri maeure on geol hwanyeonghaeyo!", es:"¡Bienvenida a nuestro pueblo!" },
        { ko:"카페하고 학원도 가 보세요.", rom:"kapehago hagwondo ga boseyo.", es:"Visita también el café y la academia." },
      ]
    }));
    npcs.push(initNpc({
      key:"ninoPueblo", name:"소년 (Niño)", x:21, y:18, dir:0, tint:"#06d6a0", hair:"black", wander:true,
      lines:[
        { ko:"학원에서 한국어를 배워요.", rom:"hagwoneseo hangugeoreul baewoyo.", es:"En la academia se aprende coreano." },
        { ko:"재미있어요!", rom:"jaemiisseoyo!", es:"¡Es divertido!" },
      ]
    }));
    npcs.push(initNpc({
      key:"abueloPueblo", name:"할아버지 (Abuelo)", x:20, y:9, dir:0, tint:"#c8a27a", hair:"gray", wander:false,
      lines:[
        { ko:"천천히 걸으세요.", rom:"cheoncheonhi georeuseyo.", es:"Camina con calma." },
        { ko:"우리 마을은 평화로워요.", rom:"uri maeureun pyeonghwarowoyo.", es:"Nuestro pueblo es tranquilo." },
      ]
    }));
    // la rival de pronunciación (junto al norebang)
    npcs.push(initNpc({
      key:"rival", name:"리나 (Rina, rival)", x:22, y:20, dir:0, tint:"#b14aed", hair:"pink", long:true,
      wander:false, action:"duel", actionLabel:"🎤 ¡duelo de pronunciación!",
      lines:[
        { ko:"내 발음이 제일 좋아!", rom:"nae bareumi jeil joa!", es:"¡Mi pronunciación es la mejor!" },
        { ko:"나랑 대결할래?", rom:"narang daegyeolhallae?", es:"¿Quieres un duelo conmigo?" },
      ]
    }));
    npcsCur = npcs;
    npcs.forEach(n => { solid[n.y][n.x]=true; meta[n.y][n.x]={type:"npc",npc:n}; });

    // salida al sur
    [16,17].forEach(x => { ground[H-1][x]="path"; solid[H-1][x]=false; meta[H-1][x]={type:"exit"}; ground[H-2][x]="path"; solid[H-2][x]=false; });

    player.x=player.tx=16; player.y=player.ty=H-2;
    player.px=player.x*TILE; player.py=player.y*TILE;
    player.dir=2;
    mode="pueblo";
    petTeleport();
    sceneDirty = true;
  }
  function enterPueblo(){
    pushMap();
    Sfx.play("door");
    buildPueblo();
  }

  // ---------- Helper: habitación interior simple ----------
  function buildRoom(W, H, npc, modeName, floorTiles){
    MW=W; MH=H;
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
    if (floorTiles) floorTiles();

    npc.x = doorX; npc.y = 3;
    initNpc(npc);
    npcsCur = [npc];
    solid[npc.y][npc.x]=true;
    meta[npc.y][npc.x]={type:"npc",npc};

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
    buildRoom(11, 8, {
      key:"barista", name:"바리스타 (Barista)", dir:0, tint:"#c86b3c", hair:"black",
      wander:false, action:"cafe", actionLabel:"☕ ver el menú",
      lines:[
        { ko:"카페에 오신 걸 환영해요!", rom:"kapee osin geol hwanyeonghaeyo!", es:"¡Bienvenida al café!" },
        { ko:"뭐 주문하시겠어요?", rom:"mwo jumunhasigesseoyo?", es:"¿Qué desea ordenar?" },
      ]
    }, "cafe");
  }
  function enterCafe(){ pushMap(); Sfx.play("door"); buildCafe(); }

  // ---------- Academia (학원) ----------
  function buildAcademia(){
    buildRoom(13, 9, {
      key:"maestra", name:"선생님 (Maestra)", dir:0, tint:"#4361ee", hair:"black", long:true,
      wander:false, action:"class", actionLabel:"📚 tomar clase",
      lines:[
        { ko:"학원에 오신 걸 환영해요!", rom:"hagwone osin geol hwanyeonghaeyo!", es:"¡Bienvenida a la academia!" },
        { ko:"오늘 복습할까요?", rom:"oneul bokseuphalkkayo?", es:"¿Repasamos hoy?" },
      ]
    }, "academia");
  }
  function enterAcademia(){ pushMap(); Sfx.play("door"); buildAcademia(); }

  // ---------- Norebang (노래방 · karaoke) ----------
  function buildNorebang(){
    buildRoom(11, 8, {
      key:"dj", name:"디제이 (DJ)", dir:0, tint:"#ff70a6", hair:"pink",
      wander:false, action:"karaoke", actionLabel:"🎤 ¡a cantar!",
      lines:[
        { ko:"노래방에 오신 걸 환영해요!", rom:"noraebange osin geol hwanyeonghaeyo!", es:"¡Bienvenida al karaoke!" },
        { ko:"마이크 준비됐어요?", rom:"maikeu junbidwaesseoyo?", es:"¿Lista con el micrófono?" },
      ]
    }, "norebang");
  }
  function enterNorebang(){ pushMap(); Sfx.play("door"); buildNorebang(); }

  // ---------- Casa de Karol (집) ----------
  function buildHome(){
    buildRoom(11, 8, {
      key:"gato_casa", name:"고양이 (Gato)", dir:0, tint:"#e8a24a", hair:"black",
      wander:true, action:null, actionLabel:"✕ cerrar",
      lines:[
        { ko:"야옹~ 집이 최고예요.", rom:"yaong~ jibi choegoyeyo.", es:"Miau~ el hogar es lo mejor." },
      ]
    }, "casa", () => {
      // punto de guardado + cama
      meta[3][2] = { type:"save" };
      ground[3][2] = "rug";
    });
    Sfx.play("ok");
  }
  function enterHome(){ pushMap(); Sfx.play("door"); buildHome(); }

  // ---------- Alcaldía (interior) ----------
  function buildAlcaldia(){
    const W=13, H=9;
    MW=W; MH=H;
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
    for (let x=0;x<W;x++){ if (x!==6){ ground[H-1][x]="wallTop"; solid[H-1][x]=true; } }
    for (let x=5;x<8;x++) ground[3][x]="rug";

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
      key:"alcalde", name:"시장님 (Alcaldesa)", x:6, y:3, dir:0,
      tint:"#a259ff", hair:"gray", long:true, wander:false, lines,
    });
    npcsCur = [alcaldesa];
    solid[alcaldesa.y][alcaldesa.x]=true;
    meta[alcaldesa.y][alcaldesa.x]={type:"npc",npc:alcaldesa};

    ground[H-1][6]="exitMat"; solid[H-1][6]=false;
    meta[H-1][6]={type:"exit"};

    player.x=player.tx=6; player.y=player.ty=H-2;
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
    const W=13, H=10;
    MW=W; MH=H;
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
    for (let x=0;x<W;x++){ ground[H-1][x] = x===6 ? ground[H-1][x] : "wallTop"; solid[H-1][x] = x!==6; }
    // rug in front of leader
    for (let y=4;y<6;y++) for (let x=5;x<8;x++) ground[y][x]="rug";
    // exit mat bottom center
    const ex=6, ey=H-1;
    ground[ey][ex]="exitMat"; solid[ey][ex]=false;
    meta[ey][ex]={type:"exit"};

    // leader NPC
    const leader = initNpc({
      name:`${gym.leader} — ${gym.name}`,
      x:6, y:3, dir:0, tint:"#ffd166", hair:"black", wander:false, isLeaderOf:gym,
      lines:[
        { ko:`안녕하세요! 저는 ${gym.leader}입니다.`, rom:"annyeonghaseyo! jeoneun ... imnida.", es:`¡Hola! Yo soy ${gym.leader}.` },
        { ko:"준비됐어요? 시험을 시작할까요?", rom:"junbidwaesseoyo? siheomeul sijakhalkkayo?", es:`¿Listo? ${gym.description} ¡Empecemos el examen!` },
      ]
    });
    npcsCur = [leader];
    solid[leader.y][leader.x]=true;
    meta[leader.y][leader.x]={type:"npc", npc:leader};

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
    Sfx.play("door");
    const px = st.pos.x;
    const py = (st.pos.y+1 < MH && !solid[st.pos.y+1]?.[px]) ? st.pos.y+1 : st.pos.y;
    player.x=player.tx=px; player.y=player.ty=py;
    player.px=px*TILE; player.py=py*TILE;
    player.dir=0;
    petTeleport();
    sceneDirty = true;
  }

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
    put("cow", 44, 11, 2); put("pig", 46, 12, 2); put("chicken", 43, 12, 2); put("sheep", 46, 10, 2);
    // libres por la pradera
    put("sheep", 18, 26, 3); put("chicken", 26, 36, 3); put("cow", 12, 22, 3);
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
    const zones = [
      { x:8,  y:14, w:40, h:24, n:4 },  // pradera
      { x:8,  y:48, w:40, h:14, n:3 },  // costa
      { x:58, y:6,  w:32, h:24, n:2 },  // bosque
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
    x:30, y:21, px:30*TILE, py:21*TILE,
    dir:0, frame:0, animT:0,
    moving:false, tx:30, ty:21, speed:1.5,
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

  function onArrive(){
    const s = State.get();
    if (mode==="over") s.playerPos = { x:player.x, y:player.y };
    const m = meta[player.y][player.x];
    if (!m) return;
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
    } else if (m.type==="pueblodoor"){
      enterPueblo();
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
    playerVis = null; petVis = null; waterMat = null; waterTexA = null; waterTexB = null;
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

  // ---------- sprite real de Karol (hoja embebida en js/karol.js) ----------
  // La skin "clásico" usa el sprite auténtico de Karol; el resto de skins
  // siguen recoloreando al personaje de papel como antes.
  const karol = { ready: false, frames: [] }; // 4 frames de frente con borde blanco
  (function loadKarol(){
    if (typeof KAROL_SHEET !== "string") return;
    const img = new Image();
    img.onload = () => {
      const FW = img.width/4, FH = img.height/4;
      for (let f = 0; f < 4; f++){
        const c = document.createElement("canvas"); c.width = FW; c.height = FH;
        const x = c.getContext("2d");
        x.imageSmoothingEnabled = false;
        x.drawImage(img, f*FW, 0, FW, FH, 0, 0, FW, FH); // fila 0 = de frente
        karol.frames.push(Paper.outline(c, 7));
      }
      karol.ready = true;
      swapPlayerToKarol(); // por si la escena ya estaba construida
    };
    img.src = KAROL_SHEET;
  })();
  function swapPlayerToKarol(){
    if (!playerVis || !karol.ready || playerVis.skin !== "clásico") return;
    playerVis.karolTex = karol.frames.map(f => own(Paper.canvasTex(f)));
    playerVis.texF = playerVis.texB = playerVis.karolTex[0];
    playerVis.mat.map = playerVis.karolTex[0];
    playerVis.mat.needsUpdate = true;
    // si la UI (batalla/topbar) ya dibujó al personaje con el fallback, refrescarla
    try {
      const url = karol.frames[0].toDataURL();
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
  let waterMat = null, waterTexA = null, waterTexB = null, waterT = 0, waterPhase = false;

  // ---------- horneado del suelo ----------
  const PPS = 20;
  const GCOL = {
    grass: ["#7ecb54","#77c34e","#84d35b","#79c950"],
    grassDot: "#5ea843",
    tall: "#4e9e52", tallDark:"#3b8242",
    sand: "#f2d49b", sandDot:"#e8c88a",
    path: "#dcae7e", pathDot:"#cf9f6e",
    waterDeep: "#2f7fc4",
    floorA:"#e8d9b8", floorB:"#dfcaa4",
    caveA:"#6a6478", caveB:"#736c80", caveWall:"#453f55",
    wallIn:"#b8a888",
    dirt: "#b09468",
  };
  function hsh(x, y){ return ((x*73856093) ^ (y*19349663)) >>> 0; }
  const isWaterish = n => n === undefined || n === "water" || (typeof n === "string" && (n.indexOf("bri")===0 || n.indexOf("pier")===0));
  const isSandLike = n => n === undefined || n==="sand" || n==="bushSand" || n==="path" || isWaterish(n);
  const isPathLike = n => n === undefined || n==="path" || n==="sand" || isWaterish(n) || n==="dirtA";

  function tileBaseColor(name, tx, ty){
    const h = hsh(tx, ty);
    if (name === undefined) return GCOL.grass[0];
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
    return GCOL.grass[h % 4]; // grass, flower*, tuft, mush, rock, bush, chest, fence*
  }

  function bakeGroundCanvas(){
    const c = document.createElement("canvas");
    c.width = MW*PPS; c.height = MH*PPS;
    const x = c.getContext("2d");
    // base
    for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
      const name = ground[ty][tx];
      x.fillStyle = tileBaseColor(name, tx, ty);
      x.fillRect(tx*PPS, ty*PPS, PPS, PPS);
      const h = hsh(tx, ty);
      // motitas de textura
      if (["grass","flower","flower2","flower3","tuft","mush","rock","bush","chest"].includes(name)){
        x.fillStyle = GCOL.grassDot;
        x.globalAlpha = 0.5;
        x.fillRect(tx*PPS + (h%13)+2, ty*PPS + ((h>>4)%13)+2, 2, 2);
        x.fillRect(tx*PPS + ((h>>8)%15)+1, ty*PPS + ((h>>12)%15)+1, 2, 2);
        x.globalAlpha = 1;
      } else if (name === "tallgrass"){
        x.strokeStyle = GCOL.tallDark; x.lineWidth = 1.6; x.lineCap = "round";
        for (let i=0;i<4;i++){
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
    // espuma del agua
    for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
      if (ground[ty][tx] !== "water") continue;
      const edges = [
        [!isWaterish(ground[ty-1]?.[tx]), tx*PPS, ty*PPS+2, PPS, 0],
        [!isWaterish(ground[ty+1]?.[tx]), tx*PPS, ty*PPS+PPS-2, PPS, 0],
        [!isWaterish(ground[ty]?.[tx-1]), tx*PPS+2, ty*PPS, 0, PPS],
        [!isWaterish(ground[ty]?.[tx+1]), tx*PPS+PPS-2, ty*PPS, 0, PPS],
      ];
      x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 3; x.lineCap = "round";
      edges.forEach(([hit, ex, ey, dx, dy]) => {
        if (!hit) return;
        x.beginPath();
        x.moveTo(ex, ey);
        x.lineTo(ex+dx, ey+dy);
        x.stroke();
      });
    }
    return c;
  }

  function bakeWaterCanvas(phase){
    const c = document.createElement("canvas");
    c.width = MW*PPS; c.height = MH*PPS;
    const x = c.getContext("2d");
    for (let ty=0; ty<MH; ty++) for (let tx=0; tx<MW; tx++){
      if (ground[ty][tx] !== "water") continue;
      const h = hsh(tx, ty);
      x.fillStyle = (h % 3 === 0) ? "#4aa8de" : "#4db2e8";
      x.fillRect(tx*PPS, ty*PPS, PPS, PPS);
      // ondas (dos arcos por tile, desplazados según la fase)
      x.strokeStyle = "rgba(220,244,255,.8)"; x.lineWidth = 2; x.lineCap = "round";
      const off = phase ? 5 : 0;
      const ax = tx*PPS + ((h + off*3) % 10);
      const ay = ty*PPS + 5 + ((h>>3) % 8) + (phase ? 2 : 0);
      x.beginPath(); x.arc(ax+5, ay, 4, Math.PI*1.1, Math.PI*1.9); x.stroke();
      x.beginPath(); x.arc(ax+12, ay+7, 4, Math.PI*1.1, Math.PI*1.9); x.stroke();
    }
    return c;
  }

  function buildGroundMesh(){
    const tex = own(new THREE.CanvasTexture(bakeGroundCanvas()));
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mat = own(new THREE.MeshLambertMaterial({ map: tex }));
    const geoM = own(new THREE.PlaneGeometry(MW, MH));
    const mesh = new THREE.Mesh(geoM, mat);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(MW/2, 0, MH/2);
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function buildWaterMesh(){
    // ¿hay agua en este mapa?
    let has = false;
    for (let y=0; y<MH && !has; y++) for (let x=0; x<MW; x++) if (ground[y][x]==="water"){ has = true; break; }
    if (!has) return;
    waterTexA = own(new THREE.CanvasTexture(bakeWaterCanvas(false)));
    waterTexB = own(new THREE.CanvasTexture(bakeWaterCanvas(true)));
    waterTexA.colorSpace = waterTexB.colorSpace = THREE.SRGBColorSpace;
    waterMat = own(new THREE.MeshPhongMaterial({
      map: waterTexA, transparent: true, opacity: 0.92,
      shininess: 110, specular: 0x99ddff,
    }));
    const geoW = own(new THREE.PlaneGeometry(MW, MH));
    const mesh = new THREE.Mesh(geoW, waterMat);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(MW/2, 0.03, MH/2);
    worldGroup.add(mesh);
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
    let saveSpot = null;

    // --- decor (objetos anclados) ---
    for (let y=0; y<MH; y++) for (let x=0; x<MW; x++){
      const d = decor[y][x];
      if (!d) continue;
      if (d.sprite === "tree"){
        trees.push({ x: x+2, z: y+3.5, data: Paper.treeData() });
      } else if (HOUSE_VARIANT[d.sprite]){
        const variant = HOUSE_VARIANT[d.sprite];
        const h = Paper.house(variant);
        h.position.set(x+3, 0, y+6);
        worldGroup.add(h);
        // etiquetas
        if (d.gym){
          const g = Data.gyms.find(k => k.key === d.gym);
          const s = State.get();
          const cleared = s.badges.includes(g.key);
          const locked = !Quests.isGymUnlocked(g.key) || Quests.level() < Quests.gymLevelReq(g.key);
          const label = cleared ? "🏆 " + g.icon : (locked ? "🔒 " + g.icon : g.icon);
          addLabel(label, x+3, 4.9, y+5.6,
            cleared ? { bg:"#fff3c9", fg:"#b8860b" } : locked ? { bg:"#e8e6f0", fg:"#7a7790" } : { bg:"#fffdf4", fg:"#33314e" });
        }
        else if (d.shop)     addLabel("상점 🛒",  x+3, 4.9, y+5.6, { fg:"#2f9e5b" });
        else if (d.alcaldia) addLabel("시청 🏛",  x+3, 4.9, y+5.6, { fg:"#b8860b" });
        else if (d.casa)     addLabel("집 Casa",  x+3, 4.9, y+5.6, { fg:"#e05575" });
        else if (d.cafe)     addLabel("카페 ☕",  x+3, 4.9, y+5.6, { fg:"#a0653a" });
        else if (d.academia) addLabel("학원 📚",  x+3, 4.9, y+5.6, { fg:"#4361ee" });
        else if (d.norebang) addLabel("노래방 🎤", x+3, 4.9, y+5.6, { fg:"#d6336c" });
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
      }
    }

    // --- suelo (objetos por tile) ---
    for (let y=0; y<MH; y++) for (let x=0; x<MW; x++){
      const g = ground[y][x];
      const cx = x+0.5, cz = y+0.5;
      const m = meta[y][x];
      if (g === "tallgrass") tufts.push({ x:cx, z:cz, s: 0.95 + (hsh(x,y)%40)/100 });
      else if (g === "tuft") tufts.push({ x:cx, z:cz, s: 0.55 });
      else if (g === "flower")  flowers.push({ x:cx, z:cz, col:"#ffffff" });
      else if (g === "flower2") flowers.push({ x:cx, z:cz, col:"#ff6b6b" });
      else if (g === "flower3") flowers.push({ x:cx, z:cz, col:"#ffd94a" });
      else if (g === "mush") mushs.push({ x:cx, z:cz });
      else if (g === "rock") rocks.push({ x:cx, z:cz, s: 0.7 + (hsh(x,y)%50)/100 });
      else if (g === "caveRock") caveRocks.push({ x:cx, z:cz });
      else if (g === "bush" || g === "bushSand") bushes.push({ x:cx, z:cz });
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
          caveWallRocks.push({ x:x+0.5, z:y+0.5, s: 1.0 + (hsh(x,y)%40)/100 });
      }
    }

    // --- siembra procedural: el mundo se siente más vivo y poblado ---
    // Solo en césped libre (sin colisión, sin decor, sin meta, sin NPC):
    // no altera caminos, puertas, encuentros ni la lógica del juego.
    if (mode === "over" || mode === "pueblo"){
      const npcAt = new Set(npcsCur.map(n => n.x + "," + n.y));
      const free = (x, y) =>
        ground[y] && ground[y][x] === "grass" && !solid[y][x] && !decor[y][x] &&
        !meta[y][x] && !npcAt.has(x + "," + y) &&
        !(saveSpot && saveSpot.x === x+0.5 && saveSpot.z === y+0.5);
      let specialCount = 0;
      const maxSpecials = mode === "over" ? 26 : 10;
      for (let y=1; y<MH-1; y++) for (let x=1; x<MW-1; x++){
        if (!free(x, y)) continue;
        const h = hsh(x, y) % 1000;
        const cx = x+0.5, cz = y+0.5;
        if (h < 90){ // 9% flores sueltas de colores
          const cols = ["#ffffff", "#ff6b6b", "#ffd94a", "#ff70a6", "#a259ff", "#5ec2ee"];
          flowers.push({ x:cx, z:cz, col: cols[h % cols.length] });
        }
        else if (h < 150) tufts.push({ x:cx, z:cz, s: 0.4 + (h%30)/100 }); // 6% hierbecilla
        else if (h < 175) mushs.push({ x:cx, z:cz });                     // 2.5% setas
        else if (h < 200) rocks.push({ x:cx, z:cz, s: 0.35 + (h%25)/100 }); // 2.5% piedritas
        else if (h < 224 && specialCount < maxSpecials && free(x+1, y)){   // 2.4% piezas especiales
          // bancos, señales, troncos, faroles de piedra, molinillos, macizos
          const kind = hsh(x*3+1, y*7+5) % 6;
          // las piezas voluminosas solo en zonas muy abiertas (8 alrededor libres
          // o césped sin nada) y se vuelven sólidas para no atravesarlas
          const bulky = kind <= 3;
          const openAround = [1,0,-1].every(dy => [1,0,-1].every(dx =>
            (dx===0&&dy===0) || (ground[y+dy] && (ground[y+dy][x+dx] === "grass" || ground[y+dy][x+dx] === "tuft" || ground[y+dy][x+dx] === "flower" || ground[y+dy][x+dx] === "flower2" || ground[y+dy][x+dx] === "flower3") && !decor[y+dy][x+dx] && !meta[y+dy][x+dx] && !npcAt.has((x+dx) + "," + (y+dy)))));
          if (bulky && !openAround) continue;
          let m2 = null;
          if (kind === 0) m2 = Paper.benchMesh();
          else if (kind === 1) m2 = Paper.signpostMesh();
          else if (kind === 2) m2 = Paper.logMesh();
          else if (kind === 3) m2 = Paper.stoneLanternMesh();
          else if (kind === 4){ m2 = Paper.pinwheelMesh(hsh(x, y) % 6); animPinwheels.push(m2); }
          else m2 = Paper.flowerPatchMesh();
          m2.position.set(cx, 0, cz);
          m2.rotation.y = (hsh(x+9, y+9) % 628) / 100;
          worldGroup.add(m2);
          if (bulky) solid[y][x] = 1;
          specialCount++;
        }
      }
    }

    // --- instanciados ---
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3();
    const Euler = new THREE.Euler();

    if (trees.length){
      const trunk = new THREE.InstancedMesh(Paper.geo("trunk", () => new THREE.CylinderGeometry(0.12, 0.18, 1, 7)), Paper.lambert("#8a5a2b"), trees.length);
      const blobMat = own(new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const blobs = new THREE.InstancedMesh(Paper.geo("canopy", () => new THREE.SphereGeometry(1, 10, 8)), blobMat, trees.length*3);
      trees.forEach((t, i) => {
        M.compose(P.set(t.x, t.data.trunkH/2, t.z), Q, S.set(1, t.data.trunkH, 1));
        trunk.setMatrixAt(i, M);
        t.data.blobs.forEach((b, j) => {
          M.compose(P.set(t.x+b.dx, b.dy, t.z+b.dz), Q, S.set(b.s, b.s*0.8, b.s));
          const k = i*3+j;
          blobs.setMatrixAt(k, M);
          blobs.setColorAt(k, new THREE.Color(b.col));
        });
      });
      trunk.castShadow = blobs.castShadow = true;
      own(trunk); own(blobs);
      worldGroup.add(trunk, blobs);
    }

    if (tufts.length){
      if (!grassTuftTexture) grassTuftTexture = Paper.canvasTex(Paper.grassBladeTexture());
      const tm = own(new THREE.MeshLambertMaterial({ map: grassTuftTexture, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
      const inst = new THREE.InstancedMesh(Paper.geo("tuftX", makeCrossedQuad), tm, tufts.length);
      tufts.forEach((t, i) => {
        Euler.set(0, (hsh(i, 7) % 628)/100, 0);
        Q.setFromEuler(Euler);
        M.compose(P.set(t.x, 0, t.z), Q, S.set(t.s, t.s, t.s));
        inst.setMatrixAt(i, M);
      });
      Q.identity();
      own(inst);
      worldGroup.add(inst);
    }

    if (flowers.length){
      const stems = new THREE.InstancedMesh(Paper.geo("stem", () => new THREE.CylinderGeometry(0.03, 0.03, 0.24, 5)), Paper.lambert("#3f8b4b"), flowers.length);
      const headMat = own(new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const heads = new THREE.InstancedMesh(Paper.geo("fhead", () => new THREE.SphereGeometry(0.1, 8, 6)), headMat, flowers.length);
      flowers.forEach((f, i) => {
        M.compose(P.set(f.x, 0.12, f.z), Q, S.set(1, 1, 1));
        stems.setMatrixAt(i, M);
        M.compose(P.set(f.x, 0.3, f.z), Q, S.set(1, 0.85, 1));
        heads.setMatrixAt(i, M);
        heads.setColorAt(i, new THREE.Color(f.col));
      });
      own(stems); own(heads);
      worldGroup.add(stems, heads);
    }

    if (mushs.length){
      const inst = new THREE.InstancedMesh(Paper.geo("mush", () => new THREE.SphereGeometry(0.14, 8, 6)), Paper.lambert("#e0563c"), mushs.length);
      mushs.forEach((t, i) => {
        M.compose(P.set(t.x, 0.08, t.z), Q, S.set(1, 0.6, 1));
        inst.setMatrixAt(i, M);
      });
      own(inst);
      worldGroup.add(inst);
    }

    const allRocks = rocks.concat(caveWallRocks);
    if (allRocks.length){
      const inst = new THREE.InstancedMesh(Paper.geo("rock", () => new THREE.DodecahedronGeometry(0.32, 0)), Paper.lambert(mode==="cueva" ? "#6a6478" : "#9aa0a8"), allRocks.length);
      allRocks.forEach((t, i) => {
        Euler.set(0, (hsh(i, 3) % 628)/100, 0); Q.setFromEuler(Euler);
        const s = t.s || 1;
        M.compose(P.set(t.x, 0.16*s, t.z), Q, S.set(s, s*0.75, s));
        inst.setMatrixAt(i, M);
      });
      Q.identity();
      inst.castShadow = true;
      own(inst);
      worldGroup.add(inst);
    }

    if (caveRocks.length){
      const mat2 = own(new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const inst = new THREE.InstancedMesh(Paper.geo("canopy", () => new THREE.SphereGeometry(1, 10, 8)), mat2, caveRocks.length);
      caveRocks.forEach((t, i) => {
        M.compose(P.set(t.x, 0.3, t.z), Q, S.set(0.4, 0.34, 0.4));
        inst.setMatrixAt(i, M);
        inst.setColorAt(i, new THREE.Color("#8a84a0"));
      });
      inst.castShadow = true;
      own(inst);
      worldGroup.add(inst);
    }

    if (bushes.length){
      const bushMat = own(new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const inst = new THREE.InstancedMesh(Paper.geo("canopy", () => new THREE.SphereGeometry(1, 10, 8)), bushMat, bushes.length*3);
      const BC = ["#1e7038", "#2f8f4a", "#14522a"];
      const BLOBS = [[0, 0.32, 0, 0.42], [-0.28, 0.22, 0.08, 0.3], [0.28, 0.24, -0.06, 0.32]];
      bushes.forEach((t, i) => {
        BLOBS.forEach(([dx, dy, dz, s], j) => {
          M.compose(P.set(t.x+dx, dy, t.z+dz), Q, S.set(s, s*0.85, s));
          const k = i*3+j;
          inst.setMatrixAt(k, M);
          inst.setColorAt(k, new THREE.Color(BC[(i+j) % 3]));
        });
      });
      inst.castShadow = true;
      own(inst);
      worldGroup.add(inst);
    }

    chests.forEach(t => {
      const c = Paper.chestMesh();
      c.position.set(t.x, 0, t.z);
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
      sp.position.set(saveSpot.x, 0, saveSpot.z);
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
    // mostrador de la tienda
    if (mode === "tienda"){
      const counter = new THREE.Mesh(Paper.geo("counter", () => new THREE.BoxGeometry(2.7, 0.85, 0.7)), Paper.lambert("#8a5a2b"));
      counter.position.set(5.5, 0.425, 4.05);
      counter.castShadow = true;
      worldGroup.add(counter);
      const top = new THREE.Mesh(Paper.geo("counterTop", () => new THREE.BoxGeometry(2.9, 0.1, 0.85)), Paper.lambert("#c48b5e"));
      top.position.set(5.5, 0.9, 4.05);
      worldGroup.add(top);
    }
    // gimnasio: tarima del líder
    if (mode === "interior"){
      const stage = new THREE.Mesh(Paper.geo("gymStage", () => new THREE.CylinderGeometry(1.6, 1.8, 0.25, 18)), Paper.lambert("#d4b46a"));
      stage.position.set(6.5, 0.125, 3.5);
      stage.receiveShadow = true;
      worldGroup.add(stage);
    }
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
  function makeCharPlane(pair, w, h){
    const texF = own(Paper.canvasTex(pair.front));
    const texB = own(Paper.canvasTex(pair.back));
    const mat = own(new THREE.MeshBasicMaterial({ map: texF, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }));
    const plane = new THREE.Mesh(Paper.geo("charPlane", () => new THREE.PlaneGeometry(1, 1)), mat);
    plane.scale.set(w, h, 1);
    plane.position.y = h/2;
    return { plane, mat, texF, texB };
  }

  function buildCharacters(){
    // jugador (Karol auténtica con la skin clásica; personaje de papel con el resto)
    const skin = State.get().activeSkin;
    const useKarol = skin === "clásico" && karol.ready;
    const pair = useKarol ? { front: karol.frames[0], back: karol.frames[0] } : playerChars(skin);
    const g = new THREE.Group();
    g.add(makeBlobShadow());
    const cp = useKarol ? makeCharPlane(pair, 1.0, 1.3) : makeCharPlane(pair, 0.95, 1.25);
    g.add(cp.plane);
    worldGroup.add(g);
    playerVis = { group: g, ...cp, skin, flip: 0, flipT: 0 };
    if (useKarol) swapPlayerToKarol();

    // NPCs
    npcsCur.forEach((n, i) => {
      const np = npcChars(n);
      const ng = new THREE.Group();
      ng.add(makeBlobShadow());
      const ncp = makeCharPlane(np, 0.9, 1.2);
      ng.add(ncp.plane);
      // bocadillo "…"
      const bcv = Paper.bubble();
      const btex = own(Paper.canvasTex(bcv));
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
    const c = Paper.svgCanvas(Creatures.petSprite(pet.key), 128, 10);
    const tex = own(Paper.canvasTex(c));
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
        const tex = own(Paper.canvasTex(c));
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
    g.position.set(30, -SEA_HOUSE_MODEL.bbox.min[1] * s, 59);
    g.rotation.y = -Math.PI/2;
    worldGroup.add(g);
    seaHouseVis = g;
  }

  // ---------- props individuales StylisedEnv (js/envProps.js) ----------
  // Piezas del diorama separadas por componentes: árboles (tronco+copa),
  // arbustos, rocas, troncos caídos, piedras y madera a la deriva.
  let envPropsRaw = null; // buffers decodificados (una sola vez)
  let envPropsCount = 0; // para debug()
  function buildEnvProps(){
    if (mode !== "over" || typeof ENV_PROPS === "undefined") return;
    if (!envPropsRaw){
      envPropsRaw = ENV_PROPS.objects.map(o => ({
        pos: b64ToF32(o.pos), nor: o.nor ? b64ToF32(o.nor) : null,
        col: o.col ? b64ToF32(o.col) : null,
        idx: o.idx ? b64ToU32(o.idx) : null,
        size: o.size,
      }));
    }
    const geos = {};
    const getGeo = i => geos[i] || (geos[i] = (() => {
      const o = envPropsRaw[i];
      const g = own(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.BufferAttribute(o.pos, 3));
      if (o.nor) g.setAttribute("normal", new THREE.BufferAttribute(o.nor, 3));
      else g.computeVertexNormals();
      if (o.col) g.setAttribute("color", new THREE.BufferAttribute(o.col, 3));
      if (o.idx) g.setIndex(new THREE.BufferAttribute(o.idx, 1));
      return g;
    })());
    const propMat = own(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));

    // índices de ENV_PROPS.objects por categoría (ver test-shots/props2_sheet_*.png)
    const TRUNKS   = [1];              // tronco grande curvo
    const CANOPIES = [19, 20, 22];     // copas grandes
    const BUSHES   = [16, 17, 18, 21, 23, 24];
    const BOULDERS = [5, 6, 7, 10, 11, 12, 28, 29, 30, 32]; // rocas musgosas
    const CRAGS    = [3, 4, 13, 15, 25];                    // riscos grises altos
    const DARKCRAG = [54, 55, 56, 57, 58, 59, 60, 61];      // riscos oscuros
    const LOGS     = [0, 2, 8, 9, 14, 26, 27, 37];          // troncos y ramas caídas
    const STONES   = [42, 43, 44, 45, 46, 47, 48, 49, 50, 51]; // piedras planas
    const PEBBLES  = [63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81];
    const DRIFT    = [38, 39, 52, 53, 88, 89, 90, 91, 92, 93, 96, 100, 101]; // madera a la deriva

    const pick = (arr, h, shift=0) => arr[(h >> shift) % arr.length];
    const put = (i, x, y, s, h, shadow=false) => {
      const m = new THREE.Mesh(getGeo(i), propMat);
      m.position.set(x+0.5, 0, y+0.5);
      m.rotation.y = (h % 628) / 100;
      m.scale.set(s, s, s);
      if (shadow) m.castShadow = true;
      worldGroup.add(m);
      envPropsCount++;
      return m;
    };

    const npcAt = new Set(npcsCur.map(n => n.x + "," + n.y));
    const free = (x, y) => ground[y] && !solid[y][x] && !decor[y][x] && !meta[y][x] && !npcAt.has(x + "," + y);
    envPropsCount = 0;
    for (let y=3; y<MH-2; y++) for (let x=3; x<MW-2; x++){
      if (!free(x, y)) continue;
      const tile = ground[y][x];
      const h = hsh(x*5+11, y*7+3) % 1000;
      if (tile === "grass"){
        if (h < 6){ // árbol: tronco + copa
          const s = 1.1 + ((h>>3)%50)/100;
          const t = put(TRUNKS[h % TRUNKS.length], x, y, s, h, true);
          const c = put(pick(CANOPIES, h, 4), x, y, s*1.1, h, true);
          c.position.y = s * 1.51 * 0.92; // copa a la altura del tronco
        }
        else if (h < 20) put(pick(BUSHES, h), x, y, 1.1 + ((h>>3)%70)/100, h);
        else if (h < 30) put(pick(BOULDERS, h), x, y, 0.9 + ((h>>3)%70)/100, h, true);
        else if (h < 36) put(pick(LOGS, h), x, y, 1.3 + ((h>>3)%70)/100, h);
        else if (h < 46) put(pick(STONES, h), x, y, 1.5 + ((h>>3)%100)/100, h);
        else if (h < 56) put(pick(PEBBLES, h), x, y, 1.6 + ((h>>3)%100)/100, h);
      } else if (tile === "sand"){
        if (h < 14) put(pick(BOULDERS, h), x, y, 0.9 + ((h>>3)%70)/100, h, true);
        else if (h < 24) put(pick(CRAGS, h), x, y, 0.8 + ((h>>3)%70)/100, h, true);
        else if (h < 32) put(pick(DARKCRAG, h), x, y, 1.0 + ((h>>3)%80)/100, h, true);
        else if (h < 46) put(pick(DRIFT, h), x, y, 1.2 + ((h>>3)%60)/100, h);
        else if (h < 60) put(pick(PEBBLES, h), x, y, 1.6 + ((h>>3)%100)/100, h);
      }
    }
  }

  // ---------- jardín-isla StylisedEnv (js/envGarden.js) ----------
  // Diorama completo del pack (estanque, árboles, helechos, flores, puente,
  // banco) emergiendo del mar al suroeste: pura belleza de fondo estilo Pokémon.
  let gardenRaw = null;
  function buildGarden(){
    if (mode !== "over" || typeof ENV_GARDEN_MODEL === "undefined") return;
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
    // en el mar al oeste del muelle, ligeramente hundida para emerger del agua
    g.position.set(13.5, -0.4, 66);
    g.rotation.y = Math.PI*0.15;
    worldGroup.add(g);
    gardenCount = g.children.length;
  }

  // ---------- ambiente por modo (cielo, luces, niebla) ----------
  const INTERIOR_BG = {
    tienda:"#f7e8d0", cafe:"#f2e0cc", academia:"#dce8f7", norebang:"#f7d8e8",
    casa:"#f7ecd8", alcaldia:"#eadcf7", interior:"#f7e8c0",
  };
  function applyModeAmbience(){
    camOffset = Math.max(MW, MH) <= 26
      ? new THREE.Vector3(0, 9.5, 7.6)
      : new THREE.Vector3(0, 16.5, 12.2);
    if (mode === "cueva"){
      scene.background = new THREE.Color("#17131f");
      scene.fog = null;
      hemi.color.set("#4a4468"); hemi.groundColor.set("#1a1626"); hemi.intensity = 0.6;
      sun.intensity = 0.15;
      caveLight.intensity = 1.6;
    } else if (mode === "over" || mode === "pueblo"){
      scene.background = new THREE.Color("#8ed8ff");
      scene.fog = new THREE.Fog(0x8ed8ff, 55, 130);
      hemi.color.set("#bfe8ff"); hemi.groundColor.set("#8a9a5b"); hemi.intensity = 0.95;
      sun.intensity = 1.05;
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
    disposeScene();
    worldGroup = new THREE.Group();
    scene.add(worldGroup);
    applyModeAmbience();
    buildGroundMesh();
    buildWaterMesh();
    scanAndBuildDecor();
    buildInteriorWalls();
    buildCharacters();
    buildAmbient();
    buildSeaHouse();
    buildEnvAssets();
    buildGarden();
    snapCamera();
  }

  function snapCamera(){
    const tx = player.px/TILE + 0.5, tz = player.py/TILE + 0.5;
    desired.set(tx + camOffset.x, camOffset.y, tz + camOffset.z);
    camera.position.copy(desired);
    lookCur.set(tx, 0.9, tz);
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
        const pair = playerChars(skin);
        pv.texF.image = pair.front; pv.texF.needsUpdate = true;
        pv.texB.image = pair.back;  pv.texB.needsUpdate = true;
        pv.skin = skin;
      }
      const gx = player.px/TILE + 0.5, gz = player.py/TILE + 0.5;
      pv.group.position.set(gx, 0, gz);
      const hop = player.moving ? Math.abs(Math.sin(player.animT*0.5))*0.09 : 0;
      pv.plane.position.y = pv.plane.scale.y/2 + hop;
      pv.mat.map = pv.karolTex
        ? pv.karolTex[player.moving ? (player.frame % pv.karolTex.length) : 0] // Karol: caminata animada
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
      vis.group.position.set(gx, 0, gz);
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
      petVis.group.position.set(gx, 0, gz);
      petVis.plane.position.y = 0.32 + (pet.moving ? Math.abs(Math.sin(pet.bob*0.3))*0.14 : Math.sin(now*0.004)*0.02);
      petVis.plane.rotation.y = Math.atan2(camX - gx, camZ - gz);
    }

    // agua (2 fases)
    if (waterMat){
      waterT += dt;
      if (waterT > 550){
        waterT = 0; waterPhase = !waterPhase;
        waterMat.map = waterPhase ? waterTexB : waterTexA;
      }
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
      vo.group.position.set(gx, 1.15 + Math.sin(b.t*0.1)*0.15, gz);
      vo.group.rotation.y = Math.atan2(camX - gx, camZ - gz);
      const f = Math.sin(now*0.022 + i*1.7)*0.75;
      const wings = vo.group.userData.wings;
      if (wings){ wings[0].rotation.z = f; wings[1].rotation.z = -f; }
    });

    // animales
    animalVis.forEach(vo => {
      const a = vo.a;
      const gx = a.px/TILE + 0.5, gz = a.py/TILE + 0.5;
      vo.group.position.set(gx, 0, gz);
      vo.plane.position.y = 0.4 + (a.moving ? Math.abs(Math.sin(a.t*0.3))*0.05 : 0);
      vo.plane.rotation.y = Math.atan2(camX - gx, camZ - gz);
      vo.plane.scale.x = (a.facing === 1 ? 1 : -1) * 0.95;
    });

    // nubes
    clouds.forEach(c => {
      c.sp.position.x += c.speed * dt * 0.001;
      if (c.sp.position.x > MW + 8) c.sp.position.x = -8;
    });

    // luz de cueva sigue al jugador
    const tx = player.px/TILE + 0.5, tz = player.py/TILE + 0.5;
    caveLight.position.set(tx, 1.9, tz);

    // sol y sombras siguen al jugador
    sun.position.set(tx+16, 26, tz+11);
    sun.target.position.set(tx, 0, tz);
    sun.target.updateMatrixWorld();

    // cámara
    desired.set(tx + camOffset.x, camOffset.y, tz + camOffset.z);
    camera.position.lerp(desired, Math.min(1, dt*0.008));
    lookTgt.set(tx, 0.9, tz);
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
    hemi = new THREE.HemisphereLight(0xbfe8ff, 0x8a9a5b, 0.95);
    sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -22; sun.shadow.camera.right = 22;
    sun.shadow.camera.top = 22; sun.shadow.camera.bottom = -22;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
    sun.shadow.bias = -0.002;
    caveLight = new THREE.PointLight(0xffd9a0, 0, 9, 1.2);
    scene.add(hemi, sun, sun.target, caveLight);
    ready = true;
  }

  async function start(){
    if (started){ sceneDirty = true; resize(); return; }
    started = true;
    buildOverworld();
    ensureRenderer();

    const pos = State.get().playerPos;
    if (pos && !solid[pos.y]?.[pos.x] && !(meta[pos.y]?.[pos.x]||{}).type){
      player.x=player.tx=pos.x; player.y=player.ty=pos.y;
      player.px=pos.x*TILE; player.py=pos.y*TILE;
    }

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

    const padKey = { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight" };
    document.querySelectorAll("[data-pad]").forEach(b => {
      const k = padKey[b.dataset.pad];
      const on  = e => { e.preventDefault(); if (Dialog.open){ advanceDialog(); return; } keys[k]=true; };
      const off = e => { e.preventDefault(); keys[k]=false; };
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off);
      b.addEventListener("pointerleave", off);
      b.addEventListener("pointercancel", off);
    });
    loop();
    setInterval(() => { if (document.hidden) tick(); }, 50);
    UI.refreshTopbar();
  }

  // Frame del personaje de papel (con la skin activa) para UI de batalla/topbar
  function playerFrameURL(row=0){
    try {
      const skin = State.get().activeSkin;
      if (skin === "clásico" && karol.ready) return karol.frames[0].toDataURL();
      const pair = playerChars(skin);
      return (row === 2 ? pair.back : pair.front).toDataURL();
    } catch(e){ return null; }
  }

  function debug(){
    return {
      mode,
      player: { x:player.x, y:player.y, moving:player.moving, dir:player.dir },
      keys: Object.keys(keys).filter(k=>keys[k]),
      ready, started, dialogOpen: Dialog.open,
      envAssets: envAssetsCount, gardenMeshes: gardenCount,
      npcs: npcsCur.map(n=>({name:n.name.split(" ")[0], x:n.x, y:n.y, moving:n.moving})),
    };
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
    const table = { shop:enterShop, pueblo:enterPueblo, cafe:enterCafe, academia:enterAcademia,
      norebang:enterNorebang, home:enterHome, alcaldia:enterAlcaldia,
      gym:()=>enterInterior(true), cave:enterCave, exit:exitMap };
    const fn = table[name];
    if (!fn) return false;
    fn();
    return true;
  }

  return { start, debug, debugEnter, playerFrameURL, tp };
})();
