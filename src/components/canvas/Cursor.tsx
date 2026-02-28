import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import * as THREE from 'three';

export const Cursor = () => {
  const meshRef = useRef<THREE.Group>(null);
  const spinnerRef = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();

  // Shader for Ring
  const ringShader = {
    uniforms: {
        color: { value: new THREE.Color("#00f0ff") },
        progress: { value: 1.0 } // 1.0 = Full, 0.0 = Empty
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 color;
        uniform float progress;
        varying vec2 vUv;
        
        #define PI 3.14159265359
        
        void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 toPixel = vUv - center;
            float angle = atan(toPixel.y, toPixel.x) + PI; // 0 to 2PI
            float normalizedAngle = angle / (2.0 * PI);
            
            // We want 360 -> 0. So if normalizedAngle < progress, show.
            // 0 is usually Right.
            
            if (normalizedAngle > progress) discard;
            
            float dist = length(toPixel);
            if (dist < 0.3 || dist > 0.5) discard; // Ring thickness
            
            gl_FragColor = vec4(color, 1.0);
        }
    `
  };

  useFrame(() => {
    // Access state directly to avoid re-renders
    const { hands, face, lastHandActivity, dwellProgress, trackingMode, tvCursor } = useStore.getState();
    const hand = hands.left.present ? hands.left : hands.right; 
    
    // Check Timeout
    const now = Date.now();
    const handsActive = (now - lastHandActivity) < 5000; 

    // Update Spinner
    if (spinnerRef.current) {
        if (!handsActive && face.present && dwellProgress > 0) {
            spinnerRef.current.visible = true;
            (spinnerRef.current.material as THREE.ShaderMaterial).uniforms.progress.value = 1 - dwellProgress;
        } else {
            spinnerRef.current.visible = false;
        }
    }

    if (meshRef.current) {
        if (trackingMode === 'TV') {
            // TV navigation logic (fixed crosshair controlled by D-Pad)
            const x = (tvCursor.x * 2 - 1) * 15;
            const y = -(tvCursor.y * 2 - 1) * 8;

            meshRef.current.position.set(x, y, 0);
            meshRef.current.scale.setScalar(1.5); // Slightly larger cursor for TV
            meshRef.current.visible = true;
        } else if (trackingMode === 'EYE' && handsActive && hand.present) {
            // --- HAND MODE ---
            const x = -(hand.x - 0.5) * viewport.width; 
            const y = -(hand.y - 0.5) * viewport.height;
            
            // Lerp
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, x, 0.2);
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, y, 0.2);
            meshRef.current.visible = true;
            
            // Scale on pinch
            const targetScale = hand.gesture === 'PINCH' ? 0.5 : 1;
            meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.2));

        } else if (!handsActive && face.present) {
            // --- SIMPLE HEAD MODE ---
            // Direct mapping of Nose position
            // Center is 0.5. 
            // x = -(face.x - 0.5) * Width * Scaling
            // Scaling = 2.0 was mostly fine, maybe boost to 2.5 for easier reach
            
            const sensitivity = 2.5;
            
            const x = -(face.x - 0.5) * viewport.width * sensitivity; 
            const y = -(face.y - 0.5) * viewport.height * sensitivity;
        
            meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, x, 0.1); 
            meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, y, 0.1);
            meshRef.current.visible = true;
            meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, 1.5, 0.1)); 
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
      
      {/* Dwell Spinner */}
      <mesh ref={spinnerRef} visible={false}>
         <planeGeometry args={[0.8, 0.8]} /> 
         <shaderMaterial args={[ringShader]} transparent />
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
