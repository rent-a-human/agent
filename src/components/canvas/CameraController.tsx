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
    const { hands, hoveredObject, clampSensibility } = useStore();
    
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
        y: 1.8 // Default Camera Height starts at minHeight
    });

    // Velocity state for inertia and physics
    const inertiaState = useRef({
        thetaVelocity: 0,
        panVelocity: new THREE.Vector3(0, 0, 0),
        yVelocity: 0, // Vertical physics velocity
        damping: 0.95 // Inertia friction (0.95 = smooth long drift, 0.90 = faster stop)
    });

    // Input state for physics
    const physicsInput = useRef({
        spaceHeld: false,
        shiftHeld: false,
        isGrounded: true
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

    // --- KEYBOARD & JOYSTICK CONTROLS (Displacement) ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const { hoveredObject, trackingMode } = useStore.getState();
            if (hoveredObject) return;
            if (trackingMode === 'TV') return; // Arrow keys used for cursor

            useStore.getState().setCameraGoal(null); // Break free on manual input

            // Input capture for physics
            if (e.key === ' ' || e.code === 'Space') {
                physicsInput.current.spaceHeld = true;
                
                // Jump Trigger
                const { gravity } = useStore.getState();
                if (gravity > 0 && physicsInput.current.isGrounded) {
                    useStore.getState().setCameraGoal(null); // Break free on manual input
                    inertiaState.current.yVelocity = 0.15; // Initial jump burst
                    physicsInput.current.isGrounded = false;
                }
            }
            if (e.key === 'Shift') {
                physicsInput.current.shiftHeld = true;
            }

            const sensitivity = 0.5;
            const theta = smoothedState.current.theta;
            
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
            // Smart TV Channel Up/Down
            if (e.key === 'ChannelUp' || e.key === 'PageUp') {
                targetRef.current.add(camFwd.multiplyScalar(sensitivity * 2));
            }
            if (e.key === 'ChannelDown' || e.key === 'PageDown') {
                targetRef.current.add(camFwd.multiplyScalar(-sensitivity * 2));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.code === 'Space') {
                physicsInput.current.spaceHeld = false;
            }
            if (e.key === 'Shift') {
                physicsInput.current.shiftHeld = false;
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // --- MOUSE & TOUCH CONTROLS (Orbiting) ---
    useEffect(() => {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startTheta = 0;
        let startCamY = 0;

        // MOUSE Handlers
        const onMouseDown = (e: MouseEvent) => {
             if (e.button !== 0) return;
             useStore.getState().setCameraGoal(null); // Break free on manual input
             isDragging = true;
             startX = e.clientX;
             startY = e.clientY;
             startTheta = orbitState.current.theta;
             startCamY = orbitState.current.y;
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const deltaX = (e.clientX - startX) * -0.005; 
            const deltaY = (e.clientY - startY) * 0.02;
            orbitState.current.theta = startTheta + deltaX;
            let newCamY = startCamY + deltaY;
            newCamY = Math.max(-1, Math.min(8, newCamY));
            orbitState.current.y = newCamY;
        };

        const onMouseUp = () => { isDragging = false; };

        // TOUCH Handlers
        const onTouchStart = (e: TouchEvent) => {
            useStore.getState().setCameraGoal(null); // Break free on manual input
            if (e.touches.length === 1) {
                // Ignore if touching the joystick area (bottom-left)
                // Heuristic: Joystick is bottom-left, say < 200px from left and > windowHeight - 200px from top
                const touch = e.touches[0];
                const isJoystickArea = touch.clientX < 200 && touch.clientY > (window.innerHeight - 200);
                
                if (!isJoystickArea) {
                    isDragging = true;
                    startX = touch.clientX;
                    startY = touch.clientY;
                    startTheta = orbitState.current.theta;
                    startCamY = orbitState.current.y;
                }
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isDragging || e.touches.length !== 1) return;
            const touch = e.touches[0];
            const deltaX = (touch.clientX - startX) * -0.005; 
            const deltaY = (touch.clientY - startY) * 0.02;
            orbitState.current.theta = startTheta + deltaX;
            let newCamY = startCamY + deltaY;
            newCamY = Math.max(-1, Math.min(8, newCamY));
            orbitState.current.y = newCamY;
        };

        const onTouchEnd = () => { isDragging = false; };

        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        
        window.addEventListener('touchstart', onTouchStart);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);
        
        return () => {
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    useFrame(({ clock }) => {
        // Initialize smoothed state on first run
        if (!initialized.current) {
            smoothedState.current.target.copy(targetRef.current);
            smoothedState.current.radius = orbitState.current.radius;
            smoothedState.current.theta = orbitState.current.theta;
            smoothedState.current.camY = camera.position.y;
            initialized.current = true;
        }

        const { cameraGoal, gravity, minHeight } = useStore.getState();
        
        // --- PHYSICS & VERTICAL MOVEMENT ---
        // If a cinematic shot dictates a specific height, we suspend gravity and floor collisions (minHeight)
        const overrideY = cameraGoal !== null && cameraGoal.camY !== undefined;

        if (!overrideY) {
            if (gravity === 0) {
                // FLOAT MODE: Space pushes up, Shift pushes down
                const floatSpeed = 0.05;
                if (physicsInput.current.spaceHeld) {
                    orbitState.current.y += floatSpeed;
                }
                if (physicsInput.current.shiftHeld) {
                    orbitState.current.y = Math.max(minHeight, orbitState.current.y - floatSpeed);
                }
            } else {
                // GRAVITY MODE: Falling and Floor collision
                const gravityAccel = 0.008 * gravity;
                
                // Apply Gravity to Velocity
                inertiaState.current.yVelocity -= gravityAccel;
                orbitState.current.y += inertiaState.current.yVelocity;
    
                // Floor Collision
                if (orbitState.current.y <= minHeight) {
                    orbitState.current.y = minHeight;
                    inertiaState.current.yVelocity = 0;
                    physicsInput.current.isGrounded = true;
                } else {
                    physicsInput.current.isGrounded = false;
                }
            }
        }

        if (cameraGoal) {
            const goalLerp = 0.04; // Smooth cinematic speed
            const targetVec = new THREE.Vector3(cameraGoal.target.x, cameraGoal.target.y, cameraGoal.target.z);
            targetRef.current.lerp(targetVec, goalLerp);
            orbitState.current.radius = THREE.MathUtils.lerp(orbitState.current.radius, cameraGoal.radius, goalLerp);
            orbitState.current.theta = lerpTheta(orbitState.current.theta, cameraGoal.theta, goalLerp);
            
            if (cameraGoal.camY !== undefined) {
                orbitState.current.y = THREE.MathUtils.lerp(orbitState.current.y, cameraGoal.camY, goalLerp);
                // Reset vertical physics velocity to prevent gravity buildup during rigid lerp
                inertiaState.current.yVelocity = 0;
            }
        }

        // Apply Joystick Input
        const { joystickInput } = useStore.getState();
        if (Math.abs(joystickInput.x) > 0.1 || Math.abs(joystickInput.y) > 0.1) {
             const sensitivity = 0.1; // Per frame
             const theta = smoothedState.current.theta;
             
             // Forward/Back (Joystick Y)
             const camFwd = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta));
             // Left/Right (Joystick X)
             const camRight = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
             
             // Joystick Y is typically positive up, negative down.
             // We want positive Y to move forward (camFwd).
             if (joystickInput.y !== 0) {
                 targetRef.current.add(camFwd.multiplyScalar(joystickInput.y * sensitivity));
             }
             if (joystickInput.x !== 0) {
                 targetRef.current.add(camRight.multiplyScalar(joystickInput.x * sensitivity));
             }
        }

        // Apply TV Orbit Input
        const { tvOrbitInput } = useStore.getState();
        if (Math.abs(tvOrbitInput.dx) > 0.01 || Math.abs(tvOrbitInput.dy) > 0.01) {
             const rotSens = 0.05 * clampSensibility;
             const tiltSens = 0.1 * clampSensibility;

             // Rotate left/right
             orbitState.current.theta += tvOrbitInput.dx * rotSens;
             
             // Tilt up/down (ArrowUp gives dy=-1, we want ArrowUp to tilt camera UP so newCamY increases)
             let newCamY = orbitState.current.y + (tvOrbitInput.dy * -tiltSens);
             // Use minHeight instead of hardcoded -1
             const { minHeight } = useStore.getState();
             newCamY = Math.max(minHeight, Math.min(8, newCamY));
             orbitState.current.y = newCamY;
        }
        
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
                    
                    const sensitivity = 20 * clampSensibility; 
                    
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
                     const rotateSens = 5 * clampSensibility; 
                     const newTheta = rotateStartRef.current.angle + (deltaX * rotateSens);
                     
                     orbitState.current.theta = newTheta;
                     
                     // Update History (Keep last 5 frames / 100ms)
                     thetaHistory.current.push({ val: newTheta, time: time });
                     if (thetaHistory.current.length > 5) thetaHistory.current.shift();
    
                     // TILT (Camera Y)
                     const deltaY = leftHand.y - rotateStartRef.current.y;
                     const tiltSens = 10 * clampSensibility;
                     let newCamY = rotateStartRef.current.camY + (deltaY * tiltSens);
                     const { minHeight } = useStore.getState();
                     newCamY = Math.max(minHeight, Math.min(8, newCamY));
                     
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

        // --- DEBUG STATE EXPORT ---
        // Debounce or sample this to avoid total react suicide, but fiber `useStore.getState().set()` from inside useFrame is surprisingly okay if minimal hooks read it, though we should only really do this while debugging is active.
        // For request specifically, we'll write it constantly so the UI overlay can read it.
        useStore.getState().setDebugCameraState({
            position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            lookAt: { x: s.target.x, y: s.target.y, z: s.target.z }
        });
    });

    return null;
};
