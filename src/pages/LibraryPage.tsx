import { Suspense, useEffect, useState, useCallback } from 'react';
import { getApiUrl } from '../config';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, Center, ContactShadows, Float } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Settings, Download, ChevronRight, ChevronLeft, Hexagon, Cog, Box, Loader2, AlertCircle, Activity, ShoppingCart, Trophy, Milk, Palette, Sun, Zap } from 'lucide-react';
import type { MaterialType } from '../components/canvas/CADProceduralModel';

interface LibraryPageProps {
  type: string | null;
}

const MATERIAL_PRESETS: Record<MaterialType, any> = {
  clay: { color: '#8b4513', roughness: 0.8, metalness: 0 },
  metal: { color: '#e2e8f0', roughness: 0.2, metalness: 1 },
  coal: { color: '#1a1a1a', roughness: 0.9, metalness: 0 },
  glass: { color: '#a5f3fc', transmission: 1, thickness: 1.5, roughness: 0.05, opacity: 0.4, transparent: true, envMapIntensity: 1 }
};

const ENVIRONMENT_PRESETS = {
  studio: 'studio',
  outdoor: 'park',
  factory: 'warehouse',
  forest: 'forest'
} as const;

type EnvironmentType = keyof typeof ENVIRONMENT_PRESETS;

const Model = ({ url, material, glassColor, glassTranslucency, glassGlow }: { 
  url: string, 
  material: MaterialType, 
  glassColor?: string, 
  glassTranslucency?: number,
  glassGlow?: number
}) => {
  const geom = useLoader(STLLoader, url);
  let props = { ...(MATERIAL_PRESETS[material] || MATERIAL_PRESETS.metal) };

  if (material === 'glass') {
    props.color = glassColor || props.color;
    props.transmission = glassTranslucency ?? props.transmission;
    props.emissive = glassColor || props.color;
    props.emissiveIntensity = glassGlow ?? 0;
  }

  return (
    <mesh geometry={geom} castShadow receiveShadow>
      <meshPhysicalMaterial {...props} />
    </mesh>
  );
};

const defaultParams: Record<string, any> = {
  bolt: {
    headWidth: 19, headHeight: 8, shaftDiameter: 12, shaftLength: 50,
    threadLength: 35, threadPitch: 1.75, headFillet: 1.2, tipChamfer: 1.5, tipDiameter: 6.0
  },
  nut: {
    width: 19, height: 10, holeDiameter: 12, threadPitch: 1.75, counterSink: 1.0
  },
  gear: {
    teeth: 20, module: 2, thickness: 10, holeDiameter: 8, helixAngle: 0, pressureAngle: 20
  },
  tube: {
    innerDiameter: 15, outerDiameter: 20, length: 50
  },
  tube2d: {
    profilePoints: 5, profileInnerRadius: 5, profileOuterRadius: 10,
    pathRadius: 20, pathHeight: 100, pathTurns: 2
  },
  'shopping-cart': {
    basketLength: 60, basketWidth: 40, basketHeight: 30, wheelDiameter: 10,
    hasScooter: true, hasArms: true, scooterLength: 100, armReach: 40, handlebarWidth: 50,
    basketDensity: 50, scooterWidth: 35, wheelArmReach: 30, suspensionHeight: 15, suspensionOffset: -20,
    basketFloorHeight: 20
  },
  'go-cart': {
    chassisLength: 80, chassisWidth: 50, wheelDiameter: 15, seatHeight: 25
  },
  bottle: {
    bottomRadius: 20, bodyHeight: 60, shoulderHeight: 15, neckRadius: 8, neckHeight: 20, wallThickness: 2
  },
  scooter: {
    scooterLength: 100, handlebarWidth: 50
  }
};

