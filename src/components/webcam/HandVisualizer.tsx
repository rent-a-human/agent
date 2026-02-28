import { useStore } from '../../store/useStore';
import { isTVBrowser } from '../../utils/device';

export const HandVisualizer = () => {
  const leftHand = useStore((state) => state.hands.left);
  const rightHand = useStore((state) => state.hands.right);

  const drawHand = (hand: typeof leftHand, color: string) => {
    if (!hand.present || !hand.landmarks.length) return null;

    return (
      <>
        {hand.landmarks.map((point, i) => (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: `${(1 - point.x) * 100}%`, // Mirroring X
              top: `${point.y * 100}%`,
              width: i === 4 || i === 8 ? '8px' : '4px', // Bigger thumb/index
              height: i === 4 || i === 8 ? '8px' : '4px',
              backgroundColor: hand.gesture === 'PINCH' ? '#ffff00' : color,
              transform: 'translate(-50%, -50%)',
              zIndex: 50, // On top of everything
            }}
          />
        ))}
      </>
    );
  };

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-50">
      {drawHand(leftHand, '#00f0ff')}
      {drawHand(rightHand, '#ff0055')}
      
      {/* Debug Info */}
      <div 
          className="fixed bg-black/50 text-white p-4 font-mono text-xs rounded-br-lg"
          style={{ top: '1rem', left: '1rem' }}
      >
        <div>Left: {leftHand.present ? leftHand.gesture : 'LOST'}</div>
        <div>Right: {rightHand.present ? rightHand.gesture : 'LOST'}</div>
        <div className="mt-1 pt-1 border-t border-white/20 text-jarvis-cyan">
            Device: {isTVBrowser() ? 'Smart TV' : 'Web Browser'}
        </div>
        <div className="text-white/50">Build: v3.10</div>
      </div>
    </div>
  );
};
