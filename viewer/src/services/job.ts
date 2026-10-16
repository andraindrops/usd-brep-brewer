import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { Model } from "@/types/model";

// prettier-ignore
const faceMaterial = new THREE.MeshStandardMaterial({
  color:     "#b8bcc6",
  roughness: 0.6,
  metalness: 0,
  side:      THREE.DoubleSide,
  // push faces back so edges drawn on the same surface stay visible
  polygonOffset:       true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits:  1,
});
const edgeMaterial = new THREE.LineBasicMaterial({ color: "#111827" });
// faceMaterial in the color of each "face:#rrggbb" material from export.py, by name
const colorMaterials = new Map<string, THREE.Material>();

function viewerMaterial(m: THREE.Material): THREE.Material {
  if (!m.name.startsWith("face:") || !(m instanceof THREE.MeshStandardMaterial)) return faceMaterial;
  let c = colorMaterials.get(m.name);
  if (!c) {
    c = faceMaterial.clone();
    (c as THREE.MeshStandardMaterial).color.copy(m.color);
    colorMaterials.set(m.name, c);
  }
  return c;
}

/** The job's out.glb with viewer materials, or null if it has none. */
export async function loadModel(id: string): Promise<Model | null> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/out.glb`);
  if (!res.ok) return null;
  const { scene } = await new GLTFLoader().parseAsync(await res.arrayBuffer(), "");
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) o.material = viewerMaterial(o.material as THREE.Material);
    else if (o instanceof THREE.LineSegments) o.material = edgeMaterial;
  });
  return { scene, box: new THREE.Box3().setFromObject(scene) };
}
