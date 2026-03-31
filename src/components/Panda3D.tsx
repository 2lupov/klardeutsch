import { Suspense, useRef, useState, useCallback, useMemo } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

import pandaWaving from "@/assets/mascot/panda-waving.png";
import pandaSleeping from "@/assets/mascot/panda-sleeping.png";

/* ── Panda sprite in 3D space ── */
const PandaSprite = ({ isSleeping = false }: { isSleeping?: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [waving, setWaving] = useState(false);
  const waveTime = useRef(0);
  const baseY = useRef(0);
  const time = useRef(0);

  const src = isSleeping ? pandaSleeping : pandaWaving;
  const texture = useLoader(THREE.TextureLoader, src);
  texture.colorSpace = THREE.SRGBColorSpace;

  const handleClick = useCallback(() => {
    if (!waving) {
      setWaving(true);
      waveTime.current = 0;
    }
  }, [waving]);

  useFrame((_, delta) => {
    time.current += delta;
    if (!groupRef.current) return;

    // Gentle idle rotation
    groupRef.current.rotation.y = Math.sin(time.current * 0.5) * 0.15;

    // Float up and down
    groupRef.current.position.y = baseY.current + Math.sin(time.current * 1.2) * 0.06;

    // Wave: tilt + bounce
    if (waving && meshRef.current) {
      waveTime.current += delta;
      const t = waveTime.current;
      meshRef.current.rotation.z = Math.sin(t * 10) * 0.15;
      meshRef.current.position.y = Math.abs(Math.sin(t * 8)) * 0.12;
      if (t > 1.5) {
        setWaving(false);
        meshRef.current.rotation.z = 0;
        meshRef.current.position.y = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]} onClick={handleClick}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2.8, 2.8]} />
        <meshStandardMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          side={THREE.DoubleSide}
          roughness={0.9}
        />
      </mesh>
    </group>
  );
};

/* ── Exported Canvas wrapper ── */
interface Panda3DProps {
  isSleeping?: boolean;
  className?: string;
}

const Panda3D = ({ isSleeping = false, className = "" }: Panda3DProps) => (
  <div className={`w-full ${className}`} style={{ minHeight: 300 }}>
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 36 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={0.8} />
      <pointLight position={[0, 2, 2]} intensity={0.3} color="#ffe4b3" />
      <Suspense fallback={null}>
        <PandaSprite isSleeping={isSleeping} />
        <ContactShadows position={[0, -1.2, 0]} opacity={0.3} scale={3} blur={2.5} />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  </div>
);

export default Panda3D;
