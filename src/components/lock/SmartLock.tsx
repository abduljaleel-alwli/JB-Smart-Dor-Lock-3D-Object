import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { createFaceTextures, LAYOUT } from "./faceTexture";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createPaintTexture, extrudeSide, indexedGeometry, roundedPoly, zipCap, type Pt } from "./geometry";
import {
  BLOCK_PROFILE, BLOCK_W, BOTTOM_TILT, FACE_FRONT, NECK_PROFILE, NECK_W, PANEL_D, PANEL_H,
  PANEL_W, PLATE_BOTTOM, PLATE_TOP, PLATE_W, POST_ROUND, TOP_TILT, plateThickness, type ProfileStep,
} from "./exteriorProfile";
import { InteriorLock } from "./InteriorLock";
import { DOOR_D, DOOR_H, DOOR_W } from "./doorProfile";
import { DoorStand, LatchPlate } from "./DoorParts";

// The exterior face is a pull handle: a thick body held off the mounting base by an
// upper post and a lower post, with an open finger gap between them. Every side-profile
// dimension lives in exteriorProfile.ts (traced from the user's side photo).
export { PANEL_H, PANEL_W };
const TRIM = 0.016;
const RIM_D = 0.014;
const RIM_Z = -RIM_D + 0.005;
const GLASS_Z = 0.003;
const BACK_ROUND = 0.05;
/** Arc length of the rounded top and bottom bends. */
const BEND_ARC = 0.36;
export const EXTERIOR_DEPTH = FACE_FRONT;

const yOf = (v: number) => PANEL_H / 2 - v * PANEL_H;
const yTop = yOf(LAYOUT.topBend);
const yBot = yOf(LAYOUT.bottomBend);
const hBottom = (1 - LAYOUT.bottomBend) * PANEL_H;
/** Door-relative depth → the exterior group's local z (face front at z = 0). */
const zOf = (depth: number) => depth - FACE_FRONT;
function sideProfile(steps: ProfileStep[]) {
  const shape = new THREE.Shape();
  steps.forEach(({ to, via }, i) => {
    if (i === 0) shape.moveTo(zOf(to[0]), to[1]);
    else if (via) shape.quadraticCurveTo(zOf(via[0]), via[1], zOf(to[0]), to[1]);
    else shape.lineTo(zOf(to[0]), to[1]);
  });
  shape.closePath();
  return shape;
}

/** Long outline edges are split to this length so every face layer bends smoothly. */
const SPLIT = 0.03;

/**
 * The panel outline (anticlockwise), with long edges pre-split and a mitred outward
 * normal at every point. All bent face layers are built from it, so they bend without
 * extra subdivision and have no T-junctions that could crack open on the curves.
 */
function outlineContour(pad: number) {
  const raw = roundedPoly(panelOutline(pad)).getPoints(12);
  if (raw[0]!.equals(raw[raw.length - 1]!)) raw.pop();
  if (THREE.ShapeUtils.isClockWise(raw)) raw.reverse();
  const contour: THREE.Vector2[] = [];
  raw.forEach((p, i) => {
    const next = raw[(i + 1) % raw.length]!;
    const pieces = Math.max(1, Math.ceil(p.distanceTo(next) / SPLIT));
    for (let k = 0; k < pieces; k++) contour.push(p.clone().lerp(next, k / pieces));
  });
  const n = contour.length;
  const normals = contour.map((p, i) => {
    const prev = contour[(i - 1 + n) % n]!;
    const next = contour[(i + 1) % n]!;
    const a = new THREE.Vector2(p.y - prev.y, prev.x - p.x).normalize();
    const b = new THREE.Vector2(next.y - p.y, p.x - next.x).normalize();
    return a.add(b).normalize();
  });
  return { contour, normals };
}

/**
 * The face's body as one moulded piece: the panel outline swept back from the rim,
 * with its back edges rounded by `round`. No front cap (the glass and rim cover it),
 * so smoothed normals stay crisp at the front and curve softly round the back.
 */
