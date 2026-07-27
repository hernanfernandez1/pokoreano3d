/* ==========================================================
   POKOREANO — Modo historia: misiones, capítulos y nivel
   Cada capítulo enseña algo y desbloquea un gimnasio.
   ========================================================== */
const Quests = (() => {

  const XP_PER_LEVEL = 15;
  function level(){ return Math.floor((State.get().xp||0)/XP_PER_LEVEL) + 1; }
  function xpIntoLevel(){ return (State.get().xp||0) % XP_PER_LEVEL; }

  // Nivel mínimo para cada gimnasio
  const GYM_LEVEL = {
    hangul:2, numeros:3, particulas:4, verbos:6,
    honor:8, topik1:10, topik2:12, maestro:14,
  };

  // Misiones en orden. `unlocks` abre ese gimnasio al completarla.
  const QUESTS = [
    { cap:1, title:"Preséntate ante la alcaldesa", desc:"Cruza la puerta oeste hacia el pueblo 마을 y habla con la alcaldesa en la alcaldía.",
      goal:{ type:"talk", npc:"alcalde" } },
    { cap:1, title:"Tus primeras palabras", desc:"Camina por la hierba alta y vence 3 palabras salvajes.",
      goal:{ type:"words", n:3 }, unlocks:"hangul" },

    { cap:2, title:"Visita la tienda", desc:"Habla con el tendero de la tienda 상점 (junto al cruce).",
      goal:{ type:"talk", npc:"tendero" } },
    { cap:2, title:"Tu primer guardián", desc:"Pisa arbustos redondos y captura 1 guardián.",
      goal:{ type:"guardian", n:1 }, unlocks:"numeros" },

    { cap:3, title:"La sabiduría de la abuela", desc:"Busca a la abuela 할머니 cerca del cruce y habla con ella.",
      goal:{ type:"talk", npc:"abuela" } },
    { cap:3, title:"Práctica constante", desc:"Vence 6 palabras salvajes más.",
      goal:{ type:"words", n:6 }, unlocks:"particulas" },

    { cap:4, title:"El muelle de pesca", desc:"Ve al muelle de la playa y pesca 3 peces respondiendo bien.",
      goal:{ type:"fish", n:3 }, unlocks:"verbos" },

    { cap:5, title:"El monje del sur", desc:"Encuentra al monje 스님 cerca de la costa y habla con él.",
      goal:{ type:"talk", npc:"monje" } },
    { cap:5, title:"Más guardianes", desc:"Captura 2 guardianes más en los arbustos.",
      goal:{ type:"guardian", n:2 }, unlocks:"honor" },

    { cap:6, title:"Rumbo al TOPIK", desc:"Vence 10 palabras salvajes más.",
      goal:{ type:"words", n:10 }, unlocks:"topik1" },

    { cap:7, title:"La fan de K-pop", desc:"Habla con la fan 팬 en la playa este.",
      goal:{ type:"talk", npc:"fan" } },
    { cap:7, title:"Debut en el norebang", desc:"Ve al 노래방 del pueblo y canta al menos 1 frase bien al micrófono.",
      goal:{ type:"sing", n:1 } },
    { cap:7, title:"Pesca mayor", desc:"Pesca 4 peces más en el muelle.",
      goal:{ type:"fish", n:4 }, unlocks:"topik2" },

    { cap:8, title:"El guardia de la cueva", desc:"Habla con el guardia frente a la cueva del bosque (noreste).",
      goal:{ type:"talk", npc:"guardia" } },
    { cap:8, title:"Equipo completo", desc:"Captura 1 guardián más para completar tu equipo.",
      goal:{ type:"guardian", n:1 }, unlocks:"maestro" },
  ];

  function current(){
    const s = State.get();
    return QUESTS[s.questIdx] || null;
  }
  function isDone(){ return State.get().questIdx >= QUESTS.length; }

  // gimnasios desbloqueados por misiones ya completadas
  function isGymUnlocked(key){
    const s = State.get();
    for (let i=0; i<s.questIdx; i++){
      if (QUESTS[i].unlocks === key) return true;
    }
    return false;
  }
  function gymLevelReq(key){ return GYM_LEVEL[key] || 1; }

  // avisar de un evento del juego: "talk"(npcKey) | "words" | "guardian" | "fish"
  function notify(type, key){
    const q = current();
    if (!q) return;
    const s = State.get();
    const g = q.goal;
    let advanced = false;
    if (g.type === "talk" && type === "talk" && key === g.npc){
      advanced = true; s.questProg = 1;
    } else if (g.type === type && ["words","guardian","fish","sing"].includes(type)){
      s.questProg++;
      advanced = s.questProg >= g.n;
    } else {
      return;
    }
    State.save();
    if (advanced){
      // misión completada
      s.questIdx++; s.questProg = 0;
      State.addCoins(50);
      State.addXp(10);
      State.save();
      Sfx.play("badge");
      const next = current();
      let msg = `📜 ¡Misión completada! +50 monedas · +10 XP`;
      if (q.unlocks){
        const gym = Data.gyms.find(x=>x.key===q.unlocks);
        msg += ` · ¡${gym.name} desbloqueado!`;
      }
      UI.toast(msg, 3200);
      if (next) setTimeout(() => UI.toast(`📜 Nueva misión: ${next.title}`, 3000), 3400);
    } else {
      UI.toast(`📜 ${q.title}: ${s.questProg}/${g.n}`, 1500);
    }
    UI.updateQuestBanner();
    UI.refreshTopbar();
  }

  return { QUESTS, current, isDone, isGymUnlocked, gymLevelReq, notify, level, xpIntoLevel, XP_PER_LEVEL, GYM_LEVEL };
})();
