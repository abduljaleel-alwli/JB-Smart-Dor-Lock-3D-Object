import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { roundedPoly } from "./geometry";
import {
  DOOR_BOTTOM, DOOR_D, DOOR_W, LATCH_BEVEL_OUT, LATCH_FROM, LATCH_OPEN_W, LATCH_OUT, LATCH_TO, MARKS, PLATE_CENTER_Y,
  PLATE_END_R, PLATE_L, PLATE_T, PLATE_W, PLINTH_H, ROUND_HOLES, SCREWS, SQUARES, SQUARE_H, SQUARE_W, STAND_CHAMFER,
  STAND_H, STAND_R, STAND_RING_R,
} from "./doorProfile";

/** Plate-local height of a point a fraction `t` down the plate (plate centred on y = 0). */
const ty = (t: number) => PLATE_L / 2 - t * PLATE_L;
const latchH = (LATCH_TO - LATCH_FROM) * PLATE_L;
const latchMid = ty((LATCH_FROM + LATCH_TO) / 2);

function rect(cx: number, cy: number, w: number, h: number, r: number) {
  return roundedPoly([
    [cx - w / 2, cy - h / 2, r], [cx + w / 2, cy - h / 2, r],
    [cx + w / 2, cy + h / 2, r], [cx - w / 2, cy + h / 2, r],
  ]);
}

/** Brushed stainless finish with the stamped marks, laid across the plate's front. */
function createPlateTexture() {
  const S = 640;
  const w = Math.round(PLATE_W * S);
  const h = Math.round(PLATE_L * S);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const base = ctx.createLinearGradient(0, 0, w, 0);
  base.addColorStop(0, "#a9abad");
  base.addColorStop(0.5, "#c9cacb");
  base.addColorStop(1, "#a4a6a8");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // Brush lines run along the plate.
  for (let i = 0; i < 520; i++) {
    const x = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * w;
    const a = 0.03 + Math.abs((Math.sin(i * 78.233) * 9631.1) % 1) * 0.07;
    ctx.fillStyle = i % 2 ? `rgba(255,255,255,${a})` : `rgba(40,40,44,${a})`;
    ctx.fillRect(x, 0, 1, h);
  }

  const stamp = (draw: () => void, width = 2.4) => {
    ctx.save();
    ctx.lineWidth = width;
    ctx.lineJoin = ctx.lineCap = "round";
    ctx.translate(0.8, 0.8);
    ctx.strokeStyle = ctx.fillStyle = "rgba(255,255,255,0.45)";
    draw();
    ctx.translate(-1.6, -1.6);
    ctx.strokeStyle = ctx.fillStyle = "rgba(34,34,36,0.8)";
    draw();
    ctx.restore();
  };
  const at = (t: number) => t * h;
  const cx = w / 2;

  // Maker's shield with its flame mark.
  stamp(() => {
    const y = at(MARKS.shield);
    ctx.beginPath();
    ctx.moveTo(cx - 28, y - 22);
    ctx.lineTo(cx + 28, y - 22);
    ctx.lineTo(cx + 24, y + 2);
    ctx.quadraticCurveTo(cx + 14, y + 18, cx, y + 26);
    ctx.quadraticCurveTo(cx - 14, y + 18, cx - 24, y + 2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 4, y + 16);
    ctx.quadraticCurveTo(cx - 16, y - 2, cx - 2, y - 14);
    ctx.quadraticCurveTo(cx + 4, y - 4, cx + 12, y - 12);
    ctx.quadraticCurveTo(cx + 12, y + 6, cx - 4, y + 16);
    ctx.stroke();
  });
  stamp(() => {
    ctx.font = "600 15px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("J.B ACCESS", cx, at(MARKS.name));
  }, 1);
  // Turn arrow under the latch.
  stamp(() => {
    const y = at(MARKS.arrow);
    ctx.beginPath();
    ctx.arc(cx, y, 11, -0.4, Math.PI * 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 4, y - 9);
    ctx.lineTo(cx + 13, y - 6);
    ctx.lineTo(cx + 12, y - 15);
    ctx.stroke();
  });
  // Triangle mark near the bottom.
  stamp(() => {
    const y = at(MARKS.triangle);
    ctx.beginPath();
    ctx.moveTo(cx, y - 20);
    ctx.lineTo(cx + 26, y + 12);
    ctx.lineTo(cx - 26, y + 12);
    ctx.closePath();
    ctx.stroke();
    ctx.font = "600 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3 1", cx, y + 3);
  }, 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // ExtrudeGeometry's front UVs are the shape's own coordinates: map them onto the canvas.
  texture.repeat.set(1 / PLATE_W, 1 / PLATE_L);
  texture.offset.set(0.5, 0.5);
  return texture;
}

function plateGeometry() {
  const outline = rect(0, 0, PLATE_W, PLATE_L, PLATE_END_R);
  outline.holes.push(rect(0, latchMid, LATCH_OPEN_W, latchH, 0.012));
  for (const t of SQUARES) outline.holes.push(rect(0, ty(t), SQUARE_W, SQUARE_H, 0.018));
  for (const { t, d } of ROUND_HOLES) {
    const hole = new THREE.Path();
    hole.absellipse(0, ty(t), d / 2, d / 2, 0, Math.PI * 2, true);
    outline.holes.push(hole);
  }
  const bevel = 0.003;
  const geometry = new THREE.ExtrudeGeometry(outline, {
    depth: PLATE_T - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 18,
  });
  geometry.translate(0, 0, bevel);
  return geometry;
}

