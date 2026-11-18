import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";

import { JobParts } from "@/components/app/job/parts";
import type { CameraParams } from "@/types/camera";
import type { Model, Part } from "@/types/model";
import { frameCamera, lookAtPoint } from "@/utils/camera";

// prettier-ignore
type Props = {
  id:       string | null;
  model:    Model | null;
  camera:   CameraParams;
  // the box to frame (the selection's, or the whole model's)
  box:      THREE.Box3 | null;
  selected: Part[] | null;
};

export function JobShow({ id, model, camera, box, selected }: Props) {
  if (!model || !box) {
    return (
      <p className="grid h-screen place-items-center text-sm text-muted-foreground">
        {id ? `${id}: no out.glb` : "Open with ?job=<id>"}
      </p>
    );
  }
  // prettier-ignore
  return (
    <div className="flex h-screen">
    <div className="relative flex-1">
      <Canvas
        orthographic={camera.ortho}
        camera={camera.ortho ? { zoom: 1 } : { fov: 35 }}
        onCreated={(s) => frameCamera(s.camera, box, camera, s.size.width / s.size.height)}
      >
        <color attach="background" args={["#f4f4f5"]} />
        <hemisphereLight args={["#ffffff", "#8a8f98", 1.6]} />
        <directionalLight position={[ 3,  5,  4]} intensity={1.6} />
        <directionalLight position={[-4, -2, -3]} intensity={0.5} />
        <primitive object={model.scene} />
        <OrbitControls makeDefault target={lookAtPoint(box, camera)} />
        <GizmoHelper alignment="bottom-left" margin={[64, 64]}>
          {/* rotate the gizmo into the model's Z-up axes so its labels match */}
          <GizmoViewport font="500 18px 'M PLUS 1 Code', monospace" rotation={[-Math.PI / 2, 0, 0]} disabled labelColor="white" />
        </GizmoHelper>
      </Canvas>
      <div className="absolute top-3 right-3 font-mono text-xs text-muted-foreground">
        az {camera.az} el {camera.el} zoom {camera.zoom} {camera.ortho ? "ortho" : "persp"}
        {camera.target && " target"}
      </div>
    </div>
    {model.parts && <JobParts parts={model.parts} selected={selected} />}
    </div>
  );
}
