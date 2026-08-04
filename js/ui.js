/* ==========================================================
   POKOREANO — UI screens & orchestration
   ========================================================== */
const UI = (() => {

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  function showScreen(id){
    $$(".screen").forEach(s => s.classList.remove("active"));
    const sc = $("#"+id);
    sc.classList.remove("active");
    void sc.offsetWidth; // reinicia la animación de entrada
    sc.classList.add("active");
  }
  function toast(msg, ms=1600){
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), ms);
  }

  // Sprite de Karol (con la skin activa) para las UIs; fallback al SVG si el mundo no cargó
  function playerSpriteHTML(row=0){
    const url = (typeof World !== "undefined" && World.playerFrameURL) ? World.playerFrameURL(row) : null;
    return url
      ? `<img src="${url}" alt="Karol" style="image-rendering:pixelated;width:100%;height:100%;object-fit:contain">`
      : Sprites.skinSvg(State.get().activeSkin);
  }

  // Texto flotante estilo arcade ("+5", "-25 HP") anclado a un elemento
  function floatText(anchor, txt, cls=""){
    if (!anchor) return;
    const f = document.createElement("div");
    f.className = ("float-txt " + cls).trim();
    f.textContent = txt;
    anchor.appendChild(f);
    setTimeout(() => f.remove(), 1050);
  }

  function updateQuestBanner(){
    const el = $("#quest-banner");
    if (!el) return;
    const q = Quests.current();
    if (!q){ el.textContent = "📜 Historia completada — ¡eres maestra del coreano!"; }
    else {
      const s = State.get();
      const prog = q.goal.n ? ` (${s.questProg}/${q.goal.n})` : "";
      el.textContent = `📜 Cap.${q.cap} · ${q.title}${prog}`;
      el.title = q.desc;
    }
    el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop");
  }

  // Stats de la topbar: bump + "+N" flotante cuando suben
  const _prevStats = {};
  function setStat(sel, key, val){
    const el = $(sel);
    if (!el) return;
    const chip = el.closest(".stat");
    const old = _prevStats[key];
    el.textContent = val;
    if (chip && old !== undefined && old !== val){
      chip.classList.remove("bump"); void chip.offsetWidth; chip.classList.add("bump");
      if (typeof val === "number" && val > old) floatText(chip, `+${val - old}`);
    }
    _prevStats[key] = val;
  }

  function refreshTopbar(){
    const s = State.get();
    $("#player-name").textContent = s.playerName;
    setStat("#stat-level", "level", Quests.level());
    setStat("#stat-badges", "badges", s.badges.length);
    setStat("#stat-vocab", "vocab", Object.keys(s.caughtWords).length);
    setStat("#stat-guardians", "guardians", Object.keys(s.guardians || {}).length);
    setStat("#stat-coins", "coins", s.coins);
    const xpIn = Quests.xpIntoLevel();
    $("#xp-fill").style.width = Math.round(xpIn / Quests.XP_PER_LEVEL * 100) + "%";
    $("#xp-text").textContent = `XP ${xpIn}/${Quests.XP_PER_LEVEL}`;
    $("#player-avatar").innerHTML = playerSpriteHTML(0);
  }

  // ---------- MAP (canvas overworld) ----------
  function renderMap(){
    World.start();
    refreshTopbar();
    updateQuestBanner();
  }

  // ---------- WILD BATTLE ----------
  let battle = null;
  function startWildBattleWord(word){
    battle = {
      word,
      playerHP: 100, enemyHP: 100,
      combo: 0, question: null,
    };
    Sfx.setTheme("battle");
    $("#enemy-sprite").innerHTML = Sprites.wordSpirit(word.han); // el monstruo ES la palabra
    $("#battle-player-sprite").innerHTML = playerSpriteHTML(2); // Karol de espaldas
    $("#battle-player-name").textContent = State.get().playerName;
    $("#enemy-name").textContent = `Palabra salvaje: ${word.han}`;
    showScreen("screen-battle");
    nextBattleQuestion();
  }

  function nextBattleQuestion(){
    if (!battle) return;
    if (battle.enemyHP <= 0) return endBattle(true);
    if (battle.playerHP <= 0) return endBattle(false);

    // Use current wild word or occasionally throw a related one
    const w = battle.word;
    const q = Engine.buildQuestion(w, Data.allWords, "mixed");
    battle.question = q;

    $("#battle-question").innerHTML = q.prompt.han
      ? `<div class="han">${q.prompt.han}</div>${q.prompt.hint?`<div class="rom">${q.prompt.hint}</div>`:""}`
      : `<div>${q.prompt.text}</div>`;
    $("#battle-feedback").textContent = "";

    if (q.prompt.han) Engine.speak(q.prompt.han);

    const opts = $("#battle-options");
    opts.innerHTML = "";
    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = opt;
      b.onclick = () => answerBattle(opt, b);
      opts.appendChild(b);
    });
    // grito de batalla: pronuncia la palabra salvaje = golpe crítico
    if (Speech.available()){
      const mic = document.createElement("button");
      mic.className = "option mic-option";
      mic.textContent = `🎤 ¡Grítala! (di "${battle.word.han}" = crítico x2)`;
      mic.onclick = () => battleShout(mic, q);
      opts.appendChild(mic);
    }
  }

  async function battleShout(btn, q){
    if (!battle) return;
    const target = battle.word.han;
    btn.disabled = true;
    btn.classList.add("listening");
    btn.textContent = "🎙️ Escuchando…";
    $("#battle-feedback").textContent = `Di: "${target}"`;
    $("#battle-feedback").className = "feedback";
    const r = await Speech.listen();
    // la batalla pudo avanzar o terminar mientras escuchaba
    if (!battle || battle.question !== q){ return; }
    btn.disabled = false;
    btn.classList.remove("listening");
    btn.textContent = `🎤 ¡Grítala! (di "${target}" = crítico x2)`;
    if (r.ok && Speech.matches(target, r.transcripts)){
      Sfx.play("ok");
      battle.combo++;
      const dmg = (25 + battle.combo * 5) * 2;
      battle.enemyHP = Math.max(0, battle.enemyHP - dmg);
      $("#battle-feedback").textContent = `💥 ¡GOLPE CRÍTICO DE VOZ! -${dmg} HP`;
      $("#battle-feedback").className = "feedback ok";
      $("#enemy-sprite").classList.add("dmg-flash");
      floatText($("#enemy-sprite"), `-${dmg}`, "crit");
      setTimeout(() => $("#enemy-sprite").classList.remove("dmg-flash"), 350);
      State.catchWord(battle.word);
      State.reviewWord(target, true);
      State.addCoins(2);
      State.addTeamXp(1);
      State.addXp(2);
      updateBattleUI();
      setTimeout(nextBattleQuestion, 900);
    } else {
      const heard = r.transcripts && r.transcripts[0];
      $("#battle-feedback").textContent = heard
        ? `Escuché "${heard}"… el grito falló (sin daño). ¡Responde con los botones o reintenta!`
        : "No te escuché 🙉 — el grito falló (sin daño).";
      $("#battle-feedback").className = "feedback bad";
    }
  }

  function answerBattle(choice, btn){
    const q = battle.question;
    const correct = choice === q.correct;
    if (correct){
      Sfx.play("ok");
      battle.combo++;
      const dmg = 25 + battle.combo * 5;
      battle.enemyHP = Math.max(0, battle.enemyHP - dmg);
      btn.classList.add("ok");
      $("#battle-feedback").textContent = `¡Correcto! -${dmg} HP`;
      $("#battle-feedback").className = "feedback ok";
      $("#enemy-sprite").classList.add("dmg-flash");
      floatText($("#enemy-sprite"), `-${dmg}`, "dmg");
      setTimeout(() => $("#enemy-sprite").classList.remove("dmg-flash"), 350);
      State.catchWord(q.word);
      State.reviewWord(q.word.han, true);
      State.addCoins(1);
      State.addTeamXp(1);
      State.addXp(1);
    } else {
      Sfx.play("bad");
      battle.combo = 0;
      const dmg = 20;
      battle.playerHP = Math.max(0, battle.playerHP - dmg);
      btn.classList.add("bad");
      $("#battle-feedback").textContent = `Fallaste. Respuesta: ${q.correct}`;
      $("#battle-feedback").className = "feedback bad";
      $("#battle-player-sprite").classList.add("dmg-flash");
      floatText($("#battle-player-sprite"), `-${dmg}`, "dmg");
      setTimeout(() => $("#battle-player-sprite").classList.remove("dmg-flash"), 350);
      State.reviewWord(q.word.han, false);
    }
    updateBattleUI();
    setTimeout(nextBattleQuestion, 900);
  }

  function updateBattleUI(){
    setHP($("#enemy-hp"), battle.enemyHP);
    setHP($("#player-hp"), battle.playerHP);
    const c = $("#combo");
    if (c.textContent !== String(battle.combo)){
      c.textContent = battle.combo;
      const lbl = c.closest(".label");
      lbl.classList.remove("bump"); void lbl.offsetWidth; lbl.classList.add("bump");
    }
    c.closest(".label").classList.toggle("hot", battle.combo >= 3);
    refreshTopbar();
  }
  function setHP(el, v){
    el.style.width = v + "%";
    el.classList.toggle("mid", v <= 60 && v > 30);
    el.classList.toggle("low", v <= 30);
  }

  function endBattle(won){
    Sfx.setTheme(World.musicTheme ? World.musicTheme() : "world");
    if (won){
      Sfx.play("coin");
      const coins = 5 + Math.floor(Math.random()*10);
      State.addCoins(coins);
      toast(`¡Capturaste ${battle.word.han}! +${coins} monedas`);
      Quests.notify("words");
      battle = null;
      renderMap();
      showScreen("screen-map");
    } else {
      /* Derrota de verdad, estilo Pokémon: la palabra te deja temblando,
         sueltas parte de las monedas y despiertas en tu casa. Sin esto
         perder no costaba nada y las batallas no tensaban. */
      const s = State.get();
      const lost = Math.ceil(s.coins * 0.25);
      if (lost > 0){ s.coins -= lost; State.save(); }
      Sfx.play("fail");
      battle = null;
      renderMap();
      showScreen("screen-map");
      if (World.respawn) World.respawn();
      toast(lost > 0
        ? `😵 Te quedaste sin energía… Despiertas en casa. Se te cayeron ${lost} monedas.`
        : "😵 Te quedaste sin energía… Despiertas en casa.", 3800);
    }
  }

  // ---------- CAPTURA DE GUARDIANES ----------
  let capture = null;
  function startCapture(creature){
    const rm = Creatures.RARITY[creature.rarity];
    capture = { creature, needed: rm.streak, streak: 0 };
    Sfx.play("encounter");
    $("#capture-sprite").innerHTML = Creatures.sprite(creature.key);
    $("#capture-rarity").textContent = rm.label;
    $("#capture-rarity").style.color = rm.color;
    $("#capture-name").textContent = `${creature.ko} ${creature.emoji}`;
    $("#capture-sub").textContent = `${creature.rom} · ${creature.es}`;
    $("#capture-msg").textContent = `¡Responde ${rm.streak} seguidas para capturarlo!`;
    renderCaptureBalls();
    showScreen("screen-capture");
    nextCaptureQuestion();
  }
  function renderCaptureBalls(){
    const el = $("#capture-balls");
    el.innerHTML = "";
    for (let i=0;i<capture.needed;i++){
      const b = document.createElement("span");
      b.className = "ball" + (i < capture.streak ? " on" : "");
      el.appendChild(b);
    }
  }
  function nextCaptureQuestion(){
    if (!capture) return;
    const w = Data.allWords[Math.random()*Data.allWords.length|0];
    const q = Engine.buildQuestion(w, Data.allWords, "mixed");
    capture.question = q;
    $("#capture-question").innerHTML = q.prompt.han
      ? `<div class="han">${q.prompt.han}</div>${q.prompt.hint?`<div class="rom">${q.prompt.hint}</div>`:""}`
      : `<div>${q.prompt.text}</div>`;
    if (q.prompt.han) Engine.speak(q.prompt.han);
    const opts = $("#capture-options");
    opts.innerHTML = "";
    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = opt;
      b.onclick = () => answerCapture(opt, b);
      opts.appendChild(b);
    });
  }
  function answerCapture(choice, btn){
    const q = capture.question;
    Array.from($("#capture-options").children).forEach(c => c.disabled = true);
    if (choice === q.correct){
      Sfx.play("ok");
      btn.classList.add("ok");
      capture.streak++;
      renderCaptureBalls();
      State.catchWord(q.word); State.reviewWord(q.word.han, true); State.addTeamXp(1); State.addXp(1);
      if (capture.streak >= capture.needed){
        const c = capture.creature;
        const isNew = State.catchGuardian(c.key);
        Sfx.play("reveal", c.rarity);
        $("#capture-msg").textContent = isNew
          ? `¡${c.ko} capturado! Se une a tu equipo.`
          : `¡Otro ${c.ko}! Tu guardián gana +10 XP.`;
        Quests.notify("guardian");
        capture = null;
        setTimeout(() => { renderMap(); showScreen("screen-map"); refreshTopbar(); }, 1600);
        return;
      }
      $("#capture-msg").textContent = `¡Bien! ${capture.needed - capture.streak} más…`;
      setTimeout(nextCaptureQuestion, 850);
    } else {
      Sfx.play("bad");
      btn.classList.add("bad");
      State.reviewWord(q.word.han, false);
      $("#capture-msg").textContent = `¡${capture.creature.ko} escapó! Respuesta: ${q.correct}`;
      capture = null;
      setTimeout(() => { renderMap(); showScreen("screen-map"); }, 1500);
    }
  }
  function startCaptureFromWorld(biome){
    const c = Creatures.roll(biome);
    if (c) startCapture(c);
  }

  // ---------- PESCA (muelle) ----------
  let fishing = null;
  const FISH = [
    { emoji:"🐟", ko:"물고기", rom:"mulgogi", es:"pez" },
    { emoji:"🐙", ko:"문어",   rom:"muneo",   es:"pulpo" },
    { emoji:"🦐", ko:"새우",   rom:"saeu",    es:"camarón" },
    { emoji:"🦀", ko:"게",     rom:"ge",      es:"cangrejo" },
    { emoji:"🐠", ko:"열대어", rom:"yeoldaeeo", es:"pez tropical" },
  ];
  function startFishing(){
    const f = FISH[Math.random()*FISH.length|0];
    fishing = { fish: f };
    Sfx.play("encounter");
    $("#capture-sprite").innerHTML = `<div style="font-size:72px;line-height:110px;text-align:center">${f.emoji}</div>`;
    $("#capture-rarity").textContent = "🎣 ¡ALGO PICÓ!";
    $("#capture-rarity").style.color = "#3fa9f5";
    $("#capture-name").textContent = f.ko;
    $("#capture-sub").textContent = `${f.rom} · ${f.es}`;
    $("#capture-msg").textContent = "¡Responde bien para sacarlo del agua!";
    $("#capture-balls").innerHTML = "";
    showScreen("screen-capture");
    // una pregunta rápida
    const w = Data.allWords[Math.random()*Data.allWords.length|0];
    const q = Engine.buildQuestion(w, Data.allWords, "mixed");
    fishing.question = q;
    $("#capture-question").innerHTML = q.prompt.han
      ? `<div class="han">${q.prompt.han}</div>${q.prompt.hint?`<div class="rom">${q.prompt.hint}</div>`:""}`
      : `<div>${q.prompt.text}</div>`;
    if (q.prompt.han) Engine.speak(q.prompt.han);
    const opts = $("#capture-options");
    opts.innerHTML = "";
    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = opt;
      b.onclick = () => answerFishing(opt, b);
      opts.appendChild(b);
    });
  }
  function answerFishing(choice, btn){
    const q = fishing.question;
    Array.from($("#capture-options").children).forEach(c => c.disabled = true);
    if (choice === q.correct){
      Sfx.play("coin");
      btn.classList.add("ok");
      const coins = 8 + Math.floor(Math.random()*10);
      State.addCoins(coins);
      State.catchWord(q.word); State.reviewWord(q.word.han, true);
      State.addTeamXp(1); State.addXp(1);
      $("#capture-msg").textContent = `¡Pescaste un ${fishing.fish.ko} (${fishing.fish.es})! +${coins} monedas`;
      Quests.notify("fish");
    } else {
      Sfx.play("bad");
      btn.classList.add("bad");
      State.reviewWord(q.word.han, false);
      $("#capture-msg").textContent = `Se escapó… La respuesta era: ${q.correct}`;
    }
    fishing = null;
    setTimeout(() => { renderMap(); showScreen("screen-map"); refreshTopbar(); }, 1500);
  }

  // ---------- CAFÉ (카페): vocabulario de comida ----------
  const FOODS = [
    { emoji:"🍚", ko:"밥",     rom:"bap",       es:"arroz" },
    { emoji:"🍜", ko:"라면",   rom:"ramyeon",   es:"ramen" },
    { emoji:"🍗", ko:"치킨",   rom:"chikin",    es:"pollo frito" },
    { emoji:"☕", ko:"커피",   rom:"keopi",     es:"café" },
    { emoji:"🍵", ko:"차",     rom:"cha",       es:"té" },
    { emoji:"🥟", ko:"만두",   rom:"mandu",     es:"empanadilla" },
    { emoji:"🍲", ko:"김치찌개", rom:"kimchi-jjigae", es:"guiso de kimchi" },
    { emoji:"🧋", ko:"버블티", rom:"beobeulti", es:"té de burbujas" },
    { emoji:"🍰", ko:"케이크", rom:"keikeu",    es:"pastel" },
    { emoji:"🥤", ko:"주스",   rom:"juseu",     es:"jugo" },
  ];
  const shuffle = a => a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(p=>p[1]);
  let cafe = null;
  function startCafe(){
    const f = FOODS[Math.random()*FOODS.length|0];
    cafe = { food: f };
    Sfx.play("blip");
    $("#capture-sprite").innerHTML = `<div style="font-size:72px;line-height:110px;text-align:center">${f.emoji}</div>`;
    $("#capture-rarity").textContent = "☕ MENÚ";
    $("#capture-rarity").style.color = "#e8a24a";
    $("#capture-name").textContent = f.ko;
    $("#capture-sub").textContent = f.rom;
    $("#capture-msg").textContent = "¿Qué significa esta palabra?";
    $("#capture-balls").innerHTML = "";
    $("#capture-question").innerHTML = `<div class="han">${f.ko}</div><div class="rom">${f.rom}</div>`;
    Engine.speak(f.ko);
    const distract = shuffle(FOODS.filter(x=>x!==f)).slice(0,3);
    const options = shuffle([f, ...distract]);
    const opts = $("#capture-options");
    opts.innerHTML = "";
    options.forEach(o => {
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = o.es;
      b.onclick = () => answerCafe(o===f, b);
      opts.appendChild(b);
    });
    showScreen("screen-capture");
  }
  function answerCafe(correct, btn){
    Array.from($("#capture-options").children).forEach(c => c.disabled = true);
    if (correct){
      Sfx.play("coin");
      btn.classList.add("ok");
      const coins = 6 + Math.floor(Math.random()*8);
      State.addCoins(coins); State.addXp(1); State.addTeamXp(1);
      $("#capture-msg").textContent = `¡Correcto! Sirves un ${cafe.food.es}. +${coins} monedas`;
    } else {
      Sfx.play("bad");
      btn.classList.add("bad");
      $("#capture-msg").textContent = `${cafe.food.ko} = ${cafe.food.es}`;
    }
    cafe = null;
    setTimeout(() => { renderMap(); showScreen("screen-map"); refreshTopbar(); }, 1500);
  }

  // ---------- ACADEMIA (학원): clase de repaso ----------
  let clazz = null;
  function startClass(){
    const s = State.get();
    const caught = Object.keys(s.caughtWords)
      .map(han => Data.allWords.find(w => w.han === han))
      .filter(Boolean);
    const pool = caught.length >= 4 ? caught : Data.allWords;
    const words = shuffle(pool.slice()).slice(0, 5);
    clazz = { idx:0, total:words.length, hits:0, words };
    Sfx.play("blip");
    $("#capture-sprite").innerHTML = `<div style="font-size:64px;line-height:110px;text-align:center">📚</div>`;
    $("#capture-rarity").textContent = "📚 CLASE DE REPASO";
    $("#capture-rarity").style.color = "#7fd8ff";
    $("#capture-name").textContent = "학원";
    $("#capture-sub").textContent = "hagwon · academia";
    showScreen("screen-capture");
    nextClassQuestion();
  }
  function nextClassQuestion(){
    if (!clazz) return;
    if (clazz.idx >= clazz.total) return finishClass();
    const w = clazz.words[clazz.idx];
    const q = Engine.buildQuestion(w, Data.allWords, "mixed");
    clazz.q = q;
    $("#capture-balls").innerHTML = "";
    for (let i=0;i<clazz.total;i++){
      const b = document.createElement("span");
      b.className = "ball" + (i<clazz.idx ? " on" : "");
      $("#capture-balls").appendChild(b);
    }
    $("#capture-msg").textContent = `Pregunta ${clazz.idx+1} de ${clazz.total}`;
    $("#capture-question").innerHTML = q.prompt.han
      ? `<div class="han">${q.prompt.han}</div>${q.prompt.hint?`<div class="rom">${q.prompt.hint}</div>`:""}`
      : `<div>${q.prompt.text}</div>`;
    if (q.prompt.han) Engine.speak(q.prompt.han);
    const opts = $("#capture-options");
    opts.innerHTML = "";
    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = opt;
      b.onclick = () => answerClass(opt, b);
      opts.appendChild(b);
    });
  }
  function answerClass(choice, btn){
    const q = clazz.q;
    Array.from($("#capture-options").children).forEach(c => c.disabled = true);
    if (choice === q.correct){
      Sfx.play("ok"); btn.classList.add("ok");
      clazz.hits++;
      State.reviewWord(q.word.han, true); State.addXp(1); State.addTeamXp(1);
    } else {
      Sfx.play("bad"); btn.classList.add("bad");
      State.reviewWord(q.word.han, false);
    }
    clazz.idx++;
    setTimeout(nextClassQuestion, 850);
  }
  function finishClass(){
    const hits = clazz.hits, total = clazz.total;
    clazz = null;
    const bonus = hits * 6;
    State.addCoins(bonus);
    Sfx.play(hits === total ? "badge" : "coin");
    toast(`📚 Clase terminada: ${hits}/${total} · +${hits} XP · +${bonus} monedas`, 2600);
    renderMap(); showScreen("screen-map"); refreshTopbar();
  }

  // ---------- NOREBANG (노래방): karaoke con micrófono ----------
  const KARAOKE_LINES = [
    { ko:"안녕하세요",       rom:"annyeonghaseyo",      es:"hola" },
    { ko:"감사합니다",       rom:"gamsahamnida",        es:"gracias" },
    { ko:"사랑해요",         rom:"saranghaeyo",         es:"te quiero" },
    { ko:"잘 지내요",        rom:"jal jinaeyo",         es:"¿cómo estás?" },
    { ko:"화이팅",           rom:"hwaiting",            es:"¡ánimo!" },
    { ko:"맛있어요",         rom:"masisseoyo",          es:"está delicioso" },
    { ko:"좋아요",           rom:"joayo",               es:"me gusta" },
    { ko:"만나서 반가워요",  rom:"mannaseo bangawoyo",  es:"encantada de conocerte" },
    { ko:"잘 가요",          rom:"jal gayo",            es:"adiós (que te vaya bien)" },
    { ko:"노래를 불러요",    rom:"noraereul bulleoyo",  es:"canto una canción" },
  ];
  let karaoke = null;
  function startKaraoke(){
    if (!Speech.available()){
      // sin micrófono: la DJ te deja tararear para no bloquear la historia
      toast("Sin micrófono la DJ te deja tararear 🎵 (usa Chrome/Edge para cantar de verdad).", 3200);
      Quests.notify("sing");
      return;
    }
    const lines = shuffle(KARAOKE_LINES.slice()).slice(0, 3);
    karaoke = { idx:0, hits:0, tries:0, lines };
    $("#capture-sprite").innerHTML = `<div style="font-size:64px;line-height:110px;text-align:center">🎤</div>`;
    $("#capture-rarity").textContent = "🎶 NOREBANG";
    $("#capture-rarity").style.color = "#ff70a6";
    $("#capture-name").textContent = "노래방";
    $("#capture-sub").textContent = "noraebang · karaoke";
    showScreen("screen-capture");
    nextKaraokeLine();
  }
  function nextKaraokeLine(){
    if (!karaoke) return;
    if (karaoke.idx >= karaoke.lines.length) return finishKaraoke();
    const L = karaoke.lines[karaoke.idx];
    karaoke.tries = 0;
    $("#capture-balls").innerHTML = "";
    for (let i=0;i<karaoke.lines.length;i++){
      const b = document.createElement("span");
      b.className = "ball" + (i<karaoke.idx ? " on" : "");
      $("#capture-balls").appendChild(b);
    }
    $("#capture-msg").textContent = `Frase ${karaoke.idx+1} de ${karaoke.lines.length} — escúchala y repítela`;
    $("#capture-question").innerHTML =
      `<div class="han">${L.ko}</div><div class="rom">${L.rom} · ${L.es}</div>`;
    Engine.speak(L.ko);
    const opts = $("#capture-options");
    opts.innerHTML = "";
    const hear = document.createElement("button");
    hear.className = "option";
    hear.textContent = "🔊 Escuchar otra vez";
    hear.onclick = () => Engine.speak(L.ko);
    const sing = document.createElement("button");
    sing.className = "option";
    sing.textContent = "🎤 ¡Cantar!";
    sing.onclick = () => singLine(sing);
    const skipB = document.createElement("button");
    skipB.className = "option";
    skipB.textContent = "⏭ Pasar";
    skipB.onclick = () => { karaoke.idx++; nextKaraokeLine(); };
    opts.appendChild(hear); opts.appendChild(sing); opts.appendChild(skipB);
  }
  async function singLine(btn){
    if (!karaoke) return;
    const L = karaoke.lines[karaoke.idx];
    btn.disabled = true;
    btn.classList.add("listening");
    btn.textContent = "🎙️ Escuchando…";
    $("#capture-msg").textContent = `Di: "${L.ko}"`;
    const r = await Speech.listen();
    if (!karaoke) return;
    btn.disabled = false;
    btn.classList.remove("listening");
    btn.textContent = "🎤 ¡Cantar!";
    if (r.ok && Speech.matches(L.ko, r.transcripts)){
      Sfx.play("ok");
      karaoke.hits++;
      State.addXp(2); State.addTeamXp(1);
      Quests.notify("sing");
      $("#capture-msg").textContent = `✨ ¡Genial! Dijiste "${r.transcripts[0]}"`;
      karaoke.idx++;
      setTimeout(nextKaraokeLine, 1100);
    } else {
      karaoke.tries++;
      Sfx.play("bad");
      const heard = r.transcripts && r.transcripts[0];
      if (karaoke.tries >= 2){
        $("#capture-msg").textContent = heard
          ? `Escuché "${heard}"… pasamos a la siguiente 🎵`
          : "No te escuché… pasamos a la siguiente 🎵";
        karaoke.idx++;
        setTimeout(nextKaraokeLine, 1300);
      } else {
        $("#capture-msg").textContent = heard
          ? `Escuché "${heard}" — ¡un intento más!`
          : "No te escuché 🙉 — ¡un intento más!";
      }
    }
  }
  function finishKaraoke(){
    const hits = karaoke.hits, total = karaoke.lines.length;
    karaoke = null;
    const coins = hits * 10;
    State.addCoins(coins);
    Sfx.play(hits === total ? "badge" : "coin");
    toast(`🎤 Karaoke: ${hits}/${total} · +${hits*2} XP · +${coins} monedas`, 2800);
    renderMap(); showScreen("screen-map"); refreshTopbar();
  }

  // ---------- DUELO DE PRONUNCIACIÓN (vs Rina) ----------
  let duel = null;
  function startDuel(){
    if (!Speech.available()){
      toast("El duelo necesita micrófono (Chrome o Edge).", 2600);
      return;
    }
    const s = State.get();
    const caught = Object.keys(s.caughtWords)
      .map(han => Data.allWords.find(w => w.han === han))
      .filter(Boolean);
    const pool = caught.length >= 3 ? caught : Data.allWords;
    duel = { idx:0, me:0, rival:0, words: shuffle(pool.slice()).slice(0,3) };
    $("#capture-sprite").innerHTML = `<div style="font-size:64px;line-height:110px;text-align:center">🎤⚡</div>`;
    $("#capture-rarity").textContent = "⚔️ DUELO DE PRONUNCIACIÓN";
    $("#capture-rarity").style.color = "#b14aed";
    $("#capture-name").textContent = "리나";
    $("#capture-sub").textContent = "Rina · tu rival";
    showScreen("screen-capture");
    nextDuelWord();
  }
  function duelScore(){ return `TÚ ${duel.me} — ${duel.rival} RINA`; }
  function nextDuelWord(){
    if (!duel) return;
    if (duel.idx >= duel.words.length) return finishDuel();
    const w = duel.words[duel.idx];
    $("#capture-balls").innerHTML = "";
    $("#capture-msg").textContent = `${duelScore()} · Palabra ${duel.idx+1} de ${duel.words.length}`;
    $("#capture-question").innerHTML =
      `<div class="han">${w.han}</div><div class="rom">${w.rom} · ${w.es}</div>`;
    Engine.speak(w.han);
    const opts = $("#capture-options");
    opts.innerHTML = "";
    const hear = document.createElement("button");
    hear.className = "option";
    hear.textContent = "🔊 Escuchar";
    hear.onclick = () => Engine.speak(w.han);
    const go = document.createElement("button");
    go.className = "option mic-option";
    go.textContent = "🎤 Tu turno";
    go.onclick = () => duelTurn(go, w);
    opts.appendChild(hear); opts.appendChild(go);
  }
  async function duelTurn(btn, w){
    if (!duel) return;
    btn.disabled = true;
    btn.classList.add("listening");
    btn.textContent = "🎙️ Escuchando…";
    $("#capture-msg").textContent = `Di: "${w.han}"`;
    const r = await Speech.listen();
    if (!duel) return;
    btn.classList.remove("listening");
    const meHit = r.ok && Speech.matches(w.han, r.transcripts);
    if (meHit){
      duel.me++;
      Sfx.play("ok");
      State.addXp(2); State.addTeamXp(1);
      $("#capture-msg").textContent = `✅ ¡Perfecto! Ahora Rina…`;
    } else {
      const heard = r.transcripts && r.transcripts[0];
      $("#capture-msg").textContent = heard
        ? `❌ Escuché "${heard}"… Ahora Rina…`
        : "❌ No te escuché… Ahora Rina…";
      Sfx.play("bad");
    }
    // turno de Rina (dramático)
    setTimeout(() => {
      if (!duel) return;
      const rivalHit = Math.random() < 0.6;
      if (rivalHit){ duel.rival++; Sfx.play("blip"); }
      $("#capture-msg").textContent =
        (rivalHit ? `Rina lo dijo perfecto 😤 · ` : `¡Rina se trabó! 😝 · `) + duelScore();
      duel.idx++;
      setTimeout(nextDuelWord, 1300);
    }, 1200);
  }
  function finishDuel(){
    const { me, rival } = duel;
    duel = null;
    let msg;
    if (me > rival){
      State.addCoins(40); State.addXp(5);
      Sfx.play("badge");
      msg = `🏆 ¡Ganaste el duelo ${me}-${rival}! +40 monedas · +5 XP`;
    } else if (me === rival){
      State.addCoins(10);
      Sfx.play("coin");
      msg = `🤝 Empate ${me}-${rival}. +10 monedas. ¡La próxima la vences!`;
    } else {
      Sfx.play("fail");
      msg = `😤 Rina ganó ${rival}-${me}… ¡Practica en el Vocabudex y vuelve!`;
    }
    toast(msg, 3200);
    renderMap(); showScreen("screen-map"); refreshTopbar();
  }

  // ---------- GUARDIANES (colección + equipo) ----------
  function renderGuardians(){
    const s = State.get();
    s.guardians = s.guardians || {}; s.team = s.team || [];
    // team bar
    const bar = $("#team-bar");
    bar.innerHTML = "";
    for (let i=0;i<3;i++){
      const k = s.team[i];
      const slot = document.createElement("span");
      slot.className = "team-slot" + (k ? " filled" : "");
      slot.innerHTML = k ? Creatures.sprite(k) : "+";
      bar.appendChild(slot);
    }
    // grid
    const grid = $("#guardians-grid");
    grid.innerHTML = "";
    Creatures.CREATURES.forEach(c => {
      const rec = s.guardians[c.key];
      const rm = Creatures.RARITY[c.rarity];
      const card = document.createElement("div");
      card.className = "guardian-card" + (rec ? "" : " unknown");
      card.style.borderColor = rec ? rm.color : "transparent";
      if (rec){
        const lvl = Creatures.levelOf(rec.xp);
        const evo = Creatures.isEvolved(rec.xp);
        const inTeam = s.team.includes(c.key);
        const pct = Math.round(((rec.xp % Creatures.XP_PER_LEVEL) / Creatures.XP_PER_LEVEL) * 100);
        card.innerHTML = `
          <div class="g-sprite ${evo?"evolved":""}">${Creatures.sprite(c.key)}</div>
          <div class="g-ko">${c.ko} <span class="g-emoji">${c.emoji}</span></div>
          <div class="g-sub">${c.rom} · ${c.es}</div>
          <div class="g-rarity" style="color:${rm.color}">${rm.label}${evo?" ★EVO":""} · Nv.${lvl}</div>
          <div class="g-xp"><div style="width:${pct}%"></div></div>
          <div class="g-ability"><b>${c.ability.name}</b>: ${c.ability.desc}</div>
          <div class="g-type">Afinidad: ${ (Data.gyms.find(g=>g.key===c.type)||{}).name || c.type }</div>
          <button class="btn small ${inTeam?"danger":""}" data-team="${c.key}">${inTeam?"Quitar del equipo":"Añadir al equipo"}</button>
        `;
      } else {
        card.innerHTML = `
          <div class="g-sprite silhouette">${Creatures.sprite(c.key)}</div>
          <div class="g-ko">???</div>
          <div class="g-sub">Vive en: ${c.biome}</div>
          <div class="g-rarity" style="color:${rm.color}">${rm.label}</div>
        `;
      }
      grid.appendChild(card);
    });
    grid.querySelectorAll("[data-team]").forEach(b => {
      b.onclick = () => {
        const k = b.dataset.team;
        const t = State.get().team || [];
        if (t.includes(k)) State.setTeam(t.filter(x=>x!==k));
        else if (t.length >= 3) { toast("El equipo ya tiene 3 guardianes."); return; }
        else State.setTeam([...t, k]);
        renderGuardians();
      };
    });
  }

  // ---------- GYM ----------
  let gym = null;
  function startGym(g){
    gym = { gym: g, idx: 0, hits: 0, skipped: 0, questions: [], done: false,
            retryArmed: false, shieldLeft: 0, phoenix: false, abilities: [] };
    // Equipo de guardianes → habilidades
    const s = State.get();
    (s.team || []).forEach(k => {
      const c = Creatures.byKey(k);
      if (!c) return;
      const rec = s.guardians[k] || { xp:0 };
      const affinity = c.type === g.key;
      let uses = 1 + (affinity ? 1 : 0) + (Creatures.isEvolved(rec.xp) ? 1 : 0);
      if (c.ability.id === "shield"){ gym.shieldLeft += uses; return; }
      if (c.ability.id === "phoenix"){ gym.phoenix = true; return; }
      gym.abilities.push({ creature: c, uses, affinity });
    });
    // Build a shuffled list of unique questions from pool
    const pool = Data.byLevel(g.pool);
    const words = [];
    while (words.length < g.total) {
      const w = pool[Math.random()*pool.length|0];
      words.push(w);
    }
    gym.questions = words.map(w => Engine.buildQuestion(w, Data.allWords, g.questionMode));
    $("#gym-title").textContent = `${g.name} — ${g.leader}`;
    $("#gym-total").textContent = g.total;
    $("#leader-sprite").innerHTML = Sprites.get(g.leaderSprite);
    renderGymAbilities();
    Sfx.setTheme("battle");
    showScreen("screen-gym");
    nextGymQuestion();
  }

  function renderGymAbilities(){
    const el = $("#gym-abilities");
    el.innerHTML = "";
    const passives = [];
    if (gym.shieldLeft > 0) passives.push(`🛡×${gym.shieldLeft}`);
    if (gym.phoenix) passives.push("🔥 Renacer");
    if (passives.length){
      const p = document.createElement("span");
      p.className = "gym-passives";
      p.textContent = passives.join(" · ");
      el.appendChild(p);
    }
    gym.abilities.forEach((a, i) => {
      const b = document.createElement("button");
      b.className = "btn small ability" + (a.affinity ? " affinity" : "");
      b.disabled = a.uses <= 0;
      b.innerHTML = `<span class="ab-sprite">${Creatures.sprite(a.creature.key)}</span> ${a.creature.ability.name} ×${a.uses}`;
      b.title = a.creature.ability.desc + (a.affinity ? " (¡Afinidad con este gimnasio!)" : "");
      b.onclick = () => useAbility(i);
      el.appendChild(b);
    });
  }

  function useAbility(i){
    const a = gym.abilities[i];
    if (!a || a.uses <= 0 || !gym) return;
    const q = gym.questions[gym.idx];
    if (!q) return;
    const id = a.creature.ability.id;
    const wrongBtns = () => Array.from($("#gym-options").children).filter(b => !b.disabled && b.textContent !== q.correct);
    const showHint = () => {
      $("#gym-feedback").textContent = `💡 Romanización: ${q.word.rom}`;
      $("#gym-feedback").style.color = "var(--accent)";
    };
    const eliminate = n => wrongBtns().slice(0, n).forEach(b => { b.disabled = true; b.classList.add("eliminated"); });
    switch(id){
      case "eliminate1": eliminate(1); break;
      case "eliminate2": eliminate(2); break;
      case "hint": showHint(); break;
      case "dragon": eliminate(2); showHint(); break;
      case "skip":
        gym.skipped++; gym.idx++;
        toast(`${a.creature.ko} saltó la pregunta.`);
        a.uses--; Sfx.play("blip"); renderGymAbilities();
        nextGymQuestion();
        return;
      case "swap": {
        const pool = Data.byLevel(gym.gym.pool);
        const w = pool[Math.random()*pool.length|0];
        gym.questions[gym.idx] = Engine.buildQuestion(w, Data.allWords, gym.gym.questionMode);
        toast(`${a.creature.ko} cambió la pregunta.`);
        a.uses--; Sfx.play("blip"); renderGymAbilities();
        nextGymQuestion();
        return;
      }
      case "retry": gym.retryArmed = true; toast(`${a.creature.ko} te protege: la próxima fallada se reintenta.`); break;
      case "hintretry": showHint(); gym.retryArmed = true; break;
    }
    a.uses--;
    Sfx.play("blip");
    renderGymAbilities();
  }

  function nextGymQuestion(){
    if (!gym) return;
    if (gym.idx >= gym.gym.total) return finishGym();
    $("#gym-idx").textContent = gym.idx + 1;
    $("#gym-hits").textContent = gym.hits;
    const q = gym.questions[gym.idx];
    $("#gym-question").innerHTML = q.prompt.han
      ? `<div class="han">${q.prompt.han}</div>${q.prompt.hint?`<div class="rom">${q.prompt.hint}</div>`:""}`
      : `<div>${q.prompt.text}</div>`;
    if (q.prompt.han) Engine.speak(q.prompt.han);
    $("#gym-feedback").textContent = "";
    const opts = $("#gym-options");
    opts.innerHTML = "";
    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "option";
      b.textContent = opt;
      b.onclick = () => answerGym(opt, b, q);
      opts.appendChild(b);
    });
    // responder con la voz (solo si la respuesta correcta es coreana)
    if (Speech.available() && /[㄰-㆏가-힯]/.test(q.correct)){
      const mic = document.createElement("button");
      mic.className = "option mic-option";
      mic.textContent = "🎤 Responder con la voz";
      mic.onclick = () => gymVoiceAnswer(mic, q);
      opts.appendChild(mic);
    }
  }

  async function gymVoiceAnswer(btn, q){
    if (!gym) return;
    btn.disabled = true;
    btn.classList.add("listening");
    btn.textContent = "🎙️ Escuchando…";
    $("#gym-feedback").textContent = "Di la respuesta en coreano…";
    $("#gym-feedback").style.color = "var(--accent)";
    const r = await Speech.listen();
    if (!gym || gym.questions[gym.idx] !== q){ return; }
    btn.disabled = false;
    btn.classList.remove("listening");
    btn.textContent = "🎤 Responder con la voz";
    if (r.ok && Speech.matches(q.correct, r.transcripts)){
      // localizar el botón de la opción correcta y responder con él
      const optBtn = Array.from($("#gym-options").children)
        .find(b => b.textContent === q.correct) || btn;
      answerGym(q.correct, optBtn, q);
      State.addXp(1); // bonus por pronunciarla
    } else {
      const heard = r.transcripts && r.transcripts[0];
      $("#gym-feedback").textContent = heard
        ? `Escuché "${heard}" — no coincide. Puedes reintentar o usar los botones (sin penalización).`
        : "No te escuché 🙉 — reintenta o usa los botones.";
      $("#gym-feedback").style.color = "var(--bad)";
    }
  }

  function answerGym(choice, btn, q){
    const correct = choice === q.correct;
    Array.from($("#gym-options").children).forEach(c => c.disabled = true);
    if (correct){
      Sfx.play("ok");
      btn.classList.add("ok");
      $("#gym-feedback").textContent = "정답! (¡Correcto!)";
      $("#gym-feedback").className = "gym-feedback";
      $("#gym-feedback").style.color = "var(--ok)";
      gym.hits++;
      State.catchWord(q.word);
      State.reviewWord(q.word.han, true);
      State.addTeamXp(1);
      State.addXp(1);
    } else if (gym.retryArmed){
      // Gracia: la fallada se reintenta sin castigo
      gym.retryArmed = false;
      Sfx.play("blip");
      btn.classList.add("bad");
      $("#gym-feedback").textContent = "🕊️ ¡Gracia! Reintenta esta pregunta.";
      $("#gym-feedback").style.color = "var(--accent)";
      setTimeout(nextGymQuestion, 950);
      return; // idx no avanza
    } else if (gym.shieldLeft > 0){
      gym.shieldLeft--;
      gym.hits++;
      Sfx.play("blip");
      btn.classList.add("bad");
      $("#gym-feedback").textContent = `🛡 ¡Caparazón absorbió el fallo! (era: ${q.correct})`;
      $("#gym-feedback").style.color = "var(--accent)";
      renderGymAbilities();
    } else {
      Sfx.play("bad");
      btn.classList.add("bad");
      $("#gym-feedback").textContent = `오답! Respuesta: ${q.correct}`;
      $("#gym-feedback").style.color = "var(--bad)";
      State.reviewWord(q.word.han, false);
    }
    gym.idx++;
    setTimeout(nextGymQuestion, 950);
  }

  function finishGym(){
    Sfx.setTheme(World.musicTheme ? World.musicTheme() : "world");
    const g = gym.gym;
    const effective = Math.max(1, g.total - gym.skipped);
    let ratio = gym.hits / effective;
    // Renacer del fénix: si suspendes por exactamente 1 pregunta, apruebas
    if (ratio < g.passRatio && gym.phoenix && (gym.hits+1)/effective >= g.passRatio){
      ratio = g.passRatio;
      toast("🔥 ¡El fénix renace! Apruebas por los pelos.", 2400);
    }
    State.setGymBest(g.key, ratio);
    if (ratio >= g.passRatio){
      Sfx.play("badge");
      State.grantBadge(g.key);
      State.addCoins(50);
      toast(`¡Ganaste la ${g.name.replace("Gimnasio","Medalla")}!`, 2200);
      openCrate(true);
    } else {
      Sfx.play("fail");
      toast(`No aprobaste (${Math.round(ratio*100)}% / ${Math.round(g.passRatio*100)}%). Intenta de nuevo.`, 2400);
      showScreen("screen-map");
      renderMap();
    }
    gym = null;
  }

  function quitGym(){
    Sfx.setTheme(World.musicTheme ? World.musicTheme() : "world");
    gym = null;
    showScreen("screen-map");
    renderMap();
  }

  // ---------- CRATE ----------
  let pendingCrate = null;
  function openCrate(fromGym){
    pendingCrate = { fromGym };
    $("#crate-box").classList.remove("open","shake");
    $("#crate-reel").classList.remove("active");
    $("#crate-result").innerHTML = "";
    $("#crate-result").className = "crate-result";
    $("#crate-open-btn").hidden = false;
    $("#crate-continue-btn").hidden = true;
    showScreen("screen-crate");
  }

  function doOpenCrate(){
    Sfx.play("crate");
    $("#crate-open-btn").hidden = true;
    $("#crate-box").classList.add("shake");

    // Build reel of fake ticks with a final winner
    const owned = State.get().unlockedSkins;
    const reward = Engine.rollReward(owned);
    const reel = $("#crate-reel");
    reel.classList.add("active");
    reel.innerHTML = `<div class="marker"></div><div class="track" id="crate-track"></div>`;
    const track = $("#crate-track");

    // Generate 40 random ticks
    const rarities = ["common","common","common","rare","rare","epic","legend","myth"];
    const skinsAll = Object.keys(Sprites.skins);
    const ticks = [];
    for (let i=0;i<40;i++){
      const r = rarities[Math.random()*rarities.length|0];
      const sk = skinsAll[Math.random()*skinsAll.length|0];
      ticks.push({ r, sk });
    }
    // Insert winner at index 34
    const winnerIdx = 34;
    ticks[winnerIdx] = { r: reward.rarity, sk: reward.type === "skin" ? reward.name : "monedas" };

    ticks.forEach(t => {
      const el = document.createElement("div");
      el.className = "tick rarity-" + t.r;
      el.innerHTML = `<div style="width:48px;height:48px">${t.sk==="monedas"?"💰":Sprites.skinSvg(t.sk)}</div><div>${t.sk}</div>`;
      track.appendChild(el);
    });

    // Animate: move track so that winner lands under marker
    const tickWidth = 106; // ~100 + 6 gap
    const containerCenter = reel.clientWidth / 2;
    const offset = -(winnerIdx * tickWidth) + containerCenter - tickWidth/2;

    // trigger reflow then transition
    requestAnimationFrame(() => {
      track.style.transform = `translateX(${offset}px)`;
    });

    setTimeout(() => {
      $("#crate-box").classList.remove("shake");
      $("#crate-box").classList.add("open");
      showCrateResult(reward);
    }, 4700);
  }

  function showCrateResult(reward){
    Sfx.play("reveal", reward.rarity);
    const rm = Engine.rarityMeta[reward.rarity];
    const res = $("#crate-result");
    res.className = "crate-result rarity-" + reward.rarity;
    if (reward.type === "skin"){
      State.unlockSkin(reward.name);
      State.setSkin(reward.name);
      res.innerHTML = `
        <div>${rm.label}</div>
        <h2>${reward.name}</h2>
        <div style="width:120px;height:120px;margin:0 auto">${Sprites.skinSvg(reward.name)}</div>
        <div>¡Nueva skin equipada!</div>
      `;
    } else {
      State.addCoins(reward.amount);
      res.innerHTML = `
        <div>${rm.label} (duplicado)</div>
        <h2>+${reward.amount} monedas</h2>
      `;
    }
    $("#crate-continue-btn").hidden = false;
    refreshTopbar();
  }

  function closeCrate(){
    showScreen("screen-map");
    renderMap();
  }

  // ---------- DEX ----------
  function renderDex(filter=""){
    const s = State.get();
    const grid = $("#dex-grid");
    grid.innerHTML = "";
    const caught = new Set(Object.keys(s.caughtWords));
    const list = Data.allWords.filter(w => {
      if (!filter) return true;
      const f = filter.toLowerCase();
      return w.han.includes(filter) || w.rom.toLowerCase().includes(f) || w.es.toLowerCase().includes(f);
    });
    list.forEach(w => {
      const seen = caught.has(w.han);
      const rec = s.caughtWords[w.han];
      const card = document.createElement("div");
      card.className = "dex-card";
      card.innerHTML = seen ? `
        <div class="han">${w.han}</div>
        <div class="rom">${w.rom}</div>
        <div class="es">${w.es}</div>
        <div class="meta">✓ ${rec.correct} · ✗ ${rec.wrong}</div>
        <div class="dex-actions">
          <button class="btn small" data-play="${w.han}">🔊</button>
          <button class="btn small" data-mic="${w.han}" title="Di la palabra al micrófono">🎤 Pronunciar</button>
        </div>
        <div class="mic-fb" data-micfb="${w.han}"></div>
      ` : `
        <div class="han" style="opacity:.35">???</div>
        <div class="rom" style="opacity:.35">no descubierto</div>
        <div class="es">—</div>
      `;
      grid.appendChild(card);
    });
    grid.querySelectorAll("[data-play]").forEach(b => {
      b.onclick = () => Engine.speak(b.dataset.play);
    });
    grid.querySelectorAll("[data-mic]").forEach(b => {
      b.onclick = () => practicePronunciation(b.dataset.mic, b);
    });
  }

  // ---------- PRONUNCIACIÓN (micrófono) ----------
  async function practicePronunciation(han, btn){
    const fb = $(`[data-micfb="${han}"]`);
    if (!Speech.available()){
      if (fb){ fb.textContent = "Tu navegador no soporta reconocimiento de voz (usa Chrome o Edge)."; fb.className = "mic-fb bad"; }
      return;
    }
    const w = Data.allWords.find(x => x.han === han);
    btn.disabled = true;
    btn.classList.add("listening");
    btn.textContent = "🎙️ Escuchando…";
    if (fb){ fb.textContent = `Di: "${han}" (${w ? w.rom : ""})`; fb.className = "mic-fb"; }
    Sfx.play("blip");

    const r = await Speech.listen();

    btn.disabled = false;
    btn.classList.remove("listening");
    btn.textContent = "🎤 Pronunciar";
    if (!fb) return;

    if (!r.ok){
      const msgs = {
        "not-allowed": "Permiso de micrófono denegado. Actívalo en el navegador (icono 🎤 en la barra de direcciones).",
        "no-speech": "No te escuché 🙉 — intenta de nuevo, más cerca del micrófono.",
        "audio-capture": "No encontré micrófono en este equipo.",
        "network": "El reconocimiento necesita internet.",
        "no-support": "Tu navegador no soporta reconocimiento de voz (usa Chrome o Edge).",
      };
      fb.textContent = msgs[r.error] || `No se pudo escuchar (${r.error}). Intenta de nuevo.`;
      fb.className = "mic-fb bad";
      return;
    }

    const heard = r.transcripts[0] || "";
    if (Speech.matches(han, r.transcripts)){
      Sfx.play("ok");
      State.reviewWord(han, true);
      State.addXp(2); State.addTeamXp(1);
      fb.textContent = `✅ ¡Perfecto! Te escuché decir "${heard}". +2 XP`;
      fb.className = "mic-fb ok";
      refreshTopbar();
    } else {
      Sfx.play("bad");
      fb.textContent = `❌ Escuché "${heard}" — la palabra es "${han}". ¡Escúchala con 🔊 e inténtalo otra vez!`;
      fb.className = "mic-fb bad";
    }
  }

  // ---------- IMPORT ----------
  const CUSTOM_KEY = "pokoreano.custom.v1";
  function loadCustomVocab(){
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (!raw) return;
      const list = JSON.parse(raw);
      list.forEach(w => {
        if (!Data.allWords.find(x => x.han === w.han)){
          Data.allWords.push({ ...w, custom:true });
          Data.vocab.push({ ...w, custom:true });
        }
      });
    } catch(e){}
  }
  function saveCustomVocab(){
    const list = Data.allWords.filter(w => w.custom).map(w => ({han:w.han, rom:w.rom, es:w.es}));
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  }
  function doImport(){
    const text = $("#import-text").value.trim();
    if (!text) { $("#import-status").textContent = "Vacío."; return; }
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
    let added = 0, skipped = 0;
    lines.forEach(line => {
      const parts = line.split(/[,;\t]/).map(s => s.trim());
      if (parts.length < 3) { skipped++; return; }
      const [han, rom, es] = parts;
      if (Data.allWords.find(w => w.han === han)) { skipped++; return; }
      Data.allWords.push({ han, rom, es, custom:true });
      Data.vocab.push({ han, rom, es, custom:true });
      added++;
    });
    saveCustomVocab();
    $("#import-status").textContent = `Añadidas ${added}, omitidas ${skipped}.`;
    toast(`Vocabulario ampliado: +${added}`);
  }

  // ---------- TIENDA ----------
  function openShop(){
    renderShop();
    showScreen("screen-shop");
  }
  function renderShop(){
    const s = State.get();
    $("#shop-coins").textContent = s.coins;
    const grid = $("#shop-grid");
    grid.innerHTML = "";
    // mascotas
    Creatures.PETS.forEach(p => {
      const owned = (s.ownedPets||[]).includes(p.key);
      const card = document.createElement("div");
      card.className = "shop-card";
      card.innerHTML = `
        <div class="g-sprite">${Creatures.petSprite(p.key)}</div>
        <div class="g-ko">${p.ko} ${p.emoji}</div>
        <div class="g-sub">${p.rom} · ${p.es}</div>
        <div class="shop-desc">Te sigue por el mapa.</div>
        <button class="btn small ${owned?"":"primary"}" data-buy-pet="${p.key}" ${owned||s.coins<p.price?"disabled":""}>
          ${owned ? "✓ Comprado" : `💰 ${p.price}`}
        </button>`;
      grid.appendChild(card);
    });
    // caja de skins
    const crateCard = document.createElement("div");
    crateCard.className = "shop-card";
    crateCard.innerHTML = `
      <div class="g-sprite" style="font-size:56px;line-height:84px;text-align:center">🎁</div>
      <div class="g-ko">상자 <span class="g-emoji">✨</span></div>
      <div class="g-sub">sangja · Caja de skins</div>
      <div class="shop-desc">Una skin aleatoria (rareza al azar).</div>
      <button class="btn small primary" data-buy-crate ${s.coins<200?"disabled":""}>💰 200</button>`;
    grid.appendChild(crateCard);

    // skin urbana (venta directa): rizos negros con mechas miel
    const urbanaOwned = s.unlockedSkins.includes("urbana");
    const urbanaImg = (typeof World !== "undefined" && World.sheetFrameURL) ? World.sheetFrameURL("urbana") : null;
    const urbanaCard = document.createElement("div");
    urbanaCard.className = "shop-card";
    urbanaCard.innerHTML = `
      <div class="g-sprite">${urbanaImg
        ? `<img src="${urbanaImg}" alt="urbana" style="image-rendering:pixelated;width:100%;height:100%;object-fit:contain">`
        : Sprites.skinSvg("urbana")}</div>
      <div class="g-ko">도시 <span class="g-emoji">🧥</span></div>
      <div class="g-sub">dosi · Skin urbana</div>
      <div class="shop-desc">Rizos con mechas miel, chaqueta marrón y zapatillas.</div>
      <button class="btn small ${urbanaOwned?"":"primary"}" data-buy-urbana ${urbanaOwned||s.coins<800?"disabled":""}>
        ${urbanaOwned ? "✓ Comprada" : "💰 800"}
      </button>`;
    grid.appendChild(urbanaCard);

    grid.querySelectorAll("[data-buy-pet]").forEach(b => {
      b.onclick = () => {
        const p = Creatures.petByKey(b.dataset.buyPet);
        if (State.buyPet(p.key, p.price)){
          Sfx.play("coin");
          toast(`¡${p.ko} (${p.es}) es tuyo! Te sigue desde ya.`);
          refreshTopbar(); renderShop();
        } else toast("No te alcanzan las monedas.");
      };
    });
    const cb = grid.querySelector("[data-buy-crate]");
    if (cb) cb.onclick = () => {
      if (!State.spendCoins(200)){ toast("No te alcanzan las monedas."); return; }
      Sfx.play("coin");
      refreshTopbar();
      openCrate(false);
    };
    const ub = grid.querySelector("[data-buy-urbana]");
    if (ub) ub.onclick = () => {
      if (!State.spendCoins(800)){ toast("No te alcanzan las monedas."); return; }
      Sfx.play("coin");
      State.unlockSkin("urbana");
      State.setSkin("urbana");
      toast("¡Skin urbana equipada! 도시 스타일 ✨");
      refreshTopbar(); renderShop();
    };
  }

  // ---------- MOCHILA ----------
  function renderBag(){
    const s = State.get();
    const body = $("#bag-body");
    const petCards = Creatures.PETS.filter(p => (s.ownedPets||[]).includes(p.key)).map(p => `
      <div class="bag-card ${s.activePet===p.key?"active":""}">
        <div class="g-sprite">${Creatures.petSprite(p.key)}</div>
        <div class="g-ko">${p.ko}</div>
        <div class="g-sub">${p.es}</div>
        <button class="btn small" data-pet="${p.key}">${s.activePet===p.key?"Descansar":"¡Sígueme!"}</button>
      </div>`).join("");
    const skinCards = s.unlockedSkins.map(sk => {
      const sheetUrl = (typeof World !== "undefined" && World.sheetFrameURL) ? World.sheetFrameURL(sk) : null;
      const icon = sheetUrl
        ? `<img src="${sheetUrl}" alt="${sk}" style="image-rendering:pixelated;width:100%;height:100%;object-fit:contain">`
        : Sprites.skinSvg(sk);
      return `
      <div class="bag-card ${s.activeSkin===sk?"active":""}">
        <div class="g-sprite">${icon}</div>
        <div class="g-sub">${sk}</div>
        <button class="btn small" data-skin="${sk}" ${s.activeSkin===sk?"disabled":""}>${s.activeSkin===sk?"Equipada":"Equipar"}</button>
      </div>`;
    }).join("");
    const badgeCards = Data.gyms.map(g => {
      const has = s.badges.includes(g.key);
      return `<div class="bag-card ${has?"":"unknown"}">
        <div class="badge-icon">${has ? "🏅" : "🔒"}</div>
        <div class="g-ko">${g.icon}</div>
        <div class="g-sub">${g.name.replace("Gimnasio ","")}</div>
      </div>`;
    }).join("");
    body.innerHTML = `
      <h3>🐾 Mis mascotas</h3>
      <div class="bag-grid">${petCards || '<p class="bag-empty">Compra una en la tienda 상점 (junto al cruce de caminos).</p>'}</div>
      <h3>👕 Mis skins</h3>
      <div class="bag-grid">${skinCards}</div>
      <h3>🏅 Mis medallas (${s.badges.length}/8)</h3>
      <div class="bag-grid">${badgeCards}</div>`;
    body.querySelectorAll("[data-pet]").forEach(b => {
      b.onclick = () => {
        const k = b.dataset.pet;
        State.setActivePet(State.get().activePet === k ? null : k);
        renderBag();
      };
    });
    body.querySelectorAll("[data-skin]").forEach(b => {
      b.onclick = () => {
        State.setSkin(b.dataset.skin);
        refreshTopbar(); renderBag();
        toast(`Skin equipada: ${b.dataset.skin}`);
      };
    });
  }

  // Called from World when player enters a gym door
  function startGymFromWorld(g){ startGym(g); }

  return {
    $, $$, showScreen, toast, refreshTopbar,
    renderMap, renderDex, quitGym, doImport,
    doOpenCrate, closeCrate, loadCustomVocab,
    startWildBattleWord, startGymFromWorld,
    startCaptureFromWorld, renderGuardians,
    openShop, renderBag,
    startFishing, updateQuestBanner,
    startCafe, startClass, startKaraoke, startDuel,
  };
})();
