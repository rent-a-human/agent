import { useEffect, useState } from 'react';
import { Hands, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { useStore } from '../store/useStore';

export const useHandTracking = (videoElement: HTMLVideoElement | null) => {
    const setHand = useStore((state) => state.setHand);
    const trackingMode = useStore((state) => state.trackingMode);
    const hdMode = useStore((state) => state.hdMode);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!videoElement || trackingMode !== 'HAND') {
            setIsReady(false);
            return;
        }

        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            },
        });

        hands.setOptions({
            maxNumHands: 2,
            modelComplexity: hdMode ? 1 : 0, // modelComplexity 0 for faster performance, 1 for better accuracy
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        hands.onResults((results: Results) => {
            const { multiHandLandmarks, multiHandedness } = results;

            let foundLeft = false;
            let foundRight = false;

            if (multiHandLandmarks && multiHandedness) {
                multiHandLandmarks.forEach((landmarks, index) => {
                    const classification = multiHandedness[index];
                    const label = classification.label; // 'Left' or 'Right' (Mirrored)

                    // MediaPipe 'Left' hand is usually the one on the user's left in the image (which is user's right hand in mirror mode)
                    const indexTip = landmarks[8];
                    const thumbTip = landmarks[4];
                    const wrist = landmarks[0];
                    const middleMcp = landmarks[9];

                    const distance = Math.hypot(
                        indexTip.x - thumbTip.x,
                        indexTip.y - thumbTip.y
                    );
                    const isPinching = distance < 0.015;  // Reduced from 0.05 to require closer pinch

                    // Calculate scale (distance between wrist and middle finger knuckle)
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
                // Double check mode in frame loop to be safe (though useEffect cleanup handles it)
                if (useStore.getState().trackingMode === 'HAND') {
                    await hands.send({ image: videoElement });
                }
            },
            width: hdMode ? 1280 : 640,
            height: hdMode ? 720 : 480,
        });

        camera.start().then(() => {
            setIsReady(true);
        });

        return () => {
            camera.stop();
            hands.close();
            setIsReady(false);
        };

    }, [videoElement, setHand, trackingMode, hdMode]);

    return { isReady };
};
