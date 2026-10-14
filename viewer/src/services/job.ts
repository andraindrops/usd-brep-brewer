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

/** The job's out.glb with viewer materials, or null if it has none. */
export async function loadModel(id: string): Promise<Model | null> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/out.glb`);
  if (!res.ok) return null;
  const { scene } = await new GLTFLoader().parseAsync(await res.arrayBuffer(), "");
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh) o.material = faceMaterial;
    else if (o instanceof THREE.LineSegments) o.material = edgeMaterial;
  });
  return { scene, box: new THREE.Box3().setFromObject(scene) };
}
