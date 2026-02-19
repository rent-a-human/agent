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
    const dwellTimerRef = useRef(0);
    
    // Global State
    const { selectedObject, setSelected, setHovered } = useStore();
    const isSelected = selectedObject === (label || 'Unknown');

    useFrame((state) => {
        if (!meshRef.current) return;

        // Custom collision detection
        const { hands, face, lastHandActivity } = useStore.getState();
        const hand = hands.left.present ? hands.left : hands.right;
        
        let isOver = false;
        
        const now = Date.now();
        const handsActive = (now - lastHandActivity) < 5000;

        // Determine Cursor Position (World Space) - simplified replication of Cursor.tsx logic
        let cursorX = 0;
        let cursorY = 0;
        let isActiveSource = false;

        const viewport = state.viewport;

        if (handsActive && hand.present) {
             cursorX = -(hand.x - 0.5) * viewport.width;
             cursorY = -(hand.y - 0.5) * viewport.height;
             isActiveSource = true;
        } else if (!handsActive && face.present) {
             // Simple Head Mode
             const sensitivity = 2.5;
             cursorX = -(face.x - 0.5) * viewport.width * sensitivity;
             cursorY = -(face.y - 0.5) * viewport.height * sensitivity;
             isActiveSource = true;
        }

        if (isActiveSource) {
             const dx = cursorX - position[0];
             const dy = cursorY - position[1];
             const dist = Math.sqrt(dx*dx + dy*dy);
             
             isOver = dist < 0.6; // Threshold matching geometry roughly
             
             // Update Local & Global Hover
             if (localHover !== isOver) {
                 setLocalHover(isOver);
                 setHovered(isOver ? (label || 'Box') : null); // Sync global
                 if (isOver) playSound.playHover();
                 
                 // Reset Dwell if lost hover
                 if (!isOver) {
                     useStore.getState().setDwellProgress(0);
                 }
             }
             
             // --- INTERACTION LOGIC ---
             if (handsActive) {
                 // Hand Click (Pinch)
                 if (isOver && hand.gesture === 'PINCH') {
                     if (!isSelected) {
                        playSound.playClick();
                        setSelected(label || 'Unknown');
                        if (label) import('../../utils/voice').then(({ speak }) => speak(`You selected: ${label}`));
                     }
                 }
                 dwellTimerRef.current = 0; // Reset dwell if hands are active
             } else {
                 // Face Dwell Click
                 if (isOver && !isSelected) {
                     // Check if this box is the globally hovered one (to avoid multi-trigger)
                     // ( Implicitly true if isOver with single cursor )
                     
                     // Increment
                     dwellTimerRef.current += 1/60; // Approx 1 frame
                     
                     const progress = Math.min(dwellTimerRef.current / 1.0, 1);
                     useStore.getState().setDwellProgress(progress);
                     
                     if (progress >= 1) {
                         // TRIGGER CLICK
                         playSound.playClick();
                         setSelected(label || 'Unknown');
                         if (label) import('../../utils/voice').then(({ speak }) => speak(`You selected: ${label}`));
                         dwellTimerRef.current = 0;
                         useStore.getState().setDwellProgress(0);
                     }
                 } else {
                     dwellTimerRef.current = 0;
                 }
            }
        } else {
            if (localHover) {
                setLocalHover(false);
                setHovered(null);
                useStore.getState().setDwellProgress(0);
                dwellTimerRef.current = 0;
            }
        }
        
        // --- ANIMATION & VISUALS ---
        const time = state.clock.getElapsedTime();
        
        // Rotation
        if (meshRef.current) {
            meshRef.current.rotation.x += isSelected ? 0.02 : 0.01;
            meshRef.current.rotation.y += isSelected ? 0.02 : 0;

            // Scale
            const targetScale = localHover ? 1.2 : (isSelected ? 1.1 : 1);
            meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));
        }

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
