import { Suspense, useEffect, useState } from 'react';
import { getApiUrl } from '../config';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, TransformControls, Environment } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { 
  Box, 
  Plus, 
  Trash2, 
  Move, 
  RotateCw, 
  Layers, 
  ChevronLeft, 
  ChevronRight,
  Database,
  ArrowLeft
} from 'lucide-react';

interface ModelMetadata {
  id: string;
  name?: string;
  stlUrl: string;
  parameters?: any;
}

interface AssemblyInstance {
  instanceId: string;
  modelId: string;
  name: string;
  stlUrl: string;
  position: [number, number, number];
  rotation: [number, number, number];
}

const ModelInstance = ({ 
  instance, 
  isSelected, 
  onSelect, 
  transformMode 
}: { 
  instance: AssemblyInstance; 
  isSelected: boolean; 
  onSelect: () => void;
  transformMode: 'translate' | 'rotate';
}) => {
  const geom = useLoader(STLLoader, instance.stlUrl);
  
  return (
    <group 
      position={instance.position} 
      rotation={instance.rotation}
    >
      {isSelected && (
        <TransformControls 
          mode={transformMode} 
          onMouseUp={(e: any) => {
            // Update instance data when transform ends
            const target = e.target.object;
            instance.position = [target.position.x, target.position.y, target.position.z];
            instance.rotation = [target.rotation.x, target.rotation.y, target.rotation.z];
          }}
        />
      )}
      <mesh 
        geometry={geom} 
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <meshStandardMaterial 
          color={isSelected ? "#00ffff" : "#aaaaaa"} 
          metalness={0.8} 
          roughness={0.2} 
        />
      </mesh>
    </group>
  );
};

