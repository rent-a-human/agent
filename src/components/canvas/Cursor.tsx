import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import * as THREE from 'three';

export const Cursor = () => {
  const meshRef = useRef<THREE.Group>(null);
  const { viewport } = useThree();

  useFrame(() => {
    // Access state directly to avoid re-renders
    const { hands } = useStore.getState();
    const hand = hands.left.present ? hands.left : hands.right; // Prioritize left or track active

    if (meshRef.current) {
        if (hand.present) {
            // Map 0..1 to viewport coordinates
            // MediaPipe x is 0 (left) -> 1 (right)
            // ThreeJS x is -width/2 -> +width/2
            // So x = (hp.x - 0.5) * viewport.width
            // But wait, MediaPipe is mirrored?
            // If I raise my right hand (on screen right), x is > 0.5.
            // In ThreeJS, x > 0 is right.
            // So: (hand.x - 0.5) * viewport.width
            
            
            // If I move my hand right, cursor goes right?
            // MediaPipe X is normalized image coordinates.
            // If we are looking at a mirror, moving hand right (screen relative) is x increasing.
            // Screen right in ThreeJS is +X.
            // So (x - 0.5) * width should be correct.
            // Let's verify mirror behavior later. For now assume direct mapping.
            // Actually, if we use `facingMode: user` (selfie), the video is usually mirrored by default in CSS scale(-1, 1).
            // But MediaPipe coordinates are based on the *input image*.
            // If the input image is the raw webcam, and we CSS flip the video, MediaPipe still sees raw.
            // If I move my hand to my right, it appears on the left of the screen (mirror).
            // MediaPipe x will be < 0.5 (left).
            // ThreeJS x should be negative (left).
            // So (x - 0.5) works.
            
            const x = -(hand.x - 0.5) * viewport.width; // Flip X if we want it to match a mirrored video
            const y = -(hand.y - 0.5) * viewport.height;
            
            // Lerp for smoothness
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, x, 0.2);
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, y, 0.2);
            meshRef.current.visible = true;
            
            // Scale on pinch
            const targetScale = hand.gesture === 'PINCH' ? 0.5 : 1;
            meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.2));

        } else {
            meshRef.current.visible = false;
        }
    }
  });

  return (
    <group ref={meshRef}>
      {/* Outer Ring */}
      <mesh>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.8} />
      </mesh>
      {/* Inner Dot */}
      <mesh>
        <circleGeometry args={[0.08, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Point Light for object interaction */}
      <pointLight color="#00f0ff" intensity={2} distance={3} decay={2} />
    </group>
  );
};
