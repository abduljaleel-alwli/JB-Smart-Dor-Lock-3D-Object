import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { Camera } from "three";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { SmartLock } from "./SmartLock";
import { DOOR_BOTTOM, DOOR_W, PLATE_CENTER_Y, PLINTH_H, STAND_H } from "./doorProfile";

type ViewName = "angle" | "exterior" | "interior" | "side" | "latch";
type Vec3 = [number, number, number];
const VIEWS: Record<ViewName, { label: string; position: Vec3; target: Vec3 }> = {
  angle: { label: "زاوية عامة", position: [5.1, 0.9, 10.2], target: [0, -0.2, 0] },
  exterior: { label: "الوجه الخارجي", position: [0, 0, 10.8], target: [0, -0.2, 0] },
  interior: { label: "الوجه الداخلي", position: [0, 0, -10.8], target: [0, -0.2, 0] },
  side: { label: "الجانب", position: [10.6, 0.2, 0], target: [0, -0.2, 0] },
  latch: { label: "مغلاق الباب", position: [4.3, -0.2, 1.1], target: [DOOR_W / 2, PLATE_CENTER_Y, 0] },
};

export function LockViewer() {
  const controls = useRef<OrbitImpl>(null);
  const camera = useRef<Camera>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<ViewName>("angle");

  const changeView = (next: ViewName) => {
    setView(next);
    if (!camera.current) return;
    camera.current.position.set(...VIEWS[next].position);
    const target = VIEWS[next].target;
    camera.current.lookAt(...target);
    if (controls.current) {
      controls.current.target.set(...target);
      controls.current.update();
    }
  };

  return (
    <div className="relative h-full w-full" data-scene-ready={ready || undefined} data-view={view}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: VIEWS.angle.position, fov: 32 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ camera: createdCamera }) => {
          camera.current = createdCamera;
          requestAnimationFrame(() => setReady(true));
        }}
      >
        <color attach="background" args={["#e9e6df"]} />
        <ambientLight intensity={0.42} />
        <directionalLight position={[4, 6, 6]} intensity={1.8} castShadow />
        <directionalLight position={[-5, 2, -4]} intensity={1.1} color="#ffe2ce" />
        <Environment resolution={256}>
          <Lightformer intensity={2.6} position={[0, 6, 2]} scale={[8, 3, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={2.3} position={[5, 1, 3]} rotation-y={-Math.PI / 3} scale={[2, 8, 1]} />
          <Lightformer intensity={1.8} color="#ffe6d4" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[2, 8, 1]} />
          <Lightformer intensity={1.4} position={[0, 0, -6]} scale={[10, 10, 1]} />
        </Environment>

        <SmartLock />
        <ContactShadows position={[0, DOOR_BOTTOM - PLINTH_H - STAND_H - 0.002, 0]} opacity={0.4} scale={8} blur={2.6} far={3} />

        <OrbitControls
          ref={controls}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={1.6}
          maxDistance={14}
          target={VIEWS.angle.target}
        />
        <EffectComposer>
          <Bloom intensity={0.3} luminanceThreshold={0.95} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-3 bottom-4 flex justify-center sm:bottom-6">
        <div className="pointer-events-auto flex max-w-full flex-wrap justify-center gap-1 rounded-2xl border border-border bg-card/85 p-1 shadow-sm backdrop-blur" aria-label="زوايا عرض القفل">
          {(Object.keys(VIEWS) as ViewName[]).map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={view === name}
              onClick={() => changeView(name)}
              className={`rounded-xl px-3 py-2 text-[11px] transition sm:px-4 sm:text-xs ${
                view === name ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"
              }`}
            >
              {VIEWS[name].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
