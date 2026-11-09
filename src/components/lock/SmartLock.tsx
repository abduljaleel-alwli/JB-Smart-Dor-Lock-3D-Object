import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { createFaceTextures, LAYOUT } from "./faceTexture";

// Units ≈ decimetres.
export const PANEL_W = 0.72;
export const PANEL_H = 4.2;
const PANEL_D = 0.12;
const TRIM = 0.026;
/** Upper camera facet leans back, like the reference photo. */
const TOP_TILT = 0.2;
/** Lower chamfer folds back sharply toward the door. */
const BOTTOM_TILT = 0.75;
/** Lower chamfer narrows to this width at its tip. */
const BOTTOM_TIP_W = 0.46;
/** How far the black rear body stands off the back of the panel. */
const REAR_D = 0.3;
/** Back surface of the panel; the rear body grows from here. */
const REAR_BACK = -PANEL_D;

type Pt = [number, number, number]; // x, y, corner radius

/** Polygon with per-corner rounded corners. */
function roundedPoly(pts: Pt[]) {
  const s = new THREE.Shape();
  const n = pts.length;
  pts.forEach((p, i) => {
    const prev = pts[(i - 1 + n) % n]!;
    const next = pts[(i + 1) % n]!;
    const [x, y, r] = p;
    const toPrev = new THREE.Vector2(prev[0] - x, prev[1] - y).normalize();
    const toNext = new THREE.Vector2(next[0] - x, next[1] - y).normalize();
    const a = [x + toPrev.x * r, y + toPrev.y * r];
    const b = [x + toNext.x * r, y + toNext.y * r];
    if (i === 0) s.moveTo(a[0]!, a[1]!);
    else s.lineTo(a[0]!, a[1]!);
    if (r > 0) s.quadraticCurveTo(x, y, b[0]!, b[1]!);
  });
  s.closePath();
  return s;
}

const yOf = (v: number) => PANEL_H / 2 - v * PANEL_H;

interface SegmentProps {
  /** Outline in local coords (pivot at y=0 on the bend). */
  outline: Pt[];
  /** Trim outline (outline grown on the free edges). */
  outer: Pt[];
  /** v of the local y=0 line, for texture mapping. */
  vPivot: number;
  mats: { copper: THREE.Material; core: THREE.Material; glass: THREE.Material };
  children?: ReactNode;
}

function Segment({ outline, outer, vPivot, mats, children }: SegmentProps) {
  const { trimGeo, faceGeo, coreGeo } = useMemo(() => {
    const outerShape = roundedPoly(outer);
    // Inset the hole a hair so it never touches the outer edge at the bends.
    const hole = roundedPoly(outline.map(([x, y, r]) => [x * 0.999, y * 0.997, r] as Pt));
    outerShape.holes.push(hole as unknown as THREE.Path);
    const trimGeo = new THREE.ExtrudeGeometry(outerShape, {
      depth: PANEL_D, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 3, curveSegments: 10,
    });
    const faceShape = roundedPoly(outline);
    const faceGeo = new THREE.ShapeGeometry(faceShape, 10);
    const pos = faceGeo.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) / PANEL_W + 0.5;
      uv[i * 2 + 1] = 1 - (vPivot - pos.getY(i) / PANEL_H);
    }
    faceGeo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const coreGeo = new THREE.ExtrudeGeometry(faceShape, { depth: PANEL_D - 0.004, bevelEnabled: false, curveSegments: 10 });
    return { trimGeo, faceGeo, coreGeo };
  }, [outline, outer, vPivot]);

  useEffect(() => () => { trimGeo.dispose(); faceGeo.dispose(); coreGeo.dispose(); }, [trimGeo, faceGeo, coreGeo]);

  return (
    <group position-z={-PANEL_D}>
      <mesh geometry={trimGeo} material={mats.copper} castShadow />
      <mesh geometry={coreGeo} material={mats.core} />
      <mesh geometry={faceGeo} material={mats.glass} position-z={PANEL_D + 0.004} />
      <group position-z={PANEL_D + 0.006}>{children}</group>
    </group>
  );
}