function moldedBody(pad: number, depth: number, round: number) {
  const { contour, normals } = outlineContour(pad);
  const n = contour.length;
  const rings: { z: number; inset: number }[] = [];
  const steps = 8;
  for (let k = 0; k <= steps; k++) {
    const angle = (k / steps) * (Math.PI / 2);
    rings.push({ z: round * (1 - Math.cos(angle)), inset: round * (1 - Math.sin(angle)) });
  }
  rings.push({ z: depth, inset: 0 });

  const positions: number[] = [];
  for (const { z, inset } of rings) {
    contour.forEach((p, i) => positions.push(p.x - normals[i]!.x * inset, p.y - normals[i]!.y * inset, z));
  }
  const index: number[] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i;
      const b = r * n + ((i + 1) % n);
      index.push(a, b, b + n, a, b + n, a + n);
    }
  }
  // Back cap faces the door.
  index.push(...zipCap(contour.map((p, i) => p.y - normals[i]!.y * round), false));
  return indexedGeometry(positions, index);
}

/** Printed front glass, with UVs taken across the flat face before bending. */
function glassGeometry() {
  const { contour } = outlineContour(0);
  const positions = contour.flatMap((p) => [p.x, p.y, 0]);
  const geometry = indexedGeometry(positions, zipCap(contour.map((p) => p.y), true));
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(contour.flatMap((p) => [p.x / PANEL_W + 0.5, 0.5 + p.y / PANEL_H]), 2),
  );
  return geometry;
}

/** Copper rim: a thin ring round the glass with a flat front and square inner and outer walls. */
function rimGeometry() {
  const { contour, normals } = outlineContour(0);
  const n = contour.length;
  const positions: number[] = [];
  const loop = (offset: number, z: number) => {
    const first = positions.length / 3;
    contour.forEach((p, i) => positions.push(p.x + normals[i]!.x * offset, p.y + normals[i]!.y * offset, z));
    return first;
  };
  const index: number[] = [];
  // Each face has its own vertices, so its edges stay crisp while it curves smoothly.
  const strip = (a: number, b: number) => {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      index.push(a + i, a + j, b + j, a + i, b + j, b + i);
    }
  };
  const outer = TRIM;
  const inner = -0.001;
  strip(loop(outer, RIM_D), loop(inner, RIM_D)); // front
  strip(loop(inner, 0), loop(outer, 0)); // back
  strip(loop(outer, 0), loop(outer, RIM_D)); // outer wall
  strip(loop(inner, RIM_D), loop(inner, 0)); // inner wall
  return indexedGeometry(positions, index);
}

/**
 * Mounting base: rounded in plan, with its thickness following the measured side profile.
 * Long edges are pre-split so the tapered front stays smooth and crack-free.
 */
function plateGeometry() {
  const bevel = 0.012;
  const bevelZ = 0.08;
  const w = PLATE_W / 2 - bevel;
  const top = PLATE_TOP - bevel;
  const bottom = PLATE_BOTTOM + bevel;
  const r = 0.09;
  const step = 0.05;
  const shape = new THREE.Shape();
  shape.moveTo(-w + r, bottom);
  shape.lineTo(w - r, bottom);
  shape.quadraticCurveTo(w, bottom, w, bottom + r);
  for (let y = bottom + r + step; y < top - r; y += step) shape.lineTo(w, y);
  shape.lineTo(w, top - r);
  shape.quadraticCurveTo(w, top, w - r, top);
  shape.lineTo(-w + r, top);
  shape.quadraticCurveTo(-w, top, -w, top - r);
  for (let y = top - r - step; y > bottom + r; y -= step) shape.lineTo(-w, y);
  shape.lineTo(-w, bottom + r);
  shape.quadraticCurveTo(-w, bottom, -w + r, bottom);

  const raw = new THREE.ExtrudeGeometry(shape, {
    depth: 1, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevelZ, bevelSegments: 3, curveSegments: 10,
  });
  const position = raw.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const s = (position.getZ(i) + bevelZ) / (1 + bevelZ * 2);
    position.setZ(i, -FACE_FRONT + s * plateThickness(position.getY(i)));
  }
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const geometry = mergeVertices(raw);
  raw.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

function panelOutline(pad = 0): Pt[] {
  const w = PANEL_W / 2 + pad;
  const top = PANEL_H / 2 + pad;
  const bottom = -PANEL_H / 2 - pad;
  const radius = 0.06 + Math.max(pad, 0);
  return [
    [-w, bottom, radius], [w, bottom, radius],
    [w, yBot, 0], [w, yTop, 0],
    [w, top, radius], [-w, top, radius],
    [-w, yTop, 0], [-w, yBot, 0],
  ];
}

