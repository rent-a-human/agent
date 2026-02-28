import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const useTVNavigation = () => {
    const { trackingMode, setTrackingMode, tvCursor, setTvCursor, tvControlMode, setJoystickInput, setTvOrbitInput } = useStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tvNumKeys = ['2', '4', '6', '8', '5'];

            // Auto-fallback to TV mode if numpad TV keys are pressed
            if (tvNumKeys.includes(e.key) && trackingMode !== 'TV') {
                setTrackingMode('TV');
            }

            // If not in TV mode and didn't just activate it -> ignore
            if (trackingMode !== 'TV' && !tvNumKeys.includes(e.key)) return;

            let dx = 0;
            let dy = 0;

            if (e.key === 'ArrowUp' || e.key === '2') dy = -1;
            if (e.key === 'ArrowDown' || e.key === '8') dy = 1;
            if (e.key === 'ArrowLeft' || e.key === '4') dx = -1;
            if (e.key === 'ArrowRight' || e.key === '6') dx = 1;

            if (dx !== 0 || dy !== 0) {
                if (tvControlMode === 'CURSOR') {
                    const SPEED = 0.15; // 15% of screen width per press
                    let newX = Math.max(0, Math.min(1, tvCursor.x + dx * SPEED));
                    let newY = Math.max(0, Math.min(1, tvCursor.y + dy * SPEED));

                    if (newX !== tvCursor.x || newY !== tvCursor.y) {
                        setTvCursor({ x: newX, y: newY });
                    }
                } else if (tvControlMode === 'CAMERA') {
                    // CAMERA MODE: Pulse the joystick
                    const J_SPEED = 2.0;
                    setJoystickInput({ x: dx * J_SPEED, y: -dy * J_SPEED }); // y inverted for joystick (up=forward)
                    setTimeout(() => setJoystickInput({ x: 0, y: 0 }), 100);
                } else if (tvControlMode === 'ROTATE') {
                    // ROTATE MODE: Pulse orbit state
                    const R_SPEED = 2.0;
                    setTvOrbitInput({ dx: dx * R_SPEED, dy: dy * R_SPEED });
                    setTimeout(() => setTvOrbitInput({ dx: 0, dy: 0 }), 100);
                }
                e.preventDefault(); // Prevent default scrolling
            }

            if (e.key === 'Enter' || e.key === '5') {
                window.dispatchEvent(new CustomEvent('tv-enter-press'));
                e.preventDefault();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);

    }, [trackingMode, setTrackingMode, tvCursor, setTvCursor, tvControlMode, setJoystickInput, setTvOrbitInput]);
};
