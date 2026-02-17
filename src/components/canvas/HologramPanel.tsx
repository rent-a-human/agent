import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface HologramPanelProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    title: string;
    content?: string;
}

export const HologramPanel = ({ position, rotation = [0, 0, 0], title, content = "NO DATA" }: HologramPanelProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    
    // Random data for visualization
    const bars = useMemo(() => new Array(10).fill(0).map(() => Math.random()), []);
    
    useFrame((state) => {
        if (!groupRef.current) return;
        
        // Float animation
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
        
        // Look at camera slightly?
        // groupRef.current.lookAt(state.camera.position); 
        // effectively billboard but maybe we want fixed rotation
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* Glass Background */}
            <mesh ref={planeRef}>
                <planeGeometry args={[2, 1.2]} />
                <meshPhongMaterial 
                    color="#001a33" 
                    transparent 
                    opacity={0.6} 
                    side={THREE.DoubleSide}
                    shininess={100}
                />
            </mesh>
            
            {/* Border Glow */}
            <mesh position={[0, 0, 0.01]}>
                <boxGeometry args={[2.05, 1.25, 0.01]} />
                <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.3} />
            </mesh>

            {/* Content */}
            <group position={[-0.9, 0.5, 0.05]}>
                <Text 
                    fontSize={0.1} 
                    color="#00f0ff" 
                    anchorX="left" 
                    anchorY="top"
                >
                    {title}
                </Text>
                
                {/* Simulated Data Bars */}
                <group position={[0, -0.3, 0]}>
                    {bars.map((val, i) => (
                        <mesh key={i} position={[i * 0.18, 0, 0]}>
                            <planeGeometry args={[0.1, val * 0.5]} />
                            <meshBasicMaterial color="#0077ff" transparent opacity={0.8} />
                        </mesh>
                    ))}
                </group>
                
                 <Text 
                    position={[0, -0.8, 0]}
                    fontSize={0.05} 
                    color="#ffffff" 
                    anchorX="left" 
                    anchorY="top"
                    maxWidth={1.8}
                >
                    {content}
                </Text>
            </group>
        </group>
    );
};
