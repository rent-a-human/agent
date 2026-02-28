import { useStore } from '../../store/useStore';

export const TVDPad = () => {
    const { trackingMode, setTrackingMode, tvCursor, setTvCursor, tvControlMode, setTvControlMode, setJoystickInput, setTvOrbitInput } = useStore();

    const handleDirection = (dx: number, dy: number) => {
        if (trackingMode !== 'TV') setTrackingMode('TV');
        
        if (tvControlMode === 'CURSOR') {
            const SPEED = 0.05;
            let newX = Math.max(0, Math.min(1, tvCursor.x + dx * SPEED));
            let newY = Math.max(0, Math.min(1, tvCursor.y + dy * SPEED));
            setTvCursor({ x: newX, y: newY });
        } else if (tvControlMode === 'CAMERA') {
            // CAMERA mode (Simulate Joystick pulse)
            const J_SPEED = 0.5;
            setJoystickInput({ x: dx * J_SPEED, y: -dy * J_SPEED }); // Y is flipped for joystick (up=forward)
            setTimeout(() => setJoystickInput({ x: 0, y: 0 }), 100); // Auto-release
        } else if (tvControlMode === 'ROTATE') {
            const R_SPEED = 0.5;
            setTvOrbitInput({ dx: dx * R_SPEED, dy: dy * R_SPEED });
            setTimeout(() => setTvOrbitInput({ dx: 0, dy: 0 }), 100);
        }
    };

    const handleEnter = () => {
        if (trackingMode !== 'TV') setTrackingMode('TV');
        window.dispatchEvent(new CustomEvent('tv-enter-press'));
    };

    const toggleMode = () => {
        if (tvControlMode === 'CURSOR') setTvControlMode('CAMERA');
        else if (tvControlMode === 'CAMERA') setTvControlMode('ROTATE');
        else setTvControlMode('CURSOR');
    };

    const btnClass = "w-12 h-12 flex items-center justify-center bg-[rgba(0,0,0,0.5)] backdrop-blur-md border border-transparent rounded-xl text-[rgba(0,240,255,0.8)] transition-all duration-200 hover:bg-[#282828]/80 hover:border-white/20 hover:-translate-y-0.5 pointer-events-auto shadow-lg focus:outline-none";
    const centerBtnClass = "w-12 h-12 flex items-center justify-center bg-[rgba(0,0,0,0.5)] backdrop-blur-md border border-transparent rounded-xl text-white font-bold text-xs transition-all duration-200 hover:bg-[#282828]/80 hover:border-white/20 hover:-translate-y-0.5 pointer-events-auto shadow-lg focus:outline-none";

    return (
        <div 
            className="fixed z-[100] flex flex-col items-center gap-2 pointer-events-none opacity-50 hover:opacity-100 transition-opacity"
            style={{ right: '2rem', bottom: '2rem' }}
        >
            <button 
                className="mb-2 px-4 py-2 flex items-center justify-center bg-[rgba(0,240,255,0.2)] backdrop-blur-md border border-[rgba(0,240,255,0.8)] rounded-full text-[rgba(0,240,255,1)] font-mono text-sm font-bold tracking-widest transition-all duration-200 hover:bg-[rgba(0,240,255,0.4)] pointer-events-auto shadow-lg focus:outline-none"
                onClick={toggleMode}
            >
                MODE: {tvControlMode}
            </button>
            <button className={btnClass} onClick={() => handleDirection(0, -1)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <div className="flex gap-2">
                <button className={btnClass} onClick={() => handleDirection(-1, 0)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button className={centerBtnClass} onClick={handleEnter}>
                    OK
                </button>
                <button className={btnClass} onClick={() => handleDirection(1, 0)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
            </div>
            <button className={btnClass} onClick={() => handleDirection(0, 1)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
        </div>
    );
};
