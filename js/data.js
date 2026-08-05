/* ==========================================================
   GUARDIANES DEL IDIOMA — Contenido

   El juego es bilingüe: se estudia coreano o inglés, y el idioma se elige al
   empezar la partida. Dos decisiones sostienen todo esto:

   1. El campo `han` de cada palabra significa "la palabra en el idioma que
      estudias", no "hangul". Se conservó el nombre para no tocar los ~70
      sitios que ya lo usaban.
   2. Las 8 claves de gimnasio (hangul, numeros, particulas, verbos, honor,
      topik1, topik2, maestro) son las mismas en los dos idiomas; solo cambian
      su nombre, su icono y sus preguntas. Así el mapa, las misiones, las
      medallas y las afinidades de los guardianes siguen valiendo tal cual.

   Cada palabra lleva `lvl`: 1 principiante · 2 medio · 3 avanzado.
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

  // ==========================================================
  //  Niveles
  // ==========================================================
  const LEVELS = [
    { key:"basico", name:"Principiante", icon:"🌱", max:1,
      desc:"Solo vocabulario básico, en la hierba y en los exámenes." },
    { key:"medio",  name:"Medio",        icon:"🌿", max:2,
      desc:"Añade el vocabulario intermedio." },
    { key:"alto",   name:"Avanzado",     icon:"🌳", max:3,
      desc:"Todo el vocabulario, incluido el más difícil." },
  ];
  // marca de nivel por familia; una palabra puede traer el suyo propio
  const at = (arr, n) => arr.map(w => (w.lvl ? w : { ...w, lvl: n }));

  /* Sube de nivel las entradas cuya clave esté en la lista. Sirve para afinar
     un conjunto grande sin escribir `lvl` palabra por palabra. */
  const bump = (arr, n, claves) => arr.map(w =>
    claves.includes(w.han) ? { ...w, lvl: n } : w);

  // ---------- coreano: qué es difícil de verdad ----------
  // Sin esto el principiante recibía casi todo el vocabulario y el nivel no
  // separaba nada. Los verbos y el trato honorífico pasan a medio/avanzado.
  const koMedio = ["먹다","마시다","가다","오다","보다","하다","자다",
    "좋아요","싫어요","학생","선생님","오빠","언니","형","누나",
    "하나","둘","셋","넷","다섯","여섯","일곱","여덟","백","천"];
  const koAlto = ["공부하다","안녕하세요","감사합니다","사랑해"];

  // Frases hechas: solo tienen sentido cuando ya se domina el vocabulario
  const koFrases = [
    { han:"이름이 뭐예요?", rom:"ireumi mwoyeyo?", es:"¿cómo te llamas?", lvl:2 },
    { han:"어디에 가요?",   rom:"eodie gayo?",     es:"¿adónde vas?", lvl:2 },
    { han:"얼마예요?",      rom:"eolmayeyo?",      es:"¿cuánto cuesta?", lvl:2 },
    { han:"잘 먹겠습니다",  rom:"jal meokgesseumnida", es:"que aproveche (antes de comer)", lvl:3 },
    { han:"잘 지냈어요?",   rom:"jal jinaesseoyo?", es:"¿qué tal has estado?", lvl:3 },
    { han:"다시 말해 주세요", rom:"dasi malhae juseyo", es:"repítelo, por favor", lvl:3 },
    { han:"천천히 말해 주세요", rom:"cheoncheonhi malhae juseyo", es:"habla más despacio", lvl:3 },
    { han:"무슨 뜻이에요?", rom:"museun tteusieyo?", es:"¿qué significa?", lvl:3 },
  ];

  // ==========================================================
  //  RUTA DE INGLÉS
  //  Mismas 8 claves de gimnasio, contenido propio.
  // ==========================================================
  const enSounds = at([
    { han:"sh", rom:"/ʃ/",  es:"como en 'ship'" },
    { han:"ch", rom:"/tʃ/", es:"como en 'chair'" },
    { han:"th", rom:"/θ/",  es:"como en 'think'" },
    { han:"th", rom:"/ð/",  es:"como en 'this'" },
    { han:"ph", rom:"/f/",  es:"como en 'phone'" },
    { han:"wh", rom:"/w/",  es:"como en 'what'" },
    { han:"ck", rom:"/k/",  es:"como en 'clock'" },
    { han:"ng", rom:"/ŋ/",  es:"como en 'sing'" },
    { han:"oo", rom:"/uː/", es:"como en 'moon'" },
    { han:"ee", rom:"/iː/", es:"como en 'see'" },
    { han:"ea", rom:"/iː/", es:"como en 'sea'" },
    { han:"ai", rom:"/eɪ/", es:"como en 'rain'" },
    { han:"ou", rom:"/aʊ/", es:"como en 'house'" },
    { han:"oi", rom:"/ɔɪ/", es:"como en 'coin'" },
    { han:"ar", rom:"/ɑːr/",es:"como en 'car'" },
    { han:"ir", rom:"/ɜːr/",es:"como en 'bird'" },
    { han:"gh", rom:"/f/",  es:"como en 'laugh'" },
    { han:"kn", rom:"/n/",  es:"la k es muda: 'knife'" },
    { han:"wr", rom:"/r/",  es:"la w es muda: 'write'" },
    { han:"tion",rom:"/ʃən/",es:"como en 'nation'" },
  ], 1);

  const enNumbers = at([
    { han:"one",    rom:"wan",     es:"1" },
    { han:"two",    rom:"tu",      es:"2" },
    { han:"three",  rom:"zri",     es:"3" },
    { han:"four",   rom:"for",     es:"4" },
    { han:"five",   rom:"faiv",    es:"5" },
    { han:"six",    rom:"siks",    es:"6" },
    { han:"seven",  rom:"seven",   es:"7" },
    { han:"eight",  rom:"eit",     es:"8" },
    { han:"nine",   rom:"nain",    es:"9" },
    { han:"ten",    rom:"ten",     es:"10" },
    { han:"eleven", rom:"ileven",  es:"11" },
    { han:"twelve", rom:"tuelv",   es:"12" },
    { han:"twenty", rom:"tuenti",  es:"20" },
    { han:"thirty", rom:"zerti",   es:"30" },
    { han:"fifty",  rom:"fifti",   es:"50" },
    { han:"hundred",rom:"jandred", es:"100" },
    { han:"thousand",rom:"zausand",es:"1000", lvl:2 },
    { han:"first",  rom:"ferst",   es:"primero", lvl:2 },
    { han:"second", rom:"sekond",  es:"segundo", lvl:2 },
    { han:"third",  rom:"zerd",    es:"tercero", lvl:2 },
  ], 1);

  const enPreps = at([
    { han:"in",      rom:"in",      es:"en (dentro)" },
    { han:"on",      rom:"on",      es:"sobre / encima" },
    { han:"at",      rom:"at",      es:"en (un punto)" },
    { han:"under",   rom:"ander",   es:"debajo de" },
    { han:"over",    rom:"over",    es:"por encima de" },
    { han:"between", rom:"bituin",  es:"entre (dos)" },
    { han:"next to", rom:"nekst tu",es:"al lado de" },
    { han:"behind",  rom:"bijaind", es:"detrás de" },
    { han:"in front of", rom:"in front ov", es:"delante de" },
    { han:"from",    rom:"from",    es:"desde / de" },
    { han:"to",      rom:"tu",      es:"a / hacia" },
    { han:"with",    rom:"wiz",     es:"con" },
    { han:"without", rom:"wizaut",  es:"sin", lvl:2 },
    { han:"through", rom:"zru",     es:"a través de", lvl:2 },
    { han:"across",  rom:"akros",   es:"al otro lado de", lvl:3 },
    { han:"among",   rom:"amang",   es:"entre (varios)", lvl:3 },
  ], 1);

  const enVerbs = at([
    { han:"to be",    rom:"tu bi",    es:"ser / estar", verb:true },
    { han:"to have",  rom:"tu jav",   es:"tener", verb:true },
    { han:"to do",    rom:"tu du",    es:"hacer", verb:true },
    { han:"to go",    rom:"tu gou",   es:"ir", verb:true },
    { han:"to eat",   rom:"tu it",    es:"comer", verb:true },
    { han:"to drink", rom:"tu drink", es:"beber", verb:true },
    { han:"to see",   rom:"tu si",    es:"ver", verb:true },
    { han:"to speak", rom:"tu spik",  es:"hablar", verb:true },
    { han:"to read",  rom:"tu rid",   es:"leer", verb:true },
    { han:"to write", rom:"tu rait",  es:"escribir", verb:true },
    { han:"to live",  rom:"tu liv",   es:"vivir", verb:true },
    { han:"to work",  rom:"tu werk",  es:"trabajar", verb:true },
    { han:"to learn", rom:"tu lern",  es:"aprender", verb:true },
    { han:"to buy",   rom:"tu bai",   es:"comprar", verb:true },
    { han:"to sleep", rom:"tu slip",  es:"dormir", verb:true },
    { han:"to know",  rom:"tu nou",   es:"saber / conocer", verb:true, lvl:2 },
    { han:"to bring", rom:"tu bring", es:"traer", verb:true, lvl:2 },
    { han:"to choose",rom:"tu chus",  es:"elegir", verb:true, lvl:2 },
    { han:"to become",rom:"tu bikam", es:"llegar a ser", verb:true, lvl:3 },
    { han:"to afford",rom:"tu aford", es:"permitirse", verb:true, lvl:3 },
  ], 1);

  const enTenses = at([
    { han:"I work",         rom:"ai werk",        es:"presente simple", lvl:1 },
    { han:"I am working",   rom:"ai am werking",  es:"presente continuo", lvl:1 },
    { han:"I worked",       rom:"ai werkt",       es:"pasado simple", lvl:2 },
    { han:"I was working",  rom:"ai wos werking", es:"pasado continuo", lvl:2 },
    { han:"I have worked",  rom:"ai jav werkt",   es:"presente perfecto", lvl:2 },
    { han:"I will work",    rom:"ai wil werk",    es:"futuro simple", lvl:2 },
    { han:"I would work",   rom:"ai wud werk",    es:"condicional", lvl:3 },
    { han:"I had worked",   rom:"ai jad werkt",   es:"pasado perfecto", lvl:3 },
    { han:"I have been working", rom:"ai jav bin werking", es:"perfecto continuo", lvl:3 },
    { han:"I am going to work",  rom:"ai am going tu werk", es:"futuro con 'going to'", lvl:2 },
  ], 2);

  const enPhrasal = at([
    { han:"give up",   rom:"giv ap",    es:"rendirse", lvl:2 },
    { han:"look for",  rom:"luk for",   es:"buscar", lvl:2 },
    { han:"find out",  rom:"faind aut", es:"averiguar", lvl:2 },
    { han:"take off",  rom:"teik of",   es:"despegar / quitarse", lvl:2 },
    { han:"put on",    rom:"put on",    es:"ponerse", lvl:2 },
    { han:"turn on",   rom:"tern on",   es:"encender", lvl:1 },
    { han:"turn off",  rom:"tern of",   es:"apagar", lvl:1 },
    { han:"get up",    rom:"get ap",    es:"levantarse", lvl:1 },
    { han:"come back", rom:"kam bak",   es:"volver", lvl:1 },
    { han:"run out of",rom:"ran aut ov",es:"quedarse sin", lvl:3 },
    { han:"put up with",rom:"put ap wiz",es:"soportar", lvl:3 },
    { han:"look forward to", rom:"luk forward tu", es:"tener ganas de", lvl:3 },
  ], 2);

  const enPolite = at([
    { han:"please",           rom:"plis",            es:"por favor", lvl:1 },
    { han:"thank you",        rom:"zank yu",         es:"gracias", lvl:1 },
    { han:"you're welcome",   rom:"yur welkom",      es:"de nada", lvl:1 },
    { han:"excuse me",        rom:"ekskius mi",      es:"disculpe", lvl:1 },
    { han:"I'm sorry",        rom:"aim sorri",       es:"lo siento", lvl:1 },
    { han:"nice to meet you", rom:"nais tu mit yu",  es:"encantado", lvl:1 },
    { han:"could you help me?",rom:"kud yu jelp mi", es:"¿podría ayudarme?", lvl:2 },
    { han:"would you mind…?", rom:"wud yu maind",    es:"¿le importaría…?", lvl:3 },
    { han:"I beg your pardon",rom:"ai beg yur pardon",es:"¿cómo dice?", lvl:3 },
    { han:"sir / madam",      rom:"ser / madam",     es:"señor / señora", lvl:2 },
  ], 1);

  const enVocab = at([
    { han:"hello",   rom:"jelou",  es:"hola" },
    { han:"goodbye", rom:"gudbai", es:"adiós" },
    { han:"yes",     rom:"yes",    es:"sí" },
    { han:"no",      rom:"nou",    es:"no" },
    { han:"water",   rom:"woter",  es:"agua" },
    { han:"bread",   rom:"bred",   es:"pan" },
    { han:"milk",    rom:"milk",   es:"leche" },
    { han:"apple",   rom:"apol",   es:"manzana" },
    { han:"house",   rom:"jaus",   es:"casa" },
    { han:"door",    rom:"dor",    es:"puerta" },
    { han:"book",    rom:"buk",    es:"libro" },
    { han:"school",  rom:"skul",   es:"escuela" },
    { han:"friend",  rom:"frend",  es:"amigo" },
    { han:"family",  rom:"famili", es:"familia" },
    { han:"cat",     rom:"kat",    es:"gato" },
    { han:"dog",     rom:"dog",    es:"perro" },
    { han:"city",    rom:"siti",   es:"ciudad" },
    { han:"street",  rom:"strit",  es:"calle" },
    { han:"today",   rom:"tudei",  es:"hoy" },
    { han:"tomorrow",rom:"tumorou",es:"mañana" },
    { han:"morning", rom:"morning",es:"mañana (parte del día)" },
    { han:"night",   rom:"nait",   es:"noche" },
    { han:"weather", rom:"weder",  es:"tiempo (clima)", lvl:2 },
    { han:"money",   rom:"mani",   es:"dinero", lvl:2 },
    { han:"job",     rom:"llob",   es:"trabajo", lvl:2 },
    { han:"health",  rom:"jelz",   es:"salud", lvl:2 },
    { han:"journey", rom:"llerni", es:"viaje", lvl:2 },
    { han:"advice",  rom:"adváis", es:"consejo", lvl:2 },
    { han:"knowledge",rom:"nolich",es:"conocimiento", lvl:3 },
    { han:"behaviour",rom:"bijeivior",es:"comportamiento", lvl:3 },
    { han:"achievement",rom:"achívment",es:"logro", lvl:3 },
    { han:"environment",rom:"invaironment",es:"medio ambiente", lvl:3 },
    { han:"opportunity",rom:"oportiuniti",es:"oportunidad", lvl:3 },
    { han:"challenge",rom:"chalinch",es:"reto", lvl:3 },
  ], 1);

  /* Frases de inglés. En principiante son fórmulas de una línea; en medio
     aparecen preguntas completas y en avanzado estructuras con condicional,
     perfecto y voz pasiva. Es donde mejor se nota el salto de nivel. */
  const enFrases = [
    { han:"What's your name?",  rom:"wots yur neim",   es:"¿cómo te llamas?", lvl:1 },
    { han:"How are you?",       rom:"jau ar yu",       es:"¿cómo estás?", lvl:1 },
    { han:"How much is it?",    rom:"jau mach is it",  es:"¿cuánto cuesta?", lvl:1 },
    { han:"I don't understand", rom:"ai dont anderstand", es:"no entiendo", lvl:1 },
    { han:"Where are you from?",rom:"wer ar yu from",  es:"¿de dónde eres?", lvl:1 },
    { han:"Could you say that again?", rom:"kud yu sei dat aguein", es:"¿puedes repetirlo?", lvl:2 },
    { han:"I've been living here for two years", rom:"aiv bin living jir for tu yirs",
      es:"llevo dos años viviendo aquí", lvl:2 },
    { han:"What do you usually do at weekends?", rom:"wot du yu yuchuali du at wikends",
      es:"¿qué sueles hacer los fines de semana?", lvl:2 },
    { han:"I was about to leave when she called", rom:"ai wos abaut tu liv wen shi kold",
      es:"estaba a punto de irme cuando llamó", lvl:3 },
    { han:"If I had known, I would have told you", rom:"if ai jad noun ai wud jav told yu",
      es:"si lo hubiera sabido, te lo habría dicho", lvl:3 },
    { han:"The house was built in 1920", rom:"de jaus wos bilt in naintin tuenti",
      es:"la casa fue construida en 1920 (pasiva)", lvl:3 },
    { han:"I'd rather stay at home tonight", rom:"aid rader stei at joum tunait",
      es:"prefiero quedarme en casa esta noche", lvl:3 },
    { han:"You should have called me earlier", rom:"yu shud jav kold mi erlier",
      es:"deberías haberme llamado antes", lvl:3 },
    { han:"No sooner had I arrived than it started raining",
      rom:"nou suner jad ai araivd dan it started reining",
      es:"nada más llegar, empezó a llover (inversión)", lvl:3 },
  ];

  const enAll = [...enSounds, ...enNumbers, ...enPreps, ...enVerbs,
                 ...enTenses, ...enPhrasal, ...enPolite, ...enVocab, ...enFrases];

  const enGyms = [
    { key:"hangul", name:"Gimnasio Fonética", leader:"Maestra Ann", leaderSprite:"hangulSpirit",
      pool: enSounds, questionMode:"han-to-rom", total:10, passRatio:0.7, icon:"Aa",
      x:120, y:120, description:"Ann te reta a leer sonidos del inglés." },
    { key:"numeros", name:"Gimnasio Números", leader:"Contador Dice", leaderSprite:"numberSlime",
      pool: enNumbers, questionMode:"mixed", total:10, passRatio:0.7, icon:"12",
      x:260, y:150, description:"Dice mide tu rapidez con los números." },
    { key:"particulas", name:"Gimnasio Preposiciones", leader:"Duende Pree", leaderSprite:"dokkaebi",
      pool: enPreps, questionMode:"mixed", total:8, passRatio:0.65, icon:"in",
      x:420, y:180, description:"Pree te lía con in, on y at." },
    { key:"verbos", name:"Gimnasio Verbos", leader:"Capitán Verb", leaderSprite:"dokkaebi",
      pool: enVerbs, questionMode:"mixed", total:10, passRatio:0.7, icon:"to",
      x:560, y:220, description:"Todo verbo empieza por 'to'." },
    { key:"honor", name:"Gimnasio Cortesía", leader:"Lady Grace", leaderSprite:"hangulSpirit",
      pool: enPolite, questionMode:"mixed", total:6, passRatio:0.66, icon:"Mr",
      x:700, y:260, description:"Modales de salón inglés." },
    { key:"topik1", name:"Gimnasio Vocabulario", leader:"Examinadora Wells", leaderSprite:"numberSlime",
      pool: enVocab, questionMode:"mixed", total:12, passRatio:0.75, icon:"A1",
      x:840, y:300, description:"Simulacro de vocabulario básico." },
    { key:"topik2", name:"Gimnasio Tiempos", leader:"Doctor Tense", leaderSprite:"dokkaebi",
      pool: enTenses.concat(enPhrasal), questionMode:"mixed", total:15, passRatio:0.8, icon:"B1",
      x:980, y:340, description:"Tiempos verbales y phrasal verbs." },
    { key:"maestro", name:"Gimnasio Maestro", leader:"Shakespeare", leaderSprite:"hangulSpirit",
      pool: enAll, questionMode:"mixed", total:20, passRatio:0.85, icon:"★",
      x:1120, y:380, description:"Frente al mismísimo bardo." },
  ];

  const enRoutes = [
    { key:"ruta1", name:"Ruta 1", icon:"🌾", x:230, y:170, pool:enSounds.concat(enVocab.slice(0,6)) },
    { key:"ruta2", name:"Ruta 2", icon:"🏞️", x:460, y:200, pool:enNumbers.concat(enVocab.slice(6,14)) },
    { key:"ruta3", name:"Ruta 3", icon:"🌊", x:700, y:230, pool:enVocab.slice(0,20) },
    { key:"ruta4", name:"Ruta 4", icon:"⛰️", x:940, y:340, pool:enVocab.concat(enVerbs) },
    { key:"ruta5", name:"Ruta 5", icon:"🌲", x:360, y:470, pool:enVocab.concat(enPreps) },
    { key:"ruta6", name:"Ruta 6", icon:"🏙️", x:720, y:520, pool:enVocab.concat(enPhrasal) },
  ];

  // ==========================================================
  //  Idiomas y superficie pública
  // ==========================================================
  // se aplica la graduación: lo básico en 1, verbos y trato en 2-3
  const koHangul = at(hangul, 1);
  const koNums   = bump(at(numbers, 1), 2, koMedio);
  const koVocab  = bump(bump(at(vocab, 1), 2, koMedio), 3, koAlto).concat(koFrases);
  const koParts  = bump(at(particles, 2), 3, ["와/과", "만"]);
  const koAll = [...koHangul, ...koNums, ...koVocab, ...koParts];
  const LANGS = {
    ko: {
      code:"ko", name:"Coreano", nativo:"한국어", flag:"🇰🇷", tts:"ko-KR",
      hangul: koHangul, numbers: koNums, vocab: koVocab,
      particles: koParts, gyms, routes, allWords: koAll,
      // etiqueta de la escritura, para textos de la interfaz
      script:"hangul",
    },
    en: {
      code:"en", name:"Inglés", nativo:"English", flag:"🇬🇧", tts:"en-US",
      hangul: enSounds, numbers: enNumbers, vocab: enVocab.concat(enFrases),
      particles: enPreps, gyms: enGyms, routes: enRoutes, allWords: enAll,
      script:"latin",
    },
  };

  /* ---------- Nombres del mundo ----------
     El mapa es el mismo en los dos idiomas, pero sus rótulos no: jugando en
     inglés no tiene sentido que los pueblos se llamen 한글 마을 ni que la
     tienda ponga 상점. Cada idioma trae aquí sus letreros; el mundo los pide
     por la clave del gimnasio, que sí es común. */
  const WORLD = {
    ko: {
      towns: {
        hangul:{ name:"Pueblo Hangul", sub:"한글 마을" },
        numeros:{ name:"Pueblo Sutja", sub:"숫자 마을" },
        particulas:{ name:"Pueblo Josa", sub:"조사 마을" },
        verbos:{ name:"Pueblo Dongsa", sub:"동사 마을" },
        topik2:{ name:"Pueblo Topik", sub:"토픽 마을" },
        topik1:{ name:"Puerto Topik", sub:"토픽 항구" },
        honor:{ name:"Pueblo Jondae", sub:"존경 마을" },
      },
      zones: { lago:"Valle del Lago", lagoSub:"호수 골짜기",
               bosque:"Bosque del Sur", bosqueSub:"남쪽 숲" },
      labels: { shop:"상점 🛒", alcaldia:"시청 🏛", casa:"집 Casa",
                cafe:"카페 ☕", academia:"학원 📚", norebang:"노래방 🎤" },
    },
    en: {
      towns: {
        hangul:{ name:"Pueblo Sonidos", sub:"Sound Town" },
        numeros:{ name:"Pueblo Números", sub:"Number Town" },
        particulas:{ name:"Pueblo Preposición", sub:"Preposition Town" },
        verbos:{ name:"Pueblo Verbo", sub:"Verb Town" },
        topik2:{ name:"Pueblo Tiempos", sub:"Tense Town" },
        topik1:{ name:"Puerto Palabra", sub:"Word Harbour" },
        honor:{ name:"Pueblo Cortesía", sub:"Manners Town" },
      },
      zones: { lago:"Valle del Lago", lagoSub:"Lake Valley",
               bosque:"Bosque del Sur", bosqueSub:"South Woods" },
      labels: { shop:"Shop 🛒", alcaldia:"Town Hall 🏛", casa:"Home 🏠",
                cafe:"Café ☕", academia:"Academy 📚", norebang:"Karaoke 🎤" },
      /* Diálogos en inglés. Los del coreano viven en world.js (son los
         originales); aquí solo hace falta lo que los sustituye. Cada NPC
         mantiene su nombre traducido y sus frases en el idioma que enseña. */
      npc: {
        abuela: { name:"Grandma", lines:[
          { ko:"Good morning, dear!", rom:"gud morning dir", es:"¡Buenos días, cielo!" },
          { ko:"The weather is lovely today.", rom:"de weder is lovli tudei", es:"Hoy hace un tiempo precioso." },
          { ko:"Be careful in the tall grass.", rom:"bi kerful in de tol gras", es:"Ten cuidado en la hierba alta." } ] },
        nino: { name:"Kid", lines:[
          { ko:"Hi! Do you want to play?", rom:"jai du yu wont tu plei", es:"¡Hola! ¿Quieres jugar?" },
          { ko:"I'm learning new words.", rom:"aim lerning niu werds", es:"Estoy aprendiendo palabras nuevas." } ] },
        vendedor: { name:"Merchant", lines:[
          { ko:"Looking for something?", rom:"luking for somzing", es:"¿Buscas algo?" },
          { ko:"The shop is up north.", rom:"de shop is ap norz", es:"La tienda está al norte." } ] },
        pescador: { name:"Fisherman", lines:[
          { ko:"The sea is calm today.", rom:"de si is kalm tudei", es:"El mar está tranquilo hoy." },
          { ko:"Try fishing at the end of the pier.", rom:"trai fishing at de end ov de pir", es:"Prueba a pescar al final del muelle." } ] },
        monje: { name:"Monk", lines:[
          { ko:"Patience is a virtue.", rom:"peishens is a verchu", es:"La paciencia es una virtud." },
          { ko:"The cave hides an old master.", rom:"de keiv jaids an ould master", es:"La cueva esconde a un viejo maestro." } ] },
        guardia: { name:"Guard", lines:[
          { ko:"Halt! This cave is dangerous.", rom:"jolt dis keiv is deinllerus", es:"¡Alto! Esta cueva es peligrosa." },
          { ko:"You need seven badges to enter.", rom:"yu nid seven bachis tu enter", es:"Necesitas siete medallas para entrar." } ] },
        granjero: { name:"Farmer", lines:[
          { ko:"My sheep escaped again!", rom:"mai ship eskeipt aguein", es:"¡Mis ovejas se han vuelto a escapar!" },
          { ko:"Do you want an apple?", rom:"du yu wont an apol", es:"¿Quieres una manzana?" } ] },
        fan: { name:"Pop fan", lines:[
          { ko:"Do you like music?", rom:"du yu laik miusik", es:"¿Te gusta la música?" },
          { ko:"Let's sing together!", rom:"lets sing tugueder", es:"¡Cantemos juntos!" } ] },
        vecina: { name:"Neighbour", lines:[
          { ko:"Welcome to our town!", rom:"welkom tu aur taun", es:"¡Bienvenida a nuestro pueblo!" },
          { ko:"The mayor is at the town hall.", rom:"de meior is at de taun jol", es:"La alcaldesa está en el ayuntamiento." } ] },
        ninoPueblo: { name:"Boy", lines:[
          { ko:"They teach English at the academy.", rom:"dei tich inglish at de akademi", es:"En la academia enseñan inglés." },
          { ko:"It's really fun!", rom:"its rili fan", es:"¡Es muy divertido!" } ] },
        abueloPueblo: { name:"Grandpa", lines:[
          { ko:"Take your time, no rush.", rom:"teik yur taim nou rash", es:"Tómate tu tiempo, sin prisa." },
          { ko:"It's a long road. Safe travels.", rom:"its a long roud seif travels", es:"El camino es largo. Buen viaje." } ] },
        rival: { name:"Rina (rival)", lines:[
          { ko:"My pronunciation is the best!", rom:"mai pronansieishon is de best", es:"¡Mi pronunciación es la mejor!" },
          { ko:"Do you want to challenge me?", rom:"du yu wont tu chalinch mi", es:"¿Quieres retarme?" } ] },
        tendero: { name:"Shopkeeper", lines:[
          { ko:"Welcome! Take a look around.", rom:"welkom teik a luk araund", es:"¡Bienvenida! Echa un vistazo." } ] },
        barista: { name:"Barista", lines:[
          { ko:"Welcome to the café!", rom:"welkom tu de kafei", es:"¡Bienvenida al café!" },
          { ko:"What would you like to order?", rom:"wot wud yu laik tu order", es:"¿Qué desea pedir?" } ] },
        maestra: { name:"Teacher", lines:[
          { ko:"Shall we review today's words?", rom:"shal wi riviu tudeis werds", es:"¿Repasamos las palabras de hoy?" } ] },
        dj: { name:"DJ", lines:[
          { ko:"Ready to sing?", rom:"redi tu sing", es:"¿Lista para cantar?" } ] },
        gato_casa: { name:"Cat", lines:[
          { ko:"Meow~ home sweet home.", rom:"miau joum suit joum", es:"Miau~ hogar, dulce hogar." } ] },
      },
    },
  };

  let curLang = "ko", curLevel = "medio";
  const L = () => LANGS[curLang];
  function setLang(code){ if (LANGS[code]) curLang = code; }
  function setLevel(key){ if (LEVELS.some(l => l.key === key)) curLevel = key; }
  const level = () => LEVELS.find(l => l.key === curLevel) || LEVELS[1];

  /* Filtra un conjunto de palabras por el nivel elegido. Se usa en los
     encuentros y en los exámenes: en principiante no deben salir palabras
     avanzadas, pero si un conjunto se quedara vacío se devuelve entero
     antes que dejar al jugador sin preguntas. */
  function byLevel(pool){
    if (!Array.isArray(pool)) return pool;
    const max = level().max;
    const f = pool.filter(w => (w.lvl || 1) <= max);
    return f.length >= 4 ? f : pool;
  }

  return {
    // idioma y nivel
    setLang, setLevel, byLevel,
    world: () => WORLD[curLang] || WORLD.ko,
    lang: () => L(),
    langCode: () => curLang,
    langs: () => Object.values(LANGS),
    LEVELS, level, levelKey: () => curLevel,
    // contenido del idioma activo (se conserva la misma superficie de antes)
    get hangul(){ return L().hangul; },
    get numbers(){ return L().numbers; },
    get vocab(){ return L().vocab; },
    get particles(){ return L().particles; },
    get gyms(){ return L().gyms; },
    get routes(){ return L().routes; },
    get allWords(){ return L().allWords; },
  };
})();
