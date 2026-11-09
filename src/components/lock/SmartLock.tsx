import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { createFaceTextures, LAYOUT } from "./faceTexture";

// Real-world-ish proportions (units ≈ decimetres).
export const PANEL_W = 0.72;
export const PANEL_H = 4.2;
const PANEL_D = 0.12;
const TRIM = 0.025;

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** v (0 top → 1 bottom) to local y. */
const vy = (v: number) => PANEL_H / 2 - v * PANEL_H;

export function SmartLock() {
  const face = useMemo(() => createFaceTextures(), []);

  const mats = useMemo(
    () => ({
      copper: new THREE.MeshPhysicalMaterial({
        color: "#c7774a", metalness: 1, roughness: 0.28, clearcoat: 0.4, clearcoatRoughness: 0.2,
      }),
      housing: new THREE.MeshPhysicalMaterial({ color: "#0b0b0d", metalness: 0.3, roughness: 0.55 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#020203", metalness: 0.1, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02,
        map: face, emissiveMap: face, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 1.6,
      }),
      lens: new THREE.MeshPhysicalMaterial({
        color: "#0a0d14", metalness: 0.2, roughness: 0.05, transmission: 0.2, clearcoat: 1, ior: 1.6,
      }),
      lensRing: new THREE.MeshStandardMaterial({ color: "#3a3d44", metalness: 1, roughness: 0.3 }),
      blueGlow: new THREE.MeshStandardMaterial({ color: "#0a2a80", emissive: "#2e6bff", emissiveIntensity: 4 }),
      sensor: new THREE.MeshPhysicalMaterial({ color: "#05070c", roughness: 0.15, clearcoat: 1 }),
      handle: new THREE.MeshPhysicalMaterial({ color: "#141417", metalness: 0.6, roughness: 0.25, clearcoat: 0.6 }),
    }),
    [face],
  );

  useEffect(
    () => () => {
      face.dispose();
      Object.values(mats).forEach((m) => m.dispose());
    },
    [face, mats],
  );

  const trimGeo = useMemo(() => {
    const outer = roundedRectShape(PANEL_W + TRIM * 2, PANEL_H + TRIM * 2, 0.1);
    outer.holes.push(roundedRectShape(PANEL_W, PANEL_H, 0.08) as unknown as THREE.Path);
    return new THREE.ExtrudeGeometry(outer, {
      depth: PANEL_D, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 3, curveSegments: 12,
    });
  }, []);

  const faceGeo = useMemo(() => {
    const g = new THREE.ShapeGeometry(roundedRectShape(PANEL_W, PANEL_H, 0.08), 12);
    // Map UVs to panel bounds so the canvas covers the whole face.
    const pos = g.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / PANEL_W + 0.5;
      uv[i * 2 + 1] = pos.getY(i) / PANEL_H + 0.5;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, []);

  useEffect(() => () => { trimGeo.dispose(); faceGeo.dispose(); }, [trimGeo, faceGeo]);

  const camY = vy(LAYOUT.camera);
  const fpY = vy(LAYOUT.fingerprint);
  const hTop = vy(LAYOUT.handleTop);
  const hBot = vy(LAYOUT.handleBottom);
  const hH = hTop - hBot;
  const front = PANEL_D + 0.006;

  return (
    <group>
      {/* Rear mounting body: thicker, taller at the top, behind the panel */}
      <RoundedBox args={[PANEL_W * 0.86, PANEL_H * 0.97, 0.42]} radius={0.06} smoothness={4} position={[0.03, 0.08, -0.2]} material={mats.housing} castShadow />
      <RoundedBox args={[PANEL_W * 0.7, 0.5, 0.5]} radius={0.08} smoothness={4} position={[0.06, PANEL_H / 2 - 0.15, -0.3]} material={mats.housing} castShadow />

      {/* Copper trim frame */}
      <mesh geometry={trimGeo} material={mats.copper} castShadow />
      {/* Panel core */}
      <mesh position={[0, 0, PANEL_D / 2]}>
        <boxGeometry args={[PANEL_W - 0.01, PANEL_H - 0.01, PANEL_D - 0.01]} />
        <meshStandardMaterial color="#050506" />
      </mesh>
      {/* Glass face with display, keypad, logo, LED */}
      <mesh geometry={faceGeo} material={mats.glass} position={[0, 0, front]} />

      {/* Camera module: three lenses */}
      <group position={[0, camY, front]}>
        <RoundedBox args={[0.42, 0.13, 0.02]} radius={0.01} material={mats.lensRing} />
        {[-0.12, 0, 0.12].map((x) => (
          <group key={x} position={[x, 0, 0.012]}>
            <mesh rotation-x={Math.PI / 2} material={mats.lensRing}>
              <cylinderGeometry args={[0.05, 0.05, 0.012, 32]} />
            </mesh>
            <mesh position-z={0.007} material={mats.lens}>
              <sphereGeometry args={[0.035, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Fingerprint sensor with glowing ring */}
      <group position={[0, fpY, front]}>
        <mesh rotation-x={Math.PI / 2} material={mats.sensor}>
          <cylinderGeometry args={[0.075, 0.075, 0.008, 48]} />
        </mesh>
        <mesh position-z={0.005} material={mats.blueGlow}>
          <torusGeometry args={[0.085, 0.009, 16, 64]} />
        </mesh>
        <pointLight color="#3a7bff" intensity={0.15} distance={0.6} position-z={0.08} />
      </group>

      {/* Pull handle recess */}
      <group position={[0, (hTop + hBot) / 2, front]}>
        <RoundedBox args={[0.34, hH, 0.02]} radius={0.01} material={mats.lensRing} />
        <RoundedBox args={[0.3, hH - 0.04, 0.05]} radius={0.015} smoothness={4} position-z={0.02} material={mats.handle} castShadow />
        <mesh position={[0, 0, 0.046]}>
          <boxGeometry args={[0.012, hH - 0.08, 0.003]} />
          <meshStandardMaterial color="#2a2a30" metalness={1} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}
