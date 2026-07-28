# 포코레아노 POKOREANO — v3.0 ✨

Juego estilo Pokémon para aprender coreano, con un **mundo 3D low-poly** renderizado con
Three.js: praderas pintadas a mano, bosques de árboles poligonales, playa con marea,
casas de verdad y cuevas. Toda la lógica original se conserva: overworld caminable,
batallas de vocabulario, gimnasios-examen, medallas, cajas estilo CS/LoL con skins,
mascotas, historia por capítulos y práctica de voz.

## Novedades v3.0 — el mundo con assets 3D

- **Vegetación y rocas del pack StylisedEnv** (`js/envProps.js`, `js/envAssets.js`): los
  árboles-esfera, arbustos y piedras procedurales han dado paso a los modelos reales del
  pack. Cada árbol es un tronco curvo con un racimo de copas; hay matas, peñascos, riscos,
  troncos caídos, losas, guijarros, helechos y flores con textura recortada. Todo va
  **instanciado por geometría**, así el mapa entero son ~85 draw calls.
- **Casas de verdad** (`buildHouseMesh` en `js/world.js`): la cabaña del asset `casa.fbx`
  —muros de estuco, tejas, vigas y ventanas— se extrae del modelo de la casa en el mar y
  se reutiliza en todos los edificios, recoloreada según el tipo (tienda, alcaldía, café,
  academia, norebang, casa, gimnasios).
- **Paisaje estilo Pokémon**: el suelo se hornea con manchas orgánicas en vez de casillas
  (se acabó el ajedrezado), cielo con cúpula degradada que sigue a la cámara, niebla al
  horizonte, faldón que evita ver el borde del mapa, y sombras a 2048.
- **Mar con marea**: degradado de profundidad de turquesa a azul hondo, espuma solo en la
  rompiente de arena, olas dispersas y **orilla ondulada** con el contorno suavizado —
  suelo y lámina de agua comparten la misma silueta.
- **Diorama del jardín** (`js/envGarden.js`) emergiendo del mar al suroeste y **casa en el
  mar** (`js/seaHouse.js`) en la playa, como piezas de paisaje de fondo.
- **Joystick táctil** en teléfonos y tablets (esquina inferior derecha). En escritorio
  no se dibuja: sobra con el teclado. La barra superior se compacta en una sola fila.
- Depuración: `index.html?autostart=1` entra directo al mapa; admite `&tp=x,y`,
  `&enter=gym|cave|shop|cafe|alcaldia|academia|norebang|home` y `&test=battle|capture`.

## La región

El mundo ya no es un único mapa: es una **región de 132x104 partida en 9 zonas**, y solo
vive en memoria la que estás pisando. Para pasar a la siguiente hay que salir por la
carretera que cruza el borde — el resto del contorno es bosque cerrado.

```
Pueblo Hangul  ── Pueblo Sutja  ── Pueblo Josa      (alcaldía+casa · tienda · academia)
      │                 │                │
Pueblo Topik   ── Valle del Lago ── Pueblo Dongsa   (cueva del Maestro · norebang)
      │                 │                │
Bosque del Sur ── Puerto Topik  ── Pueblo Jondae    (muelle de pesca · café)
```

Tres carreteras horizontales y tres verticales forman la malla; cada pueblo se planta en
un cruce, así que siempre se llega por camino. El río parte la región de norte a sur y
solo se cruza por los puentes. Por la playa del sur también se puede ir de una zona a
otra, como ruta alternativa.

Todo se describe con datos en `js/world.js` — `REGION` (costa, río, carreteras), `TOWNS`
(centro de cada pueblo y qué servicios tiene) y `ZONE_COLS`/`ZONE_ROWS` (los cortes).
Mover un pueblo es cambiar dos números; el resto se recoloca solo, incluidos los NPCs,
que se apartan a la casilla libre más cercana si su sitio queda ocupado.

## Herramientas de desarrollo (`tools/`, necesitan `npm i` dentro de la carpeta)

