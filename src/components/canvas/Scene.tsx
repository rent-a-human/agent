import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Cursor } from './Cursor';
import { InteractiveBox } from './InteractiveBox';
import { HologramPanel } from './HologramPanel';
import { VideoPanel } from './VideoPanel';
import { WebPanel } from './WebPanel';
import { useHandRaycaster } from '../../hooks/useHandRaycaster';
import { CameraController } from './CameraController';

const InteractionManager = () => {
    useHandRaycaster();
    return null;
};

export const Scene = () => {
    return (
        <Canvas
            className="w-full h-full block"
            style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }}
            dpr={[1, 2]}
            camera={{ position: [0, 0, 5], fov: 60 }}
            gl={{ alpha: true, antialias: false }} // Alpha true to see through to video? 
            // Design: Dark mode HUD. Maybe not see through to video.
            // User said: "Iron Man Jarvis HUD style... controlled... via user's webcam".
            // Typically this means you see the HUD *over* the world (or black background).
            // If "Immersive 3D dashboard", probably black background.
            // I'll keep it opaque black or dark blue.
        >
            <Suspense fallback={null}>
                <color attach="background" args={['#050a14']} />
                
                {/* Ambient & Fog */}
                <fog attach="fog" args={['#050a14', 5, 15]} />
                <ambientLight intensity={0.5} />
                
                <InteractiveBox position={[-1.5, 0, 0]} label="System" />
                <InteractiveBox position={[1.5, 0, 0]} label="Data" color="#ff0055" />
                <InteractiveBox position={[0, 1.2, 0]} label="Security" color="#00ff00" />

                <HologramPanel 
                    position={[-2.5, 1, -1]} 
                    rotation={[0, 0.5, 0]} 
                    title="SYSTEM DIAGNOSTICS" 
                    content="Core integrity: 98%. Thermal systems optimal. Neural interface synced."
                />
                
                <WebPanel 
                    position={[3.5, 1, -1]} 
                    rotation={[0, -0.5, 0]} 
                    scale={[0.35, 0.35, 0.35]}
                    url="http://localhost:5174/chess/"
                    title="TACTICAL STRATEGY"
                />

                {/* Center Video Panel */}
                <VideoPanel 
                    position={[0, 4, -2]} 
                    rotation={[0, 0, 0]} 
                    scale={[0.35, 0.35, 0.35]}
                    videoId="10mQwMDt1tw"
                />

                <Grid 
                    position={[0, -1.5, 0]} 
                    args={[20, 20]} 
                    cellSize={1} 
                    cellThickness={1} 
                    cellColor="#00f0ff" 
                    sectionSize={5} 
                    sectionThickness={1.5} 
                    sectionColor="#0077ff" 
                    fadeDistance={15} 
                    fadeStrength={1} 
                    followCamera={false} 
                    infiniteGrid={true}
                />

                <Cursor />
                

                <InteractionManager />
                <CameraController />

                <EffectComposer>
                    <Bloom 
                        luminanceThreshold={0.2} 
                        luminanceSmoothing={0.9} 
                        intensity={2.0} 
                    />
                </EffectComposer>
            </Suspense>
        </Canvas>
    );
};
