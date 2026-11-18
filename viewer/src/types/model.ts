import type * as THREE from "three";

// One brep, named by parts.json (via report.json); objects are its "brep{i}" mesh and "brep{i}_edges" lines.
// prettier-ignore
export type Part = {
  index:     number;
  name:      string;
  component: string;
  kind:      string | null;
  volume:    number | null;
  objects:   THREE.Object3D[];
};

export type Model = { scene: THREE.Object3D; box: THREE.Box3; parts: Part[] | null };
