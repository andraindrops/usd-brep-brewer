import { GizmoHelper, GizmoViewport, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

import type { CameraParams } from "@/types/camera";
import type { Model } from "@/types/model";
import { frameCamera, lookAtPoint } from "@/utils/camera";

// prettier-ignore
type Props = {
  id:     string | null;
  model:  Model | null;
  camera: CameraParams;
};

export function JobShow({ id, model, camera }: Props) {
  if (!model) {
    return (
      <p className="grid h-screen place-items-center text-sm text-muted-foreground">
        {id ? `${id}: no out.glb` : "Open with ?job=<id>"}
      </p>
    );
  }
  // prettier-ignore
  return (
    <div className="relative h-screen">
      <Canvas
        orthographic={camera.ortho}
        camera={camera.ortho ? { zoom: 1 } : { fov: 35 }}
        onCreated={(s) => frameCamera(s.camera, model.box, camera, s.size.width / s.size.height)}
      >
        <color attach="background" args={["#f4f4f5"]} />
        <hemisphereLight args={["#ffffff", "#8a8f98", 1.6]} />
        <directionalLight position={[ 3,  5,  4]} intensity={1.6} />
        <directionalLight position={[-4, -2, -3]} intensity={0.5} />
        <primitive object={model.scene} />
        <OrbitControls makeDefault target={lookAtPoint(model.box, camera)} />
        <GizmoHelper alignment="bottom-left" margin={[64, 64]}>
          {/* rotate the gizmo into the model's Z-up axes so its labels match */}
          <GizmoViewport rotation={[-Math.PI / 2, 0, 0]} disabled labelColor="white" />
        </GizmoHelper>
      </Canvas>
      <div className="absolute top-3 right-3 font-mono text-xs text-muted-foreground">
        az {camera.az} el {camera.el} zoom {camera.zoom} {camera.ortho ? "ortho" : "persp"}
        {camera.target && " target"}
      </div>
    </div>
  );
}
