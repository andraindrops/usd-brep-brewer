"""Fixed exporter: out.usda (BrepArray) -> out.glb + out.stl + report.json.

Usage: python export.py [job_dir]   (default: /work)

Models are Z-up (same convention as the upstream usd-brep docs). The glb root node
rotates them into glTF's Y-up; out.stl (for slicers) and report.json stay in the model's own coordinates.

glb layout:
  node "model" (Z-up -> Y-up rotation)
    node "brep{b}"        TRIANGLES
    node "brep{b}_edges"  LINES (each edge sampled at EDGE_SAMPLES points)
"""

import json
import math
import struct
import sys
import time
import traceback
from pathlib import Path

import numpy as np
import trimesh
import usd_brep as u

EDGE_SAMPLES = 24
Z_UP_TO_Y_UP = [-math.sqrt(0.5), 0.0, 0.0, math.sqrt(0.5)]  # -90° about X, as xyzw


def triangulate(stream):
    """Flat polygon stream [n, i0..] -> (vertex indices (m,3), corner indices (m,3))."""
    tris, corners = [], []
    i = corner = 0
    while i < len(stream):
        n = int(stream[i])
        idx = stream[i + 1 : i + 1 + n]
        for k in range(1, n - 1):
            tris.append((idx[0], idx[k], idx[k + 1]))
            corners.append((corner, corner + k, corner + k + 1))
        i += n + 1
        corner += n
    return np.asarray(tris, dtype=np.int64).reshape(-1, 3), np.asarray(corners, dtype=np.int64).reshape(-1, 3)


def sample_edges(brep):
    segs = []
    for e in brep.edges():
        t0, t1 = e.parameter_range()
        # booleans can leave an edge's range an ulp outside its curve's domain, and point_at
        # rejects anything outside the domain: clamp to it
        c0, c1 = sorted(e.curve().parameter_range())
        t0, t1 = max(t0, c0), min(t1, c1)
        pts = np.asarray([e.point_at(t) for t in np.linspace(t0, t1, EDGE_SAMPLES)], dtype=np.float64)
        segs.append(np.stack([pts[:-1], pts[1:]], axis=1).reshape(-1, 3))
    return np.concatenate(segs) if segs else np.zeros((0, 3))


class GlbWriter:
    def __init__(self):
        self.bin = bytearray()
        self.gltf = {
            "asset": {"version": "2.0", "generator": "usd-brep-brewer export.py"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"name": "model", "rotation": Z_UP_TO_Y_UP, "children": []}],
            "meshes": [],
            "accessors": [],
            "bufferViews": [],
            "buffers": [],
            "materials": [
                {"name": "face", "pbrMetallicRoughness": {"baseColorFactor": [0.72, 0.74, 0.78, 1], "metallicFactor": 0.0, "roughnessFactor": 0.6}, "doubleSided": True},
                {"name": "edge", "pbrMetallicRoughness": {"baseColorFactor": [0.05, 0.05, 0.05, 1]}, "extensions": {"KHR_materials_unlit": {}}},
            ],
            "extensionsUsed": ["KHR_materials_unlit"],
        }

    def _accessor(self, arr, target, with_bounds=False):
        data = arr.tobytes()
        while len(self.bin) % 4:
            self.bin.append(0)
        self.gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(self.bin), "byteLength": len(data), "target": target})
        self.bin += data
        acc = {
            "bufferView": len(self.gltf["bufferViews"]) - 1,
            "componentType": {np.dtype(np.float32): 5126, np.dtype(np.uint32): 5125}[arr.dtype],
            "count": len(arr),
            "type": "VEC3" if arr.ndim == 2 else "SCALAR",
        }
        if with_bounds:
            acc["min"] = arr.min(axis=0).tolist()
            acc["max"] = arr.max(axis=0).tolist()
        self.gltf["accessors"].append(acc)
        return len(self.gltf["accessors"]) - 1

    def add(self, name, positions, normals=None, lines=False):
        pos = np.ascontiguousarray(positions, dtype=np.float32)
        attrs = {"POSITION": self._accessor(pos, 34962, with_bounds=True)}
        if normals is not None:
            attrs["NORMAL"] = self._accessor(np.ascontiguousarray(normals, dtype=np.float32), 34962)
        prim = {
            "attributes": attrs,
            "indices": self._accessor(np.arange(len(pos), dtype=np.uint32), 34963),
            "mode": 1 if lines else 4,
            "material": 1 if lines else 0,
        }
        self.gltf["meshes"].append({"name": name, "primitives": [prim]})
        self.gltf["nodes"].append({"name": name, "mesh": len(self.gltf["meshes"]) - 1})
        self.gltf["nodes"][0]["children"].append(len(self.gltf["nodes"]) - 1)

    def write(self, path):
        while len(self.bin) % 4:
            self.bin.append(0)
        self.gltf["buffers"] = [{"byteLength": len(self.bin)}]
        js = json.dumps(self.gltf, separators=(",", ":")).encode()
        js += b" " * (-len(js) % 4)
        with open(path, "wb") as f:
            f.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(self.bin)))
            f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
            f.write(struct.pack("<II", len(self.bin), 0x004E4942) + bytes(self.bin))


def main(job):
    report = {"ok": False, "breps": [], "timings": {}, "errors": []}
    timings = report["timings"]
    try:
        src = job / "out.usda"
        if not src.exists():
            raise FileNotFoundError("out.usda was not produced by gen.py")
        t0 = time.perf_counter()
        breps = u.usd.import_breps(str(src))
        timings["import"] = round(time.perf_counter() - t0, 4)
        if not breps:
            raise ValueError("out.usda contains no BrepArray breps")

        glb = GlbWriter()
        all_pts = []
        stl_meshes = []
        for b, brep in enumerate(breps):
            t0 = time.perf_counter()
            mesh, tess = u.tessellate(brep, allow_partial=True, return_report=True)
            timings[f"tessellate[{b}]"] = round(time.perf_counter() - t0, 4)
            arrays = mesh.to_numpy_arrays(face_varying_normals=True)
            points = np.asarray(arrays["points"], dtype=np.float64)
            normals = np.asarray(arrays["normals"], dtype=np.float32)
            tris, corners = triangulate(np.asarray(arrays["faces"], dtype=np.int64))

            report["breps"].append({
                "index": b,
                "info": brep.info(),
                "triangles": int(len(tris)),
                "failed_faces": tess.get("failures", []),
            })
            if len(tris):
                all_pts.append(points)
                stl_meshes.append(trimesh.Trimesh(points, tris))
                glb.add(f"brep{b}", points[tris].reshape(-1, 3), normals[corners].reshape(-1, 3) if len(normals) else None)
            seg = sample_edges(brep)
            if len(seg):
                glb.add(f"brep{b}_edges", seg, lines=True)

        if all_pts:
            pts = np.concatenate(all_pts)
            lo, hi = pts.min(axis=0), pts.max(axis=0)
            report["bounds"] = {"min": lo.tolist(), "max": hi.tolist(), "size": (hi - lo).tolist()}
        glb.write(job / "out.glb")
        if stl_meshes:
            trimesh.util.concatenate(stl_meshes).export(job / "out.stl")
        report["ok"] = all(not e["failed_faces"] for e in report["breps"])
    except Exception as e:
        report["errors"].append({"type": type(e).__name__, "message": str(e), "traceback": traceback.format_exc()})
    (job / "report.json").write_text(json.dumps(report, indent=2, default=str))
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main(Path(sys.argv[1] if len(sys.argv) > 1 else "/work")))