```
node tools/shot_world.mjs [prefijo]   # una captura por zona → test-shots/
node tools/check_region.mjs           # accesos, fronteras, cruce a pie y guardado
node tools/perf_world.mjs             # FPS y errores de consola
node tools/smoke_world.mjs            # puertas, interiores, batalla y captura
node tools/check_joystick.mjs         # joystick táctil, emulando un móvil
node tools/shot_envassets.mjs         # hoja de contactos de ENV_ASSETS
```

`check_region.mjs` es el que hay que correr después de tocar el mapa: comprueba por BFS
que se llega a los 7 gimnasios y a todos los servicios, que cada zona tiene abiertas las
fronteras que le tocan, que se cruza un borde **andando** (no con el teletransporte) y
que la partida guardada recuerda en qué zona estabas.

### Habitaciones isométricas → cuarto de Karol

`assets/uploads_files_6978800_free+isometric+rooms/` es un `.blend` de 120 MB con **tres
dormitorios**. Se exporta con Blender (`winget install BlenderFoundation.Blender`) y se
hornea a JS. La habitación 0 (cama, escritorio con monitor y ventana) es la que usa la
casa de Karol:

```
blender -b "assets/uploads_files_6978800_free+isometric+rooms/free isometric roooms.blend" -P tools/blend2gltf.py -- --list
blender -b "assets/uploads_files_6978800_free+isometric+rooms/free isometric roooms.blend" -P tools/blend2gltf.py -- assets/rooms_gltf/rooms
node tools/rooms_preview.mjs     # renderiza las 3 habitaciones para elegir
node tools/room2js.mjs 0         # hornea la elegida → js/homeRoom.js
node tools/room_grid.mjs         # vista cenital con rejilla, para mapear los muebles
```

El pack trae mapas PBR de 4096px (110 MB en total). El juego sombrea con Lambert, así que
`room2js.mjs` se queda **solo con el color base reducido a 1024 JPEG** y descarta normal,
metallic y roughness: la habitación entera queda en 1,5 MB de JS.

Las casillas por las que se puede andar dentro del cuarto están escritas a mano en
`HOME_FREE` (`js/world.js`), leídas de `test-shots/room_grid.png`. Si se cambia la escala
o la posición del modelo hay que regenerar esa vista y reajustarlas — `tools/smoke_world.mjs`
comprueba que desde donde apareces se llega andando a la salida, al guardado y al gato.

## Jugar

Sirve la carpeta con cualquier servidor estático y abre `index.html`:

```
npx http-server -p 8123 .
```

(Abrir el archivo directamente con doble clic también funciona en la mayoría de navegadores.)

## Guardianes (수호신)

12 criaturas del folclore coreano viven en los **arbustos** de cada bioma (pradera,
bosque, costa) y en las **rocas de la cueva**. Al pisar uno puede aparecer un guardián:
responde una racha de preguntas sin fallar para capturarlo (las rarezas altas exigen
racha más larga). Arma tu **equipo de 3** en el menú Guardianes — cada uno da una
habilidad en los exámenes de gimnasio (eliminar opciones, saltar pregunta, escudo,
reintento…), con **doble uso si su tipo coincide con el gimnasio** (afinidad) y usos
extra al **evolucionar** (nivel 5, ganando XP con tus respuestas correctas).

El Gimnasio Maestro está escondido dentro de la **cueva** del bosque (noreste).

## Modo historia

Los servicios están **repartidos por la región**, así que hay que viajar para usarlos:

- **시청 Alcaldía** (Pueblo Hangul) — la alcaldesa te da las misiones de cada capítulo.
- **집 Casa de Karol** (Pueblo Hangul) — tu base, con un gato y un punto de guardado 💾.
- **상점 Tienda** (Pueblo Sutja) — mascotas y cajas de skins.
- **학원 Academia** (Pueblo Josa) — clase de repaso de 5 preguntas.
- **노래방 Norebang** (Pueblo Dongsa) — karaoke, y Rina espera fuera para el duelo.
- **카페 Café** (Pueblo Jondae) — identifica el plato coreano y ganas monedas.
- **Muelle de pesca** (Puerto Topik) y la **cueva del Maestro** (Valle del Lago).

Cada capítulo desbloquea un gimnasio, que además exige un **nivel mínimo de estudiante**
(⭐ ganas XP con cada respuesta correcta). La misión actual se ve siempre en el banner
del mapa, y el minimapa de la esquina muestra la zona en la que estás.

