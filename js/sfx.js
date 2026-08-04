/* ==========================================================
   POKOREANO — Chiptune SFX (WebAudio, sin assets)
   ========================================================== */
const Sfx = (() => {
  const MUTE_KEY = "pokoreano.muted";
  let ctx = null;
  let muted = localStorage.getItem(MUTE_KEY) === "1";

  function ac(){
    if (!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // one square/saw blip
  function beep(freq, dur, opts={}){
    const a = ac(); if (!a || muted) return;
    const { type="square", vol=0.12, when=0, slide=0 } = opts;
    const t0 = a.currentTime + when;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide), t0+dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    o.connect(g).connect(a.destination);
    o.start(t0); o.stop(t0+dur+0.02);
  }
  function noise(dur, opts={}){
    const a = ac(); if (!a || muted) return;
    const { vol=0.08, when=0 } = opts;
    const t0 = a.currentTime + when;
    const len = a.sampleRate * dur;
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<len;i++) d[i] = (Math.random()*2-1) * (1 - i/len);
    const src = a.createBufferSource();
    src.buffer = buf;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t0);
    src.connect(g).connect(a.destination);
    src.start(t0);
  }

  const fx = {
    blip:      () => beep(880, .05, {vol:.08}),
    step:      () => beep(220, .03, {vol:.03, type:"triangle"}),
    ok:        () => { beep(660,.08); beep(990,.12,{when:.08}); },
    bad:       () => beep(160,.28,{type:"sawtooth", slide:-80}),
    encounter: () => { [740,620,500,380].forEach((f,i)=>beep(f,.09,{when:i*.08, type:"square"})); },
    door:      () => { beep(330,.07); beep(440,.09,{when:.07}); },
    badge:     () => { [523,659,784,1047,1319].forEach((f,i)=>beep(f,.14,{when:i*.11, vol:.14})); },
    fail:      () => { [400,340,280,200].forEach((f,i)=>beep(f,.16,{when:i*.13, type:"triangle"})); },
    coin:      () => { beep(988,.06); beep(1319,.14,{when:.06}); },
    crate:     () => { for(let i=0;i<7;i++){ noise(.05,{when:i*.12}); beep(90+Math.random()*40,.05,{when:i*.12,type:"triangle",vol:.06}); } },
    reveal: (rarity) => {
      const base = { common:440, rare:554, epic:659, legend:784, myth:988 }[rarity] || 440;
      [0,4,7,12].forEach((st,i)=>beep(base*Math.pow(2,st/12), .16, {when:i*.09, vol:.13}));
      if (rarity==="legend"||rarity==="myth") noise(.5,{vol:.05,when:.36});
    },
  };

  function play(name, arg){
    try { if (fx[name]) fx[name](arg); } catch(e){}
  }

  // ---------- Música de fondo (temas procedurales por contexto) ----------
  const N = { E2:82, F2:87, G2:98, A2:110, C3:131, E3:165, F3:175, G3:196, A3:220, B3:247,
              C4:262, D4:294, E4:330, F4:349, G4:392, A4:440, B4:494, C5:523, D5:587, E5:659, G5:784, A5:880 };
  const THEMES = {
    // pueblo y rutas: melodía dulce y pausada en Do mayor
    world: {
      step: 0.30, lead: "triangle", leadVol: 0.09, bassVol: 0.07, bassWave: "sine",
      bassEvery: 4, sparkle: true,
      melody: [
        N.C5,0,N.E5,0, N.G5,0,N.E5,0,
        N.A5,0,N.G5,0, N.E5,0,N.D5,0,
        N.C5,0,N.D5,N.E5, N.D5,0,N.C5,0,
        N.A4,0,0,0, N.G4,0,0,0,
        N.C5,0,N.E5,0, N.G5,0,N.A5,0,
        N.G5,0,N.E5,0, N.C5,0,N.D5,0,
        N.E5,N.D5,N.C5,0, N.A4,0,N.C5,0,
        N.C5,0,0,0, 0,0,0,0,
      ],
      bass: [131, 98, 110, 87, 131, 98, 110, 131], // C3 G2 A2 F2 · C3 G2 A2 C3
    },
    // cueva: La menor, grave y espaciada — se oye la humedad
    cave: {
      step: 0.36, lead: "sine", leadVol: 0.06, bassVol: 0.08, bassWave: "sine",
      bassEvery: 4, sparkle: false,
      melody: [
        N.A3,0,0,0, N.C4,0,0,0,
        N.E4,0,0,N.D4, N.C4,0,N.B3,0,
        N.A3,0,0,0, N.G3,0,0,0,
        N.F3,0,N.E3,0, N.A3,0,0,0,
        N.A3,0,0,0, N.C4,0,N.E4,0,
        N.D4,0,N.C4,0, N.B3,0,0,0,
        N.A3,0,N.G3,0, N.F3,0,N.E3,0,
        N.A3,0,0,0, 0,0,0,0,
      ],
      bass: [110, 87, 98, 82, 110, 87, 98, 82],   // A2 F2 G2 E2
    },
    // batalla: corcheas rápidas con bajo machacón — tensión de examen
    battle: {
      step: 0.17, lead: "square", leadVol: 0.05, bassVol: 0.045, bassWave: "square",
      bassEvery: 2, sparkle: false,
      melody: [
        N.A4,0,N.A4,0, N.C5,0,N.B4,0,
        N.E5,0,N.D5,N.C5, N.B4,0,N.G4,0,
        N.A4,0,N.A4,0, N.C5,0,N.D5,0,
        N.E5,0,N.E5,0, N.D5,N.C5,N.B4,0,
        N.A4,0,N.A4,0, N.C5,0,N.B4,0,
        N.E5,0,N.D5,N.C5, N.B4,0,N.G4,0,
        N.F4,0,N.F4,0, N.A4,0,N.G4,0,
        N.E4,0,N.E4,0, 0,0,0,0,
      ],
      bass: [110, 110, 87, 87, 98, 98, 82, 82],   // A2 A2 F2 F2 G2 G2 E2 E2
    },
  };
  let musicTimer = null, nextT = 0, stepIdx = 0, theme = "world";

  function note(freq, t, dur, type, vol){
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t+dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t+dur+0.02);
  }
  function scheduleMusic(){
    const a = ac(); if (!a || muted) return;
    const T = THEMES[theme];
    while (nextT < a.currentTime + 0.5){
      const m = T.melody[stepIdx % T.melody.length];
      if (m){
        note(m, nextT, T.step*1.6, T.lead, T.leadVol);      // lead
        if (T.sparkle) note(m*2, nextT, T.step*0.8, "sine", 0.015); // brillo
      }
      if (stepIdx % T.bassEvery === 0){
        const b = T.bass[((stepIdx / T.bassEvery)|0) % T.bass.length];
        note(b, nextT, T.step*3.2, T.bassWave, T.bassVol); // bajo
      }
      nextT += T.step;
      stepIdx++;
    }
  }
  /* Cambiar de tema en caliente: el planificador lee el tema vivo en cada
     paso, así que el cambio se oye en el siguiente compás sin cortes. */
  function setTheme(name){
    if (!THEMES[name] || theme === name) return;
    theme = name;
    stepIdx = 0;
    if (musicTimer){ const a = ac(); if (a) nextT = a.currentTime + 0.05; }
  }
  function startMusic(){
    if (musicTimer || muted) return;
    const a = ac(); if (!a) return;
    nextT = a.currentTime + 0.1; stepIdx = 0;
    musicTimer = setInterval(scheduleMusic, 200);
  }
  function stopMusic(){
    if (musicTimer){ clearInterval(musicTimer); musicTimer = null; }
  }

  function toggleMute(){
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    if (muted) stopMusic(); else startMusic();
    return muted;
  }
  function isMuted(){ return muted; }
  function musicPlaying(){ return !!musicTimer; }

  // la música arranca con el primer gesto del usuario (política de autoplay)
  const kick = () => { startMusic(); window.removeEventListener("pointerdown", kick); window.removeEventListener("keydown", kick); };
  window.addEventListener("pointerdown", kick);
  window.addEventListener("keydown", kick);

  return { play, toggleMute, isMuted, startMusic, stopMusic, musicPlaying, setTheme };
})();
