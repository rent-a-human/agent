import { useEffect, useState } from 'react';
import { FaceMesh, type Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { useStore } from '../store/useStore';

export const useFaceTracking = (videoElement: HTMLVideoElement | null) => {
    const setFace = useStore((state) => state.setFace);
    const trackingMode = useStore((state) => state.trackingMode);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        if (!videoElement || trackingMode !== 'EYE') {
            setIsReady(false);
            return;
        }

        const faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            },
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true, // For iris tracking
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: Results) => {
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
                const landmarks = results.multiFaceLandmarks[0];
                const nose = landmarks[1];
                const leftEye = landmarks[33];
                const rightEye = landmarks[263];

                const eyeMidX = (leftEye.x + rightEye.x) / 2;
                const yaw = (nose.x - eyeMidX) * 5;

                const eyeMidY = (leftEye.y + rightEye.y) / 2;
                const pitch = (nose.y - eyeMidY) * 5;

                setFace({
                    present: true,
                    x: nose.x,
                    y: nose.y,
                    z: nose.z,
                    rotationY: yaw,
                    rotationX: pitch
                });
            } else {
                setFace({ present: false });
            }
        });

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                if (useStore.getState().trackingMode === 'EYE') {
                    await faceMesh.send({ image: videoElement });
                }
            },
            width: 1280,
            height: 720,
        });

        camera.start().then(() => {
            setIsReady(true);
        });

        return () => {
            camera.stop();
            faceMesh.close();
            setIsReady(false);
        };

    }, [videoElement, setFace, trackingMode]);

    return { isReady };
};
