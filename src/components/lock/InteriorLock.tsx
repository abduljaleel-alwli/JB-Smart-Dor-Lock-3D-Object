import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import screenAsset from "@/assets/interior-screen.png.asset.json";

function Fastener({ position, radius = 0.022 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      <mesh rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[radius, radius, 0.008, 28]} />
        <meshStandardMaterial color="#050506" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position-z={0.005}>
        <torusGeometry args={[radius, 0.0025, 8, 32]} />
        <meshStandardMaterial color="#383a3b" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Interior unit: large viewer display, projecting grip and mechanical thumbturn. */
export function InteriorLock() {
  const screen = useMemo(() => {
    const texture = new THREE.TextureLoader().load(screenAsset.url);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);

  const mats = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: "#171819", metalness: 0.28, roughness: 0.46, clearcoat: 0.18 }),
      side: new THREE.MeshStandardMaterial({ color: "#101112", metalness: 0.32, roughness: 0.42 }),
      bezel: new THREE.MeshPhysicalMaterial({ color: "#090a0b", metalness: 0.18, roughness: 0.25, clearcoat: 0.55, clearcoatRoughness: 0.18 }),
      grip: new THREE.MeshPhysicalMaterial({ color: "#1b1c1d", metalness: 0.38, roughness: 0.3, clearcoat: 0.35 }),
      edge: new THREE.MeshStandardMaterial({ color: "#363839", metalness: 0.8, roughness: 0.28 }),
      screen: new THREE.MeshBasicMaterial({ map: screen, toneMapped: false }),
      home: new THREE.MeshStandardMaterial({ color: "#c5c0b2", metalness: 0.75, roughness: 0.3 }),
      dark: new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.55 }),
    }),
    [screen],
  );

  useEffect(
    () => () => {
      screen.dispose();
      Object.values(mats).forEach((material) => material.dispose());
    },
    [screen, mats],
  );

  return (
    <group>
      {/* Thin full-height mounting body and lower cover. */}
      <RoundedBox args={[0.75, 4.2, 0.2]} radius={0.065} smoothness={5} position={[0, 0, 0.1]} material={mats.side} castShadow />
      <RoundedBox args={[0.69, 2.04, 0.045]} radius={0.045} smoothness={4} position={[0, -1.065, 0.215]} material={mats.body} castShadow />

      {/* Deep upper viewer housing, with its lower shoulder folding into the base. */}
      <RoundedBox args={[0.82, 2.2, 0.46]} radius={0.09} smoothness={6} position={[0, 1.01, 0.23]} material={mats.body} castShadow />
      <RoundedBox args={[0.72, 0.22, 0.32]} radius={0.035} smoothness={4} position={[0, -0.105, 0.18]} rotation-x={0.18} material={mats.body} castShadow />
      <RoundedBox args={[0.735, 2.075, 0.038]} radius={0.07} smoothness={5} position={[0, 1.025, 0.474]} material={mats.bezel} />
      <mesh position={[0, 0.002, 0.481]} material={mats.dark}>
        <boxGeometry args={[0.7, 0.012, 0.012]} />
      </mesh>

      {/* Rectified screen pixels from the supplied interior photograph. */}
      <RoundedBox args={[0.64, 1.47, 0.018]} radius={0.025} smoothness={4} position={[0, 1.185, 0.503]} material={mats.dark} />
      <mesh position={[0, 1.185, 0.514]} material={mats.screen}>
        <planeGeometry args={[0.612, 1.405]} />
      </mesh>
      <mesh position={[0, 0.17, 0.505]} material={mats.home}>
        <torusGeometry args={[0.044, 0.005, 12, 48]} />
      </mesh>

      {/* Two small fasteners between the viewer and the grip. */}
      <Fastener position={[-0.16, -0.155, 0.229]} radius={0.015} />
      <Fastener position={[0.16, -0.285, 0.229]} radius={0.018} />

      {/* Handle neck and its ribbed, sloping underside. */}
      <RoundedBox args={[0.35, 0.42, 0.39]} radius={0.04} smoothness={4} position={[0, -0.36, 0.39]} rotation-x={-0.18} material={mats.side} castShadow />
      <RoundedBox args={[0.33, 0.48, 0.32]} radius={0.025} smoothness={3} position={[0, -0.72, 0.36]} rotation-x={0.38} material={mats.side} castShadow />
      {[0, 1, 2, 3].map((i) => (
        <RoundedBox
          key={i}
          args={[0.3, 0.022, 0.25]}
          radius={0.006}
          smoothness={2}
          position={[0, -0.59 - i * 0.072, 0.46 - i * 0.026]}
          rotation-x={0.38}
          material={mats.edge}
        />
      ))}

      {/* Broad vertical paddle visible in all interior three-quarter photographs. */}
      <RoundedBox args={[0.52, 0.84, 0.17]} radius={0.075} smoothness={7} position={[0, -0.635, 0.69]} material={mats.grip} castShadow />
      <RoundedBox args={[0.46, 0.77, 0.012]} radius={0.06} smoothness={5} position={[0, -0.635, 0.781]} material={mats.body} />

      {/* Circular thumbturn base and narrow rotating lever. */}
      <mesh position={[0, -1.28, 0.255]} rotation-x={Math.PI / 2} material={mats.side} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.075, 56]} />
      </mesh>
      <mesh position={[0, -1.28, 0.296]} material={mats.edge}>
        <torusGeometry args={[0.155, 0.006, 10, 56]} />
      </mesh>
      <RoundedBox args={[0.125, 0.45, 0.125]} radius={0.052} smoothness={6} position={[0, -1.28, 0.37]} rotation={[0, 0.18, -0.45]} material={mats.grip} castShadow />

      {/* Small low-mounted service/lock opening. */}
      <Fastener position={[0, -1.865, 0.245]} radius={0.035} />
      <mesh position={[0, -1.865, 0.252]} material={mats.dark}>
        <circleGeometry args={[0.027, 32]} />
      </mesh>
    </group>
  );
}