## Tienda y mascotas

La **tienda 상점** está en **Pueblo Sutja**: entra por la puerta y habla con el
tendero. Con monedas puedes comprar **mascotas** (병아리 pollito, 토끼 conejo, 고양이 gato,
강아지 perrito) que te siguen por el mapa, o una **caja de skins** (200 monedas).
En la **Mochila** gestionas mascotas, skins y ves tus medallas.

## Controles

- **Flechas / WASD** — caminar. En teléfonos y tablets aparece un **joystick táctil**
  en la esquina inferior izquierda (en escritorio no se dibuja: sobra con el teclado).
- **Hierba alta** — encuentros con palabras salvajes
- **Casas** — gimnasios (exámenes). Se desbloquean en orden ganando medallas.
- **NPCs** (con burbuja "…") — camina hacia ellos para hablar: frases en coreano
  con romanización y subtítulo en español, leídas en voz alta (TTS). Avanza con
  espacio/clic, cierra con Esc.
- Cada medalla abre una **caja** con skins por rareza (común → mítico). La skin
  activa también recolorea a tu personaje en el mapa.

## Práctica de pronunciación 🎤

En el **Vocabudex**, cada palabra descubierta tiene un botón **🎤 Pronunciar**: di la
palabra al micrófono y el juego la compara con el coreano real (reconocimiento de voz
del navegador, `ko-KR`). Si la pronuncias bien: +2 XP. Requisitos: **Chrome o Edge**,
conexión a internet y dar permiso de micrófono la primera vez.

La voz también está integrada en el juego:
- **Batallas**: botón *🎤 ¡Grítala!* — pronuncia la palabra salvaje y haces un
  **golpe crítico x2** (fallar el grito no penaliza).
- **Gimnasios**: cuando la respuesta correcta es coreana, aparece
  *🎤 Responder con la voz* — pronúnciala en vez de tocarla (+1 XP extra).
- **노래방 Norebang** (karaoke, en el pueblo): la DJ te pone 3 frases coreanas;
  escúchalas y repítelas al micrófono. Cada frase acertada da XP y monedas.
  El **capítulo 7** de la historia incluye tu *Debut en el norebang* (sin micrófono,
  la DJ te deja "tararear" para no bloquear la historia).
- **Duelo de pronunciación**: Rina (리나), tu rival, espera junto al norebang del
  pueblo. 3 palabras por turnos: tú las pronuncias al micrófono y ella responde.
  Ganarle da +40 monedas y +5 XP.

## Importar vocabulario de tus libros

Menú → *Importar vocab (CSV)*. Formato una línea por palabra:

```
안녕,annyeong,hola
고양이,goyangi,gato
```

Se guarda en localStorage y entra al pool de encuentros.

## Créditos de assets

- **Vegetación, rocas y jardín**: pack *StylisedEnv*
  (`assets/uploads_files_7236724_StylisedEnv/`), horneado a JS con `tools/gltf*2js.mjs` y
  `tools/obj_assets2js.mjs` → `js/envProps.js`, `js/envAssets.js`, `js/envGarden.js`.
- **Casa** (usada tanto para la casa en el mar como para todos los edificios):
  `assets/47-house-in-the-seacorrected_blendfbx/casa.fbx`, convertido con
  `tools/fbx2glb.mjs` + `tools/glb2js.mjs` → `js/seaHouse.js`.
- **Motor 3D**: [Three.js](https://threejs.org) r158 (`lib/three.min.js`, licencia MIT).
- **Personajes, muebles y props de relleno**: generados por código (`js/paper.js`).
- **Sprites de batalla, medallas, guardianes y skins**: pixel-art SVG propio (`js/sprites.js`).
- **Cuarto de Karol**: pack *free isometric rooms*
  (`assets/uploads_files_6978800_free+isometric+rooms/`), exportado con
  `tools/blend2gltf.py` y horneado con `tools/room2js.mjs` → `js/homeRoom.js`.
- Los PNG antiguos de `assets/gfx/` (Kenmi / ArMM1998) ya **no se cargan**, salvo las
  texturas del pack en `assets/gfx/env/`; se conservan por historia del proyecto.