/** Latch tongue: square to the plate on one side, bevelled across the door thickness. */
function latchGeometry() {
  const hw = LATCH_OPEN_W / 2 - 0.008;
  const h = latchH - 0.016;
  const shape = new THREE.Shape();
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, LATCH_BEVEL_OUT);
  shape.lineTo(-hw * 0.25, LATCH_OUT);
  shape.lineTo(-hw, LATCH_OUT);
  shape.closePath();
  const bevel = 0.004;
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: h - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelOffset: -bevel, bevelSegments: 2,
  });
  // Shape (x, depth) extruded along z → plate-local (x, y = height, z = outward).
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, latchMid + h / 2 - bevel, 0);
  return geometry;
}

/** Stainless latch faceplate on the door edge, as in the edge photo. */
export function LatchPlate() {
  const texture = useMemo(() => createPlateTexture(), []);
  const parts = useMemo(() => {
    const groove = new THREE.ShapeGeometry(rect(0, 0, PLATE_W + 0.018, PLATE_L + 0.018, PLATE_END_R + 0.009), 18);
    return { plate: plateGeometry(), latch: latchGeometry(), groove };
  }, []);
  const mats = useMemo(
    () => ({
      plate: new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: texture, metalness: 0.6, roughness: 0.36, envMapIntensity: 1.5 }),
      latch: new THREE.MeshPhysicalMaterial({ color: "#c9cbcd", metalness: 0.7, roughness: 0.3, envMapIntensity: 1.3 }),
      bolt: new THREE.MeshPhysicalMaterial({ color: "#9a9da0", metalness: 0.65, roughness: 0.34 }),
      screw: new THREE.MeshPhysicalMaterial({ color: "#c2c4c6", metalness: 0.7, roughness: 0.3, envMapIntensity: 1.3 }),
      dark: new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.8 }),
      groove: new THREE.MeshStandardMaterial({ color: "#7a766f", roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 }),
    }),
    [texture],
  );
  useEffect(
    () => () => {
      texture.dispose();
      Object.values(parts).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [texture, parts, mats],
  );

  return (
    // Plate-local frame: x across the door thickness, y up, z out of the door edge.
    <group position={[DOOR_W / 2, PLATE_CENTER_Y, 0]} rotation-y={Math.PI / 2}>
      <mesh geometry={parts.groove} material={mats.groove} position-z={0.0015} />
      <mesh geometry={parts.plate} material={mats.plate} castShadow receiveShadow />

      {/* Dark lock case seen through the openings. */}
      <mesh position={[0, latchMid, 0.003]} material={mats.dark}>
        <planeGeometry args={[LATCH_OPEN_W + 0.01, latchH + 0.01]} />
      </mesh>
      <mesh geometry={parts.latch} material={mats.latch} castShadow />

      {SQUARES.map((t) => (
        <group key={t} position-y={ty(t)}>
          <mesh position-z={0.003} material={mats.dark}>
            <planeGeometry args={[SQUARE_W + 0.01, SQUARE_H + 0.01]} />
          </mesh>
          <RoundedBox args={[SQUARE_W - 0.022, SQUARE_H - 0.022, 0.008]} radius={0.01} smoothness={3} position-z={0.006} material={mats.bolt} />
        </group>
      ))}
      {ROUND_HOLES.map(({ t, d }) => (
        <mesh key={t} position={[0, ty(t), 0.003]} material={mats.dark}>
          <circleGeometry args={[d / 2 + 0.004, 24]} />
        </mesh>
      ))}

      {/* Cross-head screws, sunk into the plate. */}
      {SCREWS.map(({ t, d }) => (
        <group key={t} position={[0, ty(t), PLATE_T]}>
          <mesh rotation-x={Math.PI / 2} position-z={-0.001} material={mats.screw} castShadow>
            <cylinderGeometry args={[d * 0.44, d / 2, 0.006, 32]} />
          </mesh>
          {[0, Math.PI / 2].map((angle) => (
            <mesh key={angle} rotation-z={angle + 0.5} position-z={0.0025} material={mats.dark}>
              <boxGeometry args={[d * 0.5, d * 0.11, 0.002]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** Round stand the door section rests on: a dark disc with a chamfered top and a copper inlay ring. */
export function DoorStand() {
  const mats = useMemo(
    () => ({
      stand: new THREE.MeshPhysicalMaterial({ color: "#26272a", metalness: 0.25, roughness: 0.5, clearcoat: 0.25 }),
      copper: new THREE.MeshPhysicalMaterial({ color: "#c47a57", metalness: 0.7, roughness: 0.3 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  const top = DOOR_BOTTOM - PLINTH_H;
  const body = STAND_H - STAND_CHAMFER;

  return (
    <group>
      {/* Low plinth the door stands in. */}
      <RoundedBox args={[DOOR_W + 0.1, PLINTH_H * 2, DOOR_D + 0.1]} radius={0.015} smoothness={3} position-y={DOOR_BOTTOM - PLINTH_H} material={mats.stand} castShadow receiveShadow />
      <mesh position-y={top - STAND_CHAMFER / 2} material={mats.stand} receiveShadow castShadow>
        <cylinderGeometry args={[STAND_R - STAND_CHAMFER, STAND_R, STAND_CHAMFER, 160]} />
      </mesh>
      <mesh position-y={top - STAND_CHAMFER - body / 2} material={mats.stand} receiveShadow castShadow>
        <cylinderGeometry args={[STAND_R, STAND_R, body, 160]} />
      </mesh>
      <mesh position-y={top + 0.001} rotation-x={-Math.PI / 2} material={mats.copper}>
        <ringGeometry args={[STAND_RING_R - 0.012, STAND_RING_R, 160]} />
      </mesh>
    </group>
  );
}
