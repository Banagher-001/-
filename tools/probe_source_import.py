"""Run with Blender --background --python tools/probe_source_import.py.

Only inspects local source assets; exports no third-party model to the repo.
"""
import sys
import json
import os
from pathlib import Path
import bpy

sys.path.insert(0, '/workspace/tools')
report = {'blender': bpy.app.version_string, 'models': []}
try:
    import SourceIO
    # The 2024 plugin returns a Path object from __fspath__; Python 3.13 requires str.
    # This compatibility shim changes only the local probe, not model data or plugin files.
    from SourceIO.library.utils.tiny_path import TinyPath
    TinyPath.__fspath__ = lambda self: str(self)
    SourceIO.register()
    paths = [
        Path('/workspace/model-probe/685994386/models/speeder/buildings/lamppost.mdl'),
        Path("/workspace/model-probe/1388222994/models/kemot44/models/overwatch/vehicle/king's_row_payload_v3.mdl"),
    ]
    for path in paths:
        asset_root = Path('/workspace/model-probe') / path.relative_to('/workspace/model-probe').parts[0]
        os.chdir(asset_root)  # Legacy content providers resolve relative model paths against cwd.
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        try:
            result = bpy.ops.sourceio.mdl(filepath=str(path), directory=str(path.parent)+'/', files=[{'name': path.name}],
                import_textures=True, import_animations=False, import_physics=False)
            meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
            report['models'].append({'file': path.name, 'operator': list(result),
                'mesh_count': len(meshes), 'vertices': sum(len(o.data.vertices) for o in meshes),
                'material_count': len({slot.material.name for o in meshes for slot in o.material_slots if slot.material}),
                'status': 'imported' if meshes else 'no_meshes'})
        except Exception as error:
            report['models'].append({'file': path.name, 'error': str(error), 'status': 'failed'})
except Exception as error:
    report['error'] = str(error)
out = Path('/workspace/model-research/source-import-probe.json')
out.write_text(json.dumps(report, ensure_ascii=False, indent=2))
print('SOURCE_IMPORT_RESULT', json.dumps(report, ensure_ascii=False))
