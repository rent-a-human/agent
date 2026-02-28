import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const ChessAssistant = (props: any) => {
  const meshRef = useRef<THREE.Group>(null);

  // Material setup - shared instance for performance and coordinated glowing
  const sharedMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0xf0f0f0,
    roughness: 0.3,
    metalness: 0.4,
    emissive: new THREE.Color("#00f0ff"),
    emissiveIntensity: 0.5
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = props.position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      // Slow rotation
      meshRef.current.rotation.y += 0.005;

      // Pulsate glowing effect
      sharedMaterial.emissiveIntensity = 0.6 + Math.sin(state.clock.elapsedTime * 4) * 0.5;
    }
  });

  // Knight Geometry (Ported from chess-3d)
  const renderKnight = () => {
    const basePoints = [
      new THREE.Vector2(0.35, 0),    
      new THREE.Vector2(0.3, 0.05),
      new THREE.Vector2(0.25, 0.2),  
      new THREE.Vector2(0.22, 0.4),
      new THREE.Vector2(0.3, 0.45),  
      new THREE.Vector2(0, 0.45)
    ];

    const shape = new THREE.Shape();
    shape.moveTo(0.2, 0);
    shape.lineTo(0.25, 0.4);
    shape.quadraticCurveTo(0.25, 0.6, 0.1, 0.8);   
    shape.lineTo(0.05, 0.9);                      
    shape.lineTo(0, 0.9);                         
    shape.lineTo(-0.05, 0.8);                     
    shape.quadraticCurveTo(-0.35, 0.75, -0.4, 0.5); 
    shape.lineTo(-0.3, 0.45);                    
    shape.quadraticCurveTo(-0.1, 0.4, -0.2, 0);   
    shape.closePath();

    const extrudeSettings = {
      steps: 1,
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 3
    };

    return (
      <group scale={[4, 4, 4]}> {/* Scaled up for presence */}
        {/* Base */}
        <group>
            <mesh position={[0, 0.05, 0]} material={sharedMaterial}>
                <cylinderGeometry args={[0.4, 0.45, 0.1, 32]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} material={sharedMaterial}>
                <latheGeometry args={[basePoints, 32]} />
            </mesh>
        </group>
        
        {/* Head */}
        <group position={[0, 0.55, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0.075, 0, -0.125]} material={sharedMaterial}>
            <extrudeGeometry args={[shape, extrudeSettings]} />
            </mesh>
        </group>
      </group>
    );
  };

  return (
    <group ref={meshRef} position={props.position} rotation={props.rotation}>
      {renderKnight()}
      {/* Label */}
      <mesh position={[0, 4.5, 0]}>
          <planeGeometry args={[3, 0.8]} />
          <meshBasicMaterial color="black" transparent opacity={0.6} />
      </mesh>
    </group> // NOTE: Ideally we'd use Text from drei, but avoiding extra deps for now unless native text is messy.
    // Actually, Scene.tsx already uses Text from drei? Let's check Scene.tsx later.
    // For now, returning just the geometry group.
  );
};
