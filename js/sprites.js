/* ==========================================================
   POKOREANO — Pixel art SVG sprites (todos inline, CC0)
   Cada sprite es un SVG 32x32 escalado con image-rendering:pixelated.
   ========================================================== */
const Sprites = (() => {

  // Helper: build SVG from a 32x32 pixel grid using palette map
  function grid(palette, rows) {
    let cells = "";
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c === "." || c === " ") continue;
        const color = palette[c];
        if (!color) continue;
        cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">${cells}</svg>`;
  }

  // ---------- PLAYER (entrenador con gorra roja) ----------
  // Karol: pelo rojo
  const playerPalette = {
    K:"#111", S:"#f4c9a1", H:"#d62c38", R:"#e63946",
    W:"#ffffff", B:"#1d3557", J:"#457b9d", T:"#f1a208", O:"#a9d6e5"
  };
  const playerRows = [
    "................................",
    "................................",
    "..........KKKKKK................",
    ".........KRRRRRRK...............",
    "........KRRRRRRRRK..............",
    ".......KRRWWWWRRRK..............",
    ".......KRRWWWWRRRK..............",
    ".......KSSSSSSSSSK..............",
    "......KSSHHSSHHSSSK.............",
    "......KSSHHSSHHSSSK.............",
    "......KSSSSKKSSSSSK.............",
    "......KSSSKKKKSSSSK.............",
    "......KSSSSSSSSSSSK.............",
    ".......KSSSSSSSSSK..............",
    ".......KBBBBBBBBBK..............",
    "......KBBWWWWWWBBBK.............",
    "......KBBWJJJJWBBBK.............",
    "......KBBWJRRJWBBBK.............",
    "......KBBWJJJJWBBBK.............",
    "......KBBBBBBBBBBBK.............",
    "......KBBBBBBBBBBBK.............",
    "......KBBBBKKBBBBBK.............",
    ".......KJJK..KJJJK..............",
    ".......KJJK..KJJJK..............",
    ".......KJJK..KJJJK..............",
    ".......KTTK..KTTTK..............",
    "......KKTTK..KTTTKK.............",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................"
  ];

  // ---------- HANGUL SPIRIT (Gimnasio 1) - un carácter animado ----------
  const hangulPalette = {
    K:"#111", A:"#ffd166", B:"#e63946", W:"#ffffff", E:"#000"
  };
  const hangulRows = [
    "................................",
    "..........KKKKKKKK..............",
    ".........KAAAAAAAAK.............",
    "........KAAAAAAAAAAK............",
    ".......KAAWWWAAWWWAAK...........",
    ".......KAAWEWAAWEWAAK...........",
    ".......KAAWWWAAWWWAAK...........",
    "........KAAAAAAAAAAK............",
    "........KAAABBBBAAAK............",
    "........KAAABBBBAAAK............",
    "........KAAAAAAAAAAK............",
    ".........KAAAAAAAAK.............",
    "..........KKKAAAKKK.............",
    "...........KKAAAKK..............",
    "...........KAAAAK...............",
    "..........KAAAAAAK..............",
    ".........KAABBBBAAK.............",
    "........KAABBBBBBAAK............",
    "........KAABBBBBBAAK............",
    ".........KAABBBBAAK.............",
    "..........KAAAAAAK..............",
    "..........KAAAAAAK..............",
    "...........KAAAK................",
    "...........KAAAK................",
    "..........KAKAKAK...............",
    "..........KAKAKAK...............",
    ".........KAAKAKAAK..............",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................"
  ];

  // ---------- NUMBERS (Gimnasio 2) - Slime tipo dígito ----------
  const numberPalette = {
    K:"#111", G:"#3fa9f5", C:"#0077b6", W:"#fff", E:"#000"
  };
  const numberRows = [
    "................................",
    "................................",
    "..............KKKKK.............",
    "............KKGGGGGKK...........",
    "...........KGGGGGGGGGK..........",
    "..........KGGGGGGGGGGGK.........",
    ".........KGGGGGGGGGGGGGK........",
    ".........KGGGWWWKGWWWGGK........",
    ".........KGGGWEWKGWEWGGK........",
    ".........KGGGWWWKGWWWGGK........",
    ".........KGGGGGGGGGGGGGK........",
    ".........KGGGGGKKKKGGGGK........",
    ".........KGGGGGKWWKGGGGK........",
    ".........KGGGGGKKKKGGGGK........",
    ".........KGGGGGGGGGGGGGK........",
    ".........KCCCCCCCCCCCCCK........",
    ".........KCCCCCCCCCCCCCK........",
    ".........KCCCCCCCCCCCCCK........",
    "..........KCCCCCCCCCCCK.........",
    "...........KCCCCCCCCCK..........",
    "............KKKCCCKKK...........",
    "...............KKK..............",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................"
  ];

  // ---------- PARTICLE MASTER (Gimnasio 3) - un dokkaebi ----------
  const dokkPalette = {
    K:"#111", R:"#c02a52", H:"#7a1730", S:"#f4c9a1",
    W:"#fff", E:"#000", G:"#ffd166", B:"#3d2b1f"
  };
  const dokkRows = [
    "................................",
    "................................",
    "...........G.....G..............",
    "..........GG.....GG.............",
    "..........KKKKKKKKK.............",
    ".........KHHHHHHHHHK............",
    "........KHRRRRRRRRRHK...........",
    ".......KHRRSSSSSSSRRHK..........",
    ".......KHRSSSSSSSSSSRHK.........",
    ".......KHRSWWSSSSWWSRHK.........",
    ".......KHRSWEWSSWEWSRHK.........",
    ".......KHRSWWSSSSWWSRHK.........",
    ".......KHRSSSSKSSSSSRHK.........",
    ".......KHRSSSKKKSSSSRHK.........",
    ".......KHRSSSSKSSSSSRHK.........",
    ".......KHRSSSKKKSSSSRHK.........",
    ".......KHRSSSSSSSSSSRHK.........",
    "........KHRRRRRRRRRHK...........",
    ".........KHHHHHHHHHK............",
    "........KBBBBBBBBBBBK...........",
    "........KBBRRRRRRRBBK...........",
    "........KBBRRRRRRRBBK...........",
    "........KBBRRRRRRRBBK...........",
    ".........KBRRRRRRRBK............",
    ".........KKRRRRRRRKK............",
    "..........KKKKKKKKK.............",
    ".........KBBK..KBBK.............",
    ".........KBBK..KBBK.............",
    "........KBBBK..KBBBK............",
    "................................",
    "................................",
    "................................"
  ];

  // ---------- WILD ENCOUNTER (tigre coreano cachorro) ----------
  const tigerPalette = {
    K:"#111", O:"#ff8c00", W:"#fff", E:"#000", B:"#333", P:"#ffb27a"
  };
  const tigerRows = [
    "................................",
    "................................",
    "........KK............KK........",
    ".......KOOK..........KOOK.......",
    "......KOOOOK........KOOOOK......",
    "......KOOOOOKKKKKKKKOOOOOK......",
    ".....KOOOBOOOOOOOOOOBOOOOOK.....",
    ".....KOBBOOOOOOOOOOOOBBBOOK.....",
    ".....KOOOOOWWOOOOWWOOOOOOOK.....",
    ".....KOOOOOWEWOOWEWOOOOOOOK.....",
    ".....KOOOOOWWOOOOWWOOOOOOOK.....",
    ".....KOOOOOOOOPPOOOOOOOOOOK.....",
    ".....KOOOBOOOPKPOOOOBOOBOOK.....",
    ".....KOBBOOOPPPPOOOOBBBBBOK.....",
    ".....KOOOOOOOKKOOOOOOOOOOOK.....",
    ".....KOOOOOKKKKKKOOOOOOOOOK.....",
    ".....KOOOOKWWWWWWKOOOOOOOOK.....",
    ".....KOOOOKKKKKKKKOOOOOOOOK.....",
    "......KOOOOOOOOOOOOOOOOOOK......",
    "......KOOBOOOOOOOOOOOOBBOK......",
    "......KOOBOOOOOOOOOOOOBBOK......",
    ".......KOOOOOOOOOOOOOOOK........",
    ".......KOOKKOOKKOOKKOOKK........",
    ".......KOOKKOOKKOOKKOOKK........",
    "........KKKKKKKKKKKKKKK.........",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................",
    "................................"
  ];

  // ---------- BADGE (medalla base) ----------
  function badge(color, ring) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">
      ${circle(16,16,10,"#111")}
      ${circle(16,16,9,ring)}
      ${circle(16,16,6,color)}
      ${circle(16,16,3,"#fff")}
    </svg>`;
  }
  function circle(cx,cy,r,color){
    let out="";
    for(let y=-r;y<=r;y++){
      for(let x=-r;x<=r;x++){
        if(x*x+y*y<=r*r){
          out+=`<rect x="${cx+x}" y="${cy+y}" width="1" height="1" fill="${color}"/>`;
        }
      }
    }
    return out;
  }

  // ---------- SKINS UNLOCK (avatares alternativos) ----------
  // stored as recolors of player
  function recolorPlayer(overrides){
    const p = {...playerPalette, ...overrides};
    return grid(p, playerRows);
  }

  const skinDefs = {
    "clásico": {},
    "invierno": {R:"#0077b6", J:"#a9d6e5", B:"#023e8a", T:"#8ecae6"},
    "sakura":   {R:"#ff70a6", J:"#ffc6d9", B:"#c9184a", T:"#ff9770"},
    "dragón dorado": {R:"#ffbf00", J:"#ffd166", B:"#8b5e00", T:"#fff59d", H:"#000"},
    "seúl nocturno": {R:"#7209b7", J:"#9d4edd", B:"#3c096c", T:"#ffd166", W:"#ffe9f2"},
    "hanbok real":   {R:"#4361ee", J:"#ffd60a", B:"#780000", T:"#e63946"},
    "jeju":          {R:"#06d6a0", J:"#ffd166", B:"#118ab2", T:"#ef476f"},
    "K-pop idol":    {R:"#ff006e", J:"#ffbe0b", B:"#8338ec", T:"#3a86ff", H:"#ec5cff"},
    "monje templario":{R:"#8d6e63", J:"#d7ccc8", B:"#4e342e", T:"#ffca28"},
    "cyber neón":    {R:"#ff3d7f", J:"#00f5d4", B:"#00202e", T:"#f15bb5", W:"#c4fbff"},
    "ninja hangul":  {R:"#111", J:"#333", B:"#000", T:"#e63946", W:"#e63946"},
    "chef bibimbap": {R:"#e63946", J:"#fff", B:"#c02a52", T:"#ffd166"},
  };
  const skins = {};
  for (const name in skinDefs) skins[name] = recolorPlayer(skinDefs[name]);

  const badges = [
    { key:"hangul",   color:"#ffd166", ring:"#e63946", name:"Medalla Hangul" },
    { key:"numeros",  color:"#3fa9f5", ring:"#023e8a", name:"Medalla Numerales" },
    { key:"particulas",color:"#a259ff", ring:"#3c096c", name:"Medalla Partícula" },
    { key:"verbos",   color:"#06d6a0", ring:"#134e2a", name:"Medalla Verbo" },
    { key:"honor",    color:"#ff70a6", ring:"#7a1730", name:"Medalla Honorífico" },
    { key:"topik1",   color:"#f4a261", ring:"#8b5e00", name:"Medalla TOPIK I" },
    { key:"topik2",   color:"#ef476f", ring:"#450920", name:"Medalla TOPIK II" },
    { key:"maestro",  color:"#fff",     ring:"#c02a52", name:"Medalla Maestro" },
  ];

  const spriteMap = {
    player:  grid(playerPalette, playerRows),
    hangulSpirit: grid(hangulPalette, hangulRows),
    numberSlime:  grid(numberPalette, numberRows),
    dokkaebi:     grid(dokkPalette, dokkRows),
    tigerCub:     grid(tigerPalette, tigerRows),
  };

  function get(name){ return spriteMap[name] || ""; }

  // ---------- WORD SPIRIT (monstruo de batalla = la propia palabra) ----------
  // Un duendecillo de papel con la sílaba coreana en la pancita.
  // El color se deriva del texto para que cada palabra tenga su identidad.
  function wordSpirit(han){
    let h = 0;
    for (let i=0;i<han.length;i++) h = (h*31 + han.charCodeAt(i)) >>> 0;
    const hues = [352, 205, 150, 95, 265, 20, 320, 180];
    const hue = hues[h % hues.length];
    const body  = `hsl(${hue} 78% 62%)`;
    const shade = `hsl(${hue} 62% 46%)`;
    const belly = `hsl(${hue} 92% 90%)`;
    const flip = (h>>3) & 1; // ¿antenas o cuernitos?
    const horns = flip
      ? `<path d="M14 6 q1 -4 4 -4 q-1 3 -1 5 Z" fill="${shade}"/><path d="M34 6 q-1 -4 -4 -4 q1 3 -1 5 Z" fill="${shade}"/>`
      : `<circle cx="15" cy="4" r="2.4" fill="${shade}"/><circle cx="33" cy="4" r="2.4" fill="${shade}"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <ellipse cx="24" cy="44" rx="13" ry="2.6" fill="rgba(0,0,0,.18)"/>
      ${horns}
      <path d="M24 4 C36 4 42 13 42 24 C42 36 34 43 24 43 C14 43 6 36 6 24 C6 13 12 4 24 4 Z"
            fill="${body}" stroke="#fff" stroke-width="2.4"/>
      <path d="M9 28 C10 36 16 41 24 41 C32 41 38 36 39 28 C35 33 30 35 24 35 C18 35 13 33 9 28 Z" fill="${shade}" opacity=".55"/>
      <ellipse cx="24" cy="28" rx="11" ry="8.5" fill="${belly}"/>
      <circle cx="17" cy="16" r="3.1" fill="#fff"/><circle cx="17.8" cy="16.4" r="1.6" fill="#222"/>
      <circle cx="31" cy="16" r="3.1" fill="#fff"/><circle cx="31.8" cy="16.4" r="1.6" fill="#222"/>
      <path d="M21 21.5 q3 2.4 6 0" stroke="#222" stroke-width="1.4" fill="none" stroke-linecap="round"/>
      <text x="24" y="31.5" text-anchor="middle" font-size="${han.length>2?8:11}"
            font-family="'Malgun Gothic','Apple SD Gothic Neo',sans-serif" font-weight="800" fill="#222">${han}</text>
      <circle cx="8.5" cy="25" r="2.6" fill="${shade}"/><circle cx="39.5" cy="25" r="2.6" fill="${shade}"/>
    </svg>`;
  }
  function badgeSvg(key){
    const b = badges.find(x=>x.key===key);
    if (!b) return "";
    return badge(b.color, b.ring);
  }
  function skinSvg(name){ return skins[name] || spriteMap.player; }

  return { get, badges, badgeSvg, skins, skinSvg, skinDefs, wordSpirit };
})();