export const LibraryPage = ({ type }: LibraryPageProps) => {
  const [params, setParams] = useState<Record<string, any>>(() => {
    const defaults = defaultParams[type as string] || {};
    const saved = localStorage.getItem(`cad_params_${type}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      } catch (e) {
        return defaults;
      }
    }
    return defaults;
  });
  const [material, setMaterial] = useState<MaterialType>(() => (localStorage.getItem('cad_material') as MaterialType) || 'metal');
  const [env, setEnv] = useState<EnvironmentType>(() => (localStorage.getItem('cad_env') as EnvironmentType) || 'studio');
  const [lightIntensity, setLightIntensity] = useState(() => parseFloat(localStorage.getItem('cad_lightIntensity') || '1.0'));
  const [lightAngle, setLightAngle] = useState(() => parseFloat(localStorage.getItem('cad_lightAngle') || '0'));
  const [bgDarkness, setBgDarkness] = useState(() => parseFloat(localStorage.getItem('cad_bgDarkness') || '0.05'));
  const [glassColor, setGlassColor] = useState(() => localStorage.getItem('cad_glassColor') || '#a5f3fc');
  const [glassTranslucency, setGlassTranslucency] = useState(() => parseFloat(localStorage.getItem('cad_glassTranslucency') || '1.0'));
  const [glassGlow, setGlassGlow] = useState(() => parseFloat(localStorage.getItem('cad_glassGlow') || '0'));
  const [resolution, setResolution] = useState(() => parseInt(localStorage.getItem('cad_resolution') || '64'));
  const [isAnimated, setIsAnimated] = useState(() => localStorage.getItem('cad_isAnimated') !== 'false');

  const [showFloor, setShowFloor] = useState(() => localStorage.getItem('cad_showFloor') !== 'false');
  const [floorColor, setFloorColor] = useState(() => localStorage.getItem('cad_floorColor') || '#1a1a1a');
  const [floorDistance, setFloorDistance] = useState(() => parseFloat(localStorage.getItem('cad_floorDistance') || '30'));
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lastPartId, setLastPartId] = useState<string | null>(null);

  const generateModel = useCallback(async (currentParams: any, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      let actualParams = { ...currentParams };
      
      if (type === 'tube2d') {
        // Generate Star Profile
        const pts = [];
        const n = currentParams.profilePoints || 5;
        const ir = currentParams.profileInnerRadius || 5;
        const or = currentParams.profileOuterRadius || 10;
        for (let i = 0; i < n * 2; i++) {
          const r = i % 2 === 0 ? or : ir;
          const ang = (Math.PI * i) / n;
          pts.push([r * Math.cos(ang), r * Math.sin(ang)]);
        }

        // Generate Spiral Path
        const pathPts = [];
        const pr = currentParams.pathRadius || 20;
        const ph = currentParams.pathHeight || 100;
        const pt = currentParams.pathTurns || 2;
        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const ang = (i / steps) * Math.PI * 2 * pt;
          const z = (i / steps) * ph;
          pathPts.push([pr * Math.cos(ang), pr * Math.sin(ang), z]);
        }

        actualParams = { profile: pts, path: pathPts };
      }

      const res = await fetch(getApiUrl('/library/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type, 
          parameters: { 
            ...actualParams, 
            resolution,
            // Force boolean types just in case they arrived as numbers from legacy state
            hasScooter: !!actualParams.hasScooter,
            hasArms: !!actualParams.hasArms
          } 
        }),
        signal
      });
      const data = await res.json();
      if (data.success) {
        const fullStlUrl = getApiUrl(`/models/${data.id}.stl?t=${Date.now()}`);
        setModelUrl(fullStlUrl);
        setLastPartId(data.id);
      } else {
        setError(data.error || 'Generation Failed');
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError('Connection to geometry kernel lost');
    } finally {
      setLoading(false);
    }
  }, [type, resolution]);

  // Persistence helpers
  useEffect(() => { localStorage.setItem('cad_material', material); }, [material]);
  useEffect(() => { localStorage.setItem('cad_env', env); }, [env]);
  useEffect(() => { localStorage.setItem('cad_lightIntensity', lightIntensity.toString()); }, [lightIntensity]);
  useEffect(() => { localStorage.setItem('cad_lightAngle', lightAngle.toString()); }, [lightAngle]);
  useEffect(() => { localStorage.setItem('cad_bgDarkness', bgDarkness.toString()); }, [bgDarkness]);
  useEffect(() => { localStorage.setItem('cad_glassColor', glassColor); }, [glassColor]);
  useEffect(() => { localStorage.setItem('cad_glassTranslucency', glassTranslucency.toString()); }, [glassTranslucency]);
  useEffect(() => { localStorage.setItem('cad_glassGlow', glassGlow.toString()); }, [glassGlow]);
  useEffect(() => { localStorage.setItem('cad_resolution', resolution.toString()); }, [resolution]);
  useEffect(() => { localStorage.setItem('cad_isAnimated', isAnimated.toString()); }, [isAnimated]);
  useEffect(() => { localStorage.setItem('cad_showFloor', showFloor.toString()); }, [showFloor]);
  useEffect(() => { localStorage.setItem('cad_floorColor', floorColor); }, [floorColor]);
  useEffect(() => { localStorage.setItem('cad_floorDistance', floorDistance.toString()); }, [floorDistance]);

  useEffect(() => {
    if (!type) return;
    const controller = new AbortController();
    if (!modelUrl && !loading) { generateModel(params, controller.signal); return; }
    const timeout = setTimeout(() => { generateModel(params, controller.signal); }, 500);
    return () => { timeout && clearTimeout(timeout); controller.abort(); };
  }, [params, type, generateModel, resolution]);

  const handleParamChange = (key: string, value: number | boolean) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    localStorage.setItem(`cad_params_${type}`, JSON.stringify(newParams));
  };

  const resetParams = () => {
    const defaults = defaultParams[type as string] || {};
    setParams(defaults);
    localStorage.setItem(`cad_params_${type}`, JSON.stringify(defaults));
    
    // Reset all other states
    setMaterial('metal');
    setEnv('studio');
    setLightIntensity(1.0);
    setLightAngle(0);
    setBgDarkness(0.05);
    setGlassColor('#a5f3fc');
    setGlassTranslucency(1.0);
    setGlassGlow(0);
    setResolution(64);
    setIsAnimated(true);
    setShowFloor(true);
    setFloorColor('#1a1a1a');
    setFloorDistance(30);

    // Force model reload
    generateModel(defaults);
  };

  const getIcon = () => {
    switch (type) {
      case 'bolt': return <Hexagon className="w-6 h-6 text-cyan-400" />;
      case 'nut': return <Box className="w-6 h-6 text-cyan-400" />;
      case 'gear': return <Cog className="w-6 h-6 text-cyan-400 animate-spin-slow" />;
      case 'tube': return <Hexagon className="w-6 h-6 text-cyan-400 rotate-90" />;
      case 'tube2d': return <Activity className="w-6 h-6 text-cyan-400" />;
      case 'shopping-cart': return <ShoppingCart className="w-6 h-6 text-cyan-400" />;
      case 'go-cart': return <Trophy className="w-6 h-6 text-cyan-400" />;
      case 'bottle': return <Milk className="w-6 h-6 text-cyan-400" />;
      default: return <Settings className="w-6 h-6 text-cyan-400" />;
    }
  };

  return (
    <div className="w-screen h-screen bg-[#050505] text-white flex overflow-hidden font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[#001020] via-black to-[#000510] -z-10" />
      
      {/* Main Preview Area - Right Padding when sidebar is open */}
      <div 
        className="flex-1 relative transition-all duration-500"
        style={{ marginRight: sidebarOpen ? '320px' : '0' }}
      >
        {/* Header Overlay */}
        <div className="absolute top-6 left-6 z-40 flex items-center gap-4 bg-black/40 p-4 border border-cyan-500/20 rounded-xl backdrop-blur-xl">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            {getIcon()}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
              Designer: {type}
            </h1>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="w-full h-full cursor-move">
          <Canvas shadows camera={{ position: [50, 50, 50], fov: 45 }}>
            <color attach="background" args={[`rgb(${Math.round(bgDarkness * 255)}, ${Math.round(bgDarkness * 255)}, ${Math.round(bgDarkness * 255)})`]} />
            <ambientLight intensity={0.5 * lightIntensity} />
            <spotLight 
              position={[50, 100, 50]} 
              angle={0.15} 
              penumbra={1} 
              intensity={1.5 * lightIntensity} 
              castShadow 
            />
            <directionalLight
              position={[
                100 * Math.sin(lightAngle * Math.PI / 180),
                100,
                100 * Math.cos(lightAngle * Math.PI / 180)
              ]}
              intensity={4.5 * lightIntensity}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-left={-150}
              shadow-camera-right={150}
              shadow-camera-top={150}
              shadow-camera-bottom={150}
              shadow-camera-far={500}
            />
            <pointLight position={[0, -20, 0]} intensity={2 * lightIntensity} color="#0066ff" />
            
            <Suspense fallback={null}>
              <Environment preset={ENVIRONMENT_PRESETS[env]} />
              {modelUrl && (
                <Center>
                  {isAnimated ? (
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                      <Model 
                        url={modelUrl} 
                        material={material} 
                        glassColor={glassColor}
                        glassTranslucency={glassTranslucency}
                        glassGlow={glassGlow}
                      />
                    </Float>
                  ) : (
                    <Model 
                      url={modelUrl} 
                      material={material} 
                      glassColor={glassColor}
                      glassTranslucency={glassTranslucency}
                      glassGlow={glassGlow}
                    />
                  )}
                </Center>
              )}

              {/* Floor */}
              {showFloor && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -floorDistance, 0]} receiveShadow>
                  <planeGeometry args={[1000, 1000]} />
                  <meshStandardMaterial 
                    color={floorColor} 
                    roughness={0.8} 
                    metalness={0.2} 
                  />
                </mesh>
              )}

              <ContactShadows 
                position={[0, -floorDistance + 0.1, 0]} 
                opacity={0.4} 
                scale={100} 
                blur={2.5} 
                far={10} 
              />
            </Suspense>
            <OrbitControls makeDefault />
          </Canvas>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4 bg-black/80 p-8 rounded-2xl border border-cyan-500/40 shadow-2xl">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <span className="text-cyan-400 font-mono text-xs tracking-widest uppercase">Calculating Solid Body...</span>
            </div>
          </div>
        )}

        {/* Floating Return */}
        <div className="absolute bottom-8 left-8 z-40">
           <button 
             onClick={() => window.location.href = '/'}
             className="px-6 py-3 bg-black/60 border border-white/10 hover:border-cyan-500/50 text-white/60 hover:text-cyan-400 transition-all font-bold tracking-widest text-[10px] uppercase rounded-lg backdrop-blur-md"
           >
             ← Hub
           </button>
        </div>
      </div>

      {/* Sidebar Toggle (FORCED ON THE RIGHT SIDE) */}
      {!sidebarOpen && (
        <button 
          onClick={() => setSidebarOpen(true)}
          className="fixed z-50 p-3 bg-cyan-500/20 border border-cyan-500/60 rounded-full hover:bg-cyan-500 hover:text-black transition-all shadow-[0_0_25px_rgba(0,255,255,0.6)]"
          style={{ 
            top: '50%', 
            right: '1.5rem', 
            transform: 'translateY(-50%)'
          }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* SIDEBAR - FORCED RIGHT POSITION */}
      <div 
        className="fixed top-0 bottom-0 w-80 bg-black/95 border-l border-cyan-500/40 backdrop-blur-3xl shadow-2xl z-50 flex flex-col transition-all duration-500"
        style={{ 
            right: 0, 
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(100%)' 
        }}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Parameters
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={resetParams}
              title="Reset to Defaults"
              className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/40 hover:text-cyan-400"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {Object.entries(params)
            .filter(([key, val]) => {
              const k = key.toLowerCase();
              if (k.includes('hasarms') || k.includes('hasscooter')) return false;
              if (['scooterlength', 'armreach', 'handlebarwidth', 'scooterwidth', 'wheelarmreach', 'suspensionheight', 'suspensionoffset', 'legheight', 'basketfloorheight'].includes(k)) return false;
              return typeof val === 'number';
            })
            .map(([key, value]) => (
                  <div key={key} className="space-y-3 group">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-widest text-white/40 group-hover:text-cyan-400/70 transition-colors font-mono font-bold">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <div className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded text-cyan-300 font-mono text-[10px]">
                        {value}
                      </div>
                    </div>
                    <input 
                      type="range"
                      min={key === 'teeth' || key === 'profilePoints' || key === 'basketDensity' ? 0 : (key === 'pathTurns' || key.toLowerCase().includes('radius') || key.toLowerCase().includes('diameter') ? 0.1 : (key === 'basketHeight' || key === 'wheelArmReach' || key.toLowerCase().includes('height') ? 5 : 0))}
                      max={key.toLowerCase().includes('angle') ? 60 : (key === 'pathHeight' || key === 'basketLength' || key === 'chassisLength' || key === 'scooterLength' ? 500 : (key === 'profilePoints' ? 20 : (key === 'basketWidth' || key === 'basketHeight' || key.toLowerCase().includes('height') || key.toLowerCase().includes('radius') ? 200 : 100)))}
                      step={key.toLowerCase().includes('angle') || key.toLowerCase().includes('pitch') || key.toLowerCase().includes('diameter') || key.toLowerCase().includes('radius') || key === 'pathTurns' ? 0.1 : 1}
                      value={value as number}
                      onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400 hover:accent-cyan-300 transition-all"
                    />
                  </div>
            )
          )}

          {/* Evolution Toggles (Shopping Cart only) */}
          {type === 'shopping-cart' && (
            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Evolution Modules</span>
              </div>
              
              {/* Evolution Controls */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/40 uppercase">Scooter Base</span>
                <button 
                  onClick={() => handleParamChange('hasScooter', !params.hasScooter)}
                  className={`w-10 h-5 rounded-full transition-all duration-300 relative ${params.hasScooter ? 'bg-cyan-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${params.hasScooter ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

               <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-white/40 uppercase">Robotic Arms</span>
                <button 
                  onClick={() => handleParamChange('hasArms', !params.hasArms)}
                  className={`w-10 h-5 rounded-full transition-all duration-300 relative ${params.hasArms ? 'bg-cyan-500' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${params.hasArms ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Conditional Sliders for Arms */}
              {params.hasArms && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Arm Reach</span>
                      <span className="text-cyan-400">{params.armReach || 40}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="20"
                      max="100"
                      step="1"
                      value={(params.armReach as number) || 40}
                      onChange={(e) => handleParamChange('armReach', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Basket Floor Height</span>
                      <span className="text-cyan-400">{params.basketFloorHeight || 20}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={(params.basketFloorHeight as number) || 20}
                      onChange={(e) => handleParamChange('basketFloorHeight', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              )}

              {/* Conditional Sliders for Scooter */}
              {params.hasScooter && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Scooter Length</span>
                      <span className="text-cyan-400">{params.scooterLength || 100}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="60"
                      max="200"
                      step="1"
                      value={(params.scooterLength as number) || 100}
                      onChange={(e) => handleParamChange('scooterLength', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Handlebar Width</span>
                      <span className="text-cyan-400">{params.handlebarWidth || 50}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="30"
                      max="100"
                      step="1"
                      value={(params.handlebarWidth as number) || 50}
                      onChange={(e) => handleParamChange('handlebarWidth', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              )}

              {/* Suspension Module (Separated from main scooter controls for clarity) */}
              {params.hasScooter && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 text-cyan-400/60">
                    <span className="text-[9px] font-bold uppercase tracking-wider">Suspension System</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Wheel Reach</span>
                      <span className="text-cyan-400">{params.wheelArmReach || 30}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="100"
                      step="1"
                      value={(params.wheelArmReach as number) || 30}
                      onChange={(e) => handleParamChange('wheelArmReach', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Anchor Height</span>
                      <span className="text-cyan-400">{params.suspensionHeight || 15}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="5"
                      max="60"
                      step="1"
                      value={(params.suspensionHeight as number) || 15}
                      onChange={(e) => handleParamChange('suspensionHeight', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Anchor Offset</span>
                      <span className="text-cyan-400">{params.suspensionOffset || 30}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="-150"
                      max="100"
                      step="1"
                      value={(params.suspensionOffset as number) || -20}
                      onChange={(e) => handleParamChange('suspensionOffset', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                      <span>Scooter Width</span>
                      <span className="text-cyan-400">{params.scooterWidth || 35}mm</span>
                    </div>
                    <input 
                      type="range"
                      min="20"
                      max="80"
                      step="1"
                      value={(params.scooterWidth as number) || 35}
                      onChange={(e) => handleParamChange('scooterWidth', parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mesh Resolution Slider */}
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Box className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Mesh Quality</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                <span>Detailed Mesh</span>
                <span className="text-cyan-400">{resolution} Segments</span>
              </div>
              <input 
                type="range"
                min="16"
                max="256"
                step="8"
                value={resolution}
                onChange={(e) => setResolution(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* Material Selector */}
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Palette className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Material</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MATERIAL_PRESETS) as MaterialType[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMaterial(m)}
                  className={`px-3 py-2 rounded-lg border text-[10px] font-mono transition-all duration-300 capitalize ${
                    material === m 
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                      : 'bg-[#1a1a1a] border-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Glass Properties */}
          {material === 'glass' && (
            <div className="pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center gap-2 text-cyan-400">
                <Palette className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Glass Properties</span>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                    <span>Translucency</span>
                    <span className="text-cyan-400">{(glassTranslucency * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={glassTranslucency}
                    onChange={(e) => setGlassTranslucency(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                    <span>Tint Color</span>
                    <span className="text-cyan-400">{glassColor}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color"
                      value={glassColor}
                      onChange={(e) => setGlassColor(e.target.value)}
                      className="w-8 h-8 bg-transparent border-none cursor-pointer rounded overflow-hidden"
                    />
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      {['#a5f3fc', '#ffffff', '#ffd700', '#f472b6', '#4ade80', '#fb923c', '#94a3b8', '#1e293b'].map(c => (
                        <button 
                          key={c}
                          onClick={() => setGlassColor(c)}
                          style={{ backgroundColor: c }}
                          className={`h-4 rounded border border-white/10 ${glassColor === c ? 'border-cyan-400 ring-1 ring-cyan-400' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                    <span>Bloom Glow</span>
                    <span className="text-cyan-400">{(glassGlow * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={glassGlow}
                    onChange={(e) => setGlassGlow(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scene Selector */}
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sun className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Environment</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ENVIRONMENT_PRESETS) as EnvironmentType[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setEnv(e)}
                  className={`px-3 py-2 rounded-lg border text-[10px] font-mono transition-all duration-300 capitalize ${
                    env === e 
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' 
                      : 'bg-[#1a1a1a] border-white/5 text-white/40 hover:border-white/20 hover:text-white/60'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Lighting Controls */}
          <div className="pt-6 border-t border-white/5 space-y-6">
            <div className="flex items-center gap-2 text-cyan-400">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Lighting</span>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                  <span>Intensity</span>
                  <span className="text-cyan-400">{(lightIntensity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={lightIntensity}
                  onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                  <span>Light Angle</span>
                  <span className="text-cyan-400">{lightAngle}°</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={lightAngle}
                  onChange={(e) => setLightAngle(parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Scene Controls */}
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
              <Sun className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Scene & Floor</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                <span>Background Brightness</span>
                <span className="text-cyan-400">{(bgDarkness * 100).toFixed(0)}%</span>
              </div>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={bgDarkness}
                onChange={(e) => setBgDarkness(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-white/40 uppercase">Show Floor</span>
              <button 
                onClick={() => setShowFloor(!showFloor)}
                className={`w-10 h-5 rounded-full transition-all duration-300 relative ${showFloor ? 'bg-cyan-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${showFloor ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {showFloor && (
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <span className="text-[8px] font-mono text-white/40 uppercase">Floor Color</span>
                  <div className="grid grid-cols-6 gap-1">
                    {['#1a1a1a', '#2d3748', '#2c7a7b', '#3182ce', '#ffffff', '#000000'].map(c => (
                      <button
                        key={c}
                        onClick={() => setFloorColor(c)}
                        style={{ backgroundColor: c }}
                        className={`h-4 rounded border border-white/10 ${floorColor === c ? 'border-cyan-400 ring-1 ring-cyan-400' : ''}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[8px] font-mono text-white/40 uppercase tracking-tighter">
                    <span>Floor Distance</span>
                    <span className="text-cyan-400">{floorDistance}mm</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={floorDistance}
                    onChange={(e) => setFloorDistance(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-[10px] font-mono text-white/40 uppercase">Animation</span>
              <button 
                onClick={() => setIsAnimated(!isAnimated)}
                className={`w-10 h-5 rounded-full transition-all duration-300 relative ${isAnimated ? 'bg-cyan-500' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300 ${isAnimated ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-[10px] text-red-400 font-mono leading-relaxed uppercase tracking-tighter">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 space-y-4">
           <button 
             onClick={() => lastPartId && (window.location.href = `/agent/cad/models/${lastPartId}`)}
             disabled={loading || !!error}
             className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-black uppercase tracking-[0.2em] text-[11px] rounded-xl transition-all shadow-[0_0_25px_rgba(0,255,255,0.3)] hover:shadow-[0_0_40px_rgba(0,255,255,0.5)] flex items-center justify-center gap-2 group disabled:opacity-50"
           >
             <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
             Export to Explorer
           </button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      ` }} />
    </div>
  );
};
