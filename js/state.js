/* ==========================================================
   GUARDIANES DEL IDIOMA — State + persistence
   ========================================================== */
const State = (() => {
  const KEY = "pokoreano.save.v1";

  const defaults = () => ({
    playerName: "Karol",
    lang: "ko",           // idioma que se estudia: "ko" | "en"
    level: "medio",       // basico | medio | alto
    activeSkin: "clásico",
    unlockedSkins: ["clásico"],
    badges: [],           // ["hangul","numeros",...]
    coins: 0,
    caughtWords: {},      // { han: {seen, correct, wrong, ease, next} }
    gymStats: {},         // { key: {best: 0..1, attempts: n} }
    guardians: {},        // { key: {xp} }
    team: [],             // hasta 3 keys de guardianes
    ownedPets: [],        // mascotas compradas
    activePet: null,      // mascota que te sigue
    xp: 0,                // experiencia de estudiante (respuestas correctas)
    questIdx: 0,          // misión actual (índice en Quests.QUESTS)
    questProg: 0,         // progreso de la misión actual
    lastCrateRarity: null,
    createdAt: Date.now(),
  });

  let cur = null;

  /* El contenido del juego (vocabulario, gimnasios) sale de Data, que tiene
     un idioma activo. Cada vez que la partida cambia hay que sincronizarlo,
     o se seguiría jugando con el idioma anterior. */
  function applyLang(){
    if (typeof Data === "undefined" || !cur) return;
    Data.setLang(cur.lang || "ko");
    Data.setLevel(cur.level || "medio");
  }
  // cambiar de idioma/nivel desde la interfaz
  function setLang(code){ const s = get(); s.lang = code; applyLang(); save(); }
  function setLevel(key){ const s = get(); s.level = key; applyLang(); save(); }

  function load(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      cur = JSON.parse(raw);
      applyLang();
      return cur;
    } catch(e){ return null; }
  }
  /* Enganches que se ejecutan justo antes de escribir la partida. World se
     registra aquí para dejar apuntada la zona y la casilla exactas: antes
     solo se anotaban al pisar una casilla nueva, así que guardar parado
     (o desde el menú) escribía una posición vieja. */
  const beforeSave = [];
  function onBeforeSave(fn){ beforeSave.push(fn); }

  function save(){
    if (!cur) return;
    beforeSave.forEach(fn => { try { fn(cur); } catch(e){} });
    localStorage.setItem(KEY, JSON.stringify(cur));
  }
  function reset(){
    cur = defaults();
    applyLang();
    save();
    return cur;
  }
  function get(){ if (!cur) cur = load() || defaults(); return cur; }

  function catchWord(w){
    const s = get();
    const rec = s.caughtWords[w.han] || { seen:0, correct:0, wrong:0, ease:2.5, next:0 };
    rec.seen++;
    s.caughtWords[w.han] = rec;
    save();
    return rec;
  }
  function reviewWord(han, wasCorrect){
    const s = get();
    const rec = s.caughtWords[han];
    if (!rec) return;
    if (wasCorrect) { rec.correct++; rec.ease = Math.min(rec.ease+0.15, 4); }
    else { rec.wrong++; rec.ease = Math.max(rec.ease-0.2, 1.3); }
    rec.next = Date.now() + Math.round(rec.ease * 3600 * 1000);
    save();
  }
  function grantBadge(key){
    const s = get();
    if (!s.badges.includes(key)) s.badges.push(key);
    save();
  }
  function addCoins(n){
    const s = get(); s.coins += n; save();
  }
  function spendCoins(n){
    const s = get();
    if (s.coins < n) return false;
    s.coins -= n; save(); return true;
  }
  function unlockSkin(name){
    const s = get();
    if (!s.unlockedSkins.includes(name)) s.unlockedSkins.push(name);
    save();
  }
  function setSkin(name){
    const s = get();
    if (s.unlockedSkins.includes(name)) { s.activeSkin = name; save(); }
  }
  // ---------- Guardianes ----------
  function catchGuardian(key){
    const s = get();
    if (!s.guardians) s.guardians = {};
    if (!s.team) s.team = [];
    const isNew = !s.guardians[key];
    if (isNew){
      s.guardians[key] = { xp: 0 };
      if (s.team.length < 3) s.team.push(key); // auto-equipar si hay hueco
    } else {
      s.guardians[key].xp += 10; // duplicado = XP extra
    }
    save();
    return isNew;
  }
  function setTeam(arr){
    const s = get();
    s.team = arr.slice(0,3).filter(k => s.guardians && s.guardians[k]);
    save();
  }
  function addTeamXp(n){
    const s = get();
    if (!s.team || !s.guardians) return;
    s.team.forEach(k => { if (s.guardians[k]) s.guardians[k].xp += n; });
    save();
  }

  // ---------- XP de estudiante ----------
  function addXp(n){
    const s = get(); s.xp = (s.xp||0) + n; save();
  }

  // ---------- Mascotas ----------
  function buyPet(key, price){
    const s = get();
    if (!s.ownedPets) s.ownedPets = [];
    if (s.ownedPets.includes(key)) return false;
    if (!spendCoins(price)) return false;
    s.ownedPets.push(key);
    if (!s.activePet) s.activePet = key;
    save();
    return true;
  }
  function setActivePet(key){
    const s = get();
    s.activePet = (key && (s.ownedPets||[]).includes(key)) ? key : null;
    save();
  }

  function setGymBest(key, ratio){
    const s = get();
    const rec = s.gymStats[key] || { best:0, attempts:0 };
    rec.attempts++;
    if (ratio > rec.best) rec.best = ratio;
    s.gymStats[key] = rec;
    save();
  }

  return {
    load, save, reset, get, defaults, onBeforeSave,
    applyLang, setLang, setLevel,
    catchWord, reviewWord, grantBadge, addCoins, spendCoins,
    unlockSkin, setSkin, setGymBest,
    catchGuardian, setTeam, addTeamXp,
    buyPet, setActivePet, addXp
  };
})();
