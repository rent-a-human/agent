import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store/useStore';

export const useHandRaycaster = () => {
    const raycaster = useThree((state) => state.raycaster);
    const camera = useThree((state) => state.camera);

    useFrame(() => {
        const { hands, face, trackingMode, tvCursor } = useStore.getState();

        // Convert hand 0..1 to -1..1 for raycaster
        // MediaPipe: 0(left)..1(right), 0(top)..1(bottom)
        // Raycaster: -1(left)..1(right), 1(top)..-1(bottom)

        // Mirror logic:
        // Input X=0 (screen left/user right) -> Raycaster X=-1
        // Input X=1 (screen right/user left) -> Raycaster X=1
        // BUT we mirrored the Cursor visual.
        // If I move my hand to my right, it appears on screen right (x > 0.5).
        // That corresponds to Raycaster X > 0.
        // So: (x * 2) - 1.

        // Y:
        // Input Y=0 (top) -> Raycaster Y=1
        // Input Y=1 (bottom) -> Raycaster Y=-1
        // So: -((y * 2) - 1) = 1 - 2y.

        // Wait, earlier we flipped Cursor X?
        // Cursor: -(hand.x - 0.5) * width
        // This suggests hand.x is decreasing when moving right?
        // Let's stick to the Cursor logic.
        // If Cursor uses -(hand.x - 0.5), it means we inverted X.
        // So we should invert NDC X too.

        if (trackingMode === 'HAND') {
            const hand = hands.left.present ? hands.left : hands.right;
            if (hand.present) {
                const x = -((hand.x * 2) - 1);
                const y = -((hand.y * 2) - 1);
                raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            }
        } else if (trackingMode === 'EYE') {
            if (face.present) {
                // Map the face orientation/position to the screen
                const x = -face.rotationY * 3;
                const y = face.rotationX * 3 - 0.5;
                raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
            }
        } else if (trackingMode === 'TV') {
            // TV cursor is stored normalized 0 to 1 mapping from top-left
            const x = (tvCursor.x * 2) - 1;
            const y = -(tvCursor.y * 2) + 1; // Invert Y for 3D cartesian
            raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
        }

        // Raycasting is handled by R3F events on objects usually.
        // But we need to manually trigger them if we are not using the mouse.
        // R3F's raycaster usually follows the mouse.
        // We can override the pointer state?

    });
};
