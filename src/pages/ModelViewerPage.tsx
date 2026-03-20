import { Suspense, useEffect, useState } from 'react';
import { getApiUrl } from '../config';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stage, Environment } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { 
  type Operation,
  SolidModel 
} from '../components/canvas/CADProceduralModel';

interface ModelViewerPageProps {
  partId: string | null;
}

const Model = ({ url }: { url: string }) => {
  const geom = useLoader(STLLoader, url);
  return (
    <mesh geometry={geom}>
      <meshStandardMaterial color="#00ffff" metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

export const ModelViewerPage = ({ partId }: ModelViewerPageProps) => {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proceduralOps, setProceduralOps] = useState<Operation[]>([]);
  const isProcedural = partId?.startsWith('part-');

  useEffect(() => {
    if (!partId) return;

    if (isProcedural) {
      const saved = localStorage.getItem(`cad-design-${partId}`);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          setProceduralOps(data.operations || []);
        } catch (e) {
          setError("Failed to load procedural model from storage");
        }
      } else {
        setError("Model not found in local storage");
      }
      return;
    }

    // Fetch the metadata JSON first to get the stlUrl (for legacy/library models)
    fetch(getApiUrl(`/models/${partId}.json`))
      .then((res) => {
        if (!res.ok) throw new Error('Model not found');
        return res.json();
      })
      .then((data) => {
        setModelUrl(getApiUrl(data.stlUrl));
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      });
  }, [partId, isProcedural]);

  if (error) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-black text-red-500">
        <h1>Error: {error}</h1>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black relative">
       <div className="absolute top-4 left-4 z-50 p-4 bg-black/50 border border-cyan-500/30 rounded-lg backdrop-blur-md">
          <h1 className="text-cyan-400 font-bold tracking-widest text-xl uppercase">CAD PREVIEW: {partId}</h1>
          <p className="text-cyan-600/70 text-sm mt-1">Parametric Local Generation Feed</p>
       </div>

       <Canvas shadows camera={{ position: [50, 50, 100], fov: 50 }}>
          <color attach="background" args={['#4a4a4a']} />
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Suspense fallback={null}>
            {isProcedural ? (
              <group>
                {proceduralOps.map(op => <SolidModel key={op.id} op={op} />)}
              </group>
            ) : modelUrl && (
                <Stage intensity={0.5} environment="city" shadows={false}>
                    <Model url={modelUrl} />
                </Stage>
            )}
          </Suspense>
          <OrbitControls makeDefault />
       </Canvas>

       <div className="absolute bottom-4 right-4 z-50">
          <button 
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black transition-all font-bold tracking-widest text-xs uppercase"
          >
            ← Back to Dashboard
          </button>
       </div>
    </div>
  );
};
