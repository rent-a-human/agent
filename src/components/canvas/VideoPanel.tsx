import { Html } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { useEffect, useRef } from 'react';

interface VideoPanelProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    videoId: string;
}

export const VideoPanel = ({ position, rotation = [0, 0, 0], scale = [1, 1, 1], videoId }: VideoPanelProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const selectedObject = useStore((state) => state.selectedObject);
    const isPlaying = selectedObject === 'Security';

    useEffect(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            const command = isPlaying ? 'playVideo' : 'pauseVideo';
            iframeRef.current.contentWindow.postMessage(JSON.stringify({
                event: 'command',
                func: command,
                args: []
            }), '*');
        }
    }, [isPlaying]);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Visual Frame */}
            <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[4.2, 2.4]} />
                <meshBasicMaterial color="#000000" />
            </mesh>
            
            <mesh position={[0, 0, -0.04]}>
                <boxGeometry args={[4.3, 2.5, 0.05]} />
                <meshBasicMaterial color="#00f0ff" wireframe />
            </mesh>

            <Html 
                transform 
                occlude 
                position={[0, 0, 0]}
                style={{
                    width: '800px',
                    height: '450px',
                    background: '#000',
                    border: '2px solid #00f0ff',
                    borderRadius: '10px'
                }}
            >
                <iframe 
                    ref={iframeRef}
                    width="800" 
                    height="450" 
                    src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&mute=0&loop=1&playlist=${videoId}`} 
                    title="Jarvis Video" 
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    style={{ pointerEvents: 'none' }} 
                />
            </Html>
        </group>
    );
};
