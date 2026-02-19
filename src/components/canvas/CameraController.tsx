import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import { useRef, useEffect } from 'react';
import * as THREE from 'three'; 

// Helper for shortest-path angle interpolation
const lerpTheta = (start: number, end: number, alpha: number) => {
    const d = end - start;
    // Normalize delta to -PI..PI
    const delta = ((d + Math.PI) % (2 * Math.PI)) - Math.PI;
    return start + delta * alpha;
};

export const CameraController = () => {
    const { camera } = useThree();
    const { hands, hoveredObject } = useStore();
    
    // ...

    // ...

    const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

    // Refs for gesture start states
    const dragStartRef = useRef<{ 
        z: number, 
        scale: number, 
        x: number, // Hand X
        y: number, // Hand Y
        target: THREE.Vector3 
    } | null>(null);
    
    const rotateStartRef = useRef<{ 
        x: number, 
        y: number, 
        angle: number, 
        camY: number 
    } | null>(null);

    // Current Orbit State (Track these to reconstruct position relative to target)
    const orbitState = useRef({
        radius: 5,
        theta: 0, 
        y: 5 // Camera Height goal
    });

    // Velocity state for inertia
    const inertiaState = useRef({
        thetaVelocity: 0,
        panVelocity: new THREE.Vector3(0, 0, 0),
        damping: 0.95 // Inertia friction (0.95 = smooth long drift, 0.90 = faster stop)
    });

    // --- SMOOTHING STATE ---
    // We store the "Goal" states in the refs above (targetRef, orbitState).
    // We introduce "Current" states for smoothing.
    const smoothedState = useRef({
        target: new THREE.Vector3(0, 0, 0),
        radius: 5,
        theta: 0,
        camY: 0
    });

    // Initialize smoothed state on first run
    const initialized = useRef(false);

    // History for smoothing release velocity
    const thetaHistory = useRef<{ val: number, time: number }[]>([]);
    const panHistory = useRef<{ val: THREE.Vector3, time: number }[]>([]);

    // --- KEYBOARD CONTROLS (Displacement) ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (useStore.getState().hoveredObject) return; // Don't move if interacting? Actually navigating while hovering is fine.

            const sensitivity = 0.5;
            const theta = smoothedState.current.theta;
            
            // Forward/Back based on Camera View (at current theta)
            const camFwd = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta));
            const camRight = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));

            if (e.key === 'ArrowUp' || e.key === 'w') {
                targetRef.current.add(camFwd.multiplyScalar(sensitivity));
            }
            if (e.key === 'ArrowDown' || e.key === 's') {
                targetRef.current.add(camFwd.multiplyScalar(-sensitivity));
            }
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                targetRef.current.add(camRight.multiplyScalar(-sensitivity));
            }
            if (e.key === 'ArrowRight' || e.key === 'd') {
                targetRef.current.add(camRight.multiplyScalar(sensitivity));
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- MOUSE CONTROLS (Orbiting) ---
    useEffect(() => {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startTheta = 0;
        let startCamY = 0;

        const onMouseDown = (e: MouseEvent) => {
             // Only Left Click (button 0)
             if (e.button !== 0) return;
             // Ignore if hovering UI? (Handled by pointer-events in DOM overlay)
             // But we are in canvas. 
             isDragging = true;
             startX = e.clientX;
             startY = e.clientY;
             startTheta = orbitState.current.theta;
             startCamY = orbitState.current.y;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            
            const deltaX = (e.clientX - startX) * -0.005; // Inverted X for natural orbit
            const deltaY = (e.clientY - startY) * 0.02;

            orbitState.current.theta = startTheta + deltaX;
            
            let newCamY = startCamY + deltaY;
            newCamY = Math.max(-1, Math.min(8, newCamY));
            orbitState.current.y = newCamY;
        };

        const onMouseUp = () => {
             isDragging = false;
        };

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        
        return () => {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    useFrame(({ clock }) => {
        if (!initialized.current) {
            smoothedState.current.target.copy(targetRef.current);
            smoothedState.current.radius = orbitState.current.radius;
            smoothedState.current.theta = orbitState.current.theta;
            smoothedState.current.camY = camera.position.y;
            initialized.current = true;
        }
        
        // ... (Hand Logic Omitted for Brevity - Keeping existing Hand Logic below) ...
        // Wait, I need to preserve the Hand Logic!
        // The Replace Tool overwrites the block.
        // I must include the entire useFrame or splice carefully.
        // It's safer to insert the useEffects BEFORE useFrame, and keep useFrame intact?
        // But the previous content showed useFrame logic. 
        // I will re-inject the `useFrame` logic.
        
        const time = clock.getElapsedTime();
        const rightHand = hands.right;
        const leftHand = hands.left;
        
        // Only process inputs if NOT hovering
        if (!hoveredObject) {
            // --- RIGHT HAND: PAN & ZOOM ---
            if (rightHand.present && rightHand.gesture === 'PINCH') {
                // Reset Pan Inertia
                inertiaState.current.panVelocity.set(0, 0, 0);
    
                if (!dragStartRef.current) {
                    // Start Drag
                    dragStartRef.current = {
                        z: rightHand.z, 
                        scale: rightHand.scale, 
                        x: rightHand.x,
                        y: rightHand.y, 
                        target: targetRef.current.clone()
                    };
                    
                    // Reset History
                    panHistory.current = [{ val: targetRef.current.clone(), time: time }];
                } else {
                    // --- PLANAR DRAG ---
                    const deltaX = rightHand.x - dragStartRef.current.x;
                    const deltaY = rightHand.y - dragStartRef.current.y;
                    
                    const sensitivity = 20; 
                    
                    // Use Visual Theta for Direction (Stable)
                    const theta = smoothedState.current.theta;
                    
                    const camFwd = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta));
                    const camRight = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
    
                    const moveX = camRight.clone().multiplyScalar(deltaX * sensitivity);
                    const moveZ = camFwd.clone().multiplyScalar(deltaY * sensitivity); 
                    
                    const combinedMove = new THREE.Vector3().add(moveX).add(moveZ);
                    
                    targetRef.current.copy(dragStartRef.current.target).add(combinedMove);
                    
                    // Update History
                    panHistory.current.push({ val: targetRef.current.clone(), time: time });
                    if (panHistory.current.length > 5) panHistory.current.shift();
                }
            } else {
                // RELEASED
                if (dragStartRef.current) {
                    // Calculate Pan Velocity from History
                    if (panHistory.current.length >= 2) {
                        const latest = panHistory.current[panHistory.current.length - 1];
                        const oldest = panHistory.current[0];
                        
                        const timeDelta = latest.time - oldest.time;
                        const valDelta = latest.val.clone().sub(oldest.val);
                        
                        if (timeDelta > 0.01) {
                            const v = valDelta.divideScalar(panHistory.current.length - 1);
                            inertiaState.current.panVelocity.copy(v).multiplyScalar(1.5); // Boost
                        }
                    }
                    dragStartRef.current = null;
                    panHistory.current = [];
                }
                
                // Apply Pan Inertia
                if (inertiaState.current.panVelocity.lengthSq() > 0.000001) {
                    targetRef.current.add(inertiaState.current.panVelocity);
                    inertiaState.current.panVelocity.multiplyScalar(inertiaState.current.damping);
                } else {
                    inertiaState.current.panVelocity.set(0, 0, 0);
                }
            }
    
            // --- LEFT HAND: ORBIT & TILT ---
            if (leftHand.present && leftHand.gesture === 'PINCH') {
                // Reset inertia
                inertiaState.current.thetaVelocity = 0;
    
                if (!rotateStartRef.current) {
                     // Start Pinch
                     const dx = camera.position.x - targetRef.current.x;
                     const dz = camera.position.z - targetRef.current.z;
                     const theta = Math.atan2(dx, dz);
    
                     rotateStartRef.current = {
                         x: leftHand.x, 
                         y: leftHand.y,
                         angle: theta,
                         camY: camera.position.y
                     };
                     
                     // Reset History
                     thetaHistory.current = [{ val: theta, time: time }];
                } else {
                     // ORBIT (Theta)
                     const deltaX = leftHand.x - rotateStartRef.current.x;
                     const rotateSens = 5; 
                     const newTheta = rotateStartRef.current.angle + (deltaX * rotateSens);
                     
                     orbitState.current.theta = newTheta;
                     
                     // Update History (Keep last 5 frames / 100ms)
                     thetaHistory.current.push({ val: newTheta, time: time });
                     if (thetaHistory.current.length > 5) thetaHistory.current.shift();
    
                     // TILT (Camera Y)
                     const deltaY = leftHand.y - rotateStartRef.current.y;
                     const tiltSens = 10;
                     let newCamY = rotateStartRef.current.camY + (deltaY * tiltSens);
                     newCamY = Math.max(-1, Math.min(8, newCamY));
                     
                     orbitState.current.y = newCamY;
                }
            } else {
                // RELEASED
                if (rotateStartRef.current) {
                    // Calculate Throw Velocity from History
                    if (thetaHistory.current.length >= 2) {
                        const latest = thetaHistory.current[thetaHistory.current.length - 1];
                        const oldest = thetaHistory.current[0];
                        
                        const timeDelta = latest.time - oldest.time;
                        const valDelta = latest.val - oldest.val;
                        
                        if (timeDelta > 0.01) {
                            const v = valDelta / (thetaHistory.current.length - 1);
                            inertiaState.current.thetaVelocity = v * 1.5; 
                        }
                    }
                    rotateStartRef.current = null;
                    thetaHistory.current = [];
                }
                
                // Apply Inertia
                if (Math.abs(inertiaState.current.thetaVelocity) > 0.0001) {
                    orbitState.current.theta += inertiaState.current.thetaVelocity;
                    inertiaState.current.thetaVelocity *= inertiaState.current.damping;
                } else {
                    inertiaState.current.thetaVelocity = 0;
                }
            }
        }
        
        // --- SMOOTHING APPLICATION (LERP) ---
        const lerpFactor = 0.1; 
        
        smoothedState.current.target.lerp(targetRef.current, lerpFactor);
        smoothedState.current.radius = THREE.MathUtils.lerp(smoothedState.current.radius, orbitState.current.radius, lerpFactor);
        
        // Use Shortest Path Lerp for Theta
        smoothedState.current.theta = lerpTheta(smoothedState.current.theta, orbitState.current.theta, lerpFactor);
        
        smoothedState.current.camY = THREE.MathUtils.lerp(smoothedState.current.camY, orbitState.current.y, lerpFactor);

        // --- UPDATE CAMERA ---
        const s = smoothedState.current;
        
        camera.position.x = s.target.x + s.radius * Math.sin(s.theta);
        camera.position.z = s.target.z + s.radius * Math.cos(s.theta);
        camera.position.y = s.camY;
        
        camera.lookAt(s.target);
    });

    return null;
};
