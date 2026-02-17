import { useEffect, useState } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { useStore } from '../store/useStore';

export const useHandTracking = (videoElement: HTMLVideoElement | null) => {
    const setHand = useStore((state) => state.setHand);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!videoElement) return;

        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            },
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        hands.onResults((results: Results) => {
            const { multiHandLandmarks, multiHandedness } = results;

            // Reset hands if not detected
            // Actually, we should selectively update.
            // If a hand is missing in results, we should set present: false.
            // But multiHandLandmarks loop only processes detected hands.
            // So first, default both to not present?
            // Or just map what we find.

            let foundLeft = false;
            let foundRight = false;

            if (multiHandLandmarks && multiHandedness) {
                multiHandLandmarks.forEach((landmarks, index) => {
                    const classification = multiHandedness[index];
                    const label = classification.label; // 'Left' or 'Right' (Mirrored)

                    // MediaPipe 'Left' hand is usually the one on the user's left in the image (which is user's right hand in mirror mode)
                    // But 'Left' label generally means left hand model detected.
                    // Let's assume standard labelling: 'Left' is Left Hand.
                    const indexTip = landmarks[8];
                    const thumbTip = landmarks[4];
                    const wrist = landmarks[0];
                    const middleMcp = landmarks[9];

                    const distance = Math.hypot(
                        indexTip.x - thumbTip.x,
                        indexTip.y - thumbTip.y
                    );
                    const isPinching = distance < 0.05;

                    // Calculate scale (distance between wrist and middle finger knuckle)
                    // This is strictly 2D distance on screen, which is a good proxy for Z-depth
                    const scale = Math.hypot(
                        wrist.x - middleMcp.x,
                        wrist.y - middleMcp.y
                    );

                    const handData = {
                        present: true,
                        x: indexTip.x,
                        y: indexTip.y,
                        z: indexTip.z,
                        scale: scale,
                        gesture: (isPinching ? 'PINCH' : 'IDLE') as 'PINCH' | 'IDLE',
                        landmarks: landmarks,
                    };

                    if (label === 'Left') {
                        setHand('right', handData); // Mirror mode: Left label = User's Right Hand
                        foundRight = true;
                    } else {
                        setHand('left', handData); // Mirror mode: Right label = User's Left Hand
                        foundLeft = true;
                    }
                });
            }

            if (!foundLeft) setHand('left', { present: false, landmarks: [] });
            if (!foundRight) setHand('right', { present: false, landmarks: [] });
        });

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 1280,
            height: 720,
        });

        camera.start().then(() => {
            setIsReady(true);
        });

        return () => {
            // Cleanup not strictly necessary for single page app but good practice
            // camera.stop(); 
            // hands.close();
        };

    }, [videoElement, setHand]);

    return { isReady };
};
