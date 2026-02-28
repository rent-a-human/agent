import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { playSound } from '../../utils/sound';

interface SettingsHologramProps {
    position: [number, number, number];
    rotation?: [number, number, number];
}

// Sleek 3D Holographic Button
const HologramButton = ({ 
    position, 
    label, 
    onClick, 
    width = 0.4,
    height = 0.15
}: { 
    position: [number, number, number], 
    label: string, 
    onClick: () => void,
    width?: number,
    height?: number
}) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [hovered, setHovered] = useState(false);
    const { trackingMode, setHovered: setGlobalHovered } = useStore();

    useFrame(() => {
        if (!meshRef.current) return;
        const targetScale = hovered ? 1.1 : 1;
        meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.2));
    });

    const handlePointerOver = () => {
        if (trackingMode === 'MOUSE' || trackingMode === 'TV') {
            setHovered(true);
            setGlobalHovered(`Button: ${label}`);
            playSound.playHover();
        }
    };

    const handlePointerOut = () => {
        if (trackingMode === 'MOUSE' || trackingMode === 'TV') {
            setHovered(false);
            setGlobalHovered(null);
        }
    };

    const handleClick = () => {
        if (trackingMode === 'MOUSE' || trackingMode === 'TV') {
            playSound.playClick();
            onClick();
        }
    };

    useEffect(() => {
        const handleEnter = () => {
            if (hovered && trackingMode === 'TV') handleClick();
        };
        window.addEventListener('tv-enter-press', handleEnter);
        return () => window.removeEventListener('tv-enter-press', handleEnter);
    }, [hovered, trackingMode, onClick]);

    return (
        <group position={position}>
            <RoundedBox
                ref={meshRef as any}
                args={[width, height, 0.05]}
                radius={0.02}
                smoothness={4}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onClick={handleClick}
            >
                <meshPhongMaterial 
                    color={hovered ? "#00f0ff" : "#001a33"} 
                    transparent 
                    opacity={hovered ? 0.9 : 0.7} 
                    shininess={100}
                />
            </RoundedBox>
            
            <Text 
                position={[0, 0, 0.03]} 
                fontSize={0.08} 
                color={hovered ? "#000000" : "#00f0ff"}
                anchorX="center"
                anchorY="middle"
                fontWeight="bold"
            >
                {label}
            </Text>
        </group>
    );
};

// Material UI Style 3D Switch
const HologramToggle = ({
    position,
    active,
    onClick
}: {
    position: [number, number, number];
    active: boolean;
    onClick: () => void;
}) => {
    const groupRef = useRef<THREE.Group>(null);
    const knobRef = useRef<THREE.Mesh>(null);
    const trackMaterialRef = useRef<THREE.MeshPhongMaterial>(null);
    const knobMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
    
    const [hovered, setHovered] = useState(false);
    const { trackingMode, setHovered: setGlobalHovered } = useStore();

    useFrame(() => {
        if (!knobRef.current || !trackMaterialRef.current || !knobMaterialRef.current) return;
        
        // Animate Knob Position (-0.1 to 0.1 local X)
        const targetX = active ? 0.1 : -0.1;
        knobRef.current.position.x = THREE.MathUtils.lerp(knobRef.current.position.x, targetX, 0.2);

        // Animate Track Color (Gray to Cyan)
        const targetColor = active ? new THREE.Color("#00f0ff") : new THREE.Color("#001a33");
        trackMaterialRef.current.color.lerp(targetColor, 0.1);
        
        // Track Opacity
        trackMaterialRef.current.opacity = THREE.MathUtils.lerp(trackMaterialRef.current.opacity, active ? 0.6 + (hovered ? 0.2 : 0) : 0.3 + (hovered ? 0.1 : 0), 0.1);
        
        // Knob Color (White to Bright Cyan)
        const knobTargetColor = active ? new THREE.Color("#ffffff") : new THREE.Color("#cccccc");
        knobMaterialRef.current.color.lerp(knobTargetColor, 0.2);
    });

    const handlePointerOver = () => {
        if (trackingMode === 'MOUSE' || trackingMode === 'TV') {
            setHovered(true);
            setGlobalHovered(`Toggle`);
            playSound.playHover();
        }
    };

    const handlePointerOut = () => {
        if (trackingMode === 'MOUSE' || trackingMode === 'TV') {
            setHovered(false);
            setGlobalHovered(null);
        }
    };

    const handleClick = () => {
        if (trackingMode === 'MOUSE' || trackingMode === 'TV') {
            playSound.playClick();
            onClick();
        }
    };

    useEffect(() => {
        const handleEnter = () => {
            if (hovered && trackingMode === 'TV') handleClick();
        };
        window.addEventListener('tv-enter-press', handleEnter);
        return () => window.removeEventListener('tv-enter-press', handleEnter);
    }, [hovered, trackingMode, onClick]);

    return (
        <group 
            ref={groupRef} 
            position={position}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
        >
            {/* The Track */}
            <RoundedBox args={[0.4, 0.15, 0.04]} radius={0.075} smoothness={4}>
                <meshPhongMaterial ref={trackMaterialRef} transparent opacity={0.3} color="#001a33" shininess={100} />
            </RoundedBox>
            
            {/* The Knob */}
            <mesh ref={knobRef} position={[-0.1, 0, 0.03]}>
                <sphereGeometry args={[0.1, 32, 32]} />
                <meshBasicMaterial ref={knobMaterialRef} color="#cccccc" />
            </mesh>
            
            {/* Hover Glow Ring */}
            {hovered && (
                <RoundedBox args={[0.45, 0.2, 0.02]} radius={0.1} smoothness={4} position={[0, 0, -0.01]}>
                    <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.3} />
                </RoundedBox>
            )}
        </group>
    );
}

