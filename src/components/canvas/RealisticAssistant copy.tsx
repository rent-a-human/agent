import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  modelUrl?: string; // e.g. "/models/my-sexy-assistant.glb"
}

export const RealisticAssistant: React.FC<Props> = ({
  position = [9.5, 0, 0],
  rotation = [0, -0.35, 0],
  scale = 0.42,
  modelUrl = "/agent/models/eve.glb", // ← put your .glb in public/models/
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(modelUrl);
  const { actions, names } = useAnimations(animations, scene);

  // Play idle animation + subtle head follow + breathing
  useEffect(() => {
    const idle = actions[names.find(n => n.toLowerCase().includes('idle')) || names[0]];
    if (idle) {
      idle.reset().fadeIn(0.5).play();
    }
    // Optional: mix a second subtle breathing clip if you exported one
  }, [actions, names]);

  // Gentle floating + head look-at (flirty idle)
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.2) * 0.06;
    }
    // Simple head tracking toward center (or mouse later)
    const head = scene.getObjectByName('Head') || scene.getObjectByName('head'); // adjust bone name
    if (head) {
      head.lookAt(0, 4, 2); // looks slightly toward main interaction area
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={scene} />
    </group>
  );
};