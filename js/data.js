/* ==========================================================
   POKOREANO — Contenido semilla
   ========================================================== */
const Data = (() => {

  // Hangul básico (consonantes + vocales)
  const hangul = [
    // vocales
    { han:"ㅏ", rom:"a", es:"a" }, { han:"ㅑ", rom:"ya", es:"ya" },
    { han:"ㅓ", rom:"eo", es:"eo (o abierta)" }, { han:"ㅕ", rom:"yeo", es:"yeo" },
    { han:"ㅗ", rom:"o", es:"o" }, { han:"ㅛ", rom:"yo", es:"yo" },
    { han:"ㅜ", rom:"u", es:"u" }, { han:"ㅠ", rom:"yu", es:"yu" },
    { han:"ㅡ", rom:"eu", es:"eu" }, { han:"ㅣ", rom:"i", es:"i" },
    // consonantes
    { han:"ㄱ", rom:"g/k", es:"g (inicial), k (final)" },
    { han:"ㄴ", rom:"n", es:"n" }, { han:"ㄷ", rom:"d/t", es:"d/t" },
    { han:"ㄹ", rom:"r/l", es:"r/l" }, { han:"ㅁ", rom:"m", es:"m" },
    { han:"ㅂ", rom:"b/p", es:"b/p" }, { han:"ㅅ", rom:"s", es:"s" },
    { han:"ㅇ", rom:"ng / mudo", es:"mudo al inicio, ng al final" },
    { han:"ㅈ", rom:"j", es:"j" }, { han:"ㅊ", rom:"ch", es:"ch" },
    { han:"ㅋ", rom:"k", es:"k aspirada" }, { han:"ㅌ", rom:"t", es:"t aspirada" },
    { han:"ㅍ", rom:"p", es:"p aspirada" }, { han:"ㅎ", rom:"h", es:"h" },
  ];

  // Numerales sino-coreanos y nativos
  const numbers = [
    { han:"일", rom:"il", es:"1 (sino)" },
    { han:"이", rom:"i", es:"2 (sino)" },
    { han:"삼", rom:"sam", es:"3 (sino)" },
    { han:"사", rom:"sa", es:"4 (sino)" },
    { han:"오", rom:"o", es:"5 (sino)" },
    { han:"육", rom:"yuk", es:"6 (sino)" },
    { han:"칠", rom:"chil", es:"7 (sino)" },
    { han:"팔", rom:"pal", es:"8 (sino)" },
    { han:"구", rom:"gu", es:"9 (sino)" },
    { han:"십", rom:"sip", es:"10 (sino)" },
    { han:"백", rom:"baek", es:"100" },
    { han:"천", rom:"cheon", es:"1.000" },
    { han:"하나", rom:"hana", es:"1 (nativo)" },
    { han:"둘",   rom:"dul", es:"2 (nativo)" },
    { han:"셋",   rom:"set", es:"3 (nativo)" },
    { han:"넷",   rom:"net", es:"4 (nativo)" },
    { han:"다섯", rom:"daseot", es:"5 (nativo)" },
    { han:"여섯", rom:"yeoseot", es:"6 (nativo)" },
    { han:"일곱", rom:"ilgop", es:"7 (nativo)" },
    { han:"여덟", rom:"yeodeol", es:"8 (nativo)" },
  ];

  // Vocabulario básico
  const vocab = [
    { han:"안녕하세요", rom:"annyeonghaseyo", es:"hola (formal)" },
    { han:"안녕",       rom:"annyeong",       es:"hola / adiós (informal)" },
    { han:"감사합니다", rom:"gamsahamnida",   es:"gracias (formal)" },
    { han:"고마워요",   rom:"gomawoyo",       es:"gracias" },
    { han:"네",         rom:"ne",             es:"sí" },
    { han:"아니요",     rom:"aniyo",          es:"no" },
    { han:"사랑해",     rom:"saranghae",      es:"te amo" },
    { han:"물",         rom:"mul",            es:"agua" },
    { han:"불",         rom:"bul",            es:"fuego" },
    { han:"밥",         rom:"bap",            es:"arroz / comida" },
    { han:"김치",       rom:"kimchi",         es:"kimchi" },
    { han:"학교",       rom:"hakgyo",         es:"escuela" },
    { han:"집",         rom:"jip",            es:"casa" },
    { han:"책",         rom:"chaek",          es:"libro" },
    { han:"친구",       rom:"chingu",         es:"amigo" },
    { han:"고양이",     rom:"goyangi",        es:"gato" },
    { han:"강아지",     rom:"gangaji",        es:"perro" },
    { han:"사과",       rom:"sagwa",          es:"manzana" },
    { han:"학생",       rom:"haksaeng",       es:"estudiante" },
    { han:"선생님",     rom:"seonsaengnim",   es:"profesor(a)" },
    { han:"엄마",       rom:"eomma",          es:"mamá" },
    { han:"아빠",       rom:"appa",           es:"papá" },
    { han:"오빠",       rom:"oppa",           es:"hermano mayor (mujer→hombre)" },
    { han:"언니",       rom:"eonni",          es:"hermana mayor (mujer→mujer)" },
    { han:"형",         rom:"hyeong",         es:"hermano mayor (hombre→hombre)" },
    { han:"누나",       rom:"nuna",           es:"hermana mayor (hombre→mujer)" },
    { han:"좋아요",     rom:"joayo",          es:"me gusta / bien" },
    { han:"싫어요",     rom:"sireoyo",        es:"no me gusta" },
    { han:"먹다",       rom:"meokda",         es:"comer" },
    { han:"마시다",     rom:"masida",         es:"beber" },
    { han:"가다",       rom:"gada",           es:"ir" },
    { han:"오다",       rom:"oda",            es:"venir" },
    { han:"보다",       rom:"boda",           es:"ver / mirar" },
    { han:"하다",       rom:"hada",           es:"hacer" },
    { han:"자다",       rom:"jada",           es:"dormir" },
    { han:"공부하다",   rom:"gongbuhada",     es:"estudiar" },
  ];

  // Partículas
  const particles = [
    { han:"은/는", rom:"eun/neun", es:"partícula de tema" },
    { han:"이/가", rom:"i/ga",     es:"partícula de sujeto" },
    { han:"을/를", rom:"eul/reul", es:"partícula de objeto directo" },
    { han:"에",   rom:"e",         es:"a / en (destino, tiempo)" },
    { han:"에서", rom:"eseo",      es:"en / desde (lugar de acción)" },
    { han:"와/과",rom:"wa/gwa",    es:"y / con (formal)" },
    { han:"도",   rom:"do",        es:"también" },
    { han:"만",   rom:"man",       es:"solo" },
  ];

  // Gimnasios (leaders con preguntas)
  const gyms = [
    {
      key:"hangul",
      name:"Gimnasio Hangul",
      leader:"Maestro Han",
      leaderSprite:"hangulSpirit",
      pool: hangul,
      questionMode:"han-to-rom", // varía
      total: 10,
      passRatio: 0.7,
      icon:"가",
      x:120, y:120,
      description:"El líder Han te reta a leer sílabas."
    },
    {
      key:"numeros",
      name:"Gimnasio Numerales",
      leader:"Contadora Sena",
      leaderSprite:"numberSlime",
      pool: numbers,
      questionMode:"mixed",
      total: 10,
      passRatio: 0.7,
      icon:"十",
      x:340, y:220,
      description:"Sena mide tu rapidez con números sino y nativos."
    },
    {
      key:"particulas",
      name:"Gimnasio Partícula",
      leader:"Dokkaebi Jo",
      leaderSprite:"dokkaebi",
      pool: particles,
      questionMode:"mixed",
      total: 8,
      passRatio: 0.65,
      icon:"은",
      x:580, y:160,
      description:"El dokkaebi Jo te confunde con partículas."
    },
    {
      key:"verbos",
      name:"Gimnasio Verbo",
      leader:"Ronin Baek",
      leaderSprite:"dokkaebi",
      pool: vocab.filter(v => v.han.endsWith("다")),
      questionMode:"mixed",
      total: 10,
      passRatio: 0.7,
      icon:"다",
      x:820, y:280,
      description:"Todos los verbos terminan en 다.",
      requires:"particulas"
    },
    {
      key:"honor",
      name:"Gimnasio Honoríficos",
      leader:"Anciana Mi",
      leaderSprite:"hangulSpirit",
      pool: vocab.filter(v => ["안녕하세요","감사합니다","선생님","고마워요"].includes(v.han)),
      questionMode:"mixed",
      total: 6,
      passRatio: 0.66,
      icon:"님",
      x:1040, y:180,
      description:"Cortesía nivel real.",
      requires:"verbos"
    },
    {
      key:"topik1",
      name:"Gimnasio TOPIK I",
      leader:"Examinadora Yun",
      leaderSprite:"numberSlime",
      pool: vocab,
      questionMode:"mixed",
      total: 12,
      passRatio: 0.75,
      icon:"급",
      x:180, y:420,
      description:"Simulacro TOPIK básico.",
      requires:"honor"
    },
    {
      key:"topik2",
      name:"Gimnasio TOPIK II",
      leader:"Doctor Cho",
      leaderSprite:"dokkaebi",
      pool: vocab.concat(particles),
      questionMode:"mixed",
      total: 15,
      passRatio: 0.8,
      icon:"高",
      x:520, y:480,
      description:"Nivel intermedio-alto.",
      requires:"topik1"
    },
    {
      key:"maestro",
      name:"Gimnasio Maestro",
      leader:"Rey Sejong",
      leaderSprite:"hangulSpirit",
      pool: vocab.concat(particles).concat(hangul),
      questionMode:"mixed",
      total: 20,
      passRatio: 0.85,
      icon:"王",
      x:900, y:520,
      description:"Frente al mismísimo Rey Sejong.",
      requires:"topik2"
    },
  ];

  // Rutas del mapa (nodos entre gimnasios)
  const routes = [
    { key:"ruta1", name:"Ruta 1", icon:"🌾", x:230, y:170, pool:hangul.concat(vocab.slice(0,6)) },
    { key:"ruta2", name:"Ruta 2", icon:"🏞️", x:460, y:200, pool:numbers.concat(vocab.slice(6,14)) },
    { key:"ruta3", name:"Ruta 3", icon:"🌊", x:700, y:230, pool:vocab.slice(0,20) },
    { key:"ruta4", name:"Ruta 4", icon:"⛰️", x:940, y:340, pool:vocab },
    { key:"ruta5", name:"Ruta 5", icon:"🌲", x:360, y:470, pool:vocab.concat(particles) },
    { key:"ruta6", name:"Ruta 6", icon:"🏙️", x:720, y:520, pool:vocab.concat(particles) },
  ];

  // Todas las palabras únicas para el vocabudex inicial (no reveladas)
  const allWords = [...hangul, ...numbers, ...vocab, ...particles];

  return { hangul, numbers, vocab, particles, gyms, routes, allWords };
})();