export const AssemblyPage = () => {
  const [availableModels, setAvailableModels] = useState<ModelMetadata[]>([]);
  const [instances, setInstances] = useState<AssemblyInstance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch(getApiUrl('/cad-models'))
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAvailableModels(data.models);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addInstance = (model: ModelMetadata) => {
    const newInstance: AssemblyInstance = {
      instanceId: `inst-${Date.now()}`,
      modelId: model.id,
      name: model.name || model.id,
      stlUrl: getApiUrl(model.stlUrl),
      position: [0, 0, 0],
      rotation: [0, 0, 0]
    };
    setInstances([...instances, newInstance]);
    setSelectedInstanceId(newInstance.instanceId);
  };

  const removeInstance = (id: string) => {
    setInstances(instances.filter(inst => inst.instanceId !== id));
    if (selectedInstanceId === id) setSelectedInstanceId(null);
  };

  return (
    <div className="w-screen h-screen bg-[#050505] text-white flex overflow-hidden font-sans relative">
      <div className="absolute inset-0 bg-gradient-to-br from-[#001020] via-black to-[#000510] -z-10" />

      {/* Sidebar - Model List */}
      <div 
        className={`fixed top-0 bottom-0 w-80 bg-black/95 border-r border-cyan-500/20 backdrop-blur-3xl z-50 flex flex-col transition-all duration-500 shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-400 flex items-center gap-2">
            <Database className="w-4 h-4" /> Available Parts
          </h2>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
            </div>
          ) : availableModels.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-white/10 rounded-xl text-white/30 text-xs">
              No parts found in library
            </div>
          ) : (
            availableModels.map(model => (
              <div 
                key={model.id}
                onClick={() => addInstance(model)}
                className="group p-4 bg-white/5 border border-white/5 hover:border-cyan-500/40 rounded-xl cursor-pointer transition-all hover:bg-cyan-500/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                      <Box className="w-5 h-5 text-white/40 group-hover:text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-white/70 group-hover:text-white transition-colors">{model.name || model.id}</p>
                      <p className="text-[10px] font-mono text-white/30 uppercase mt-0.5">STL Resource</p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-white/20 group-hover:text-cyan-400" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Assembly Structure */}
        <div className="p-4 border-t border-white/5 bg-black/40">
           <h3 className="text-[10px] uppercase tracking-widest text-white/40 mb-4 flex items-center gap-2">
             <Layers className="w-3 h-3" /> Assembly Tree ({instances.length})
           </h3>
           <div className="space-y-2 max-h-60 overflow-y-auto">
              {instances.map(inst => (
                <div 
                  key={inst.instanceId}
                  onClick={() => setSelectedInstanceId(inst.instanceId)}
                  className={`flex items-center justify-between p-2 rounded-lg text-[10px] group transition-all cursor-pointer ${selectedInstanceId === inst.instanceId ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5 border border-transparent'}`}
                >
                  <span className="font-mono text-white/60 group-hover:text-cyan-400">{inst.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeInstance(inst.instanceId); }}
                    className="p-1 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div 
        className="flex-1 relative transition-all duration-500"
        style={{ marginLeft: sidebarOpen ? '0' : '0' }}
      >
        {/* Toggle Sidebar Button */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="fixed top-24 left-6 z-40 p-3 bg-black/60 border border-white/10 rounded-full hover:border-cyan-500/50 text-white/60 hover:text-cyan-400 transition-all backdrop-blur-md"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Header Overlay */}
        <div className="absolute top-6 left-6 z-40 flex items-center gap-4 bg-black/40 p-4 border border-cyan-500/20 rounded-xl backdrop-blur-xl">
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
            <Layers className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 uppercase">
              Assembly Workspace
            </h1>
            <p className="text-[10px] text-cyan-500/50 font-mono tracking-widest uppercase">Multi-Component Spatial Engine</p>
          </div>
        </div>

        {/* Toolbar Overlay */}
        <div className="absolute top-6 right-6 z-40 flex items-center gap-2 bg-black/40 p-2 border border-white/10 rounded-xl backdrop-blur-xl">
           <button 
             onClick={() => setTransformMode('translate')}
             className={`p-3 rounded-lg transition-all ${transformMode === 'translate' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'hover:bg-white/5 text-white/40'}`}
             title="Translate"
           >
             <Move className="w-5 h-5" />
           </button>
           <button 
             onClick={() => setTransformMode('rotate')}
             className={`p-3 rounded-lg transition-all ${transformMode === 'rotate' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'hover:bg-white/5 text-white/40'}`}
             title="Rotate"
           >
             <RotateCw className="w-5 h-5" />
           </button>
           <div className="w-px h-8 bg-white/10 mx-2" />
           <p className="px-4 text-[10px] font-mono text-white/30 uppercase tracking-tighter">
             {selectedInstanceId ? `Editing: ${instances.find(i => i.instanceId === selectedInstanceId)?.name}` : 'No Selection'}
           </p>
        </div>

        {/* 3D Canvas */}
        <div className="w-full h-full cursor-crosshair">
          <Canvas shadows camera={{ position: [100, 100, 100], fov: 45 }}>
            <color attach="background" args={['#050505']} />
            <ambientLight intensity={0.5} />
            <spotLight position={[100, 100, 100]} angle={0.15} penumbra={1} intensity={2} castShadow />
            <pointLight position={[-100, -100, -100]} intensity={1} color="#0066ff" />
            <Environment preset="city" />
            
            <Suspense fallback={null}>
              <group onClick={() => setSelectedInstanceId(null)}>
                <gridHelper args={[500, 50, '#222222', '#111111']} position={[0, -0.1, 0]} />
                {instances.map(inst => (
                  <ModelInstance 
                    key={inst.instanceId}
                    instance={inst}
                    isSelected={selectedInstanceId === inst.instanceId}
                    onSelect={() => setSelectedInstanceId(inst.instanceId)}
                    transformMode={transformMode}
                  />
                ))}
              </group>
            </Suspense>
            
            <OrbitControls 
              makeDefault 
              enabled={!selectedInstanceId} 
            />
          </Canvas>
        </div>

        {/* Footer Navigation */}
        <div className="absolute bottom-8 left-8 z-40">
           <button 
             onClick={() => window.location.href = '/'}
             className="flex items-center gap-3 px-6 py-3 bg-black/60 border border-white/10 hover:border-cyan-500/50 text-white/60 hover:text-cyan-400 transition-all font-bold tracking-widest text-[10px] uppercase rounded-lg backdrop-blur-md group"
           >
             <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Dashboard
           </button>
        </div>
      </div>
    </div>
  );
};
