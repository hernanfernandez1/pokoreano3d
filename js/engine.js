/* ==========================================================
   POKOREANO — Battle & Gym engine
   ========================================================== */
const Engine = (() => {

  function shuffle(a){ const b=[...a]; for(let i=b.length-1;i>0;i--){ const j=Math.random()*(i+1)|0; [b[i],b[j]]=[b[j],b[i]]; } return b; }
  function pick(a){ return a[Math.random()*a.length|0]; }
  function sample(a, n){ return shuffle(a).slice(0, n); }

  // Build a question from a word using a specific mode
  // modes: han-to-es, es-to-han, han-to-rom, rom-to-han
  function buildQuestion(word, pool, mode) {
    if (mode === "mixed") {
      const modes = ["han-to-es","es-to-han","han-to-rom"];
      mode = pick(modes);
    }
    let prompt, correct, options;
    if (mode === "han-to-es") {
      prompt = { han: word.han, hint: word.rom };
      correct = word.es;
      const distract = sample(pool.filter(w => w.es !== word.es), 3).map(w => w.es);
      options = shuffle([correct, ...distract]);
    } else if (mode === "es-to-han") {
      prompt = { text: `¿Cómo se escribe "${word.es}"?` };
      correct = word.han;
      const distract = sample(pool.filter(w => w.han !== word.han), 3).map(w => w.han);
      options = shuffle([correct, ...distract]);
    } else if (mode === "han-to-rom") {
      prompt = { han: word.han };
      correct = word.rom;
      const distract = sample(pool.filter(w => w.rom !== word.rom), 3).map(w => w.rom);
      options = shuffle([correct, ...distract]);
    } else {
      prompt = { text: `Romanización: ${word.rom}` };
      correct = word.han;
      const distract = sample(pool.filter(w => w.han !== word.han), 3).map(w => w.han);
      options = shuffle([correct, ...distract]);
    }
    return { word, mode, prompt, correct, options };
  }

  // Random wild encounter word
  function pickEncounter(pool) {
    return pick(pool);
  }

  // Rarity roll for crates (approximate CS/LoL feel)
  function rollRarity() {
    const r = Math.random();
    if (r < 0.60) return "common";
    if (r < 0.85) return "rare";
    if (r < 0.96) return "epic";
    if (r < 0.995) return "legend";
    return "myth";
  }

  const rarityMeta = {
    common: { label:"COMÚN",     color:"#b0b7d6", coins:5 },
    rare:   { label:"RARO",      color:"#3fa9f5", coins:15 },
    epic:   { label:"ÉPICO",     color:"#a259ff", coins:40 },
    legend: { label:"LEGENDARIO",color:"#ffb400", coins:120 },
    myth:   { label:"MÍTICO",    color:"#ff3d7f", coins:400 },
  };

  // What skin drops based on rarity
  const skinsByRarity = {
    common: ["invierno","chef bibimbap","monje templario"],
    rare:   ["sakura","jeju","hanbok real"],
    epic:   ["seúl nocturno","ninja hangul"],
    legend: ["dragón dorado","K-pop idol"],
    myth:   ["cyber neón"],
  };

  function rollReward(alreadyOwned) {
    const rarity = rollRarity();
    const pool = skinsByRarity[rarity].filter(s => !alreadyOwned.includes(s));
    let reward;
    if (pool.length === 0) {
      // duplicate → convert to coins
      reward = { type:"coins", amount: rarityMeta[rarity].coins * 2, rarity };
    } else {
      reward = { type:"skin", name: pick(pool), rarity };
    }
    return reward;
  }

  // Korean TTS via Web Speech API
  let voices = [];
  function initTTS() {
    if (!("speechSynthesis" in window)) return;
    voices = speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => voices = speechSynthesis.getVoices();
  }
  function speak(text){
    if (!("speechSynthesis" in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const koVoice = voices.find(v => v.lang && v.lang.startsWith("ko"));
      if (koVoice) u.voice = koVoice;
      u.lang = "ko-KR";
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch(e){}
  }

  return { buildQuestion, pickEncounter, rollReward, rarityMeta, skinsByRarity, initTTS, speak };
})();
