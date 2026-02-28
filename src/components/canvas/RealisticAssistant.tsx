import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RealisticAssistantProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  modelUrl?: string;
  jiggleIntensity?: number;   // 0.0 – 2.0 (1.35 feels perfect)
  debugBones?: boolean;       // set true once to log all bone names
}

export const RealisticAssistant: React.FC<RealisticAssistantProps> = ({
  position = [-5, 0, 2],
  rotation = [0, 0, 0],
  scale = 1.5,
  modelUrl = "/agent/models/eve.glb",
  jiggleIntensity = 1.35,
  debugBones = false,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const leftBreastBone = useRef<THREE.Bone | null>(null);
  const rightBreastBone = useRef<THREE.Bone | null>(null);

  const { scene, animations } = useGLTF(modelUrl);
  const { actions, names } = useAnimations(animations, scene);

  // ── AUTO-DETECT BREAST BONES (TS-safe) ──
  useEffect(() => {
    scene.traverse((obj) => {
      // FIXED: type-safe bone check (no more TS error)
      if (obj.type === 'Bone') {
        const bone = obj as THREE.Bone;
        const name = bone.name.toLowerCase();

        if (debugBones) console.log('Bone found:', bone.name);

        if (!leftBreastBone.current &&
            (name.includes('left') || name.includes('l_') || name.includes('.l')) &&
            (name.includes('breast') || name.includes('boob') || name.includes('bust') || name.includes('chest'))) {
          leftBreastBone.current = bone;
          console.log('✅ Left breast bone locked →', bone.name);
        }

        if (!rightBreastBone.current &&
            (name.includes('right') || name.includes('r_') || name.includes('.r')) &&
            (name.includes('breast') || name.includes('boob') || name.includes('bust') || name.includes('chest'))) {
          rightBreastBone.current = bone;
          console.log('✅ Right breast bone locked →', bone.name);
        }
      }
    });

    if (!leftBreastBone.current && !rightBreastBone.current && debugBones) {
      console.warn('⚠️ No breast bones found. Open eve.glb in Blender and add/rename breast bones if needed.');
    }

    // Start idle animation
    const idleClip = names.find(n =>
      n.toLowerCase().includes('idle') ||
      n.toLowerCase().includes('breath') ||
      n.toLowerCase().includes('stand')
    ) || names[0];

    if (idleClip) {
      const action = actions[idleClip];
      action?.reset().fadeIn(0.6).play();
    }
  }, [scene, names, actions, debugBones]);

  // ── JUICY BOUNCING BOOBS + IDLE ──
  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(t * 1.1) * 0.055;
    }

    // Head tracking (flirty)
    const head = scene.getObjectByName('Head') ||
                 scene.getObjectByName('head') ||
                 scene.getObjectByName('Head001');
    if (head) head.lookAt(0, 4.5, 3);

    // === BREAST JIGGLE (soft, natural, sexy) ===
    const fast = Math.sin(t * 7.8) * 0.028 * jiggleIntensity;
    const slow = Math.sin(t * 2.3) * 0.019 * jiggleIntensity;
    const breathe = Math.sin(t * 1.4) * 0.012;

    if (leftBreastBone.current) {
      leftBreastBone.current.rotation.x = fast * 0.9 + slow + breathe;
      leftBreastBone.current.rotation.z = Math.sin(t * 4.2) * 0.008 * jiggleIntensity;
    }
    if (rightBreastBone.current) {
      rightBreastBone.current.rotation.x = fast * 1.05 + slow * 0.95 + breathe;
      rightBreastBone.current.rotation.z = Math.sin(t * 4.6) * -0.008 * jiggleIntensity;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
};