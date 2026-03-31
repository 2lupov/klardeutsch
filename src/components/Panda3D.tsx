import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/* ── Panda body parts ── */
const PandaModel = ({ isSleeping = false }: { isSleeping?: boolean }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Slow idle rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
    }
  });

  const white = "#f5f5f5";
  const dark = "#1a1a1a";
  const nose = "#2d2d2d";
  const blush = "#ffb3b3";

  return (
    <Float speed={isSleeping ? 1 : 2} rotationIntensity={0.15} floatIntensity={0.4}>
      <group ref={groupRef} position={[0, -0.2, 0]}>
        {/* ── Body ── */}
        <mesh position={[0, -0.6, 0]}>
          <sphereGeometry args={[0.85, 32, 32]} />
          <meshStandardMaterial color={white} roughness={0.8} />
        </mesh>
        {/* Belly patch */}
        <mesh position={[0, -0.5, 0.55]}>
          <sphereGeometry args={[0.55, 32, 32]} />
          <meshStandardMaterial color={"#fafafa"} roughness={0.9} />
        </mesh>

        {/* ── Head ── */}
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.7, 32, 32]} />
          <meshStandardMaterial color={white} roughness={0.8} />
        </mesh>

        {/* ── Ears ── */}
        <mesh position={[-0.48, 1.05, 0]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[0.48, 1.05, 0]}>
          <sphereGeometry args={[0.22, 24, 24]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        {/* Inner ears */}
        <mesh position={[-0.48, 1.05, 0.1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={"#3a3a3a"} roughness={0.9} />
        </mesh>
        <mesh position={[0.48, 1.05, 0.1]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color={"#3a3a3a"} roughness={0.9} />
        </mesh>

        {/* ── Eye patches (dark) ── */}
        <mesh position={[-0.22, 0.6, 0.52]} rotation={[0, 0, 0.3]}>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[0.22, 0.6, 0.52]} rotation={[0, 0, -0.3]}>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>

        {/* ── Eyes (white) ── */}
        <mesh position={[-0.2, 0.62, 0.62]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={white} roughness={0.5} />
        </mesh>
        <mesh position={[0.2, 0.62, 0.62]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={white} roughness={0.5} />
        </mesh>

        {/* ── Pupils ── */}
        {isSleeping ? (
          /* Sleeping eyes — closed lines represented by thin dark spheres */
          <>
            <mesh position={[-0.2, 0.61, 0.7]} scale={[1, 0.2, 0.5]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color={dark} roughness={0.9} />
            </mesh>
            <mesh position={[0.2, 0.61, 0.7]} scale={[1, 0.2, 0.5]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color={dark} roughness={0.9} />
            </mesh>
          </>
        ) : (
          <>
            <mesh position={[-0.19, 0.63, 0.7]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color={dark} roughness={0.9} />
            </mesh>
            <mesh position={[0.21, 0.63, 0.7]}>
              <sphereGeometry args={[0.05, 12, 12]} />
              <meshStandardMaterial color={dark} roughness={0.9} />
            </mesh>
            {/* Eye highlights */}
            <mesh position={[-0.17, 0.65, 0.72]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color={"#ffffff"} emissive={"#ffffff"} emissiveIntensity={0.5} roughness={0.3} />
            </mesh>
            <mesh position={[0.23, 0.65, 0.72]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color={"#ffffff"} emissive={"#ffffff"} emissiveIntensity={0.5} roughness={0.3} />
            </mesh>
          </>
        )}

        {/* ── Nose ── */}
        <mesh position={[0, 0.45, 0.65]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={nose} roughness={0.7} />
        </mesh>

        {/* ── Mouth — smile */}
        {!isSleeping && (
          <mesh position={[0, 0.38, 0.63]} rotation={[0.2, 0, 0]} scale={[1, 0.3, 0.5]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color={dark} roughness={0.9} />
          </mesh>
        )}

        {/* ── Blush cheeks ── */}
        <mesh position={[-0.35, 0.45, 0.48]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={blush} roughness={1} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0.35, 0.45, 0.48]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={blush} roughness={1} transparent opacity={0.5} />
        </mesh>

        {/* ── Arms ── */}
        <mesh position={[-0.7, -0.5, 0.15]} rotation={[0, 0, 0.5]}>
          <capsuleGeometry args={[0.18, 0.4, 8, 16]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[0.7, -0.5, 0.15]} rotation={[0, 0, -0.5]}>
          <capsuleGeometry args={[0.18, 0.4, 8, 16]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>

        {/* ── Legs ── */}
        <mesh position={[-0.35, -1.3, 0.15]} rotation={[0.3, 0, 0]}>
          <capsuleGeometry args={[0.2, 0.3, 8, 16]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>
        <mesh position={[0.35, -1.3, 0.15]} rotation={[0.3, 0, 0]}>
          <capsuleGeometry args={[0.2, 0.3, 8, 16]} />
          <meshStandardMaterial color={dark} roughness={0.9} />
        </mesh>

        {/* ── Foot pads ── */}
        <mesh position={[-0.35, -1.5, 0.35]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={"#4a4a4a"} roughness={0.9} />
        </mesh>
        <mesh position={[0.35, -1.5, 0.35]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color={"#4a4a4a"} roughness={0.9} />
        </mesh>
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
  <div className={`w-full h-full ${className}`}>
    <Canvas
      camera={{ position: [0, 0.3, 3.8], fov: 40 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#b3d4ff" />
      <pointLight position={[0, 3, 2]} intensity={0.4} color="#ffe4b3" />
      <Suspense fallback={null}>
        <PandaModel isSleeping={isSleeping} />
        <ContactShadows position={[0, -1.7, 0]} opacity={0.35} scale={4} blur={2.5} />
        <Environment preset="sunset" />
      </Suspense>
    </Canvas>
  </div>
);

export default Panda3D;
