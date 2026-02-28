import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AnimeAssistantProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export const AnimeAssistant: React.FC<AnimeAssistantProps> = ({
  position = [9.5, 0, 0],
  rotation = [0, -0.35, 0],
  scale = 0.4,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const headRef = useRef<THREE.Group>(null!);
  const leftTailRef = useRef<THREE.Group>(null!);
  const rightTailRef = useRef<THREE.Group>(null!);
  const leftEyeRef = useRef<THREE.Group>(null!);
  const rightEyeRef = useRef<THREE.Group>(null!);
  const torsoRef = useRef<THREE.Group>(null!);
  const skirtRef = useRef<THREE.Group>(null!);
  const leftArmRef = useRef<THREE.Group>(null!);
  const leftBreastRef = useRef<THREE.Group>(null!);   // ← for juicy melon jiggle
  const rightBreastRef = useRef<THREE.Group>(null!);

  const blinkTimer = useRef(0);
  const isBlinking = useRef(false);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.4) * 0.09 * scale;
      groupRef.current.rotation.z = Math.sin(t * 0.55) * 0.018;
    }

    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(t * 0.7) * 0.035;
      headRef.current.rotation.y = Math.sin(t * 1.15) * 0.07;
    }

    if (leftTailRef.current) {
      leftTailRef.current.rotation.z = Math.sin(t * 3.2) * 0.22 - 0.35;
      leftTailRef.current.rotation.x = Math.sin(t * 2.1) * 0.12;
    }
    if (rightTailRef.current) {
      rightTailRef.current.rotation.z = -Math.sin(t * 3.2) * 0.22 + 0.35;
      rightTailRef.current.rotation.x = Math.sin(t * 1.9) * 0.11;
    }

    // Torso breathing (stronger to emphasize bust)
    if (torsoRef.current) {
      const breathe = 1 + Math.sin(t * 2.8) * 0.028;
      torsoRef.current.scale.setScalar(breathe);
    }

    // === JUICY MELONS JIGGLE (soft, natural bounce) ===
    const baseJiggle = Math.sin(t * 5.2) * 0.011;
    const breatheJiggle = Math.sin(t * 2.8) * 0.019;
    if (leftBreastRef.current) {
      leftBreastRef.current.scale.setScalar(1 + baseJiggle + breatheJiggle * 0.7);
      leftBreastRef.current.position.z = 0.42 + Math.abs(Math.sin(t * 4.1)) * 0.006;
    }
    if (rightBreastRef.current) {
      rightBreastRef.current.scale.setScalar(1 + baseJiggle * 0.95 + breatheJiggle * 0.7);
      rightBreastRef.current.position.z = 0.42 + Math.abs(Math.sin(t * 4.6)) * 0.006;
    }

    if (skirtRef.current) {
      skirtRef.current.rotation.y = Math.sin(t * 1.8) * 0.045;
    }

    // Blink
    blinkTimer.current += delta;
    if (blinkTimer.current > 3.5 + Math.random() * 2.5 && !isBlinking.current) {
      isBlinking.current = true;
      blinkTimer.current = 0;
    }
    if (isBlinking.current) {
      const progress = Math.sin(blinkTimer.current * 28) * 0.5 + 0.5;
      if (leftEyeRef.current) leftEyeRef.current.scale.y = Math.max(0.05, progress);
      if (rightEyeRef.current) rightEyeRef.current.scale.y = Math.max(0.05, progress);
      if (progress < 0.15) {
        isBlinking.current = false;
        blinkTimer.current = 0;
      }
    } else {
      if (leftEyeRef.current) leftEyeRef.current.scale.y = 1;
      if (rightEyeRef.current) rightEyeRef.current.scale.y = 1;
    }
  });

  // Materials (same premium holographic look)
  const skinMat = (
    <meshStandardMaterial
      color="#ffe4d1"
      emissive="#ffbb99"
      emissiveIntensity={0.18}
      roughness={0.65}
      metalness={0.1}
    />
  );

  const hairMat = (
    <meshStandardMaterial
      color="#f9e07c"
      emissive="#ffe633"
      emissiveIntensity={0.55}
      roughness={0.35}
      metalness={0.25}
    />
  );

  const outfitMat = (
    <meshStandardMaterial
      color="#1a0022"
      emissive="#aa22ff"
      emissiveIntensity={0.82}
      roughness={0.12}
      metalness={0.88}
      transparent
      opacity={0.93}
    />
  );

  const skirtMat = (
    <meshStandardMaterial
      color="#0f0018"
      emissive="#cc44ff"
      emissiveIntensity={0.6}
      roughness={0.2}
      metalness={0.7}
      side={THREE.DoubleSide}
    />
  );

  const eyeWhiteMat = <meshStandardMaterial color="#ffffff" emissive="#bbddff" emissiveIntensity={0.4} />;
  const irisMat = <meshStandardMaterial color="#3b8cff" emissive="#66ccff" emissiveIntensity={0.7} />;
  const pupilMat = <meshStandardMaterial color="#111111" />;
  const mouthMat = <meshStandardMaterial color="#ff4488" emissive="#ff2266" emissiveIntensity={0.3} />;
  const ringMat = <meshBasicMaterial color="#bb44ff" transparent opacity={0.25} side={THREE.DoubleSide} />;

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      {/* Holographic floor ring */}
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI * 0.5, 0, 0]}>
        <ringGeometry args={[1.8, 2.4, 48]} />
        {ringMat}
      </mesh>

      {/* LEGS (unchanged – thicc & sexy) */}
      <group position={[-0.35, 1.75, 0]}>
        <mesh position={[0, -0.65, 0]} rotation={[0.12, 0, 0.18]}>
          <capsuleGeometry args={[0.24, 1.35, 8, 24]} />
          {skinMat}
        </mesh>
        <mesh position={[0, -1.35, 0]} rotation={[0.12, 0, 0.18]}>
          <cylinderGeometry args={[0.245, 0.24, 0.35, 24]} />
          <meshStandardMaterial color="#220022" emissive="#9900cc" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, -2.1, 0]}>
          <capsuleGeometry args={[0.16, 1.4, 8, 20]} />
          {skinMat}
        </mesh>
        <mesh position={[0.08, -3.05, 0.15]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[0.22, 0.18, 0.55]} />
          <meshStandardMaterial color="#110011" emissive="#5500aa" emissiveIntensity={0.7} />
        </mesh>
      </group>

      <group position={[0.35, 1.75, 0]}>
        <mesh position={[0, -0.65, 0]} rotation={[0.12, 0, -0.18]}>
          <capsuleGeometry args={[0.24, 1.35, 8, 24]} />
          {skinMat}
        </mesh>
        <mesh position={[0, -1.35, 0]} rotation={[0.12, 0, -0.18]}>
          <cylinderGeometry args={[0.245, 0.24, 0.35, 24]} />
          <meshStandardMaterial color="#220022" emissive="#9900cc" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, -2.1, 0]}>
          <capsuleGeometry args={[0.16, 1.4, 8, 20]} />
          {skinMat}
        </mesh>
        <mesh position={[-0.08, -3.05, 0.15]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[0.22, 0.18, 0.55]} />
          <meshStandardMaterial color="#110011" emissive="#5500aa" emissiveIntensity={0.7} />
        </mesh>
      </group>

      {/* === TORSO WITH TWO JUICY MELONS === */}
      <group ref={torsoRef} position={[0, 3.1, 0]}>
        {/* Hips / lower torso */}
        <mesh position={[0, -0.4, 0]}>
          <cylinderGeometry args={[0.72, 0.48, 0.9, 32, 1, true]} />
          {outfitMat}
        </mesh>

        {/* Tiny corset waist (even tighter for contrast) */}
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.36, 0.51, 1.12, 28]} />
          {outfitMat}
        </mesh>

        {/* LEFT JUICY MELON */}
        <group ref={leftBreastRef} position={[-0.33, 1.22, 0.42]}>
          <mesh>
            <sphereGeometry args={[0.51, 36, 32]} />
            {outfitMat}
          </mesh>
        </group>

        {/* RIGHT JUICY MELON */}
        <group ref={rightBreastRef} position={[0.33, 1.22, 0.42]}>
          <mesh>
            <sphereGeometry args={[0.51, 36, 32]} />
            {outfitMat}
          </mesh>
        </group>

        {/* Deep glowing cleavage (now between two real melons) */}
        <mesh position={[0, 1.38, 0.78]} rotation={[0.82, 0, 0]}>
          <torusGeometry args={[0.26, 0.035, 8, 32, Math.PI * 1.55]} />
          <meshBasicMaterial color="#ff66bb" transparent opacity={0.85} />
        </mesh>
        {/* Extra vertical cleavage highlight */}
        <mesh position={[0, 1.25, 0.79]} rotation={[1.1, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
          <meshBasicMaterial color="#ff99dd" transparent opacity={0.6} />
        </mesh>
      </group>

      {/* ARMS (unchanged) */}
      <group ref={leftArmRef} position={[-0.75, 4.0, 0]}>
        <mesh position={[0, -0.8, 0]} rotation={[0.6, 0, -1.35]}>
          <capsuleGeometry args={[0.12, 1.45, 8, 16]} />
          {skinMat}
        </mesh>
        <mesh position={[-0.4, -1.75, -0.1]} rotation={[0.8, 0.3, -1.6]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          {skinMat}
        </mesh>
      </group>

      <group position={[0.75, 4.0, 0]}>
        <mesh position={[0, -0.8, 0]} rotation={[-0.2, 0, 1.1]}>
          <capsuleGeometry args={[0.12, 1.45, 8, 16]} />
          {skinMat}
        </mesh>
        <mesh position={[0.35, -1.65, 0.1]} rotation={[0.4, -0.5, 0.9]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          {skinMat}
        </mesh>
      </group>

      {/* HEAD + FACE (unchanged) */}
      <group ref={headRef} position={[0, 5.25, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 32, 32]} />
          {skinMat}
        </mesh>

        <group ref={leftEyeRef} position={[-0.22, 0.18, 0.52]}>
          <mesh><sphereGeometry args={[0.19, 24, 24]} />{eyeWhiteMat}</mesh>
          <mesh position={[0, 0, 0.03]}><sphereGeometry args={[0.11, 20, 20]} />{irisMat}</mesh>
          <mesh position={[0.02, 0.02, 0.08]}><sphereGeometry args={[0.055, 12, 12]} />{pupilMat}</mesh>
        </group>
        <group ref={rightEyeRef} position={[0.22, 0.18, 0.52]}>
          <mesh><sphereGeometry args={[0.19, 24, 24]} />{eyeWhiteMat}</mesh>
          <mesh position={[0, 0, 0.03]}><sphereGeometry args={[0.11, 20, 20]} />{irisMat}</mesh>
          <mesh position={[-0.02, 0.02, 0.08]}><sphereGeometry args={[0.055, 12, 12]} />{pupilMat}</mesh>
        </group>

        <mesh position={[-0.24, 0.42, 0.58]} rotation={[0, 0, 0.4]}>
          <capsuleGeometry args={[0.04, 0.22, 4, 8]} />
          <meshStandardMaterial color="#2c1f00" />
        </mesh>
        <mesh position={[0.24, 0.42, 0.58]} rotation={[0, 0, -0.4]}>
          <capsuleGeometry args={[0.04, 0.22, 4, 8]} />
          <meshStandardMaterial color="#2c1f00" />
        </mesh>
        <mesh position={[0, -0.18, 0.58]} rotation={[0.6, 0, 0]}>
          <torusGeometry args={[0.08, 0.025, 8, 16, Math.PI * 0.8]} />
          {mouthMat}
        </mesh>
        <mesh position={[-0.3, -0.05, 0.6]} scale={[0.9, 0.4, 1]}>
          <sphereGeometry args={[0.13]} />
          <meshBasicMaterial color="#ff99aa" transparent opacity={0.25} />
        </mesh>
        <mesh position={[0.3, -0.05, 0.6]} scale={[0.9, 0.4, 1]}>
          <sphereGeometry args={[0.13]} />
          <meshBasicMaterial color="#ff99aa" transparent opacity={0.25} />
        </mesh>
      </group>

      {/* HAIR (unchanged) */}
      <group position={[0, 5.25, 0]}>
        <mesh position={[0, 0.3, -0.25]} scale={[1.15, 1.05, 0.9]}>
          <sphereGeometry args={[0.62, 28, 24]} />
          {hairMat}
        </mesh>
        <mesh position={[0, 0.65, 0.42]} rotation={[0.6, 0, 0]}>
          <cylinderGeometry args={[0.48, 0.32, 0.45, 28, 1, true]} />
          {hairMat}
        </mesh>

        <group ref={leftTailRef} position={[-0.55, 0.4, -0.1]}>
          <mesh position={[0, -0.9, 0]} rotation={[0.3, 0.8, 0]}>
            <cylinderGeometry args={[0.13, 0.09, 2.1, 16]} />
            {hairMat}
          </mesh>
          <mesh position={[-0.3, -2.1, 0.4]} scale={[1.2, 1.1, 1]}>
            <sphereGeometry args={[0.22]} />
            {hairMat}
          </mesh>
        </group>

        <group ref={rightTailRef} position={[0.55, 0.4, -0.1]}>
          <mesh position={[0, -0.9, 0]} rotation={[0.3, -0.8, 0]}>
            <cylinderGeometry args={[0.13, 0.09, 2.1, 16]} />
            {hairMat}
          </mesh>
          <mesh position={[0.3, -2.1, 0.4]} scale={[1.2, 1.1, 1]}>
            <sphereGeometry args={[0.22]} />
            {hairMat}
          </mesh>
        </group>

        <mesh position={[0.1, 1.1, 0.3]} rotation={[0, 0, 1.2]}>
          <capsuleGeometry args={[0.03, 0.38, 6]} />
          {hairMat}
        </mesh>
      </group>

      {/* SKIRT (unchanged) */}
      <group ref={skirtRef} position={[0, 3.05, 0]}>
        <mesh position={[0, -0.2, 0]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.92, 1.1, 36, 1, true]} />
          {skirtMat}
        </mesh>
        <mesh position={[0, -0.35, 0]} rotation={[0.22, 0, 0]} scale={[1.05, 1, 1]}>
          <coneGeometry args={[0.96, 0.95, 42, 1, true]} />
          {skirtMat}
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[0.25, 0, 0]} scale={[1.12, 1, 1]}>
          <coneGeometry args={[0.99, 0.8, 48, 1, true]} />
          <meshStandardMaterial color="#ffffff" emissive="#eeccff" emissiveIntensity={0.3} transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Corset ribbon */}
      <mesh position={[0, 3.65, 0.62]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.42, 0.035, 6, 24, Math.PI * 1.4]} />
        <meshBasicMaterial color="#ff44cc" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};