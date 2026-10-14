import type * as THREE from "three";

// Camera set from URL params, in the model's own Z-up coordinates:
//   view=iso|front|back|right|left|top|bottom   preset az/el
//   az=<deg>      around Z; 0 = from −Y (front), 90 = from +X (right)
//   el=<deg>      above the XY plane; 90 = from +Z (top)
//   zoom=<n>      1 = whole model fits
//   target=x,y,z  look at this point instead of the model center
//   ortho=1       orthographic projection
// prettier-ignore
export type CameraParams = {
  az:     number;
  el:     number;
  zoom:   number;
  ortho:  boolean;
  target: THREE.Vector3 | null;
};
