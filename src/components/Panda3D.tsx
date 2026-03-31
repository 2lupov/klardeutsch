import { Suspense, useRef, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/* ── Panda body built from smooth primitives ── */
const PandaModel = ({ isSleeping = false }: { isSleeping?: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const [waving, setWaving] = useState(false);
  const waveTime = useRef(0);

  const handleClick = useCallback(() => {
    if (!waving) {
      setWaving(true);
      waveTime.current = 0;
    }
  }, [waving]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.25;
    }
    // Wave animation
    if (rightArmRef.current && waving) {
      waveTime.current += delta;
      const t = waveTime.current;
      rightArmRef.current.rotation.z = -0.5 + Math.sin(t * 12) * 0.6;
      rightArmRef.current.rotation.x = -0.8;
      if (t > 1.8) {
        setWaving(false);
        rightArmRef.current.rotation.z = -0.5;
        rightArmRef.current.rotation.x = 0;
      }
    }
  });

  const fur = "#faf9f6";
  const dark = "#1e1e1e";
  const blush = "#ffaaaa";

  return (
    <Float speed={isSleeping ? 1 : 1.8} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef} position={[0, -0.3, 0]} onClick={handleClick}>
        {/* ── Body (slightly egg-shaped) ── */}
        <mesh position={[0, -0.55, 0]} scale={[1, 1.1, 0.9]}>
          <sphereGeometry args={[0.82, 48, 48]} />
          <meshPhysicalMaterial color={fur} roughness={0.85} clearcoat={0.1} />
        </mesh>
        {/* Belly */}
        <mesh position={[0, -0.45, 0.5]}>
          <sphereGeometry args={[0.52, 32, 32]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.9} clearcoat={0.05} />
        </mesh>

        {/* ── Head ── */}
        <mesh position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.68, 48, 48]} />
          <meshPhysicalMaterial color={fur} roughness={0.8} clearcoat={0.15} />
        </mesh>

        {/* ── Ears ── */}
        {[[-1, 1], [1, 1]].map(([side], i) => (
          <group key={i}>
            <mesh position={[side * 0.46, 1.0, -0.05]}>
              <sphereGeometry args={[0.2, 32, 32]} />
              <meshPhysicalMaterial color={dark} roughness={0.95} />
            </mesh>
            <mesh position={[side * 0.46, 1.0, 0.08]}>
              <sphereGeometry args={[0.1, 24, 24]} />
              <meshPhysicalMaterial color="#3d3d3d" roughness={0.95} />
            </mesh>
          </group>
        ))}

        {/* ── Eye patches ── */}
        {[[-1, 0.3], [1, -0.3]].map(([side, rot], i) => (
          <mesh key={i} position={[side * 0.22, 0.55, 0.5]} rotation={[0, 0, rot]}>
            <sphereGeometry args={[0.17, 32, 32]} />
            <meshPhysicalMaterial color={dark} roughness={0.95} />
          </mesh>
        ))}

        {/* ── Eyes ── */}
        {isSleeping ? (
          [[-1], [1]].map(([side], i) => (
            <mesh key={i} position={[side * 0.2, 0.56, 0.62]} scale={[1, 0.15, 0.4]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshPhysicalMaterial color={dark} roughness={0.9} />
            </mesh>
          ))
        ) : (
          [[-1], [1]].map(([side], i) => (
            <group key={i}>
              {/* White */}
              <mesh position={[side * 0.2, 0.57, 0.6]}>
                <sphereGeometry args={[0.1, 24, 24]} />
                <meshPhysicalMaterial color="#ffffff" roughness={0.4} clearcoat={0.6} />
              </mesh>
              {/* Iris */}
              <mesh position={[side * 0.19, 0.58, 0.69]}>
                <sphereGeometry args={[0.055, 16, 16]} />
                <meshPhysicalMaterial color="#2a1f1a" roughness={0.7} />
              </mesh>
              {/* Pupil */}
              <mesh position={[side * 0.185, 0.585, 0.73]}>
                <sphereGeometry args={[0.03, 12, 12]} />
                <meshPhysicalMaterial color="#0a0a0a" roughness={0.5} />
              </mesh>
              {/* Highlight */}
              <mesh position={[side * 0.17, 0.6, 0.74]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshPhysicalMaterial
                  color="#ffffff"
                  emissive="#ffffff"
                  emissiveIntensity={0.8}
                  roughness={0.1}
                />
              </mesh>
            </group>
          ))
        )}

        {/* ── Nose ── */}
        <mesh position={[0, 0.42, 0.64]} scale={[1.2, 0.9, 0.8]}>
          <sphereGeometry args={[0.07, 24, 24]} />
          <meshPhysicalMaterial color="#2b2b2b" roughness={0.6} clearcoat={0.4} />
        </mesh>

        {/* ── Mouth ── */}
        {!isSleeping && (
          <mesh position={[0, 0.35, 0.61]} rotation={[0.15, 0, 0]} scale={[1.2, 0.25, 0.4]}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshPhysicalMaterial color={dark} roughness={0.9} />
          </mesh>
        )}

        {/* ── Blush ── */}
        {[[-1], [1]].map(([side], i) => (
          <mesh key={i} position={[side * 0.34, 0.42, 0.46]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshPhysicalMaterial color={blush} roughness={1} transparent opacity={0.4} />
          </mesh>
        ))}

        {/* ── Left arm ── */}
        <group position={[-0.7, -0.45, 0.12]} rotation={[0, 0, 0.5]}>
          <mesh>
            <capsuleGeometry args={[0.17, 0.45, 12, 24]} />
            <meshPhysicalMaterial color={dark} roughness={0.9} />
          </mesh>
          {/* Paw pad */}
          <mesh position={[0, -0.3, 0.08]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshPhysicalMaterial color="#4a4040" roughness={0.95} />
          </mesh>
        </group>

        {/* ── Right arm (waves) ── */}
        <group ref={rightArmRef} position={[0.7, -0.45, 0.12]} rotation={[0, 0, -0.5]}>
          <mesh>
            <capsuleGeometry args={[0.17, 0.45, 12, 24]} />
            <meshPhysicalMaterial color={dark} roughness={0.9} />
          </mesh>
          <mesh position={[0, -0.3, 0.08]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshPhysicalMaterial color="#4a4040" roughness={0.95} />
          </mesh>
        </group>

        {/* ── Legs ── */}
        {[[-1], [1]].map(([side], i) => (
          <group key={i} position={[side * 0.33, -1.25, 0.12]} rotation={[0.25, 0, 0]}>
            <mesh>
              <capsuleGeometry args={[0.19, 0.32, 12, 24]} />
              <meshPhysicalMaterial color={dark} roughness={0.9} />
            </mesh>
            {/* Foot pad */}
            <mesh position={[0, -0.22, 0.12]}>
              <sphereGeometry args={[0.12, 16, 16]} />
              <meshPhysicalMaterial color="#4a4040" roughness={0.95} />
            </mesh>
            {/* Toe beans */}
            {[-0.05, 0.05].map((ox, j) => (
              <mesh key={j} position={[ox, -0.18, 0.2]}>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshPhysicalMaterial color="#5a5050" roughness={0.95} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </Float>
  );
};

/* ── Exported Canvas wrapper ── */
interface Panda3DProps {
  isSleeping?: boolean;
  className?: string;
}

const Panda3D = ({ isSleeping = false, className = "" }: Panda3DProps) => (
  <div className={`w-full ${className}`} style={{ minHeight: 240 }}>
    <Canvas
      camera={{ position: [0, 0.2, 3.6], fov: 38 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent", width: "100%", height: "100%" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#b3d4ff" />
      <pointLight position={[0, 3, 2]} intensity={0.5} color="#ffe4b3" />
      <spotLight position={[0, 4, 3]} angle={0.4} penumbra={0.5} intensity={0.4} color="#fff5e6" />
      <Suspense fallback={null}>
        <PandaModel isSleeping={isSleeping} />
        <ContactShadows position={[0, -1.65, 0]} opacity={0.4} scale={4} blur={2.5} />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  </div>
);

export default Panda3D;
