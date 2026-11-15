import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import screenAsset from "@/assets/interior-screen.png.asset.json";
import { extrudeSide, roundedPoly } from "./geometry";

// Interior unit, measured from the door-edge and three-quarter photographs.
// Local z = 0 is the door surface; +z points into the room.
const BASE_W = 0.76;
const BASE_TOP = 2.3;
const BASE_BOTTOM = -2.0;
const BASE_D = 0.14;
const COVER_D = 0.03; // lower cover stands slightly proud of the base
const MODULE_W = 0.7;
const MODULE_FRONT = 0.33;
const MODULE_BOTTOM = 0.4; // where the chin starts curving back
const CHIN_END = 0.08;
const coverFront = BASE_D + COVER_D;

function Dot({ position, radius }: { position: [number, number, number]; radius: number }) {
  return (
    <group position={position}>
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
      dark: new THREE.MeshStandardMaterial({ color: "#040405", roughness: 0.6 }),
    }),
    [screen],
  );

  const geometries = useMemo(() => {
    // Display module side profile: deep upper housing whose chin coves back into the lower cover.
    const top = BASE_TOP - 0.05;
    const r = 0.06;
    const m = new THREE.Shape();
    m.moveTo(BASE_D - 0.02, top);
    m.lineTo(MODULE_FRONT - r, top);
    m.quadraticCurveTo(MODULE_FRONT, top, MODULE_FRONT, top - r);
    m.lineTo(MODULE_FRONT, MODULE_BOTTOM);
    m.bezierCurveTo(MODULE_FRONT - 0.07, MODULE_BOTTOM - 0.02, coverFront - 0.005, MODULE_BOTTOM - 0.14, coverFront - 0.008, CHIN_END);
    m.lineTo(BASE_D - 0.02, CHIN_END - 0.02);
    m.closePath();
    const module = extrudeSide(m, MODULE_W, 0.03);

    // Paddle: rounded slab with a slight waist on the hinge side, as photographed.
    const paddleShape = roundedPoly([
      [-0.27, -0.43, 0.11], [0.27, -0.43, 0.11], [0.28, 0.43, 0.11], [-0.265, 0.43, 0.11], [-0.24, 0, 0],
    ]);
    const paddle = new THREE.ExtrudeGeometry(paddleShape, {
      depth: 0.05, bevelEnabled: true, bevelSize: 0.018, bevelThickness: 0.018, bevelSegments: 5, curveSegments: 16,
    });
    return { module, paddle };
  }, []);

  useEffect(
    () => () => {
      screen.dispose();
      Object.values(mats).forEach((material) => material.dispose());
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    },
    [screen, mats, geometries],
  );

  const baseH = BASE_TOP - BASE_BOTTOM;
  const coverTop = 0.16;
  const coverBottom = BASE_BOTTOM + 0.05;
  const screenTop = 2.08;
  const screenBottom = 0.6;
  const paddleY = -0.5;
  const neckY = -0.52;
  const neckLen = MODULE_FRONT + 0.02 - coverFront;
  const turnY = -1.2;
  const ribs = 22;

  return (
    <group>
      {/* Full-height base plate against the door. */}
      <RoundedBox args={[BASE_W, baseH, BASE_D]} radius={0.05} smoothness={6} position={[0, (BASE_TOP + BASE_BOTTOM) / 2, BASE_D / 2]} material={mats.base} castShadow />
      {/* Lower cover carrying the handle, thumbturn and key opening. */}
      <RoundedBox
        args={[MODULE_W, coverTop - coverBottom, 0.06]}
        radius={0.025}
        smoothness={4}
        position={[0, (coverTop + coverBottom) / 2, coverFront - 0.03]}
        material={mats.base}
      />

      {/* Display module with coved chin. */}
      <mesh geometry={geometries.module} material={mats.module} castShadow />
      <RoundedBox
        args={[MODULE_W - 0.03, BASE_TOP - 0.05 - MODULE_BOTTOM - 0.02, 0.008]}
        radius={0.0035}
        smoothness={4}
        position={[0, (BASE_TOP - 0.05 + MODULE_BOTTOM) / 2, MODULE_FRONT + 0.03]}
        material={mats.bezel}
      />
      <mesh position={[0, (screenTop + screenBottom) / 2, MODULE_FRONT + 0.0355]} material={mats.screen}>
        <planeGeometry args={[0.58, screenTop - screenBottom]} />
      </mesh>
      <mesh position={[0, 0.52, MODULE_FRONT + 0.036]} material={mats.home}>
        <torusGeometry args={[0.04, 0.0045, 12, 48]} />
      </mesh>

      {/* Microphone hole and side button just above the handle. */}
      <Dot position={[-0.07, -0.03, coverFront + 0.001]} radius={0.008} />
      <Dot position={[0.29, -0.2, coverFront + 0.001]} radius={0.014} />

      {/* Ribbed neck connecting the cover to the paddle. */}
      <group position={[0, neckY, coverFront + neckLen / 2]} rotation-x={Math.PI / 2}>
        <mesh material={mats.rib} castShadow>
          <cylinderGeometry args={[0.1, 0.105, neckLen, 40]} />
        </mesh>
        {Array.from({ length: ribs }, (_, i) => {
          const a = (i / ribs) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.104, 0, Math.sin(a) * 0.104]} rotation-y={-a} material={mats.grip}>
              <boxGeometry args={[0.012, neckLen, 0.016]} />
            </mesh>
          );
        })}
      </group>

      {/* Broad paddle grip. */}
      <mesh geometry={geometries.paddle} material={mats.grip} position={[0, paddleY, MODULE_FRONT + 0.02]} castShadow />

      {/* Thumbturn: round rose and tapered lever. */}
      <mesh position={[0, turnY, coverFront + 0.025]} rotation-x={Math.PI / 2} material={mats.grip} castShadow>
        <cylinderGeometry args={[0.13, 0.135, 0.05, 56]} />
      </mesh>
      <RoundedBox
        args={[0.1, 0.3, 0.1]}
        radius={0.038}
        smoothness={6}
        position={[0, turnY, coverFront + 0.09]}
        rotation-z={0.58}
        material={mats.grip}
        castShadow
      />

      {/* Small emergency key / reset opening near the bottom. */}
      <Dot position={[0, -1.79, coverFront + 0.001]} radius={0.024} />
    </group>
  );
}
