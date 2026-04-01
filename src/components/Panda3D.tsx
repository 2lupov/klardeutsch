import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

import pandaSleeping from "@/assets/mascot/panda-sleeping.png";
import pandaWaving from "@/assets/mascot/panda-waving.png";

/* ── Panda sprite in 3D space ── */
const PandaSprite = ({ isSleeping = false }: { isSleeping?: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [waving, setWaving] = useState(false);
  const waveTime = useRef(0);
  const time = useRef(0);

  const src = isSleeping ? pandaSleeping : pandaWaving;
  const texture = useLoader(THREE.TextureLoader, src);
  texture.colorSpace = THREE.SRGBColorSpace;

  const spriteConfig = useMemo(
    () =>
      isSleeping
        ? { x: 0.02, y: -0.12, size: 2.05 }
        : { x: 0.06, y: 0.02, size: 2.15 },
    [isSleeping],
  );

  const handleClick = useCallback(() => {
    if (!waving) {
      setWaving(true);
      waveTime.current = 0;
    }
  }, [waving]);

  useFrame((_, delta) => {
    time.current += delta;
    if (!groupRef.current || !meshRef.current) return;

    groupRef.current.rotation.y = Math.sin(time.current * 0.45) * 0.1;
    groupRef.current.position.y = Math.sin(time.current * 1.1) * 0.05;

    meshRef.current.position.x = spriteConfig.x;

    if (waving) {
      waveTime.current += delta;
      const t = waveTime.current;
      meshRef.current.rotation.z = Math.sin(t * 10) * 0.12;
      meshRef.current.position.y = spriteConfig.y + Math.abs(Math.sin(t * 8)) * 0.1;

      if (t > 1.5) {
        setWaving(false);
        meshRef.current.rotation.z = 0;
        meshRef.current.position.y = spriteConfig.y;
      }
    } else {
      meshRef.current.rotation.z = 0;
      meshRef.current.position.y = spriteConfig.y;
    }
  });

  return (
    <group ref={groupRef} onClick={handleClick}>
      <mesh ref={meshRef} position={[spriteConfig.x, spriteConfig.y, 0]}>
        <planeGeometry args={[spriteConfig.size, spriteConfig.size]} />
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

interface Panda3DProps {
  isSleeping?: boolean;
  className?: string;
}

const Panda3D = ({ isSleeping = false, className = "" }: Panda3DProps) => (
  <div className={`w-full h-full ${className}`} style={{ minHeight: 320 }}>
    <Canvas
      camera={{ position: [0, 0, 4.8], fov: 34 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent", width: "100%", height: "100%", display: "block" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 4, 3]} intensity={0.8} />
      <pointLight position={[0, 2, 2]} intensity={0.3} color="#ffe4b3" />
      <Suspense fallback={null}>
        <PandaSprite isSleeping={isSleeping} />
        <ContactShadows position={[0, -1.3, 0]} opacity={0.28} scale={3.3} blur={2.5} />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  </div>
);

export default Panda3D;