/**
 * Maps a point of the flat face (height `y0`, depth `zw` behind the face front) onto
 * the bent face. Each bend is a smooth arc of length BEND_ARC centred on its hinge
 * line, so the face, rim and glass all curve round it instead of folding at a corner.
 * Returns the bent position and the local tilt angle.
 */
function bendPoint(y0: number, zw: number) {
  const top = y0 > yTop - BEND_ARC / 2;
  if (!top && y0 >= yBot + BEND_ARC / 2) return { y: y0, z: zw, angle: 0 };
  const sign = top ? 1 : -1;
  const start = top ? yTop - BEND_ARC / 2 : yBot + BEND_ARC / 2;
  const radius = BEND_ARC / (top ? TOP_TILT : BOTTOM_TILT);
  const u = (y0 - start) * sign;
  const angle = Math.min(u, BEND_ARC) / radius;
  const rest = Math.max(u - BEND_ARC, 0);
  const along = radius * Math.sin(angle) + rest * Math.cos(angle) + zw * Math.sin(angle);
  const back = radius * (1 - Math.cos(angle)) + rest * Math.sin(angle);
  return { y: start + sign * along, z: zw * Math.cos(angle) - back, angle };
}

/**
 * Bends a pre-split face layer round the two arcs, keeping all layers aligned.
 * `zOffset` is the mesh's z position, so depth is measured from the face front.
 * The bottom section also narrows slightly towards its end.
 */
