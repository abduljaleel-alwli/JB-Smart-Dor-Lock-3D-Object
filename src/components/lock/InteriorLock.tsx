import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import screenAsset from "@/assets/interior-screen.png.asset.json";
import { extrudeSide, indexedGeometry, roundedPoly, zipCap } from "./geometry";
import {
  BASE_BOTTOM, BASE_D, BASE_TOP, BASE_W, BOSS_D, BOSS_PAD, COVE_END, COVE_LIP, COVE_START,
  COVER_FRONT, GLASS_BOTTOM, GLASS_TOP, HOME_Y, KEY_Y, LEVER_D, LEVER_LEN, LEVER_TILT, LEVER_W_BOTTOM,
  LEVER_W_TOP, MODULE_FRONT, MODULE_TOP, MODULE_TOP_ROLL_D, MODULE_TOP_ROLL_H, MODULE_W, NECK_BOTTOM,
  NECK_RIB_H, NECK_RIBS, NECK_TOP, NECK_W, PADDLE_BACK, PADDLE_BOTTOM, PADDLE_T, PADDLE_TOP, ROSE_D, ROSE_R,
  SCREEN_BOTTOM, SCREEN_TOP, TURN_Y, coveDepthAt, covePoint, paddleLean,
} from "./interiorProfile";

// Interior unit. Every dimension lives in interiorProfile.ts (traced from the side photo).
// Local z = 0 is the door surface; +z points into the room.
const NECK_Y = (NECK_TOP + NECK_BOTTOM) / 2;
const NECK_A = NECK_W / 2;
const NECK_B = (NECK_TOP - NECK_BOTTOM) / 2;

