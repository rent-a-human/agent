import { useEffect, useRef, forwardRef } from 'react';

interface VideoFeedProps {
  onVideoReady?: (video: HTMLVideoElement) => void;
}

export const VideoFeed = forwardRef<HTMLVideoElement, VideoFeedProps>(({ onVideoReady }, ref) => {
  const internalRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = (ref as React.MutableRefObject<HTMLVideoElement>)?.current || internalRef.current;
    if (!video) return;

    const startVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user',
          },
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          onVideoReady?.(video);
        };
      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
    };

    startVideo();
  }, [onVideoReady, ref]);

  return (
    <video
      ref={ref || internalRef}
      className="fixed top-0 left-0 w-full h-full object-cover -z-10 opacity-0 pointer-events-none"
      style={{ transform: 'scaleX(-1)' }}
      playsInline
      muted
      autoPlay
    />
  );
});

VideoFeed.displayName = 'VideoFeed';
