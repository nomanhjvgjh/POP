import { Canvas } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { Environment, Float, PerspectiveCamera, ContactShadows } from "@react-three/drei";
import { Popsicle } from "./Popsicle";
import { Particles } from "./Particles";

export function Scene() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={45} />
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={2} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#ff3e3e" />
        
        <Suspense fallback={null}>
          <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
            <Popsicle />
          </Float>
          <Particles count={40} />
          <Environment preset="city" />
          <ContactShadows 
            position={[0, -3.5, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2} 
            far={4.5} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

