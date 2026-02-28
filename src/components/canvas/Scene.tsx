import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { DashboardEnvironment } from './environments/DashboardEnvironment';
import { CityEnvironment } from './environments/CityEnvironment';
import { Cursor } from './Cursor';
import { InteractiveBox } from './InteractiveBox';
import { HologramPanel } from './HologramPanel';
import { VideoPanel } from './VideoPanel';
import { WebPanel } from './WebPanel';
import { TrackingToggle } from './TrackingToggle';
import { useHandRaycaster } from '../../hooks/useHandRaycaster';
import { CameraController } from './CameraController';
import { ChessAssistant } from './ChessAssistant';
import { AnimeAssistant } from './AnimeAssistant';
import { RealisticAssistant } from './RealisticAssistant';
import { SettingsHologram } from './SettingsHologram';

import { useStore } from '../../store/useStore';
import { useTVNavigation } from '../../hooks/useTVNavigation';

const InteractionManager = () => {
    useHandRaycaster();
    useTVNavigation();
    return null;
};

export const Scene = () => {
    const { 
        hdMode, 
        showWebPanel, 
        showVideoPanel, 
        showChessAssistant, 
        showAnimeAssistant, 
        showRealisticAssistant,
        scene
    } = useStore();

    return (
        <Canvas
            className="w-full h-full block"
            style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh' }}
            dpr={hdMode ? [1, 2] : 1}
            camera={{ position: [0, 0, 5], fov: 60 }}
            gl={{ alpha: true, antialias: false }} // Alpha true to see through to video? 
            // Design: Dark mode HUD. Maybe not see through to video.
            // User said: "Iron Man Jarvis HUD style... controlled... via user's webcam".
            // Typically this means you see the HUD *over* the world (or black background).
            // If "Immersive 3D dashboard", probably black background.
            // I'll keep it opaque black or dark blue.
        >
            <Suspense fallback={null}>
                {scene === 'dashboard' && <DashboardEnvironment />}
                {scene === 'city' && <CityEnvironment />}
                {scene === 'forest' && <DashboardEnvironment />} {/* Fallback to dashboard for now */}
                
                <InteractiveBox position={[-1.5, 0, 0]} label="System" />
                <InteractiveBox position={[1.5, 0, 0]} label="Data" color="#ff0055" />
                <InteractiveBox position={[0, 1.2, 0]} label="Security" color="#00ff00" />
                
                <TrackingToggle />

                <HologramPanel 
                    position={[-2.5, 1, -1]} 
                    rotation={[0, 0.5, 0]} 
                    title="SYSTEM DIAGNOSTICS" 
                    content="Core integrity: 98%. Thermal systems optimal. Neural interface synced."
                />
                
                {/* 3D Holographic Settings mapped right next to diagnostics */}
                <SettingsHologram
                    position={[-4.8, 1, -1]} 
                    rotation={[0, 0.4, 0]} 
                />
                
                {/* Heavy 3D Assets & Video conditionally rendered */}
                {showWebPanel && (
                    <WebPanel 
                        position={[5.5, 1, -1]} 
                        rotation={[0, -0.5, 0]} 
                        scale={[0.35, 0.35, 0.35]}
                        url="https://rent-a-human.github.io/chess/"
                        title="TACTICAL STRATEGY"
                    />
                )}
                {showChessAssistant && (
                    <ChessAssistant 
                        position={[-10, 0, 2]} 
                        rotation={[0, Math.PI / 4, 0]} 
                    />
                )}
                {showAnimeAssistant && (
                    <AnimeAssistant 
                        scale={0.5}
                        position={[10, 0, 2]} 
                        rotation={[0, -Math.PI / 4, 0]} 
                    />
                )}
                {showRealisticAssistant && (
                    <RealisticAssistant 
                        scale={1.5} 
                        position={[-5, 0, 2]} 
                        rotation={[0, 0, 0]} 
                        modelUrl="/agent/models/eve.glb"
                        jiggleIntensity={1.8}
                        debugBones={true}
                    />
                )}
                {showVideoPanel && (
                    <VideoPanel 
                        position={[0, 4, -2]} 
                        rotation={[0, 0, 0]} 
                        scale={[0.35, 0.35, 0.35]}
                        videoId="10mQwMDt1tw"
                    />
                )}

                <Cursor />
                

                <InteractionManager />
                <CameraController />

                {hdMode && (
                    <EffectComposer>
                        <Bloom 
                            luminanceThreshold={0.2} 
                            luminanceSmoothing={0.9} 
                            intensity={2.0} 
                        />
                    </EffectComposer>
                )}
            </Suspense>
        </Canvas>
    );
};
