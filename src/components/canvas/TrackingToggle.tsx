import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { playSound } from '../../utils/sound';
import * as THREE from 'three';

export const TrackingToggle = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);
    const [localHover, setLocalHover] = useState(false);
    const dwellTimerRef = useRef(0);
    
    // Global State
    const { trackingMode, setTrackingMode, hands, face } = useStore();
    
    // Position next to "System" box (Scene.tsx: System is at [-1.5, 0, 0])
    const position: [number, number, number] = [-3.0, 0, 0];

    const toggleMode = () => {
        playSound.playClick();
        if (trackingMode === 'EYE') setTrackingMode('HAND');
        else if (trackingMode === 'HAND') setTrackingMode('MOUSE');
        else setTrackingMode('EYE');
    };

    useFrame((state) => {
        if (!meshRef.current) return;

        // --- INTERACTION LOGIC ---
        // 1. Mouse Interaction (Always available, but primary for 'MOUSE' mode)
        // Handled by R3F events on the mesh below.

        // 2. Custom Hand/Face Interaction (Only if not in MOUSE mode)
        if (trackingMode !== 'MOUSE') {
            const hand = hands.left.present ? hands.left : hands.right;
            const viewport = state.viewport;
            let isOver = false;
            let isActiveSource = false;
            let cursorX = 0;
            let cursorY = 0;

            if (trackingMode === 'HAND' && hand.present) {
                cursorX = -(hand.x - 0.5) * viewport.width;
                cursorY = -(hand.y - 0.5) * viewport.height;
                isActiveSource = true;
            } else if (trackingMode === 'EYE' && face.present) {
                 const sensitivity = 2.5;
                 cursorX = -(face.x - 0.5) * viewport.width * sensitivity;
                 cursorY = -(face.y - 0.5) * viewport.height * sensitivity;
                 isActiveSource = true;
            }

            if (isActiveSource) {
                const dx = cursorX - position[0];
                const dy = cursorY - position[1];
                const dist = Math.sqrt(dx*dx + dy*dy);
                
                isOver = dist < 0.6; 
                
                if (localHover !== isOver) {
                     setLocalHover(isOver);
                     if (isOver) playSound.playHover();
                     if (!isOver) dwellTimerRef.current = 0;
                }

                if (isOver) {
                    // Hand Click (Pinch)
                    if (trackingMode === 'HAND' && hand.gesture === 'PINCH') {
                         // Debounce needed? Pinch can last multiple frames.
                         // For checking "just pinched", we'd need prev state.
                         // But toggleMode cycles, so rapid cycling is bad.
                         // Let's rely on dwell for stability or add a cooldown?
                         // For now, let's use dwell for everything to be consistent/stable.
                         dwellTimerRef.current += 1/30; // Faster dwell for pinch
                    } 
                    // Eye Dwell
                    else {
                        dwellTimerRef.current += 1/60;
                    }

                    if (dwellTimerRef.current > 1.0) {
                        toggleMode();
                        dwellTimerRef.current = 0;
                        setLocalHover(false); // Force reset to prevent rapid cycling
                    }
                } else {
                    dwellTimerRef.current = 0;
                }
            } else {
                if (localHover) setLocalHover(false);
                dwellTimerRef.current = 0;
            }
        }

        // --- VISUALS ---
        // Rotate
        meshRef.current.rotation.x += 0.01;
        meshRef.current.rotation.y += 0.01;

        // Scale
        const targetScale = localHover ? 1.2 : 1;
        meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));

        // Color based on mode
        const color = trackingMode === 'EYE' ? '#00ff00' : (trackingMode === 'HAND' ? '#ffaa00' : '#888888');
        
        if (materialRef.current) {
            materialRef.current.color.set(color);
            materialRef.current.emissive.set(color);
            materialRef.current.emissiveIntensity = localHover ? 0.5 : 0.2;
            materialRef.current.wireframe = !localHover;
        }
    });

    return (
        <group position={position}>
            <mesh 
                ref={meshRef}
                onClick={toggleMode}
                onPointerOver={() => {
                     setLocalHover(true);
                     playSound.playHover();
                }}
                onPointerOut={() => {
                     setLocalHover(false);
                     dwellTimerRef.current = 0;
                }}
            >
                {/* Octahedron for distinct shape */}
                <octahedronGeometry args={[0.7, 0]} />
                <meshStandardMaterial 
                    ref={materialRef}
                    transparent
                    opacity={0.8}
                />
            </mesh>
            <Text 
                position={[0, -1.0, 0]} 
                fontSize={0.15} 
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
            >
                {`TRACKING: ${trackingMode}`}
            </Text>
        </group>
    );
};
