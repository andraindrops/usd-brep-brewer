import * as THREE from "three";

import type { CameraParams } from "@/types/camera";

// prettier-ignore
const VIEWS: Record<string, [number, number]> = {
  iso:    [ 35,  30],
  front:  [  0,   0],
  back:   [180,   0],
  right:  [ 90,   0],
  left:   [-90,   0],
  top:    [  0,  90],
  bottom: [  0, -90],
};

const finite = (s: string | null) => (s !== null && s.trim() !== "" && Number.isFinite(Number(s)) ? Number(s) : null);

// prettier-ignore
export function parseCameraParams(params: URLSearchParams): CameraParams {
  const [az0, el0] = VIEWS[params.get("view") ?? ""] ?? VIEWS.iso!;
  const t          = params.get("target")?.split(",").map(finite);
  return {
    az:     finite(params.get("az")) ?? az0,
    el:     finite(params.get("el")) ?? el0,
    zoom:   Math.max(finite(params.get("zoom")) ?? 1, 1e-3),
    ortho:  params.get("ortho") === "1",
    target: t?.length === 3 && t.every((v) => v !== null) ? new THREE.Vector3(t[0]!, t[2]!, -t[1]!) : null,
  };
}

/** Unit vector from the target toward the camera, in world (Y-up) coordinates. */
// prettier-ignore
function viewDir(az: number, el: number) {
  // straight up/down makes lookAt degenerate; stay just off the pole so screen-up follows the front view
  const a     = THREE.MathUtils.degToRad(az);
  const e     = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(el, -89.99, 89.99));
  const model = [Math.sin(a) * Math.cos(e), -Math.cos(a) * Math.cos(e), Math.sin(e)] as const;
  return new THREE.Vector3(model[0], model[2], -model[1]); // model Z-up -> world Y-up
}

export function lookAtPoint(box: THREE.Box3, p: CameraParams) {
  return p.target?.clone() ?? box.getCenter(new THREE.Vector3());
}

/** Place the camera per params and fit the box to the viewport. */
// prettier-ignore
export function frameCamera(camera: THREE.Camera, box: THREE.Box3, p: CameraParams, aspect: number) {
  const margin = 1.1 / p.zoom;
  const center = lookAtPoint(box, p);
  const radius = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 1e-6);
  const dir    = viewDir(p.az, p.el);

  if (camera instanceof THREE.OrthographicCamera) {
    const dist = radius * 4;
    camera.position.copy(center).addScaledVector(dir, dist);
    camera.lookAt(center);
    camera.updateMatrixWorld();
    // fit the projected box corners, not the bounding sphere, so the model fills the view
    const inv = camera.matrixWorldInverse;
    const c   = box.getCenter(new THREE.Vector3()).applyMatrix4(inv);
    let hx = 1e-6;
    let hy = 1e-6;
    for (let i = 0; i < 8; i++) {
      const q = new THREE.Vector3(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z,
      ).applyMatrix4(inv);
      hx = Math.max(hx, Math.abs(q.x - c.x));
      hy = Math.max(hy, Math.abs(q.y - c.y));
    }
    const width  = camera.right - camera.left;
    const height = camera.top - camera.bottom;
    camera.zoom = Math.min(width / (2 * hx), height / (2 * hy)) / margin;
    camera.near = 0.01 * radius;
    camera.far  = dist + radius * 4;
    camera.updateProjectionMatrix();
    return;
  }

  const persp = camera as THREE.PerspectiveCamera;
  const fov   = THREE.MathUtils.degToRad(persp.fov / 2);
  const fit   = Math.min(Math.sin(fov), Math.sin(Math.atan(Math.tan(fov) * aspect)));
  const dist  = (radius / fit) * margin;
  persp.position.copy(center).addScaledVector(dir, dist);
  persp.near = dist / 100;
  persp.far  = dist * 100;
  persp.lookAt(center);
  persp.updateProjectionMatrix();
}
