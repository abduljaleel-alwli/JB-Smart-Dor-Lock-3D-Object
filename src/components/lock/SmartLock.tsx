import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import { createFaceTextures, LAYOUT } from "./faceTexture";
import { createPaintTexture, roundedPoly, type Pt } from "./geometry";
import { InteriorLock } from "./InteriorLock";

// Proportions measured against the nine supplied photographs; units ≈ decimetres.
export const PANEL_W = 0.72;
export const PANEL_H = 4.2;
const PANEL_D = 0.1;
const TRIM = 0.018;
const TOP_TILT = 0.23;
const BOTTOM_TILT = 0.48;
const BOTTOM_TIP_SCALE = 0.92;
const REAR_D = 0.24;
const DOOR_D = 0.46;

const yOf = (v: number) => PANEL_H / 2 - v * PANEL_H;
const yTop = yOf(LAYOUT.topBend);
const yBot = yOf(LAYOUT.bottomBend);
const hBottom = (1 - LAYOUT.bottomBend) * PANEL_H;

function panelOutline(pad = 0): Pt[] {
  const w = PANEL_W / 2 + pad;
  const top = PANEL_H / 2 + pad;
  const bottom = -PANEL_H / 2 - pad;
  const radius = pad ? 0.078 : 0.06;
  return [
    [-w, bottom, radius], [w, bottom, radius],
    [w, yBot, 0], [w, yTop, 0],
    [w, top, radius], [-w, top, radius],
    [-w, yTop, 0], [-w, yBot, 0],
  ];
}

/** Bends every vertex around the same two hinge lines, keeping the copper frame seamless. */
function bendPanel(source: THREE.BufferGeometry) {
  // Long triangles would otherwise cut across a hinge and fold through the glass.
  const geometry = new TessellateModifier(0.16, 6).modify(source);
  source.dispose();
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x0 = position.getX(i);
    const y0 = position.getY(i);
    const z0 = position.getZ(i);
    let x = x0;
    let y = y0;
    let z = z0;
    if (y0 > yTop) {
      const d = y0 - yTop;
      y = yTop + d * Math.cos(TOP_TILT);
      z = z0 - d * Math.sin(TOP_TILT);
    } else if (y0 < yBot) {
      const d = yBot - y0;
      const ratio = d / hBottom;
      x = x0 * (1 - (1 - BOTTOM_TIP_SCALE) * ratio);
      y = yBot - d * Math.cos(BOTTOM_TILT);
      z = z0 - d * Math.sin(BOTTOM_TILT);
    }
    position.setXYZ(i, x, y, z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function PanelFeature({ v, lift = 0.012, children }: { v: number; lift?: number; children: ReactNode }) {
  const y = yOf(v);
  const zFront = lift;
  if (v < LAYOUT.topBend) {
    const d = y - yTop;
    return (
      <group position={[0, yTop + d * Math.cos(TOP_TILT), zFront - d * Math.sin(TOP_TILT)]} rotation-x={-TOP_TILT}>
        {children}
      </group>
    );
  }
  if (v > LAYOUT.bottomBend) {
    const d = yBot - y;
    return (
      <group position={[0, yBot - d * Math.cos(BOTTOM_TILT), zFront - d * Math.sin(BOTTOM_TILT)]} rotation-x={BOTTOM_TILT}>
        {children}
      </group>
    );
  }
  return <group position={[0, y, zFront]}>{children}</group>;
}

function ExteriorLock() {
  const face = useMemo(() => createFaceTextures(), []);
  const mats = useMemo(
    () => ({
      copper: new THREE.MeshPhysicalMaterial({ color: "#c28268", metalness: 0.58, roughness: 0.32, clearcoat: 0.25 }),
      housing: new THREE.MeshPhysicalMaterial({ color: "#141517", metalness: 0.28, roughness: 0.48, clearcoat: 0.2 }),
      housingEdge: new THREE.MeshStandardMaterial({ color: "#090a0b", metalness: 0.35, roughness: 0.45 }),
      core: new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.5 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#07090b", metalness: 0.12, roughness: 0.09, clearcoat: 1, clearcoatRoughness: 0.035,
        envMapIntensity: 0.55, map: face, emissiveMap: face, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.9,
      }),
      lens: new THREE.MeshPhysicalMaterial({ color: "#26374a", metalness: 0, roughness: 0.24, clearcoat: 0.45, emissive: "#101820", emissiveIntensity: 0.35 }),
      lensRing: new THREE.MeshStandardMaterial({ color: "#414850", metalness: 0.12, roughness: 0.4 }),
      blueGlow: new THREE.MeshStandardMaterial({ color: "#08265f", emissive: "#1764ff", emissiveIntensity: 3.2 }),
      sensor: new THREE.MeshPhysicalMaterial({ color: "#02050a", roughness: 0.32, clearcoat: 0.35, envMapIntensity: 0.2 }),
      handle: new THREE.MeshPhysicalMaterial({ color: "#141619", metalness: 0.55, roughness: 0.28, clearcoat: 0.5 }),
      handleMetal: new THREE.MeshStandardMaterial({ color: "#555b61", metalness: 0.9, roughness: 0.25 }),
      gold: new THREE.MeshStandardMaterial({ color: "#88734b", metalness: 0.85, roughness: 0.22 }),
    }),
    [face],
  );

  const geometries = useMemo(() => {
    const inner = roundedPoly(panelOutline());
    const outer = roundedPoly(panelOutline(TRIM));
    const hole = roundedPoly(panelOutline(-0.001));
    outer.holes.push(hole as unknown as THREE.Path);
    const trim = bendPanel(new THREE.ExtrudeGeometry(outer, {
      depth: PANEL_D, bevelEnabled: true, bevelSize: 0.0035, bevelThickness: 0.0035, bevelSegments: 3, curveSegments: 12,
    }));
    const core = bendPanel(new THREE.ExtrudeGeometry(inner, { depth: PANEL_D - 0.004, bevelEnabled: false, curveSegments: 12 }));
    const glass = new THREE.ShapeGeometry(inner, 12);
    const pos = glass.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / PANEL_W + 0.5;
      uv[i * 2 + 1] = 0.5 + pos.getY(i) / PANEL_H;
    }
    glass.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    bendPanel(glass);
    return { trim, core, glass };
  }, []);

  useEffect(
    () => () => {
      face.dispose();
      Object.values(mats).forEach((material) => material.dispose());
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    },
    [face, mats, geometries],
  );

  const handleCenter = (yOf(LAYOUT.handleTop) + yOf(LAYOUT.handleBottom)) / 2;
  const handleV = 0.5 - handleCenter / PANEL_H;
  const handleH = (LAYOUT.handleBottom - LAYOUT.handleTop) * PANEL_H;

  return (
    <group>
      {/* Rounded rear shell: slightly wider, higher at the top and shorter at the bottom. */}
      <RoundedBox args={[0.81, 4.16, REAR_D]} radius={0.075} smoothness={6} position={[0.025, 0.1, -PANEL_D - REAR_D / 2]} material={mats.housing} castShadow />
      <RoundedBox args={[0.77, 4.04, 0.018]} radius={0.06} smoothness={4} position={[0.025, 0.1, -PANEL_D - 0.012]} material={mats.housingEdge} />

      <mesh geometry={geometries.trim} material={[mats.copper, mats.housingEdge]} position-z={-PANEL_D} castShadow />
      <mesh geometry={geometries.core} material={mats.core} position-z={-PANEL_D + 0.002} />
      <mesh geometry={geometries.glass} material={mats.glass} position-z={0.004} />

      {/* Three vertical lens windows in one recessed horizontal camera bar. */}
      <PanelFeature v={LAYOUT.camera} lift={0.1}>
        <RoundedBox args={[0.43, 0.17, 0.018]} radius={0.025} smoothness={4} material={mats.housingEdge} />
        {[-0.12, 0, 0.12].map((x) => (
          <group key={x} position={[x, 0, 0.014]}>
            <RoundedBox args={[0.082, 0.132, 0.025]} radius={0.036} smoothness={6} material={mats.lensRing} />
            <mesh position-z={0.016} scale={[0.72, 1.12, 0.3]} material={mats.lens}>
              <sphereGeometry args={[0.047, 28, 18]} />
            </mesh>
            {x === 0 && (
              <mesh position={[0, -0.018, 0.031]} material={mats.gold}>
                <sphereGeometry args={[0.009, 18, 12]} />
              </mesh>
            )}
          </group>
        ))}
      </PanelFeature>

      <PanelFeature v={LAYOUT.fingerprint}>
        <mesh rotation-x={Math.PI / 2} material={mats.sensor}>
          <cylinderGeometry args={[0.077, 0.077, 0.008, 56]} />
        </mesh>
        <mesh position-z={0.005} material={mats.lensRing}>
          <torusGeometry args={[0.092, 0.004, 12, 64]} />
        </mesh>
        <mesh position-z={0.008} material={mats.blueGlow}>
          <torusGeometry args={[0.083, 0.0075, 16, 72]} />
        </mesh>
      </PanelFeature>

      {/* Small flush rectangular slider with its fine central division. */}
      <PanelFeature v={handleV}>
        <RoundedBox args={[0.32, handleH + 0.025, 0.018]} radius={0.035} smoothness={5} material={mats.handle} />
        <RoundedBox args={[0.275, handleH - 0.02, 0.035]} radius={0.03} smoothness={5} position-z={0.016} material={mats.handle} castShadow />
        <mesh position={[0, 0, 0.036]} material={mats.handleMetal}>
          <boxGeometry args={[0.009, handleH - 0.065, 0.003]} />
        </mesh>
      </PanelFeature>
    </group>
  );
}