export const SettingsHologram = ({ position, rotation = [0, 0, 0] }: SettingsHologramProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const planeRef = useRef<THREE.Mesh>(null);
    
    // Global State
    const { 
        hdMode, setHdMode, 
        showWebPanel, setShowWebPanel,
        showVideoPanel, setShowVideoPanel,
        showChessAssistant, setShowChessAssistant,
        showAnimeAssistant, setShowAnimeAssistant,
        showRealisticAssistant, setShowRealisticAssistant,
        clampSensibility, setClampSensibility,
        gravity, setGravity,
        minHeight, setMinHeight
    } = useStore();
    
    useFrame((state) => {
        if (!groupRef.current) return;
        // Float animation matching HologramPanel
        groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    });

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* Sleek Glass Background without messy wireframes */}
            <RoundedBox ref={planeRef as any} args={[2.2, 3.8, 0.02]} radius={0.05} smoothness={4}>
                <meshPhongMaterial 
                    color="#001a33" 
                    transparent 
                    opacity={0.65} 
                    shininess={100}
                />
            </RoundedBox>
            
            {/* Clean Outer Frame Glow */}
            <RoundedBox args={[2.25, 3.85, 0.01]} radius={0.06} smoothness={4} position={[0, 0, -0.01]}>
                <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.15} />
            </RoundedBox>

            {/* Content Container */}
            <group position={[-0.9, 1.7, 0.02]}>
                {/* Title */}
                <Text 
                    fontSize={0.12} 
                    color="#00f0ff" 
                    anchorX="left" 
                    anchorY="top"
                    fontWeight="bold"
                >
                    SYS.CONFIG
                </Text>

                {/* --- Option 1: HD Mode --- */}
                <group position={[0, -0.3, 0]}>
                    <Text fontSize={0.08} color="#ffffff" anchorX="left" anchorY="top">
                        HD Mode
                    </Text>
                    <Text fontSize={0.05} color="#00f0ff" anchorX="left" anchorY="top" position={[0, -0.1, 0]} fillOpacity={0.7}>
                        High-res tracking & bloom fx
                    </Text>
                    
                    {/* 3D Slide Toggle */}
                    <HologramToggle 
                        position={[1.6, -0.05, 0]} 
                        active={hdMode}
                        onClick={() => setHdMode(!hdMode)}
                    />
                </group>

                {/* --- Options Group: Component Visibility --- */}
                <group position={[0, -0.7, 0]}>
                    <Text fontSize={0.08} color="#ffffff" anchorX="left" anchorY="top">
                        Render Settings
                    </Text>
                    
                    {/* WebPanel (Chess App) */}
                    <group position={[0, -0.2, 0]}>
                        <Text fontSize={0.06} color="#00f0ff" anchorX="left" anchorY="middle">Web Panel (Strategy)</Text>
                        <HologramToggle position={[1.6, 0, 0]} active={showWebPanel} onClick={() => setShowWebPanel(!showWebPanel)} />
                    </group>

                    {/* VideoPanel */}
                    <group position={[0, -0.4, 0]}>
                        <Text fontSize={0.06} color="#00f0ff" anchorX="left" anchorY="middle">Music Video Player</Text>
                        <HologramToggle position={[1.6, 0, 0]} active={showVideoPanel} onClick={() => setShowVideoPanel(!showVideoPanel)} />
                    </group>

                    {/* ChessAssistant */}
                    <group position={[0, -0.6, 0]}>
                        <Text fontSize={0.06} color="#00f0ff" anchorX="left" anchorY="middle">Chess AI Widget</Text>
                        <HologramToggle position={[1.6, 0, 0]} active={showChessAssistant} onClick={() => setShowChessAssistant(!showChessAssistant)} />
                    </group>

                    {/* AnimeAssistant */}
                    <group position={[0, -0.8, 0]}>
                        <Text fontSize={0.06} color="#00f0ff" anchorX="left" anchorY="middle">Anime Guide Avatar</Text>
                        <HologramToggle position={[1.6, 0, 0]} active={showAnimeAssistant} onClick={() => setShowAnimeAssistant(!showAnimeAssistant)} />
                    </group>

                    {/* RealisticAssistant */}
                    <group position={[0, -1.0, 0]}>
                        <Text fontSize={0.06} color="#00f0ff" anchorX="left" anchorY="middle">Realistic Guide Avatar</Text>
                        <HologramToggle position={[1.6, 0, 0]} active={showRealisticAssistant} onClick={() => setShowRealisticAssistant(!showRealisticAssistant)} />
                    </group>
                </group>

                {/* --- Option 3: Physics & Movement --- */}
                <group position={[0, -2.0, 0]}>
                    <Text fontSize={0.08} color="#ffffff" anchorX="left" anchorY="top">
                        Physics & Movement
                    </Text>

                    {/* Gravity */}
                    <group position={[0, -0.2, 0]}>
                        <Text fontSize={0.06} color="#00f0ff" anchorX="left" anchorY="middle">Gravity Scale</Text>
                        <group position={[1.6, 0, 0]}>
                            <HologramButton position={[-0.3, 0, 0]} width={0.15} height={0.15} label="-" onClick={() => setGravity(Math.max(0, Number((gravity - 0.1).toFixed(1))))} />
                            <Text position={[0, 0, 0.02]} fontSize={0.07} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">{(gravity * 100).toFixed(0)}%</Text>
                            <HologramButton position={[0.3, 0, 0]} width={0.15} height={0.15} label="+" onClick={() => setGravity(Math.min(1, Number((gravity + 0.1).toFixed(1))))} />
                        </group>
                    </group>

                    {/* Floor Limit */}
                    <group position={[0, -0.4, 0]}>
                        <Text fontSize={0.06} color="#00f0ff" anchorX="left" anchorY="middle">Floor Limit</Text>
                        <group position={[1.6, 0, 0]}>
                            <HologramButton position={[-0.3, 0, 0]} width={0.15} height={0.15} label="-" onClick={() => setMinHeight(Math.max(0, Number((minHeight - 0.1).toFixed(1))))} />
                            <Text position={[0, 0, 0.02]} fontSize={0.07} color="#ffffff" anchorX="center" anchorY="middle" fontWeight="bold">{minHeight.toFixed(1)}m</Text>
                            <HologramButton position={[0.3, 0, 0]} width={0.15} height={0.15} label="+" onClick={() => setMinHeight(Math.min(5, Number((minHeight + 0.1).toFixed(1))))} />
                        </group>
                    </group>
                </group>

                {/* --- Option 4: Motion Sensitivity --- */}
                <group position={[0, -2.9, 0]}>
                    <Text fontSize={0.08} color="#ffffff" anchorX="left" anchorY="top">
                        Motion Sensitivity
                    </Text>
                    <Text fontSize={0.05} color="#00f0ff" anchorX="left" anchorY="top" position={[0, -0.1, 0]} fillOpacity={0.7}>
                        Hand tracking speed multiplier
                    </Text>
                    
                    {/* Pill Buttons Container */}
                    <group position={[1.6, -0.05, 0]}>
                        <HologramButton 
                            position={[-0.3, 0, 0]} 
                            width={0.15}
                            height={0.15}
                            label="-" 
                            onClick={() => setClampSensibility(Math.max(0.1, clampSensibility - 0.1))}
                        />
                        <Text 
                            position={[0, 0, 0.02]} 
                            fontSize={0.09} 
                            color="#ffffff" 
                            anchorX="center" 
                            anchorY="middle"
                            fontWeight="bold"
                        >
                            {clampSensibility.toFixed(1)}x
                        </Text>
                        <HologramButton 
                            position={[0.3, 0, 0]} 
                            width={0.15}
                            height={0.15}
                            label="+" 
                            onClick={() => setClampSensibility(Math.min(3.0, clampSensibility + 0.1))}
                        />
                    </group>
                </group>

                {/* Decorative Bottom Bar */}
                <mesh position={[0.9, -3.4, 0]}>
                    <planeGeometry args={[1.9, 0.02]} />
                    <meshBasicMaterial color="#00f0ff" transparent opacity={0.4} />
                </mesh>
            </group>
        </group>
    );
};
