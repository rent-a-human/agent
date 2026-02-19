import { useStore } from '../../store/useStore';
import { JoystickControl } from './JoystickControl';
import { FullScreenToggle } from './FullScreenToggle';

export const HudOverlay = () => {
  const { hands } = useStore();
  const hand = hands.left.present ? hands.left : hands.right;

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none p-8 flex flex-col justify-between">
      {/* Top Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-jarvis-cyan tracking-widest drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">
            JARVIS <span className="text-white text-sm align-top opacity-70">V7.0</span>
          </h1>
          <div className="flex gap-2 mt-2">
             <div className="h-1 w-12 bg-jarvis-cyan animate-pulse"></div>
             <div className="h-1 w-4 bg-jarvis-blue"></div>
          </div>
        </div>
        <div className="text-right font-mono text-xs text-jarvis-blue">
            <p>SYS.STATUS: <span className="text-green-400">ONLINE</span></p>
            <p>CPU: <span className="animate-pulse">ACTIVE</span></p>
            <p>NET: SECURE</p>
        </div>
      </div>

      {/* Center Reticle (only shows if hand is missing/searching) */}
      {!hand.present && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="w-64 h-64 border border-jarvis-cyan/30 rounded-full flex items-center justify-center animate-spin-slow">
                <div className="w-56 h-56 border border-jarvis-blue/20 rounded-full border-t-transparent border-l-transparent"></div>
            </div>
            <p className="mt-4 text-jarvis-cyan/50 text-sm tracking-[0.5em] animate-pulse">SEARCHING USER</p>
        </div>
      )}

      {/* Bottom Footer */}
      <div className="flex justify-between items-end font-mono text-xs text-xs text-white/50">
        <div className="flex gap-4">
             <div>
                <span className="block text-jarvis-cyan">L-HAND</span>
                {hands.left.present ? <span className="text-white">TRACKED</span> : <span className="text-red-500">OFFLINE</span>}
             </div>
             <div>
                <span className="block text-jarvis-cyan">R-HAND</span>
                {hands.right.present ? <span className="text-white">TRACKED</span> : <span className="text-red-500">OFFLINE</span>}
             </div>
        </div>
        <div>
            {hand.present && <p className="text-jarvis-cyan animate-pulse">GESTURE: {hand.gesture}</p>}
        </div>
      </div>

      {/* Joystick Control (Bottom Left, distinct from footer text) */}
      <JoystickControl />
      
      {/* Fullscreen Toggle (Top Right) */}
      <FullScreenToggle />
    </div>
  );
};
