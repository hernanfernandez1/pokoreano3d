/* ==========================================================
   POKOREANO — 수호신 Guardianes (criaturas del folclore coreano)
   Sprites pixel-art SVG 16x16 propios (CC0).
   ========================================================== */
const Creatures = (() => {

  function grid(palette, rows){
    let cells = "";
    for (let y=0;y<rows.length;y++){
      const row = rows[y];
      for (let x=0;x<row.length;x++){
        const c = row[x];
        if (c==="."||c===" ") continue;
        const color = palette[c];
        if (!color) continue;
        cells += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">${cells}</svg>`;
  }

  const sprites = {
    tokki: grid({K:"#222",W:"#f5f0ea",P:"#f2a6c0",E:"#222"},[
      "...K....K.......",
      "..KWK..KWK......",
      "..KWPK.KPWK.....",
      "..KWPK.KPWK.....",
      "..KWWK.KWWK.....",
      "..KWWKKKWWK.....",
      ".KWWWWWWWWWK....",
      ".KWEWWWWWEWK....",
      ".KWWWWWWWWWK....",
      ".KWWWPPWWWWK....",
      "..KWWWWWWWK.....",
      ".KWWWWWWWWWK....",
      ".KWWWWWWWWWK....",
      ".KWWKWWWKWWK....",
      "..KKKWWWKKK.....",
      "....KKKKK.......",
    ]),
    kkachi: grid({K:"#181818",W:"#f5f0ea",B:"#3f6fb5",Y:"#e8b84b",E:"#fff"},[
      "................",
      ".....KKKK.......",
      "....KKKKKK......",
      "...KKEKKKKK.....",
      "...KKKKKKKKYY...",
      "....KKKKKKK.....",
      "...KWWWWKKK.....",
      "..KWWWWWKBK.....",
      ".KWWWWWWKBBK....",
      ".KWWWWWKKBBK....",
      ".KWWWWKKKBK.....",
      "..KWWKKKKK......",
      "...KKKKKK.......",
      "....KYY.........",
      "....KY..........",
      "................",
    ]),
    gom: grid({K:"#222",B:"#6d4a32",D:"#553826",W:"#e8d8c5",E:"#221510"},[
      "..KK......KK....",
      ".KBBK....KBBK...",
      ".KBDBK..KBDBK...",
      "..KBBKKKKBBK....",
      ".KBBBBBBBBBBK...",
      ".KBEBBBBBBEBK...",
      ".KBBBBWWBBBBK...",
      ".KBBBWWWWBBBK...",
      "..KBBBWWBBBK....",
      ".KBBBBBBBBBBK...",
      ".KBBBBBBBBBBK...",
      ".KBBBBBBBBBBK...",
      ".KBBKBBBBKBBK...",
      "..KKKBBBBKKK....",
      "....KKKKKK......",
      "................",
    ]),
    horangi: grid({K:"#111",O:"#e8862c",S:"#111",W:"#f5f0ea",E:"#111",N:"#e0567a"},[
      "..KK......KK....",
      ".KOOK....KOOK...",
      ".KOSOKKKKOSOK...",
      ".KOOOOOOOOOOK...",
      "KOOSOOOOOOSOOK..",
      "KOOOOOOOOOOOOK..",
      "KOWEWOOOOWEWOK..",
      "KOWWWOOOOWWWOK..",
      "KOOOOWWWWOOOOK..",
      "KOSOOWNWWOOSOK..",
      "KOOOOWWWWOOOOK..",
      ".KOOOOWWOOOOK...",
      ".KOSOOOOOOSOK...",
      "..KOOOOOOOOK....",
      "...KKKKKKKK.....",
      "................",
    ]),
    gumiho: grid({K:"#222",W:"#efe6da",G:"#d8c8b5",E:"#b53f3f",N:"#222"},[
      "..K....K........",
      ".KWK..KWK..GG...",
      ".KWWK.KWWK.GWG..",
      ".KWWKKKWWKGWWG..",
      ".KWWWWWWWKGWG...",
      "KWWWWWWWWWKG....",
      "KWEWWWWWEWWK....",
      "KWWWWWWWWWWKGG..",
      ".KWWWNNWWWKGWWG.",
      ".KWWWWWWWWKGWG..",
      "..KWWWWWWKGWG...",
      ".KWWWWWWWWKG....",
      ".KWWWWWWWWWK....",
      ".KWWKWWWWKWK....",
      "..KKKWWWWKK.....",
      "....KKKKK.......",
    ]),
    hak: grid({K:"#222",W:"#f5f0ea",R:"#d43d3d",B:"#222",Y:"#e8b84b"},[
      "......RR........",
      ".....KWWK.......",
      ".....KWWKY......",
      ".....KBWK.......",
      ".....KBK........",
      ".....KBK........",
      "....KWWK........",
      "...KWWWWK.......",
      "..KWWWWWWK......",
      ".KWWWWWWWWK.....",
      ".KWWWWWWBWK.....",
      "..KWWWWBBK......",
      "...KWWWWK.......",
      "....KKKK........",
      "....KY.KY.......",
      "................",
    ]),
    geobugi: grid({K:"#222",G:"#5da05d",D:"#3f7a3f",S:"#8a6a44",T:"#6e5436",E:"#173517"},[
      "................",
      "....KKKKKK......",
      "...KSSSSSSK.....",
      "..KSTTSSTTSK....",
      ".KSTTSSSSTTSK...",
      ".KSSSSTTSSSSK...",
      ".KSTTSSSSTTSK...",
      ".KSSSSTTSSSSK...",
      "..KSSSSSSSSK....",
      "KGKKKKKKKKKKGK..",
      "KGGK.KGGK.KGGK..",
      ".KK.KGEGGK.KK...",
      "....KGGGGK......",
      ".....KKKK.......",
      "................",
      "................",
    ]),
    haetae: grid({K:"#222",B:"#5f7fb8",D:"#41598a",W:"#f5f0ea",E:"#fff",Y:"#e8b84b"},[
      "..KKK...KKK.....",
      ".KDDDK.KDDDK....",
      ".KDBDDKDDBDK....",
      ".KDDDDDDDDDK....",
      "KDBBBBBBBBBDK...",
      "KDBEBBBBBEBDK...",
      "KDBBBBBBBBBDK...",
      "KDBBWWWWWBBDK...",
      ".KDBWYYWBBDK....",
      ".KDBBWWBBBDK....",
      "KDDBBBBBBBDDK...",
      "KDBBBBBBBBBDK...",
      ".KBBKBBBKBBK....",
      "..KKKBBBKKK.....",
      "....KKKKK.......",
      "................",
    ]),
    dokkaebi: grid({K:"#222",R:"#c8503c",D:"#933a2c",Y:"#e8b84b",E:"#fff",T:"#7a5230"},[
      "......KK........",
      "......KYK.......",
      "....KKKYKK......",
      "...KRRRRRRK.....",
      "..KRRRRRRRRK....",
      ".KRRERRRERRK....",
      ".KRRRRRRRRRK.T..",
      ".KRRRYYRRRRKKTK.",
      ".KRRYRRYRRRK.TK.",
      "..KRRRRRRRK..TK.",
      ".KRRRRRRRRRK.TK.",
      ".KRRRRRRRRRKKTK.",
      ".KRRKRRRKRRK.T..",
      "..KKKRRRKKK.....",
      "....KKKKK.......",
      "................",
    ]),
    yong: grid({K:"#12262b",T:"#3fa9a0",D:"#2b7a74",Y:"#e8b84b",E:"#ffdf6b",W:"#f5f0ea"},[
      "..KK..KK........",
      ".KYYK.KYYK......",
      "..KYKKKYK.......",
      ".KTTTTTTTK......",
      "KTTTTTTTTTK.....",
      "KTETTTTTETK.....",
      "KTTTTTTTTTK.....",
      "KDTTWWWWTTTK....",
      ".KTTWWWWTTK.....",
      "..KDTTTTDK.KK...",
      "...KDTTTDKKTTK..",
      "....KDTTTTTTDK..",
      ".....KDTTTTDK...",
      "......KDDDDK....",
      ".......KKKK.....",
      "................",
    ]),
    sansin: grid({K:"#222",S:"#e8c9a1",W:"#f0ece4",G:"#8b93a5",D:"#6b7385",E:"#26303f"},[
      "....KKKKKK......",
      "...KGGGGGGK.....",
      "..KGGGGGGGGK....",
      "..KGSSSSSSGK....",
      ".KGSSSSSSSSGK...",
      ".KGSESSSSESGK...",
      ".KGSSSSSSSSGK...",
      "..KSWWWWWWSK....",
      "..KWWWWWWWWK....",
      ".KWWWWWWWWWWK...",
      ".KDWWWWWWWWDK...",
      ".KDDWWWWWWDDK...",
      ".KDDDWWWWDDDK...",
      ".KDDDDDDDDDDK...",
      "..KKKKKKKKKK....",
      "................",
    ]),
    bonghwang: grid({K:"#331111",R:"#e0563c",O:"#f2903c",Y:"#ffd166",E:"#fff",F:"#ffdf6b"},[
      "......KK...F....",
      ".....KRRK.F.F...",
      "....KRRRRKF.....",
      "...KRERRRK.F....",
      "...KRRRRRKYK....",
      "....KRRRRK......",
      "...KORRRROK.....",
      "..KOORRRROOK....",
      ".KOOORRRROOOK...",
      ".KOOORRRROOOK...",
      "..KOORRRROOK....",
      "...KYRRRRYK.....",
      "....KYRRYK.FF...",
      ".....KYYK.FYYF..",
      "......KYK.FF....",
      ".......K........",
    ]),
  };

  // Habilidades primitivas: eliminate2, eliminate1, skip, retry, hint, shield, swap, phoenix
  const CREATURES = [
    { key:"tokki",    ko:"토끼",   rom:"tokki",       es:"Conejo lunar",     emoji:"🐰", biome:"pradera", rarity:"common", type:"hangul",
      ability:{ id:"skip", name:"Salto lunar", desc:"Salta una pregunta sin contar como fallo." } },
    { key:"kkachi",   ko:"까치",   rom:"kkachi",      es:"Urraca de la suerte", emoji:"🐦", biome:"pradera", rarity:"common", type:"numeros",
      ability:{ id:"hint", name:"Canto", desc:"Revela la romanización de la pregunta." } },
    { key:"gom",      ko:"곰",     rom:"gom",         es:"Osa de Dangun",    emoji:"🐻", biome:"pradera", rarity:"rare",   type:"topik1",
      ability:{ id:"eliminate1", name:"Zarpazo", desc:"Elimina 1 opción incorrecta." } },
    { key:"horangi",  ko:"호랑이", rom:"horangi",     es:"Tigre guardián",   emoji:"🐯", biome:"bosque",  rarity:"rare",   type:"verbos",
      ability:{ id:"eliminate2", name:"Rugido", desc:"Elimina 2 opciones incorrectas." } },
    { key:"gumiho",   ko:"구미호", rom:"gumiho",      es:"Zorro de 9 colas", emoji:"🦊", biome:"bosque",  rarity:"epic",   type:"particulas",
      ability:{ id:"swap", name:"Ilusión", desc:"Cambia la pregunta por otra." } },
    { key:"hak",      ko:"학",     rom:"hak",         es:"Grulla sabia",     emoji:"🕊️", biome:"bosque",  rarity:"rare",   type:"honor",
      ability:{ id:"retry", name:"Gracia", desc:"Si fallas la siguiente, reintenta sin castigo." } },
    { key:"geobugi",  ko:"거북이", rom:"geobugi",     es:"Tortuga de jade",  emoji:"🐢", biome:"costa",   rarity:"common", type:"topik1",
      ability:{ id:"shield", name:"Caparazón", desc:"El primer fallo del examen no cuenta (pasivo)." } },
    { key:"haetae",   ko:"해태",   rom:"haetae",      es:"León de justicia", emoji:"🦁", biome:"costa",   rarity:"epic",   type:"honor",
      ability:{ id:"eliminate2", name:"Juicio", desc:"Elimina 2 opciones incorrectas." } },
    { key:"yong",     ko:"용",     rom:"yong",        es:"Dragón de agua",   emoji:"🐉", biome:"costa",   rarity:"legend", type:"maestro",
      ability:{ id:"dragon", name:"Aliento", desc:"Elimina 2 opciones y revela la romanización." } },
    { key:"dokkaebi", ko:"도깨비", rom:"dokkaebi",    es:"Duende travieso",  emoji:"👹", biome:"cueva",   rarity:"rare",   type:"numeros",
      ability:{ id:"swap", name:"Trueque", desc:"Cambia la pregunta por otra." } },
    { key:"sansin",   ko:"산신령", rom:"sansillyeong",es:"Espíritu del monte", emoji:"🧙", biome:"cueva",  rarity:"epic",   type:"topik2",
      ability:{ id:"hintretry", name:"Sabiduría", desc:"Revela la romanización y protege esta pregunta." } },
    { key:"bonghwang",ko:"봉황",   rom:"bonghwang",   es:"Fénix coreano",    emoji:"🔥", biome:"cueva",   rarity:"legend", type:"maestro",
      ability:{ id:"phoenix", name:"Renacer", desc:"Si suspendes por 1 pregunta, apruebas igual (pasivo)." } },
  ];

  const RARITY = {
    common: { label:"COMÚN",      color:"#9aa0b4", weight:0.60, streak:2 },
    rare:   { label:"RARO",       color:"#3fa9f5", weight:0.28, streak:2 },
    epic:   { label:"ÉPICO",      color:"#a259ff", weight:0.10, streak:3 },
    legend: { label:"LEGENDARIO", color:"#ffd166", weight:0.02, streak:3 },
  };

  function byKey(key){ return CREATURES.find(c=>c.key===key); }
  function byBiome(biome){ return CREATURES.filter(c=>c.biome===biome); }

  // roll a creature for a bush in the given biome (null = nothing)
  function roll(biome){
    const pool = byBiome(biome);
    if (!pool.length) return null;
    const r = Math.random();
    let acc = 0;
    // order legend→common so rare rolls win first
    const order = ["legend","epic","rare","common"];
    for (const rar of order){
      acc += RARITY[rar].weight;
      if (r < acc){
        const cands = pool.filter(c=>c.rarity===rar);
        if (cands.length) return cands[Math.random()*cands.length|0];
      }
    }
    const commons = pool.filter(c=>c.rarity==="common");
    return commons[Math.random()*commons.length|0] || pool[0];
  }

  // ---------- XP / niveles ----------
  const XP_PER_LEVEL = 15;
  function levelOf(xp){ return Math.floor((xp||0)/XP_PER_LEVEL) + 1; }
  function isEvolved(xp){ return levelOf(xp) >= 5; }

  function sprite(key){ return sprites[key] || ""; }

  // ---------- MASCOTAS (te siguen por el mapa; se compran en la tienda) ----------
  const petSprites = {
    ppollo: grid({K:"#7a5210",Y:"#ffd94a",O:"#f28c28",W:"#fff"},[
      "................",
      "................",
      "................",
      "................",
      "....KKKK........",
      "...KYYYYK.......",
      "..KYWKYYYK......",
      "..KYYYYYYK......",
      "..KYYYYYYKO.....",
      "...KYYYYOK......",
      "..KYYYYYYK......",
      "..KYYYYYYK......",
      "...KYYYYK.......",
      "....KOKOK.......",
      "....KK.KK.......",
      "................",
    ]),
    pconejo: grid({K:"#6b5a42",B:"#e3cba4",W:"#f8f4ec",P:"#f2a6c0",E:"#4a3826"},[
      "................",
      "...K...K........",
      "..KBK.KBK.......",
      "..KBPKKPBK......",
      "..KBPK.PBK......",
      "..KBBKKBBK......",
      "..KBBBBBBK......",
      ".KBEBBBBEBK.....",
      ".KBBWPPWBBK.....",
      ".KBBWWWWBBK.....",
      ".KBWWWWWWBK.....",
      "..KBWWWWBBKW....",
      "..KBWWWWBBKK....",
      "...KBKWWKBK.....",
      "....KK..KK......",
      "................",
    ]),
    pperro: grid({K:"#3d2a17",B:"#8a5a2b",D:"#6e4620",W:"#f0e6d8",E:"#2a1c0e",N:"#1c1209"},[
      "................",
      "..KK.....KK.....",
      ".KDDK...KDDK....",
      ".KDDDK.KDDDK....",
      "..KBBBBBBBK.....",
      ".KBBBBBBBBBK....",
      ".KBEBBBBBEBK....",
      ".KBBBWWWBBBK....",
      ".KBBBWNWBBBK....",
      "..KBBWWWBBK.....",
      ".KBBBBBBBBBK..K.",
      ".KBBBBBBBBBK.KDK",
      ".KBBBBBBBBBKKDK.",
      "..KBKBBBKBKDK...",
      "...KK...KK......",
      "................",
    ]),
    pgato: grid({K:"#333",G:"#9aa0b4",D:"#7c8299",W:"#f5f0ea",E:"#3fa96f",N:"#e0567a"},[
      "................",
      "..K.....K.......",
      ".KGK...KGK......",
      ".KGDK.KDGK......",
      ".KGGGGGGGK......",
      "KGGGGGGGGGK.....",
      "KGEGGGGGEGK.....",
      "KGGGWWWGGGK.....",
      "KGGGWNWGGGK.....",
      ".KGGWWWGGK......",
      ".KGGGGGGGGK..K..",
      ".KGGGGGGGGK.KDK.",
      ".KGGGGGGGGKKDK..",
      "..KGKGGKGKDK....",
      "...KK..KK.......",
      "................",
    ]),
  };
  const PETS = [
    { key:"ppollo",  ko:"병아리", rom:"byeongari", es:"Pollito", price:100, emoji:"🐤" },
    { key:"pconejo", ko:"토끼",   rom:"tokki",     es:"Chewie",  price:150, emoji:"🐇" },
    { key:"pgato",   ko:"고양이", rom:"goyangi",   es:"Gato",    price:200, emoji:"🐱" },
    { key:"pperro",  ko:"강아지", rom:"gangaji",   es:"Perrito", price:250, emoji:"🐶" },
  ];
  function petByKey(key){ return PETS.find(p=>p.key===key); }
  function petSprite(key){ return petSprites[key] || ""; }

  return { CREATURES, RARITY, byKey, byBiome, roll, sprite, levelOf, isEvolved, XP_PER_LEVEL,
           PETS, petByKey, petSprite };
})();
