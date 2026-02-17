import { Html } from '@react-three/drei';

interface VideoPanelProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    videoId: string;
}

export const VideoPanel = ({ position, rotation = [0, 0, 0], scale = [1, 1, 1], videoId }: VideoPanelProps) => {
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
                    width="800" 
                    height="450" 
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&loop=1&playlist=${videoId}`} 
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
