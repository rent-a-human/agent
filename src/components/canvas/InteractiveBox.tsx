import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { playSound } from '../../utils/sound';
import * as THREE from 'three';

interface InteractiveBoxProps {
    position: [number, number, number];
    color?: string;
    label?: string;
}

export const InteractiveBox = ({ position, color = "#00f0ff", label }: InteractiveBoxProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const [localHover, setLocalHover] = useState(false);
    
    // Global State
    const { selectedObject, setSelected, setHovered } = useStore();
    const isSelected = selectedObject === (label || 'Unknown');

    useFrame((state) => {
        if (!meshRef.current) return;

        // Custom collision detection
        const { hands } = useStore.getState();
        const hand = hands.left.present ? hands.left : hands.right;
        
        let isOver = false;

        if (hand.present) {
             const viewport = state.viewport;
             const cx = -(hand.x - 0.5) * viewport.width;
             const cy = -(hand.y - 0.5) * viewport.height;
             
             const dx = cx - position[0];
             const dy = cy - position[1];
             const dist = Math.sqrt(dx*dx + dy*dy);
             
             isOver = dist < 0.6; // Threshold
             
             // Update Local & Global Hover
             if (localHover !== isOver) {
                 setLocalHover(isOver);
                 setHovered(isOver ? (label || 'Box') : null); // Sync global
                 if (isOver) playSound.playHover();
             }
             
             // Click Logic
             if (isOver && hand.gesture === 'PINCH') {
                 if (!isSelected) {
                    playSound.playClick();
                    setSelected(label || 'Unknown');
                    
                    if (label) {
                        import('../../utils/voice').then(({ speak }) => {
                            speak(`You selected: ${label}`);
                        });
                    }
                 }
             }
        } else {
            if (localHover) {
                setLocalHover(false);
                setHovered(null);
            }
        }
        
        // --- ANIMATION & VISUALS ---
        const time = state.clock.getElapsedTime();
        
        // Rotation
        meshRef.current.rotation.x += isSelected ? 0.02 : 0.01;
        meshRef.current.rotation.y += isSelected ? 0.02 : 0;

        // Scale
        const targetScale = localHover ? 1.2 : (isSelected ? 1.1 : 1);
        meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));

        // Material Visuals (Palpitating Effect)
        if (materialRef.current) {
            if (isSelected) {
                // Palpitating Opacity (0.4 to 0.8)
                const pulse = Math.sin(time * 3) * 0.2 + 0.6; 
                materialRef.current.opacity = pulse;
                materialRef.current.wireframe = false;
                materialRef.current.emissive.set(color);
                materialRef.current.emissiveIntensity = Math.sin(time * 3) * 0.5 + 0.5;
            } else {
                // Default / Hover
                materialRef.current.opacity = 0.8;
                materialRef.current.wireframe = !localHover; // Wireframe unless hovered
                materialRef.current.emissive.set('#000000');
                materialRef.current.emissiveIntensity = 0;
            }
        }
    });

    return (
        <group position={position}>
            <mesh ref={meshRef}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial 
                    ref={materialRef}
                    color={color} 
                    transparent
                    opacity={0.8}
                />
            </mesh>
            {label && (
                <Text 
                    position={[0, -0.8, 0]} 
                    fontSize={0.2} 
                    color={isSelected ? "#ffffff" : color}
                    anchorX="center"
                    anchorY="middle"
                >
                    {label.toUpperCase()}
                </Text>
            )}
        </group>
    );
};
