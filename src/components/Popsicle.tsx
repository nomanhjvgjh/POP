import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

export function Popsicle() {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const { viewport } = useThree();
  
  // Create textures for fruits (placeholders for now, using colors)
  const iceMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: "#ff3e3e", // Strawberry
    metalness: 0,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 1.5,
    ior: 1.45,
    opacity: 1,
    transparent: true,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    attenuationColor: "#ff3e3e",
    attenuationDistance: 0.5,
  }), []);

  const fruitSegments = useMemo(() => {
    const segments = [];
    const colors = ["#ff0000", "#ffbe0b", "#8ac926", "#6a4c93"];
    for(let i = 0; i < 8; i++) {
        segments.push({
            position: [Math.random() * 0.8 - 0.4, Math.random() * 1.8 - 0.9, Math.random() * 0.3 - 0.15] as [number, number, number],
            rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI] as [number, number, number],
            scale: Math.random() * 0.15 + 0.1,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    return segments;
  }, []);

  useEffect(() => {
    // Scroll based animations
    const handleScroll = () => {
        const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        
        if (meshRef.current) {
            // Zoom out and move as we scroll
            meshRef.current.position.z = -scrollPercent * 5;
            meshRef.current.rotation.x = scrollPercent * Math.PI * 2;
            
            // Responsiveness: move aside on second section
            if (scrollPercent > 0.2 && scrollPercent < 0.5) {
                gsap.to(meshRef.current.position, { x: viewport.width * 0.25, duration: 1 });
            } else if (scrollPercent < 0.2) {
                gsap.to(meshRef.current.position, { x: 0, duration: 1 });
            }
        }
        
        // Color transition based on scroll sections
        if (materialRef.current) {
            if (scrollPercent > 0.6) {
                gsap.to(materialRef.current.color, { r: 0.4, g: 0.3, b: 0.6, duration: 2 }); // Blueberry
            } else if (scrollPercent > 0.4) {
                gsap.to(materialRef.current.color, { r: 1, g: 0.7, b: 0, duration: 2 }); // Mango
            } else {
                gsap.to(materialRef.current.color, { r: 1, g: 0.24, b: 0.24, duration: 2 }); // Strawberry
            }
        }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [viewport]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    
    // Ambient idle movement
    meshRef.current.position.y += Math.sin(t * 1.5) * 0.001;
    meshRef.current.rotation.y += Math.sin(t * 0.5) * 0.002;
    meshRef.current.rotation.z += Math.cos(t * 0.3) * 0.001;
  });

  return (
    <group ref={meshRef}>
      {/* Popsicle Body */}
      <RoundedBox 
        args={[1.4, 2.6, 0.6]} 
        radius={0.3} 
        smoothness={6}
      >
        <primitive ref={materialRef} object={iceMaterial} attach="material" />
      </RoundedBox>

      {/* Fruit bits inside */}
      {fruitSegments.map((seg, i) => (
        <mesh key={i} position={seg.position} rotation={seg.rotation}>
            <octahedronGeometry args={[seg.scale, 2]} />
            <meshStandardMaterial color={seg.color} roughness={0.1} metalness={0.5} />
        </mesh>
      ))}

      {/* Stick */}
      <mesh position={[0, -2.1, 0]}>
        <boxGeometry args={[0.3, 1.8, 0.08]} />
        <meshStandardMaterial color="#e8cfa9" roughness={0.9} />
      </mesh>
    </group>
  );
}

