# Exporta un .blend a glTF separado. Se ejecuta CON Blender, no con Python suelto:
#
#   blender -b "assets/uploads_files_6978800_free+isometric+rooms/free isometric roooms.blend" \
#           -P tools/blend2gltf.py -- assets/rooms_gltf/rooms
#
# Deja rooms.gltf + rooms.bin (+ texturas) listos para hornear a JS.
# Si se pasa --list en vez de una ruta, solo imprime los objetos del archivo,
# que es lo primero que conviene hacer para saber qué habitación usar.
import bpy, sys, os

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []

if not argv or argv[0] == "--list":
    print("=== objetos del .blend ===")
    for o in bpy.data.objects:
        if o.type != "MESH":
            continue
        d = o.dimensions
        print(f"{o.name}\ttipo={o.type}\tverts={len(o.data.vertices)}"
              f"\tdim={d.x:.2f}x{d.y:.2f}x{d.z:.2f}"
              f"\tcolecciones={[c.name for c in o.users_collection]}")
    print("=== colecciones ===")
    for c in bpy.data.collections:
        print(c.name, "->", len(c.objects), "objetos")
    sys.exit(0)

out = os.path.abspath(argv[0])
only = argv[1] if len(argv) > 1 else None   # nombre de colección u objeto a exportar
os.makedirs(os.path.dirname(out), exist_ok=True)

if only:
    # deja seleccionado solo lo pedido (una habitación concreta)
    bpy.ops.object.select_all(action="DESELECT")
    target = bpy.data.collections.get(only)
    objs = list(target.all_objects) if target else [o for o in bpy.data.objects if o.name == only]
    if not objs:
        print("No encontré ninguna colección u objeto llamado", only)
        sys.exit(1)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]

bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLTF_SEPARATE",
    use_selection=bool(only),
    export_apply=True,        # aplica modificadores
    export_yup=True,          # convención de Three.js
    export_materials="EXPORT",
)
print("Exportado a", out + ".gltf")
