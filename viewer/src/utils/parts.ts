import * as THREE from "three";

import type { Model, Part } from "@/types/model";

const meshes = (p: Part) =>
  p.objects.filter((o): o is THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> => o instanceof THREE.Mesh);

/** Parts picked by ?component=<name> or ?part=<name>, or null to show everything. */
export function selectedParts(parts: Part[] | null, params: URLSearchParams): Part[] | null {
  const component = params.get("component");
  const part = params.get("part");
  if (!parts || (component === null && part === null)) return null;
  return parts.filter((p) => p.component === component || p.name === part);
}

/** Dim every part outside the selection (and hide its edges); returns the box to frame. */
export function applySelection(model: Model, selected: Part[] | null): THREE.Box3 {
  if (!selected?.length) return model.box;
  for (const p of model.parts ?? []) {
    if (selected.includes(p)) continue;
    for (const o of p.objects) o.visible = o instanceof THREE.Mesh;
    for (const m of meshes(p)) Object.assign(m.material, { transparent: true, opacity: 0.12, depthWrite: false });
  }
  const box = new THREE.Box3();
  for (const p of selected) for (const o of p.objects) box.expandByObject(o);
  return box;
}

export function showParts(parts: Part[], selected: Part[] | null, on: boolean) {
  for (const p of parts) {
    for (const o of p.objects) o.visible = on && (o instanceof THREE.Mesh || !selected?.length || selected.includes(p));
  }
}

export function highlightPart(part: Part, on: boolean) {
  for (const m of meshes(part)) m.material.emissive.set(on ? "#2563eb" : "#000000");
}
