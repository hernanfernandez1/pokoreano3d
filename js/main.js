/* ==========================================================
   POKOREANO — bootstrap
   ========================================================== */
(function(){
  Engine.initTTS();

  const $ = UI.$;

  // Menu buttons
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const a = btn.dataset.action;
    switch(a){
      case "new-game": {
        const name = prompt("¿Tu nombre de entrenador?", "Entrenador") || "Entrenador";
        const s = State.reset();
        s.playerName = name;
        State.save();
        UI.renderMap();
        UI.showScreen("screen-map");
        break;
      }
      case "continue": {
        if (!State.load()) { UI.toast("No hay partida guardada."); return; }
        UI.renderMap();
        UI.showScreen("screen-map");
        break;
      }
      case "import": {
        UI.showScreen("screen-import");
        break;
      }
      case "do-import": {
        UI.doImport();
        break;
      }
      case "dex": {
        UI.renderDex();
        UI.showScreen("screen-dex");
        break;
      }
      case "guardians": {
        UI.renderGuardians();
        UI.showScreen("screen-guardians");
        break;
      }
      case "bag": {
        UI.renderBag();
        UI.showScreen("screen-bag");
        break;
      }
      case "cheats": {
        UI.showScreen("screen-cheats");
        break;
      }
      case "mute": {
        const m = Sfx.toggleMute();
        btn.textContent = m ? "🔇" : "🔊";
        UI.toast(m ? "Sonido apagado." : "Sonido encendido.");
        break;
      }
      case "save": {
        State.save();
        UI.toast("Guardado.");
        break;
      }
      case "close-modal": {
        UI.showScreen("screen-map");
        UI.renderMap();
        break;
      }
      case "quit-gym": {
        UI.quitGym();
        break;
      }
    }
  });

  // Dex search
  $("#dex-search").addEventListener("input", (e) => UI.renderDex(e.target.value));
  // Crate buttons
  $("#crate-open-btn").addEventListener("click", () => UI.doOpenCrate());
  $("#crate-continue-btn").addEventListener("click", () => UI.closeCrate());

  // Trucos (modo prueba)
  document.querySelectorAll("[data-cheat]").forEach(b => {
    b.addEventListener("click", () => {
      const s = State.get();
      switch (b.dataset.cheat){
        case "coins": State.addCoins(1000); UI.toast("+1000 monedas 💰"); break;
        case "megacoins": s.coins = 99999; State.save(); UI.toast("¡99.999 monedas! 💎"); break;
        case "badges":
          Data.gyms.forEach(g => State.grantBadge(g.key));
          UI.toast("Todas las medallas 🏅"); break;
        case "guardians":
          Creatures.CREATURES.forEach(c => { if (!s.guardians[c.key]) s.guardians[c.key] = { xp: 0 }; });
          State.save(); UI.toast("Todos los guardianes 🐾"); break;
        case "skins":
          Object.keys(Sprites.skins).forEach(k => State.unlockSkin(k));
          UI.toast("Todas las skins 👕"); break;
        case "pets":
          Creatures.PETS.forEach(p => { if (!s.ownedPets.includes(p.key)) s.ownedPets.push(p.key); });
          if (!s.activePet) s.activePet = s.ownedPets[0];
          State.save(); UI.toast("Todas las mascotas 🐶"); break;
        case "reset":
          if (confirm("¿Borrar toda la partida?")){
            localStorage.removeItem("pokoreano.save.v1");
            location.reload();
          }
          return;
      }
      Sfx.play("coin");
      UI.refreshTopbar();
    });
  });

  // Load save + custom vocab silently if exists
  State.load();
  UI.loadCustomVocab();
  // reflect persisted mute state
  const mb = document.getElementById("mute-btn");
  if (mb && Sfx.isMuted()) mb.textContent = "🔇";

  // ?autostart — entra directo al mapa (pruebas/depuración, sin prompt)
  if (/[?&]autostart/.test(location.search)){
    if (!State.load()){ const s = State.reset(); s.playerName = "Tester"; State.save(); }
    UI.renderMap();
    UI.showScreen("screen-map");
    // hooks extra de prueba: &tp=x,y  &enter=gym|cave|shop|...  &test=battle|capture
    const q = new URLSearchParams(location.search);
    if (q.get("tp")){
      const [x, y] = q.get("tp").split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) World.tp(x, y);
    }
    if (q.get("enter")) World.debugEnter(q.get("enter"));
    if (q.get("test") === "battle") UI.startWildBattleWord(Data.vocab[7]);
    if (q.get("test") === "capture") UI.startCaptureFromWorld("pradera");
  }
})();
