/* ==========================================================
   POKOREANO — Reconocimiento de voz (Web Speech API, ko-KR)
   Práctica de pronunciación: dices la palabra al micrófono
   y comparamos con el coreano real.
   Requiere Chrome/Edge + permiso de micrófono + internet
   (el reconocimiento corre en los servidores del navegador).
   ========================================================== */
const Speech = (() => {

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  function available(){ return !!SR; }

  // normalizar: quitar espacios/puntuación para comparar
  function norm(s){
    return (s||"").replace(/[\s.,!?~·]/g, "").trim();
  }

  // Escucha una frase corta en coreano. Devuelve Promise con
  // { ok, transcripts:[...], error? }
  function listen(){
    return new Promise(resolve => {
      if (!SR){
        resolve({ ok:false, transcripts:[], error:"no-support" });
        return;
      }
      const rec = new SR();
      rec.lang = "ko-KR";
      rec.interimResults = false;
      rec.maxAlternatives = 5;
      rec.continuous = false;

      let settled = false;
      const done = (r) => { if (!settled){ settled = true; resolve(r); } };

      rec.onresult = (e) => {
        const alts = [];
        for (const res of e.results){
          for (let i=0; i<res.length; i++) alts.push(res[i].transcript);
        }
        done({ ok:true, transcripts: alts });
      };
      rec.onerror = (e) => done({ ok:false, transcripts:[], error: e.error });
      rec.onend = () => done({ ok:false, transcripts:[], error:"no-speech" });

      try { rec.start(); }
      catch(err){ done({ ok:false, transcripts:[], error:"start-failed" }); }

      // corte de seguridad a los 7s
      setTimeout(() => { try { rec.stop(); } catch(e){} }, 7000);
    });
  }

  // ¿alguna transcripción coincide con la palabra objetivo?
  function matches(target, transcripts){
    const t = norm(target);
    if (!t) return false;
    return transcripts.some(tr => {
      const n = norm(tr);
      return n === t || n.includes(t) || t.includes(n) && n.length >= Math.max(1, t.length-1);
    });
  }

  return { available, listen, matches, norm };
})();
