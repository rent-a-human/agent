import { Html } from '@react-three/drei';
import { useState } from 'react';

interface WebPanelProps {
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
    url: string;
    title?: string;
}

export const WebPanel = ({ position, rotation = [0, 0, 0], scale = [1, 1, 1], url, title }: WebPanelProps) => {
const [isActive, setIsActive] = useState(false);

    return (
        <group position={position} rotation={rotation} scale={scale}>
            {/* Visual Frame */}
            <mesh position={[0, 0, -0.05]}>
                <planeGeometry args={[4.2, 2.4]} />
                <meshBasicMaterial color="#000000" opacity={0.8} transparent />
            </mesh>
            
            <mesh position={[0, 0, -0.04]}>
                <boxGeometry args={[4.3, 2.5, 0.05]} />
                <meshBasicMaterial color={isActive ? "#00ff00" : "#ffffff"} wireframe />
            </mesh>
            
            {title && (
                 <Html position={[0, 1.4, 0]} transform center>
                    <div className="flex gap-2">
                        <div className="text-white font-mono text-sm bg-black/80 px-2 py-1 border border-white/20">
                            {title}
                        </div>
                        {isActive && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsActive(false); }}
                                className="text-black font-bold text-xs bg-white px-2 py-1 hover:bg-gray-200"
                            >
                                EXIT INTERACTION
                            </button>
                        )}
                    </div>
                 </Html>
            )}

            <Html 
                transform 
                occlude 
                position={[0, 0, 0]}
                style={{
                    width: '800px',
                    height: '450px',
                    background: '#000',
                    border: isActive ? '2px solid #00ff00' : '1px solid #ffffff',
                    borderRadius: '4px'
                }}
            >
                <div 
                    onPointerDown={(e) => e.stopPropagation()} // Stop OrbitControls
                    style={{ width: '100%', height: '100%', position: 'relative' }}
                >
                    {!isActive && (
                        <div 
                            onClick={() => setIsActive(true)}
                            style={{
                                position: 'absolute',
                                top: 0, 
                                left: 0, 
                                width: '100%', 
                                height: '100%', 
                                zIndex: 10,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'rgba(0,0,0,0.5)'
                            }}
                        >
                            <span style={{ color: 'white', border: '1px solid white', padding: '10px 20px', background: 'black' }}>
                                CLICK TO INTERACT
                            </span>
                        </div>
                    )}
                    <iframe 
                        width="800" 
                        height="450" 
                        src={url} 
                        title={title || "Web Panel"}
                        frameBorder="0" 
                        style={{ 
                            width: '100%',
                            height: '100%',
                            pointerEvents: isActive ? 'auto' : 'none',
                            background: '#fff' 
                        }} 
                    />
                </div>
            </Html>
        </group>
    );
};