function bendPanel(geometry: THREE.BufferGeometry, zOffset = 0) {
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i++) {
    const x0 = position.getX(i);
    const y0 = position.getY(i);
    const bent = bendPoint(y0, position.getZ(i) + zOffset);
    const narrow = 1 - 0.06 * (Math.max(yBot - y0, 0) / hBottom);
    position.setXYZ(i, x0 * narrow, bent.y, bent.z - zOffset);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function PanelFeature({ v, lift = 0.008, children }: { v: number; lift?: number; children: ReactNode }) {
  const bent = bendPoint(yOf(v), lift);
  const tilt = v < 0.5 ? -bent.angle : bent.angle;
  return (
    <group position={[0, bent.y, bent.z]} rotation-x={tilt}>
      {children}
    </group>
  );
}

function ExteriorLock() {
  const face = useMemo(() => createFaceTextures(), []);
  const mats = useMemo(
    () => ({
      copper: new THREE.MeshPhysicalMaterial({ color: "#c47a57", metalness: 0.7, roughness: 0.28, clearcoat: 0.3 }),
      plate: new THREE.MeshPhysicalMaterial({ color: "#1a1b1d", metalness: 0.2, roughness: 0.55, clearcoat: 0.12 }),
      // Satin finish on the posts, as in the photo, so their curves don't flash white.
      post: new THREE.MeshPhysicalMaterial({ color: "#141517", metalness: 0.2, roughness: 0.48, clearcoat: 0.12, envMapIntensity: 0.55 }),
      body: new THREE.MeshPhysicalMaterial({ color: "#0c0d0e", metalness: 0.3, roughness: 0.38, clearcoat: 0.4 }),
      glass: new THREE.MeshPhysicalMaterial({
        color: "#07090b", metalness: 0.1, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03,
        envMapIntensity: 0.6, map: face, emissiveMap: face, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.9,
      }),
      lens: new THREE.MeshPhysicalMaterial({ color: "#1d2836", roughness: 0.15, clearcoat: 1, emissive: "#0a1018", emissiveIntensity: 0.4 }),
      lensRing: new THREE.MeshStandardMaterial({ color: "#2c3238", metalness: 0.4, roughness: 0.35 }),
      blueGlow: new THREE.MeshStandardMaterial({ color: "#08265f", emissive: "#1764ff", emissiveIntensity: 3.2 }),
      sensor: new THREE.MeshPhysicalMaterial({ color: "#02050a", roughness: 0.32, clearcoat: 0.35, envMapIntensity: 0.2 }),
      slider: new THREE.MeshPhysicalMaterial({ color: "#08090a", metalness: 0.2, roughness: 0.2, clearcoat: 0.8 }),
      sliderLine: new THREE.MeshStandardMaterial({ color: "#5e646a", metalness: 0.8, roughness: 0.3 }),
      gold: new THREE.MeshStandardMaterial({ color: "#88734b", metalness: 0.85, roughness: 0.22 }),
    }),
    [face],
  );

  const geometries = useMemo(() => {
    // Copper rim at the very front, the thick glossy body behind it, and the printed glass.
    const rim = bendPanel(rimGeometry(), RIM_Z);
    const body = bendPanel(moldedBody(TRIM - 0.002, PANEL_D - RIM_D, BACK_ROUND), -PANEL_D);
    const glass = bendPanel(glassGeometry(), GLASS_Z);

    // Mounting posts: curved side profiles with generously rounded edges.
    const neck = extrudeSide(sideProfile(NECK_PROFILE), NECK_W, POST_ROUND, true);
    const block = extrudeSide(sideProfile(BLOCK_PROFILE), BLOCK_W, POST_ROUND, true);
    const plate = plateGeometry();
    return { rim, body, glass, neck, block, plate };
  }, []);

  useEffect(
    () => () => {
      face.dispose();
      Object.values(mats).forEach((material) => material.dispose());
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    },
    [face, mats, geometries],
  );

  const sliderTop = LAYOUT.handleTop;
  const sliderBottom = LAYOUT.handleBottom;
  const sliderH = (sliderBottom - sliderTop) * PANEL_H;

  return (
    <group>
      {/* Mounting base against the door, with its tapered ends. */}
      <mesh geometry={geometries.plate} material={mats.plate} castShadow />

      <mesh geometry={geometries.neck} material={mats.post} castShadow />
      <mesh geometry={geometries.block} material={mats.post} castShadow />

      {/* Bent face: thick smooth body, copper front rim and printed glass. */}
      <mesh geometry={geometries.body} material={mats.body} position-z={-PANEL_D} castShadow />
      <mesh geometry={geometries.rim} material={mats.copper} position-z={RIM_Z} />
      <mesh geometry={geometries.glass} material={mats.glass} position-z={GLASS_Z} />

      {/* Three lenses built into the face: flush with the glass, nothing stands proud. */}
      <PanelFeature v={LAYOUT.camera} lift={0.0035}>
        {[-0.12, 0, 0.12].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh scale={[0.75, 1.15, 1]} material={mats.lensRing}>
              <circleGeometry args={[0.05, 40]} />
            </mesh>
            <mesh position-z={0.0004} scale={[0.75, 1.15, 1]} material={mats.lens}>
              <circleGeometry args={[0.04, 40]} />
            </mesh>
            {x === 0 && (
              <mesh position={[0, -0.034, 0.0008]} material={mats.gold}>
                <circleGeometry args={[0.007, 16]} />
              </mesh>
            )}
          </group>
        ))}
      </PanelFeature>

      <PanelFeature v={LAYOUT.fingerprint} lift={0.002}>
        <mesh rotation-x={Math.PI / 2} material={mats.sensor}>
          <cylinderGeometry args={[0.077, 0.077, 0.006, 56]} />
        </mesh>
        <mesh position-z={0.004} material={mats.lensRing}>
          <torusGeometry args={[0.092, 0.004, 12, 64]} />
        </mesh>
        <mesh position-z={0.006} material={mats.blueGlow}>
          <torusGeometry args={[0.083, 0.0075, 16, 72]} />
        </mesh>
      </PanelFeature>

      {/* Flush mechanical-key cover with its off-centre slot. */}
      <PanelFeature v={(sliderTop + sliderBottom) / 2} lift={0.002}>
        <RoundedBox args={[0.3, sliderH, 0.008]} radius={0.003} smoothness={2} material={mats.sliderLine} />
        <RoundedBox args={[0.29, sliderH - 0.01, 0.012]} radius={0.004} smoothness={2} material={mats.slider} />
        <mesh position={[0.012, 0, 0.007]} material={mats.sliderLine}>
          <boxGeometry args={[0.006, sliderH - 0.05, 0.002]} />
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
      <RoundedBox args={[DOOR_W, DOOR_H, DOOR_D]} radius={0.025} smoothness={3} material={mats.paint} castShadow receiveShadow />
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

/** Complete lock installed through a door section: exterior pull handle outside, interior unit inside. */
export function SmartLock() {
  return (
    <group>
      <DoorSlab />
      <LatchPlate />
      <DoorStand />
      <group position={[0, 0, DOOR_D / 2 + EXTERIOR_DEPTH]}>
        <ExteriorLock />
      </group>
      <group position={[0, 0, -DOOR_D / 2]} rotation-y={Math.PI}>
        <InteriorLock />
      </group>
    </group>
  );
}
