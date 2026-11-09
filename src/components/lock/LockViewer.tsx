import { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import { SmartLock } from "./SmartLock";

const DEFAULT_CAM: [number, number, number] = [3.2, 0.8, 5.2];

export function LockViewer() {
  const controls = useRef<OrbitImpl>(null);
  const [ready, setReady] = useState(false);

  return (
    <div className="relative h-full w-full" data-scene-ready={ready || undefined}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: DEFAULT_CAM, fov: 32 }}
        gl={{ antialias: true }}
        onCreated={() => requestAnimationFrame(() => setReady(true))}
      >
        <color attach="background" args={["#efeeeb"]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} castShadow />
        <directionalLight position={[-5, 2, -4]} intensity={1.2} color="#ffd9c0" />
        <Environment resolution={256}>
          <Lightformer intensity={3} position={[0, 6, 2]} scale={[8, 3, 1]} rotation-x={Math.PI / 2} />
          <Lightformer intensity={2.5} position={[5, 1, 3]} rotation-y={-Math.PI / 3} scale={[2, 8, 1]} />
          <Lightformer intensity={2} color="#ffe6d4" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[2, 8, 1]} />
          <Lightformer intensity={1.5} position={[0, 0, -6]} scale={[10, 10, 1]} />
        </Environment>

        <group rotation-y={-0.1}>
          <SmartLock />
        </group>
        <ContactShadows position={[0, -2.25, 0]} opacity={0.45} scale={6} blur={2.6} far={3} />

        <OrbitControls
          ref={controls}
          enableDamping
          dampingFactor={0.08}
          enablePan={false}
          minDistance={1.2}
          maxDistance={10}
          target={[0, 0, 0]}
        />
        <EffectComposer>
          <Bloom intensity={0.7} luminanceThreshold={0.85} mipmapBlur />
        </EffectComposer>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
        <button
          onClick={() => controls.current?.reset()}
          className="pointer-events-auto rounded-full border border-border bg-card/80 px-5 py-2 text-xs uppercase tracking-[0.2em] text-foreground backdrop-blur transition hover:bg-card"
        >
          Reset view
        </button>
      </div>
    </div>
  );
}
