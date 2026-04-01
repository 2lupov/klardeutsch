import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import * as THREE from "three";

import pandaSleeping from "@/assets/mascot/panda-sleeping.png";
import pandaWaving from "@/assets/mascot/panda-waving.png";

/* ── Panda sprite in 3D space ── */
const PandaSprite = ({ imageSrc }: { imageSrc: string }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [waving, setWaving] = useState(false);
  const waveTime = useRef(0);
  const time = useRef(0);

  const texture = useLoader(THREE.TextureLoader, imageSrc);
  texture.colorSpace = THREE.SRGBColorSpace;

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

    if (waving) {
      waveTime.current += delta;
      const t = waveTime.current;
      meshRef.current.rotation.z = Math.sin(t * 10) * 0.12;
      meshRef.current.position.y = Math.abs(Math.sin(t * 8)) * 0.1;
      if (t > 1.5) {
        setWaving(false);
        meshRef.current.rotation.z = 0;
        meshRef.current.position.y = 0;
      }
    } else {
      meshRef.current.rotation.z = 0;
      meshRef.current.position.y = 0;
    }
  });

  return (
    <group ref={groupRef} onClick={handleClick}>
      <mesh ref={meshRef}>
        <planeGeometry args={[2.4, 2.4]} />
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
  stageImage?: string;
  className?: string;
}

const Panda3D = ({ isSleeping = false, stageImage, className = "" }: Panda3DProps) => {
  const src = stageImage || (isSleeping ? pandaSleeping : pandaWaving);

  return (
    <div className={`w-full h-full ${className}`} style={{ minHeight: 320 }}>
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 36 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent", width: "100%", height: "100%", display: "block" }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[2, 4, 3]} intensity={0.8} />
        <pointLight position={[0, 2, 2]} intensity={0.3} color="#ffe4b3" />
        <Suspense fallback={null}>
          <PandaSprite imageSrc={src} />
          <ContactShadows position={[0, -1.3, 0]} opacity={0.28} scale={3.3} blur={2.5} />
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Panda3D;
