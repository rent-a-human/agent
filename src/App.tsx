import { useState } from 'react';
import { VideoFeed } from './components/webcam/VideoFeed';
import { useHandTracking } from './hooks/useHandTracking';
import { useFaceTracking } from './hooks/useFaceTracking';
import { HandVisualizer } from './components/webcam/HandVisualizer';
import { HudOverlay } from './components/dom/HudOverlay';
import { Scene } from './components/canvas/Scene';

function App() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  useHandTracking(videoElement);
  useFaceTracking(videoElement);

  return (
    <div className="w-screen h-screen bg-jarvis-dark text-white overflow-hidden relative">
      {/* Webcam Feed (Hidden but active) */}
      <VideoFeed onVideoReady={setVideoElement} />

      {/* Debug Visualizer (Optional: Toggle with key) */}
      <HandVisualizer />

      {/* 3D Scene Container */}
      <div className="absolute inset-0 z-10">
         <Scene />
      </div>

      {/* HUD UI Layer */}
      <HudOverlay />
    </div>
  );
}

export default App;