function DoorSlab() {
  const paint = useMemo(() => createPaintTexture(), []);
  const mats = useMemo(
    () => ({
      paint: new THREE.MeshStandardMaterial({ color: "#f0ede6", map: paint, roughness: 0.82, metalness: 0 }),
      trim: new THREE.MeshStandardMaterial({ color: "#ded9cf", roughness: 0.78 }),
    }),
    [paint],
  );
  useEffect(() => () => { paint.dispose(); Object.values(mats).forEach((m) => m.dispose()); }, [paint, mats]);

  return (
    <group>
      <RoundedBox args={[1.62, 5.25, DOOR_D]} radius={0.025} smoothness={3} material={mats.paint} castShadow receiveShadow />
      {[-1, 1].map((side) => (
        <group key={side} position-z={side * (DOOR_D / 2 + 0.006)}>
          {[-0.68, 0.68].map((x) => (
            <mesh key={x} position={[x, 0, 0]} material={mats.trim}>
              <boxGeometry args={[0.018, 4.83, 0.012]} />
            </mesh>
          ))}
          {[-2.405, 2.405].map((y) => (
            <mesh key={y} position={[0, y, 0]} material={mats.trim}>
              <boxGeometry args={[1.36, 0.018, 0.012]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Complete lock installed through a narrow door cutaway. */
export function SmartLock() {
  return (
    <group>
      <DoorSlab />
      <group position={[0, 0, DOOR_D / 2 + PANEL_D + REAR_D]}>
        <ExteriorLock />
      </group>
      <group position={[0, 0, -DOOR_D / 2]} rotation-y={Math.PI}>
        <InteriorLock />
      </group>
    </group>
  );
}
