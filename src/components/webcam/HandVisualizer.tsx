import { useStore } from '../../store/useStore';

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
      <div className="absolute top-4 right-4 bg-black/50 text-white p-4 font-mono text-xs">
        <div>Left: {leftHand.present ? leftHand.gesture : 'LOST'}</div>
        <div>Right: {rightHand.present ? rightHand.gesture : 'LOST'}</div>
        <div>FPS: --</div>
      </div>
    </div>
  );
};