function Dot({ position, radius, tilt = 0 }: { position: [number, number, number]; radius: number; tilt?: number }) {
  return (
    <group position={position} rotation-x={tilt}>
      <mesh>
        <circleGeometry args={[radius, 24]} />
        <meshStandardMaterial color="#020203" roughness={0.9} />
      </mesh>
      <mesh position-z={0.001}>
        <torusGeometry args={[radius, radius * 0.18, 8, 24]} />
        <meshStandardMaterial color="#2a2c2e" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Screen unit side profile: rolled top edge, flat front, then the concave cove onto the back body. */
function moduleProfile() {
  const back = BASE_D - 0.03;
  const m = new THREE.Shape();
  m.moveTo(back, MODULE_TOP);
  m.lineTo(MODULE_FRONT - MODULE_TOP_ROLL_D, MODULE_TOP);
  m.quadraticCurveTo(MODULE_FRONT, MODULE_TOP, MODULE_FRONT, MODULE_TOP - MODULE_TOP_ROLL_H);
  m.lineTo(MODULE_FRONT, COVE_START + COVE_LIP);
  const lipTheta = Math.asin(Math.min(COVE_LIP / (MODULE_FRONT - COVER_FRONT), 0.9));
  const [lz, ly] = covePoint(lipTheta);
  m.quadraticCurveTo(MODULE_FRONT, COVE_START, lz, ly);
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const [z, y] = covePoint(lipTheta + (i / steps) * (Math.PI / 2 - lipTheta));
    m.lineTo(z, y);
  }
  // Tuck the end just behind the back body's front so the two surfaces meet without flicker.
  m.lineTo(COVER_FRONT - 0.003, COVE_END - 0.04);
  m.lineTo(back, COVE_END - 0.04);
  m.closePath();
  return extrudeSide(m, MODULE_W, 0.03, true);
}

/** Outline split into short pieces with a mitred outward normal at every point. */
function splitContour(shape: THREE.Shape, split = 0.03) {
  const raw = shape.getPoints(12);
  if (raw[0]!.equals(raw[raw.length - 1]!)) raw.pop();
  if (THREE.ShapeUtils.isClockWise(raw)) raw.reverse();
  const contour: THREE.Vector2[] = [];
  raw.forEach((p, i) => {
    const next = raw[(i + 1) % raw.length]!;
    const pieces = Math.max(1, Math.ceil(p.distanceTo(next) / split));
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
 * Paddle: a rounded slab with a slight waist on the hinge side, rounded all round its edges,
 * whose upper part leans back toward the door and whose tip turns back slightly (side photo).
 */
function paddleGeometry() {
  const mid = (PADDLE_TOP + PADDLE_BOTTOM) / 2;
  const outline = roundedPoly([
    [-0.28, PADDLE_BOTTOM, 0.12], [0.28, PADDLE_BOTTOM, 0.12], [0.29, PADDLE_TOP, 0.13],
    [-0.275, PADDLE_TOP, 0.13], [-0.25, mid, 0.25],
  ]);
  const { contour, normals } = splitContour(outline);
  const n = contour.length;
  const round = 0.035;
  const steps = 6;
  const rings: { z: number; inset: number }[] = [];
  for (let k = 0; k <= steps; k++) {
    const a = (k / steps) * (Math.PI / 2);
    rings.push({ z: round * (1 - Math.cos(a)), inset: round * (1 - Math.sin(a)) });
  }
  for (let k = 0; k <= steps; k++) {
    const a = (k / steps) * (Math.PI / 2);
    rings.push({ z: PADDLE_T - round + round * Math.sin(a), inset: round * (1 - Math.cos(a)) });
  }
  const positions: number[] = [];
  for (const { z, inset } of rings) {
    contour.forEach((p, i) => {
      const x = p.x - normals[i]!.x * inset;
      const y = p.y - normals[i]!.y * inset;
      positions.push(x, y, PADDLE_BACK + z + paddleLean(y));
    });
  }
  const index: number[] = [];
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < n; i++) {
      const a = r * n + i;
      const b = r * n + ((i + 1) % n);
      index.push(a, b, b + n, a, b + n, a + n);
    }
  }
  const ringYs = (r: number) => contour.map((p, i) => p.y - normals[i]!.y * rings[r]!.inset);
  index.push(...zipCap(ringYs(0), false));
  index.push(...zipCap(ringYs(rings.length - 1), true, (rings.length - 1) * n));
  const geometry = indexedGeometry(positions, index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Ribbed oval neck from the back body to the paddle; ribs run along its length. */
function neckGeometry() {
  const samples = NECK_RIBS * 12;
  const dense = Array.from({ length: samples }, (_, i) => {
    const t = (i / samples) * Math.PI * 2;
    return new THREE.Vector2(NECK_A * Math.cos(t), NECK_B * Math.sin(t));
  });
  const lengths = [0];
  for (let i = 1; i < samples; i++) lengths.push(lengths[i - 1]! + dense[i]!.distanceTo(dense[i - 1]!));
  const total = lengths[samples - 1]! + dense[0]!.distanceTo(dense[samples - 1]!);
  const shape = new THREE.Shape(
    dense.map((p, i) => {
      const t = (i / samples) * Math.PI * 2;
      const normal = new THREE.Vector2(Math.cos(t) / NECK_A, Math.sin(t) / NECK_B).normalize();
      const phase = Math.cos((lengths[i]! / total) * NECK_RIBS * Math.PI * 2);
      const bump = NECK_RIB_H * Math.sqrt(Math.max(0, phase));
      return p.clone().addScaledVector(normal, bump);
    }),
  );
  const start = COVER_FRONT - 0.02;
  const end = PADDLE_BACK - BOSS_D + 0.01;
  const raw = new THREE.ExtrudeGeometry(shape, { depth: end - start, bevelEnabled: false, curveSegments: 1 });
  raw.translate(0, NECK_Y, start);
  // Smooth shading round the ribs (the end caps are hidden in the back body and the boss).
  raw.deleteAttribute("normal");
  raw.deleteAttribute("uv");
  const smooth = mergeVertices(raw, 1e-5);
  raw.dispose();
  smooth.computeVertexNormals();
  return smooth;
}

/** Tapered thumbturn lever, wider at its upper end. */
function leverGeometry() {
  const bevel = 0.022;
  const half = LEVER_LEN / 2 - bevel;
  const top = LEVER_W_TOP / 2 - bevel;
  const bottom = LEVER_W_BOTTOM / 2 - bevel;
  const shape = roundedPoly([
    [-bottom, -half, bottom * 0.95], [bottom, -half, bottom * 0.95], [top, half, top * 0.95], [-top, half, top * 0.95],
  ]);
  return new THREE.ExtrudeGeometry(shape, {
    depth: LEVER_D - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 5, curveSegments: 12,
  });
}

export function InteriorLock() {
  const screen = useMemo(() => {
    const texture = new THREE.TextureLoader().load(screenAsset.url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);

  const mats = useMemo(
    () => ({
      base: new THREE.MeshPhysicalMaterial({ color: "#191a1c", metalness: 0.22, roughness: 0.55, clearcoat: 0.1 }),
      module: new THREE.MeshPhysicalMaterial({ color: "#161719", metalness: 0.25, roughness: 0.45, clearcoat: 0.2 }),
      bezel: new THREE.MeshPhysicalMaterial({ color: "#060708", metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
      grip: new THREE.MeshPhysicalMaterial({ color: "#121314", metalness: 0.2, roughness: 0.5, clearcoat: 0.2 }),
      rib: new THREE.MeshStandardMaterial({ color: "#111213", metalness: 0.4, roughness: 0.45 }),
      screen: new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }),
      home: new THREE.MeshStandardMaterial({ color: "#d8d4ca", emissive: "#bfbab0", emissiveIntensity: 0.25, metalness: 0.5, roughness: 0.3 }),
    }),
    [screen],
  );

  const geometries = useMemo(
    () => ({ module: moduleProfile(), paddle: paddleGeometry(), neck: neckGeometry(), lever: leverGeometry() }),
    [],
  );

  useEffect(
    () => () => {
      screen.dispose();
      Object.values(mats).forEach((material) => material.dispose());
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    },
    [screen, mats, geometries],
  );

  const baseH = BASE_TOP - BASE_BOTTOM;
  const button = coveDepthAt(0.15);

  return (
    <group>
      {/* Full-height back body against the door. */}
      <RoundedBox args={[BASE_W, baseH, BASE_D]} radius={0.05} smoothness={6} position={[0, (BASE_TOP + BASE_BOTTOM) / 2, BASE_D / 2]} material={mats.base} castShadow />
      {/* Screen unit with its rolled top edge and concave cove. */}
      <mesh geometry={geometries.module} material={mats.module} castShadow />
      <RoundedBox
        args={[MODULE_W - 0.04, GLASS_TOP - GLASS_BOTTOM, 0.01]}
        radius={0.004}
        smoothness={4}
        position={[0, (GLASS_TOP + GLASS_BOTTOM) / 2, MODULE_FRONT - 0.003]}
        material={mats.bezel}
      />
      <mesh position={[0, (SCREEN_TOP + SCREEN_BOTTOM) / 2, MODULE_FRONT + 0.0025]} material={mats.screen}>
        <planeGeometry args={[0.58, SCREEN_TOP - SCREEN_BOTTOM]} />
      </mesh>
      <mesh position={[0, HOME_Y, MODULE_FRONT + 0.003]} material={mats.home}>
        <torusGeometry args={[0.04, 0.0045, 12, 48]} />
      </mesh>

      {/* Microphone hole under the glass and the side button on the cove. */}
      <Dot position={[-0.07, (GLASS_BOTTOM + COVE_START) / 2, MODULE_FRONT + 0.001]} radius={0.008} />
      <Dot position={[0.27, 0.15, button.depth + 0.002]} radius={0.014} tilt={Math.atan(button.slope)} />

      {/* Long ribbed neck, the smooth boss behind the paddle, and the paddle. */}
      <mesh geometry={geometries.neck} material={mats.rib} castShadow />
      <mesh position={[0, NECK_Y, PADDLE_BACK - BOSS_D / 2 + 0.005]} rotation-x={Math.PI / 2} scale={[NECK_A + BOSS_PAD, BOSS_D + 0.01, NECK_B + BOSS_PAD]} material={mats.rib} castShadow>
        <cylinderGeometry args={[1, 1, 1, 48]} />
      </mesh>
      <mesh geometry={geometries.paddle} material={mats.grip} castShadow />

      {/* Thumbturn: thin round rose and a tapered lever. */}
      <mesh position={[0, TURN_Y, BASE_D + ROSE_D / 2]} rotation-x={Math.PI / 2} material={mats.grip} castShadow>
        <cylinderGeometry args={[ROSE_R - 0.006, ROSE_R, ROSE_D, 64]} />
      </mesh>
      <mesh
        geometry={geometries.lever}
        position={[0, TURN_Y, BASE_D + ROSE_D + 0.022]}
        rotation-z={LEVER_TILT}
        material={mats.grip}
        castShadow
      />

      {/* Small emergency key / reset opening near the bottom. */}
      <Dot position={[0, KEY_Y, BASE_D + 0.001]} radius={0.024} />
    </group>
  );
}