export function SmartLock() {
  const face = useMemo(() => createFaceTextures(), []);

  const mats = useMemo(
    () => ({
      copper: new THREE.MeshPhysicalMaterial({ color: "#c7774a", metalness: 1, roughness: 0.28, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
      housing: new THREE.MeshPhysicalMaterial({ color: "#0b0b0d", metalness: 0.3, roughness: 0.5, clearcoat: 0.3 }),
      core: new THREE.MeshStandardMaterial({ color: "#050506" }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#020203", metalness: 0.1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 0.5,
        map: face, emissiveMap: face, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 1.05,
      }),
      lens: new THREE.MeshPhysicalMaterial({ color: "#0a0d14", metalness: 0.2, roughness: 0.05, clearcoat: 1, ior: 1.6 }),
      lensRing: new THREE.MeshStandardMaterial({ color: "#3a3d44", metalness: 1, roughness: 0.3 }),
      blueGlow: new THREE.MeshStandardMaterial({ color: "#0a2a80", emissive: "#2e6bff", emissiveIntensity: 4 }),
      sensor: new THREE.MeshPhysicalMaterial({ color: "#05070c", roughness: 0.15, clearcoat: 1 }),
      handle: new THREE.MeshPhysicalMaterial({ color: "#141417", metalness: 0.6, roughness: 0.25, clearcoat: 0.6 }),
      handleMetal: new THREE.MeshStandardMaterial({ color: "#2a2a30", metalness: 1, roughness: 0.2 }),
    }),
    [face],
  );
  useEffect(() => () => { face.dispose(); Object.values(mats).forEach((m) => m.dispose()); }, [face, mats]);

  const w = PANEL_W / 2;
  const t = TRIM;
  const yTop = yOf(LAYOUT.topBend);
  const yBot = yOf(LAYOUT.bottomBend);
  const hTop = LAYOUT.topBend * PANEL_H;
  const hMid = yTop - yBot;
  const hBot = (1 - LAYOUT.bottomBend) * PANEL_H;
  const tw = BOTTOM_TIP_W / 2;

  const seg = useMemo(() => ({
    top: {
      outline: [[-w, 0, 0], [w, 0, 0], [w, hTop, 0.1], [-w, hTop, 0.1]] as Pt[],
      outer: [[-w - t, 0, 0], [w + t, 0, 0], [w + t, hTop + t, 0.12], [-w - t, hTop + t, 0.12]] as Pt[],
    },
    mid: {
      outline: [[-w, -hMid, 0], [w, -hMid, 0], [w, 0, 0], [-w, 0, 0]] as Pt[],
      outer: [[-w - t, -hMid, 0], [w + t, -hMid, 0], [w + t, 0, 0], [-w - t, 0, 0]] as Pt[],
    },
    bot: {
      outline: [[-w, 0, 0], [-tw, -hBot, 0.04], [tw, -hBot, 0.04], [w, 0, 0]] as Pt[],
      outer: [[-w - t, 0, 0], [-tw - t * 0.7, -hBot - t, 0.05], [tw + t * 0.7, -hBot - t, 0.05], [w + t, 0, 0]] as Pt[],
    },
  }), [w, t, hTop, hMid, hBot, tw]);

  // Local y inside a segment whose pivot sits at vPivot.
  const local = (vPivot: number, v: number) => (vPivot - v) * PANEL_H;
  const handleCenter = (local(LAYOUT.topBend, LAYOUT.handleTop) + local(LAYOUT.topBend, LAYOUT.handleBottom)) / 2;
  const handleH = (LAYOUT.handleBottom - LAYOUT.handleTop) * PANEL_H;

  return (
    <group>
      {/* Rear mounting body, rising above the panel with a sloped cap */}
      <RoundedBox args={[PANEL_W * 0.86, PANEL_H * 0.93, REAR_D]} radius={0.06} smoothness={4} position={[0.04, 0.05, REAR_BACK - REAR_D / 2]} material={mats.housing} castShadow />
      <group position={[0.07, PANEL_H / 2 - 0.05, REAR_BACK - REAR_D / 2 - 0.05]} rotation-x={-0.35}>
        <RoundedBox args={[PANEL_W * 0.74, 0.7, REAR_D]} radius={0.1} smoothness={5} material={mats.housing} castShadow />
      </group>

      {/* Upper camera facet, hinged at the top bend and leaning back */}
      <group position={[0, yTop, PANEL_D]} rotation-x={-TOP_TILT}>
        <Segment {...seg.top} vPivot={LAYOUT.topBend} mats={mats}>
          <group position-y={local(LAYOUT.topBend, LAYOUT.camera)}>
            <RoundedBox args={[0.42, 0.13, 0.02]} radius={0.01} material={mats.lensRing} />
            {[-0.12, 0, 0.12].map((x) => (
              <group key={x} position={[x, 0, 0.012]}>
                <mesh rotation-x={Math.PI / 2} material={mats.lensRing}>
                  <cylinderGeometry args={[0.05, 0.05, 0.012, 32]} />
                </mesh>
                <mesh position-z={0.007} rotation-x={Math.PI / 2} material={mats.lens}>
                  <sphereGeometry args={[0.035, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                </mesh>
              </group>
            ))}
          </group>
        </Segment>
      </group>

      {/* Main flat panel: keypad, fingerprint, handle, logo */}
      <group position={[0, yTop, PANEL_D]}>
        <Segment {...seg.mid} vPivot={LAYOUT.topBend} mats={mats}>
          <group position-y={local(LAYOUT.topBend, LAYOUT.fingerprint)}>
            <mesh rotation-x={Math.PI / 2} material={mats.sensor}>
              <cylinderGeometry args={[0.075, 0.075, 0.008, 48]} />
            </mesh>
            <mesh position-z={0.005} material={mats.blueGlow}>
              <torusGeometry args={[0.085, 0.009, 16, 64]} />
            </mesh>
            <pointLight color="#3a7bff" intensity={0.15} distance={0.6} position-z={0.08} />
          </group>
          <group position-y={handleCenter}>
            <RoundedBox args={[0.34, handleH, 0.02]} radius={0.01} material={mats.lensRing} />
            <RoundedBox args={[0.3, handleH - 0.04, 0.05]} radius={0.015} smoothness={4} position-z={0.02} material={mats.handle} castShadow />
            <mesh position={[0, 0, 0.046]} material={mats.handleMetal}>
              <boxGeometry args={[0.012, handleH - 0.08, 0.003]} />
            </mesh>
          </group>
        </Segment>
      </group>

      {/* Lower chamfer, folding back and tapering to the tip */}
      <group position={[0, yBot, PANEL_D]} rotation-x={BOTTOM_TILT}>
        <Segment {...seg.bot} vPivot={LAYOUT.bottomBend} mats={mats} />
      </group>
    </group>
  );
}
