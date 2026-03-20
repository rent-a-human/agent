import { Suspense, useState, useMemo, useEffect } from 'react';
import { getApiUrl } from '../config';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, OrthographicCamera, GizmoHelper, GizmoViewport, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Settings, MousePointer2, Pencil, Circle, Layers, Box, X, ChevronRight, Check, Square, Share2, BoxSelect, GripVertical, Hexagon, IterationCcw, Loader2, Ruler, Trash2 } from 'lucide-react';
import { 
  type PlaneType, 
  type MaterialType, 
  type SketchElement, 
  type Operation,
  type Mode,
  type Tool,
  DrawnElements, 
  SolidModel,
  CoordinatePlane,
  CameraController,
  InfiniteAxis
} from '../components/canvas/CADProceduralModel';
import { useRef } from 'react';
import { GitCommit } from 'lucide-react';

// --- MAIN PAGE ---

export const CreatePage = () => {
  const modelGroupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const hudInputRef = useRef<HTMLInputElement>(null);
  const [activePlane, setActivePlane] = useState<PlaneType | null>(null);
  const [mode, setMode] = useState<Mode>('3D');
  const [activeTool, setActiveTool] = useState<Tool>('select');
  const [menuPos, setMenuPos] = useState<{ x: number, y: number } | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [extrudeParams, setExtrudeParams] = useState<{ depth: number, direction: 'pos' | 'neg' | 'mid', opType: 'add' | 'cut' }>({ depth: 10, direction: 'pos', opType: 'add' });
  const [revolveParams, setRevolveParams] = useState<{ angle: number, axisId: string, axisType: 'main' | 'sketch', opType: 'add' | 'cut' }>({ angle: 360, axisId: 'y', axisType: 'main', opType: 'add' });
  const [pendingOpType, setPendingOpType] = useState<'extrude' | 'revolve' | null>(null);
  const [partId, setPartId] = useState<string>('');
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportName, setExportName] = useState('Untitled Part');
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredOpId, setHoveredOpId] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<MaterialType>('clay');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  
  const [managerPos, setManagerPos] = useState({ x: 300, y: 100 });
  const [dimHUDPos, setDimHUDPos] = useState({ x: 800, y: 100 });
  const [savedCameraState, setSavedCameraState] = useState<{ position: [number, number, number], target: [number, number, number] } | null>(null);
  
  // Sketching state
  const [sketchElements, setSketchElements] = useState<SketchElement[]>([]);
  const [currentElement, setCurrentElement] = useState<SketchElement | null>(null);
  const [snapPoint, setSnapPoint] = useState<[number, number] | null>(null);
  const [dimensionStart, setDimensionStart] = useState<[number, number] | null>(null);
  
  const [appSettings, setAppSettings] = useState({
    units: 'mm',
    showX: true,
    showY: true,
    showZ: true,
    show3DInSketch: false
  });
  const [sidebarTab, setSidebarTab] = useState<'features' | 'settings'>('features');
  

  // --- PERSISTENCE ---

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let id = params.get('id');
    if (!id) {
      id = `part-${Math.random().toString(36).substr(2, 9)}`;
      window.history.replaceState(null, '', `?id=${id}`);
    }
    setPartId(id);
    setExportName(id);

    const saved = localStorage.getItem(`cad-design-${id}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setOperations(data.operations || []);
      } catch (e) {
        console.error("Failed to load design", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'SKETCH') {
          setActiveTool('select');
          setCurrentElement(null);
          setSelectedElementId(null);
        } else if (mode === 'REGION_SELECT') {
          setMode('3D');
          setSelectedRegions([]);
        }
      } else if (e.key === 'Tab' && mode === 'SKETCH' && currentElement) {
        e.preventDefault();
        hudInputRef.current?.focus();
        hudInputRef.current?.select();
      } else if (e.key === 'Enter' && selectedElementId) {
        commitCurrentElement();
      } else if ((e.key === 'Backspace' || e.key === 'Delete') && selectedElementId && mode === 'SKETCH') {
        deleteSelectedElement();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  useEffect(() => {
    if (partId && operations.length > 0) {
      localStorage.setItem(`cad-design-${partId}`, JSON.stringify({ operations }));
    }
  }, [operations, partId]);

  // Camera restoration effect
  useEffect(() => {
    if (mode === '3D' && savedCameraState && controlsRef.current) {
      const { position, target } = savedCameraState;
      controlsRef.current.object.position.set(...position);
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
      setSavedCameraState(null);
    }
  }, [mode, savedCameraState]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(getApiUrl('/custom/save'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: exportName,
          name: exportName,
          operations: operations
        })
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = `/agent/cad/models/${exportName}`;
      } else {
        alert('Export failed: ' + data.error);
      }
    } catch (err) {
      alert('Export failed: Connection lost');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePlaneClick = (type: PlaneType, e: any) => {
    if (mode === '3D') {
      setActivePlane(type);
      setMenuPos({ x: e.clientX, y: e.clientY });
    }
  };

  const getSnappedPoint = (x: number, y: number) => {
    const threshold = 3; // Reduced threshold for tighter snapping
    const candidates: [number, number][] = [[0, 0]];
    
    // Grid candidates in local neighborhood
    // Dynamic step: 1 unit if zoomed in enough (zoom > 5), 5 units otherwise
    const snapStep = zoom > 5 ? 1 : 5;
    const gx = Math.round(x / snapStep) * snapStep;
    const gy = Math.round(y / snapStep) * snapStep;
    candidates.push([gx, gy]);

    // Existing points
    sketchElements.forEach(el => {
      el.points.forEach(p => candidates.push(p));
    });

    for (const [cx, cy] of candidates) {
      const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      if (dist < threshold) {
        if (!snapPoint || snapPoint[0] !== cx || snapPoint[1] !== cy) {
          setSnapPoint([cx, cy]);
        }
        return [cx, cy];
      }
    }
    if (snapPoint !== null) setSnapPoint(null);
    return [x, y];
  };

   const commitCurrentElement = () => {
    if (selectedElementId === 'temp') {
      if (!currentElement) return;

      if (currentElement.type === 'polyline') {
        const lines: SketchElement[] = [];
        // Extract all unique segments
        for (let i = 0; i < currentElement.points.length - 1; i++) {
          const p1 = currentElement.points[i];
          const p2 = currentElement.points[i+1];
          // Skip zero-length segments
          const dist = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
          if (dist > 0.01) {
            lines.push({
              id: Math.random().toString(),
              type: 'line',
              points: [p1, p2]
            });
          }
        }
        
        if (lines.length > 0) {
          setSketchElements(prev => [...prev, ...lines]);
        }
        setCurrentElement(null);
        setSelectedElementId(null);
        return;
      }

      const id = Math.random().toString();
      const newEl: SketchElement = { ...currentElement, id };
      setSketchElements(prev => [...prev, newEl]);
      setCurrentElement(null);
      setSelectedElementId(id);
    } else {
      setSelectedElementId(null);
    }
  };

  const ZoomTracker = ({ setZoom }: { setZoom: (z: number) => void }) => {
    const { camera } = useThree();
    useFrame(() => {
      const z = (camera as any).zoom || (150 / camera.position.length());
      setZoom(z);
    });
    return null;
  };

  const ZoomHandler = () => {
    const { camera, gl, controls } = useThree();
    
    useEffect(() => {
      const handleWheel = (e: WheelEvent) => {
        if (mode !== 'SKETCH') return;
        
        e.preventDefault();
        e.stopPropagation();

        const zoomStep = 1.15;
        const factor = e.deltaY > 0 ? 1 / zoomStep : zoomStep;

        const rect = gl.domElement.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        
        const mouseNDC = new THREE.Vector3(x, y, 0);
        const worldPosBefore = mouseNDC.clone().unproject(camera);
        
        if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
          const ortho = camera as THREE.OrthographicCamera;
          const newZoom = ortho.zoom * factor;
          
          if (newZoom > 0.01 && newZoom < 1000) {
            ortho.zoom = newZoom;
            ortho.updateProjectionMatrix();
            
            const worldPosAfter = mouseNDC.clone().unproject(camera);
            const offset = worldPosBefore.clone().sub(worldPosAfter);
            camera.position.add(offset);
            if (controls) {
              (controls as any).target.add(offset);
            }
          }
        }
      };

      const canvas = gl.domElement;
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }, [camera, gl, controls]);

    return null;
  };

  const handleCanvasClick = (e: any) => {
    if (activeTool === 'select') return;
    const point = e.point;
    if (!point) return;
    e.stopPropagation();

    let xraw = 0, yraw = 0;
    if (activePlane === 'alzado') { xraw = point.x; yraw = point.y; }
    else if (activePlane === 'planta') { xraw = point.x; yraw = -point.z; }
    else if (activePlane === 'lateral') { xraw = -point.z; yraw = point.y; }

    const [x2d, y2d] = getSnappedPoint(xraw, yraw);

    if (activeTool === 'point') {
      const newEl: SketchElement = { id: Math.random().toString(), type: 'point', points: [[x2d, y2d]] };
      setSketchElements(prev => [...prev, newEl]);
    } else if (activeTool === 'line') {
      if (!currentElement) {
        setCurrentElement({ id: 'temp', type: 'line', points: [[x2d, y2d], [x2d, y2d]] });
        setSelectedElementId('temp');
        setDimHUDPos({ x: window.innerWidth / 2 - 120, y: 150 });
      } else {
        commitCurrentElement();
      }
    } else if (activeTool === 'polyline') {
      if (!currentElement) {
        setCurrentElement({ id: 'temp', type: 'polyline', points: [[x2d, y2d], [x2d, y2d]] });
        setSelectedElementId('temp');
        setDimHUDPos({ x: window.innerWidth / 2 - 120, y: 150 });
      } else {
        const startPoint = currentElement.points[0];
        const dist = Math.sqrt(Math.pow(x2d - startPoint[0], 2) + Math.pow(y2d - startPoint[1], 2));
        
        // Finalize if click is very close to start point (closed loop)
        if (dist < 2 && currentElement.points.length > 2) {
          commitCurrentElement();
        } else {
          // Continue adding segments
          setCurrentElement(prev => {
            if (!prev) return null;
            return { ...prev, points: [...prev.points, [x2d, y2d]] };
          });
        }
      }
    } else if (activeTool === 'circle') {
      if (!currentElement) {
        setCurrentElement({ id: 'temp', type: 'circle', points: [[x2d, y2d]], radius: 0 });
        setSelectedElementId('temp');
        setDimHUDPos({ x: window.innerWidth / 2 - 120, y: 150 });
      } else {
        commitCurrentElement();
      }
    } else if (activeTool === 'dimension') {
      if (!dimensionStart) {
        setDimensionStart([x2d, y2d]);
      } else {
        const newEl: SketchElement = { 
          id: Math.random().toString(), 
          type: 'dimension', 
          points: [dimensionStart, [x2d, y2d]] 
        };
        setSketchElements(prev => [...prev, newEl]);
        setDimensionStart(null);
      }
    } else if (activeTool === 'rectangle' || activeTool === 'center-rectangle') {
      if (!currentElement) {
        setCurrentElement({ id: 'temp', type: activeTool, points: [[x2d, y2d], [x2d, y2d]] });
        setSelectedElementId('temp');
        setDimHUDPos({ x: window.innerWidth / 2 - 120, y: 150 });
      } else {
        commitCurrentElement();
      }
    } else if (activeTool === 'polygon') {
      if (!currentElement) {
        setCurrentElement({ id: 'temp', type: 'polygon', points: [[x2d, y2d]], radius: 0, sides: 6 });
        setSelectedElementId('temp');
        setDimHUDPos({ x: window.innerWidth / 2 - 120, y: 150 });
      } else {
        commitCurrentElement();
      }
    } else if (activeTool === 'arc') {
      if (!currentElement) {
        setCurrentElement({ id: 'temp', type: 'arc', points: [[x2d, y2d], [x2d, y2d]] });
        setSelectedElementId('temp');
        setDimHUDPos({ x: window.innerWidth / 2 - 120, y: 150 });
      } else if (currentElement.points.length === 2) {
        setCurrentElement({ ...currentElement, points: [currentElement.points[0], [x2d, y2d], [x2d, y2d]] });
      } else if (currentElement.points.length === 3) {
        commitCurrentElement();
      }
    }
  };

  const handlePointerMove = (e: any) => {
    if (document.activeElement?.tagName === 'INPUT') return;
    const point = e.point;
    if (!point) return;
    if (activeTool !== 'select') e.stopPropagation();

    let xraw = 0, yraw = 0;
    if (activePlane === 'alzado') { xraw = point.x; yraw = point.y; }
    else if (activePlane === 'planta') { xraw = point.x; yraw = -point.z; }
    else if (activePlane === 'lateral') { xraw = -point.z; yraw = point.y; }

    const [x2d, y2d] = getSnappedPoint(xraw, yraw);

    if (currentElement) {
      if (currentElement.type === 'line') {
        setCurrentElement(prev => prev ? { ...prev, points: [prev.points[0], [x2d, y2d]] } : null);
      } else if (currentElement.type === 'polyline') {
        setCurrentElement(prev => {
          if (!prev) return null;
          const pts = [...prev.points];
          pts[pts.length - 1] = [x2d, y2d];
          return { ...prev, points: pts };
        });
      } else if (currentElement.type === 'circle') {
        const center = currentElement.points[0];
        const radius = Math.sqrt(Math.pow(x2d - center[0], 2) + Math.pow(y2d - center[1], 2));
        setCurrentElement(prev => prev ? { ...prev, radius } : null);
      } else if (currentElement.type === 'rectangle' || currentElement.type === 'center-rectangle') {
        setCurrentElement(prev => prev ? { ...prev, points: [prev.points[0], [x2d, y2d]] } : null);
      } else if (currentElement.type === 'polygon') {
        const center = currentElement.points[0];
        const radius = Math.sqrt(Math.pow(x2d - center[0], 2) + Math.pow(y2d - center[1], 2));
        setCurrentElement(prev => prev ? { ...prev, radius } : null);
      } else if (currentElement.type === 'arc') {
        if (currentElement.points.length === 2) {
          setCurrentElement(prev => prev ? { ...prev, points: [prev.points[0], [x2d, y2d]] } : null);
        } else if (currentElement.points.length === 3) {
          setCurrentElement(prev => prev ? { ...prev, points: [prev.points[0], prev.points[1], [x2d, y2d]] } : null);
        }
      }
    }
  };

  const enterSketchMode = () => {
    // Save current camera state
    if (controlsRef.current) {
      const cam = controlsRef.current.object;
      const target = controlsRef.current.target;
      setSavedCameraState({
        position: [cam.position.x, cam.position.y, cam.position.z],
        target: [target.x, target.y, target.z]
      });
    }

    setMode('SKETCH');
    setActiveTool('line');
    setMenuPos(null);
    setSketchElements([]);
  };

  const exitSketchMode = () => {
    setMode('3D');
    setActiveTool('select');
    setActivePlane(null);
    setSketchElements([]);
    setSelectedElementId(null);
    setSelectedOpId(null);
    setSnapPoint(null);
  };

  const deleteSelectedElement = () => {
    if (!selectedElementId) return;

    if (mode === 'SKETCH') {
      setSketchElements(prev => prev.filter(el => el.id !== selectedElementId));
    } else {
      setOperations(prev => prev.map(op => {
        if (op.id !== selectedOpId) return op;
        return {
          ...op,
          sketch: op.sketch.filter(el => el.id !== selectedElementId)
        };
      }));
    }
    setSelectedElementId(null);
  };

  const updateElementDimension = (opId: string | null, elId: string, updates: Partial<SketchElement>) => {
    if (elId === 'temp') {
      setCurrentElement(prev => prev ? { ...prev, ...updates } : null);
      return;
    }
    if (mode === 'SKETCH') {
      setSketchElements(prev => prev.map(el => el.id === elId ? { ...el, ...updates } : el));
    } else {
      setOperations(prev => prev.map(op => {
        if (op.id !== opId) return op;
        return {
          ...op,
          sketch: op.sketch.map(el => el.id === elId ? { ...el, ...updates } : el)
        };
      }));
    }
  };

  const handleElementClick = (opId: string, elId: string) => {
    if (activeTool !== 'select') return;
    setSelectedOpId(opId);
    setSelectedElementId(elId);
    setDimHUDPos({ x: window.innerWidth / 2 - 120, y: 150 });
  };

  const finishSketch = () => {
    if (sketchElements.length > 0 && activePlane) {
      const sketchCount = operations.filter(o => o.type === 'sketch').length + 1;
      const newOp: Operation = {
        id: Math.random().toString(),
        name: `sketch_${sketchCount.toString().padStart(2, '0')}`,
        type: 'sketch',
        sketch: [...sketchElements],
        params: { plane: activePlane }
      };
      setOperations(prev => [...prev, newOp]);
    }
    exitSketchMode();
  };

  const startExtrude = () => {
    if (selectedOpId) {
      const op = operations.find(o => o.id === selectedOpId);
      if (op) {
        setPendingOpType('extrude');
        setMode('REGION_SELECT');
        setActivePlane(op.params.plane || 'alzado');
      }
    }
  };

  const startRevolve = () => {
    if (selectedOpId) {
      const op = operations.find(o => o.id === selectedOpId);
      if (op) {
        setPendingOpType('revolve');
        setMode('REGION_SELECT');
        setActivePlane(op.params.plane || 'alzado');
      }
    }
  };

  const toggleRegion = (id: string) => {
    // If it's a "virtual" region like an annulus or frame, we might need to select multiple elements
    if (id.startsWith('annulus-') || id.startsWith('frame-')) {
      const parts = id.split('-').slice(1);
      setSelectedRegions(prev => {
        const isSelected = parts.every(p => prev.includes(p));
        if (isSelected) return prev.filter(p => !parts.includes(p));
        return [...new Set([...prev, ...parts])];
      });
    } else {
      setSelectedRegions(prev => 
        prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
      );
    }
  };

  const updateOperationParams = (opId: string, params: any) => {
    setOperations(prev => prev.map(op => op.id === opId ? { ...op, params: { ...op.params, ...params } } : op));
  };

  const detectedRegions = useMemo(() => {
    if (mode !== 'REGION_SELECT' || !selectedOpId) return [];
    const op = operations.find(o => o.id === selectedOpId);
    if (!op) return [];

    const getBoundingBoxPoints = (pts: [number, number][]) => {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(([px, py]) => {
        minX = Math.min(minX, px); maxX = Math.max(maxX, px);
        minY = Math.min(minY, py); maxY = Math.max(maxY, py);
      });
      return { minX, maxX, minY, maxY };
    };

    const getBoundingBox = (el: any) => {
      if (!el) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      if (el.type === 'circle' || el.type === 'polygon') {
        const p0 = el.points?.[0];
        if (!p0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        const [cx, cy] = p0;
        const r = el.radius || 0;
        return { minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r };
      }
      if (el.type === 'rectangle' || el.type === 'center-rectangle') {
        const [p1, p2] = el.points;
        const isCenter = el.type === 'center-rectangle';
        if (!isCenter) {
          return { 
            minX: Math.min(p1[0], p2[0]), 
            maxX: Math.max(p1[0], p2[0]), 
            minY: Math.min(p1[1], p2[1]), 
            maxY: Math.max(p1[1], p2[1]) 
          };
        } else {
          const dx = Math.abs(p2[0] - p1[0]); const dy = Math.abs(p2[1] - p1[1]);
          return { minX: p1[0]-dx, maxX: p1[0]+dx, minY: p1[1]-dy, maxY: p1[1]+dy };
        }
      }
      if (el.type === 'loop' || el.type === 'line-loop' || el.type === 'arc') {
        return getBoundingBoxPoints(el.points || []);
      }
      return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    };

    const isInside = (inner: any, outer: any) => {
      const b1 = getBoundingBox(inner);
      const b2 = getBoundingBox(outer);
      return b1.minX >= b2.minX && b1.maxX <= b2.maxX && b1.minY >= b2.minY && b1.maxY <= b2.maxY;
    };

    type RegionEntity = { id: string, name: string, type: string, elements: string[], points?: [number, number][], radius?: number };
    const entities: RegionEntity[] = [];
    
    // 1. Collect circles, polygons, rectangles
    op.sketch.filter(el => 
      (el.type === 'circle' && el.radius) || 
      (el.type === 'polygon' && el.radius) ||
      ((el.type === 'rectangle' || el.type === 'center-rectangle') && el.points.length > 1) ||
      (el.type === 'polyline' && el.points.length > 2 && 
       Math.sqrt(Math.pow(el.points[0][0] - el.points[el.points.length-1][0], 2) + Math.pow(el.points[0][1] - el.points[el.points.length-1][1], 2)) < 1)
    ).forEach((el, i) => {
      entities.push({ 
        id: el.id, 
        name: `${el.type} ${i + 1}`, 
        type: el.type, 
        elements: [el.id],
        points: el.points as [number, number][],
        radius: el.radius
      });
    });

    // 2. Discover line/arc/polyline loops
    const sketchPathElements = op.sketch.filter(el => (el.type === 'line' || el.type === 'arc' || el.type === 'polyline') && el.points.length >= 2);
    if (sketchPathElements.length >= 1) {
      const adj: Record<string, { to: string, id: string, pt: [number, number], allPts: [number, number][] }[]> = {};
      const points: [number, number][] = [];
      const getPtId = (p: [number, number]) => {
        const existing = points.findIndex(pt => Math.abs(pt[0] - p[0]) < 0.1 && Math.abs(pt[1] - p[1]) < 0.1);
        if (existing !== -1) return existing.toString();
        points.push(p);
        return (points.length - 1).toString();
      };

      sketchPathElements.forEach(el => {
        const p1 = getPtId(el.points[0] as [number, number]);
        const p2 = getPtId(el.points[el.points.length - 1] as [number, number]);
        if (!adj[p1]) adj[p1] = [];
        if (!adj[p2]) adj[p2] = [];
        adj[p1].push({ to: p2, id: el.id, pt: el.points[el.points.length - 1] as [number, number], allPts: el.points as [number, number][] });
        adj[p2].push({ to: p1, id: el.id, pt: el.points[0] as [number, number], allPts: [...el.points].reverse() as [number, number][] });
      });

      const visited = new Set<string>();
      const findLoops = (curr: string, start: string, pathPoints: [number, number][], elementIds: string[]) => {
        visited.add(curr);
        for (const edge of adj[curr] || []) {
          if (edge.to === start && elementIds.length >= 0) {
             const allIds = Array.from(new Set([...elementIds, edge.id]));
             // Collect ALL points from all elements in the loop for a better bounding box
             const finalPoints: [number, number][] = [];
             allIds.forEach(id => {
               const el = op.sketch.find(e => e.id === id);
               if (el) el.points.forEach(p => finalPoints.push(p as [number, number]));
             });

             const loopId = `loop-${allIds.sort().join('-')}`;
             if (!entities.find(e => e.id === loopId)) {
               entities.push({ 
                 id: loopId, 
                 name: `Loop (${allIds.length} segments)`, 
                 type: 'loop', 
                 elements: allIds,
                 points: finalPoints
               });
             }
             continue;
          }
          if (!visited.has(edge.to) && !elementIds.includes(edge.id)) {
            findLoops(edge.to, start, [...pathPoints, edge.pt], [...elementIds, edge.id]);
          }
        }
      };

      Object.keys(adj).forEach(startNode => {
        visited.clear();
        findLoops(startNode, startNode, [points[parseInt(startNode)]], []);
      });
    }

    // 3. Flatten and unify detection logic
    const finalRegions: RegionEntity[] = [];
    
    // Add all entities first
    entities.forEach(ent => {
      finalRegions.push(ent);
    });

    // Detect containment among all entities
    for (let i = 0; i < entities.length; i++) {
        for (let j = 0; j < entities.length; j++) {
            if (i === j) continue;
            const ent1 = entities[i];
            const ent2 = entities[j];
            
            if (isInside(ent1, ent2)) {
                finalRegions.push({ 
                    id: `frame-${ent1.id}-${ent2.id}`, 
                    name: `Frame (${ent2.type} - ${ent1.type})`, 
                    type: 'frame', 
                    elements: Array.from(new Set([...ent1.elements, ...ent2.elements]))
                });
            }
        }
    }

    // Deduplicate
    const uniqueItems: RegionEntity[] = [];
    finalRegions.forEach(item => {
      const sortedIds = [...item.elements].sort().join(',');
      if (!uniqueItems.find(ui => ui.id === item.id || [...ui.elements].sort().join(',') === sortedIds)) {
        uniqueItems.push(item);
      }
    });

    return uniqueItems;
  }, [mode, selectedOpId, operations]);

  // Auto-select detected regions when entering REGION_SELECT mode
  useEffect(() => {
    if (mode === 'REGION_SELECT' && detectedRegions.length > 0 && selectedRegions.length === 0) {
      setSelectedRegions(detectedRegions.map(r => r.id));
    }
  }, [mode, detectedRegions, selectedRegions.length]);

  const confirmFinalOperation = () => {
    if (selectedOpId && selectedRegions.length > 0) {
      const sourceOp = operations.find(o => o.id === selectedOpId);
      if (sourceOp) {
        const resolvedElementIds = new Set<string>();
        selectedRegions.forEach(rid => {
          const region = (detectedRegions as any[]).find(r => r.id === rid);
          if (region) {
            region.elements.forEach((eid: string) => resolvedElementIds.add(eid));
          } else {
            resolvedElementIds.add(rid);
          }
        });

        if (pendingOpType === 'extrude') {
          const extrudeCount = operations.filter(o => o.type === 'extrude').length + 1;
          const extrudeId = Math.random().toString();
          const newOp: Operation = {
            id: extrudeId,
            name: `extrude_${extrudeCount.toString().padStart(2, '0')}`,
            type: 'extrude',
            sketch: sourceOp.sketch.filter(el => resolvedElementIds.has(el.id)),
            params: { 
              depth: extrudeParams.depth, 
              direction: extrudeParams.direction,
              plane: sourceOp.params.plane,
              material: activeMaterial,
              opType: extrudeParams.opType
            }
          };
          setOperations(prev => {
            const updated = prev.map(o => o.id === sourceOp.id ? { ...o, parentId: extrudeId } : o);
            return [...updated, newOp];
          });
        } else if (pendingOpType === 'revolve') {
          const revolveCount = operations.filter(o => o.type === 'revolve').length + 1;
          const revolveId = Math.random().toString();
          const newOp: Operation = {
            id: revolveId,
            name: `revolve_${revolveCount.toString().padStart(2, '0')}`,
            type: 'revolve',
            sketch: sourceOp.sketch.filter(el => resolvedElementIds.has(el.id)),
            params: { 
              angle: revolveParams.angle,
              axisId: revolveParams.axisId,
              axisType: revolveParams.axisType,
              plane: sourceOp.params.plane,
              material: activeMaterial,
              opType: revolveParams.opType
            }
          };
          setOperations(prev => {
            const updated = prev.map(o => o.id === sourceOp.id ? { ...o, parentId: revolveId } : o);
            return [...updated, newOp];
          });
        }
      }
      setMode('3D');
      setSelectedRegions([]);
      setSelectedOpId(null);
      setPendingOpType(null);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#222] text-white/90 flex overflow-hidden font-sans relative">
      <div className="absolute inset-0 bg-[#7a7a7a] -z-10" />

      <div className="absolute top-6 left-6 z-40 flex items-center gap-6">
        <div className="flex items-center gap-4 bg-[#121212]/95 p-4 border border-[#00ff88]/20 rounded-xl backdrop-blur-3xl shadow-2xl">
          <div className="p-3 bg-[#00ff88]/10 rounded-lg border border-[#00ff88]/30">
            <Layers className="w-6 h-6 text-[#00ff88]" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-black tracking-tighter text-white/90 uppercase">
              AI CAD <span className="text-[#00ff88]">CORE</span>
            </h1>
            <p className="text-[9px] text-white/30 font-mono uppercase tracking-[0.3em] leading-none mt-1">
              {mode} MODE // {activePlane || 'NONE'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#1a1a1a]/90 p-1.5 border border-white/10 rounded-2xl backdrop-blur-3xl shadow-2xl">
          {(() => {
            const Button = ({ tool, icon: Icon, label, active = activeTool === tool }: { tool: Tool, icon: any, label: string, active?: boolean }) => (
              <button 
                onClick={() => {
                   setActiveTool(tool);
                   if (tool !== 'polyline' && currentElement) setCurrentElement(null);
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group border ${active ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'bg-transparent text-white/30 border-transparent hover:bg-white/5 hover:text-white/60'}`}
                title={label}
              >
                <Icon className={`w-4 h-4 ${active ? 'animate-in zoom-in-75 duration-300' : 'group-hover:scale-110 transition-transform'}`} />
                {active && <span className="text-[8px] font-mono font-black uppercase tracking-[0.2em] animate-in slide-in-from-left-2 duration-300">{label}</span>}
              </button>
            );

            if (mode === '3D') {
              return (
                <>
                  <Button tool="select" icon={MousePointer2} label="Select" />
                  <div className="w-px h-4 bg-white/5 mx-1" />
                  <button 
                    onClick={enterSketchMode}
                    disabled={!activePlane}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${!activePlane ? 'opacity-20 cursor-not-allowed' : 'text-white/30 hover:bg-white/5 hover:text-white'}`}
                    title="New Sketch"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </>
              );
            }

            if (mode === 'SKETCH') {
              return (
                <>
                  <Button tool="select" icon={MousePointer2} label="Select" />
                  <div className="w-px h-4 bg-white/5 mx-1" />
                  <Button 
                    tool="point" 
                    icon={() => <div className="w-2 h-2 rounded-full bg-current" />} 
                    label="Point" 
                  />
                  <Button tool="line" icon={Pencil} label="Line" />
                  <Button tool="dimension" icon={Ruler} label="Dimension" />
                  <Button tool="polyline" icon={GitCommit} label="Polyline" />
                  <Button tool="circle" icon={Circle} label="Circle" />
                  <Button tool="arc" icon={IterationCcw} label="Arc" />
                  <Button tool="rectangle" icon={Square} label="Rectangle" />
                  <Button tool="center-rectangle" icon={BoxSelect} label="Center Rect" />
                  <Button tool="polygon" icon={Hexagon} label="Polygon" />
                  
                  <div className="w-px h-4 bg-white/5 mx-1" />
                  
                  <button 
                    onClick={finishSketch}
                    className="p-2 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all group hover:border-emerald-500/50"
                    title="Finalize Sketch"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={exitSketchMode}
                    className="p-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl transition-all group hover:border-red-500/50"
                    title="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              );
            }
            return null;
          })()}
        </div>

        {mode === 'REGION_SELECT' && (
          <div 
            className="absolute z-[100] flex flex-col gap-0 bg-[#121212]/95 border border-[#00ff88]/30 rounded-xl backdrop-blur-3xl shadow-2xl overflow-hidden w-[240px]"
            style={{ left: managerPos.x, top: managerPos.y }}
          >
            {/* Draggable Header */}
            <div 
              className="bg-[#00ff88]/5 px-4 py-3 border-b border-white/5 flex items-center justify-between cursor-move active:cursor-grabbing"
              onMouseDown={(e) => {
                const startX = e.clientX - managerPos.x;
                const startY = e.clientY - managerPos.y;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  setManagerPos({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
                };
                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                };
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-3 h-3 text-[#00ff88]/40" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff88] italic">{pendingOpType === 'extrude' ? 'Extrusion' : 'Revolution'} Manager</span>
              </div>
              <button 
                onClick={() => { setMode('3D'); setSelectedRegions([]); setPendingOpType(null); }}
                className="text-white/20 hover:text-white/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            
            {/* Params Table */}
            <div className="p-4 space-y-4">
              {pendingOpType === 'extrude' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none">Depth</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        value={extrudeParams.depth}
                        onChange={(e) => setExtrudeParams(prev => ({ ...prev, depth: Number(e.target.value) }))}
                        className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] w-full outline-none focus:border-[#00ff88] font-bold text-[#00ff88]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none">Direction</span>
                    <div className="flex bg-black/60 p-0.5 rounded border border-white/5 h-[26px] gap-0.5">
                      <button onClick={() => setExtrudeParams(prev => ({ ...prev, direction: 'pos' }))} className={`flex-1 text-[8px] font-black rounded transition-all ${extrudeParams.direction === 'pos' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'text-white/20 hover:text-white/40'}`}>POS</button>
                      <button onClick={() => setExtrudeParams(prev => ({ ...prev, direction: 'mid' }))} className={`flex-1 text-[8px] font-black rounded transition-all ${extrudeParams.direction === 'mid' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'text-white/20 hover:text-white/40'}`}>MID</button>
                      <button onClick={() => setExtrudeParams(prev => ({ ...prev, direction: 'neg' }))} className={`flex-1 text-[8px] font-black rounded transition-all ${extrudeParams.direction === 'neg' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'text-white/20 hover:text-white/40'}`}>NEG</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none">Angle</span>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        value={revolveParams.angle}
                        onChange={(e) => setRevolveParams(prev => ({ ...prev, angle: Number(e.target.value) }))}
                        className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[11px] w-full outline-none focus:border-[#00ff88] font-bold text-[#00ff88]"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none">Axis</span>
                    <div className="flex bg-black/60 p-1 rounded border border-white/10 text-[9px] font-mono text-[#00ff88] capitalize">
                      {revolveParams.axisType === 'main' ? `${revolveParams.axisId}-Axis` : 'Sketch Line'}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none">Material</span>
                  <select 
                    value={activeMaterial}
                    onChange={(e) => setActiveMaterial(e.target.value as MaterialType)}
                    className="bg-black/60 border border-white/10 rounded px-2 py-1 text-[9px] uppercase font-bold outline-none focus:border-[#00ff88] w-full appearance-none text-[#00ff88]"
                  >
                    <option value="clay">Clay</option>
                    <option value="metal">Metal</option>
                    <option value="coal">Coal</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none">Operation</span>
                  <div className="flex bg-black/60 p-0.5 rounded border border-white/5 h-[26px]">
                    <button 
                      onClick={() => {
                        if (pendingOpType === 'extrude') setExtrudeParams(prev => ({ ...prev, opType: 'add' }));
                        else if (pendingOpType === 'revolve') setRevolveParams(prev => ({ ...prev, opType: 'add' }));
                      }} 
                      className={`flex-1 text-[8px] font-black rounded transition-all ${(pendingOpType === 'extrude' ? extrudeParams.opType : revolveParams.opType) === 'add' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'text-white/20 hover:text-white/40'}`}
                    >
                      ADD
                    </button>
                    <button 
                      onClick={() => {
                        if (pendingOpType === 'extrude') setExtrudeParams(prev => ({ ...prev, opType: 'cut' }));
                        else if (pendingOpType === 'revolve') setRevolveParams(prev => ({ ...prev, opType: 'cut' }));
                      }} 
                      className={`flex-1 text-[8px] font-black rounded transition-all ${(pendingOpType === 'extrude' ? extrudeParams.opType : revolveParams.opType) === 'cut' ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/5' : 'text-white/20 hover:text-white/40'}`}
                    >
                      CUT
                    </button>
                  </div>
                </div>
              </div>

              {/* Region List */}
              <div className="flex flex-col gap-1.5 pt-2">
                <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest leading-none border-t border-white/5 pt-3">Detected Regions</span>
                <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                  {detectedRegions.map((region) => {
                    const isSelected = selectedRegions.includes(region.id);
                    
                    return (
                      <div 
                        key={region.id}
                        onClick={() => toggleRegion(region.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-[#00ff88]/10 border-[#00ff88]/50 text-[#00ff88]' : 'bg-white/[0.02] border-white/5 text-white/30 hover:bg-white/[0.04] hover:text-white/60'}`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-tight">{region.name}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 pt-0">
              <button 
                onClick={confirmFinalOperation}
                disabled={selectedRegions.length === 0}
                className={`w-full py-3 rounded-xl transition-all font-black text-[11px] uppercase tracking-[0.2em] shadow-lg border ${selectedRegions.length > 0 ? 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/50 hover:bg-[#00ff88]/20 hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/5 text-white/10 border-white/5 cursor-not-allowed'}`}
              >
                Generate Solid
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 relative">
        <Canvas shadows>
          <color attach="background" args={['#0a0a0a']} />
          {mode === 'SKETCH' ? (
            <OrthographicCamera 
              makeDefault 
              position={activePlane === 'alzado' ? [0, 0, 100] : activePlane === 'planta' ? [0, 100, 0] : [-100, 0, 0]} 
              zoom={10} 
              near={0.1} 
              far={2000}
            />
          ) : (
            <PerspectiveCamera makeDefault position={[100, 100, 100]} fov={45} />
          )}
          
          <OrbitControls 
            ref={controlsRef}
            makeDefault 
            enabled={true} 
            enableRotate={mode === '3D'}
            enableZoom={mode !== 'SKETCH'}
            screenSpacePanning={true}
            mouseButtons={{
              LEFT: (mode === 'SKETCH' && activeTool === 'select') ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN
            }}
          />
          <ambientLight intensity={0.4} />
          <pointLight position={[100, 100, 100]} intensity={1} />
          <Environment preset="city" />

          <Suspense fallback={null}>
             <CoordinatePlane type="alzado" color="#ff4444" mode={mode} active={activePlane === 'alzado'} onClick={(e: any) => handlePlaneClick('alzado', e)} />
             <CoordinatePlane type="planta" color="#44ff44" mode={mode} active={activePlane === 'planta'} onClick={(e: any) => handlePlaneClick('planta', e)} />
             <CoordinatePlane type="lateral" color="#4444ff" mode={mode} active={activePlane === 'lateral'} onClick={(e: any) => handlePlaneClick('lateral', e)} />

             {mode === 'SKETCH' && activePlane && (
               <DrawnElements 
                 elements={currentElement ? [...sketchElements, currentElement] : sketchElements} 
                 type={activePlane} 
                 color="#22d3ee" 
                 selectedElementId={selectedElementId}
                 hoveredElementId={hoveredElementId}
                 onHoverElement={setHoveredElementId}
                 onClickElement={(elId) => handleElementClick(selectedOpId || '', elId)}
               />
             )}

              <group ref={modelGroupRef}>
                {(mode === '3D' || mode === 'REGION_SELECT' || (mode === 'SKETCH' && appSettings.show3DInSketch)) && operations.map(op => {
                  if (mode === 'SKETCH' && op.id === selectedOpId) return null;
                  return (
                    <group 
                      key={op.id}
                      onPointerOver={() => setHoveredOpId(op.id)}
                      onPointerOut={() => setHoveredOpId(null)}
                      onClick={(e) => { e.stopPropagation(); setSelectedOpId(op.id); }}
                    >
                      {op.type === 'sketch' ? (
                        <DrawnElements 
                          elements={op.sketch} 
                          type={op.params.plane || 'alzado'} 
                          color={selectedOpId === op.id ? "#22d3ee" : (hoveredOpId === op.id ? "#ffffff" : "#ffffff")} 
                          opacity={mode === 'SKETCH' ? 0.3 : 1}
                          selectedElementId={op.id === selectedOpId ? selectedElementId : null}
                          hoveredElementId={hoveredElementId}
                          onHoverElement={setHoveredElementId}
                          onClickElement={(elId) => handleElementClick(op.id, elId)}
                        />
                      ) : (
                        <SolidModel 
                          op={op} 
                          hoveredOpId={hoveredOpId} 
                          opacity={mode === 'SKETCH' ? 0.2 : 1}
                        />
                      )}
                    </group>
                  );
                })}
              </group>

             {(mode === 'SKETCH' || mode === 'REGION_SELECT') && activePlane && (
               <mesh 
                 rotation={activePlane === 'alzado' ? [0, 0, 0] : activePlane === 'planta' ? [-Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0]}
                 visible={false}
                 onPointerDown={handleCanvasClick}
                 onPointerMove={handlePointerMove}
               >
                 <planeGeometry args={[1000, 1000]} />
               </mesh>
             )}

             {mode === 'REGION_SELECT' && selectedOpId && (
                <group>
                  {operations.find(o => o.id === selectedOpId)?.sketch.map(el => (
                    <group 
                      key={el.id} 
                      onClick={(e) => { e.stopPropagation(); toggleRegion(el.id); }}
                    >
                       <DrawnElements 
                         elements={[el]} 
                         type={activePlane || 'alzado'} 
                         color={selectedRegions.includes(el.id) ? "#22d3ee" : "#ffffff"} 
                         selectedElementId={selectedElementId}
                       />
                       <mesh rotation={activePlane === 'alzado' ? [0, 0, 0] : activePlane === 'planta' ? [-Math.PI / 2, 0, 0] : [0, Math.PI / 2, 0]}>
                          {el.type === 'circle' && el.radius && (
                            <mesh position={[el.points[0][0], el.points[0][1], 0.1]}>
                               <circleGeometry args={[el.radius, 32]} />
                               <meshBasicMaterial transparent opacity={0.1} color={selectedRegions.includes(el.id) ? "#22d3ee" : "white"} depthWrite={false} />
                            </mesh>
                          )}
                       </mesh>
                    </group>
                  ))}
                </group>
              )}

              <InfiniteAxis 
                mode={mode} 
                showX={appSettings.showX}
                showY={appSettings.showY}
                showZ={appSettings.showZ}
                onClickAxis={(axis) => {
                  if (mode === 'REGION_SELECT' && pendingOpType === 'revolve') {
                    setRevolveParams(prev => ({ ...prev, axisId: axis, axisType: 'main' }));
                  }
                }} 
              />

              {mode !== 'SKETCH' && (
                <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
                   <GizmoViewport 
                     axisColors={['#ff4444', '#00ff88', '#4444ff']} 
                     labelColor="#ffffff" 
                     hideNegativeAxes
                   />
                </GizmoHelper>
              )}

              <ZoomTracker setZoom={setZoom} />
              <ZoomHandler />

             <CameraController targetView={mode === 'SKETCH' ? activePlane : null} onAnimationComplete={() => {}} />
               {mode === 'SKETCH' && activePlane && snapPoint && activeTool !== 'select' && (
                 <Html
                   position={[
                     activePlane === 'alzado' ? snapPoint[0] : (activePlane === 'lateral' ? 0.5 : snapPoint[0]),
                     activePlane === 'alzado' ? snapPoint[1] : (activePlane === 'planta' ? 0.5 : snapPoint[1]),
                     activePlane === 'planta' ? -snapPoint[1] : (activePlane === 'lateral' ? -snapPoint[0] : 0.5)
                   ]}
                   center
                   style={{
                     pointerEvents: 'none',
                     userSelect: 'none'
                   }}
                 >
                    <div className="flex flex-col items-start" style={{ transform: 'translate(28px, -28px)' }}>
                      <div className="bg-[#121212]/90 border border-[#00ff88]/40 px-2 py-1 rounded shadow-2xl backdrop-blur-md">
                        <span className="text-[#00ff88] font-mono text-[10px] font-black tracking-widest whitespace-nowrap">
                          [{snapPoint[0].toFixed(0)}, {snapPoint[1].toFixed(0)}]
                        </span>
                      </div>
                      <div className="w-[28px] h-px bg-[#00ff88]/40 -translate-x-[28px] translate-y-4 origin-left -rotate-45" />
                    </div>
                 </Html>
               )}

               {snapPoint && activePlane && activeTool !== 'select' && (
                 <Html
                   position={[
                     activePlane === 'alzado' ? snapPoint[0] : (activePlane === 'lateral' ? 0 : snapPoint[0]),
                     activePlane === 'alzado' ? snapPoint[1] : (activePlane === 'planta' ? 0 : snapPoint[1]),
                     activePlane === 'planta' ? -snapPoint[1] : (activePlane === 'lateral' ? -snapPoint[0] : 0)
                   ]}
                   center
                   style={{ pointerEvents: 'none', userSelect: 'none' }}
                 >
                   <div className="w-4 h-4 bg-[#0078d4] rounded-full shadow-[0_0_15px_#0078d4] border-2 border-[#0078d4] ring-2 ring-white/40" />
                 </Html>
               )}

          </Suspense>
        </Canvas>


        {selectedElementId && (
          <div 
            className="absolute z-[100] w-64 bg-[#1a1a1a]/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in duration-300 overflow-hidden"
            style={{ left: dimHUDPos.x, top: dimHUDPos.y }}
          >
            {/* Header / Drag Handle */}
            <div 
              className="flex items-center justify-between p-4 border-b border-white/5 cursor-move active:cursor-grabbing bg-white/[0.02]"
              onMouseDown={(e) => {
                const startX = e.clientX - dimHUDPos.x;
                const startY = e.clientY - dimHUDPos.y;
                const onMouseMove = (moveEvent: MouseEvent) => {
                  setDimHUDPos({ x: moveEvent.clientX - startX, y: moveEvent.clientY - startY });
                };
                const onMouseUp = () => {
                  window.removeEventListener('mousemove', onMouseMove);
                  window.removeEventListener('mouseup', onMouseUp);
                };
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
              }}
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#00ff88]/10 rounded-lg border border-[#00ff88]/20">
                  <BoxSelect className="w-3.5 h-3.5 text-[#00ff88]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/90 leading-tight">Dimension Editor</span>
                  <span className="text-[7px] text-white/30 uppercase font-bold tracking-widest">Parameter control</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {selectedElementId === 'temp' ? (
                  <button 
                    onClick={() => commitCurrentElement()} 
                    className="p-1.5 bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 border border-[#00ff88]/30 rounded-lg transition-all"
                    title="Confirm (Enter)"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button 
                    onClick={() => deleteSelectedElement()}
                    className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group"
                    title="Delete (Backspace/Delete)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white/20 group-hover:text-red-400" />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedElementId(null)}
                  className="p-1.5 hover:bg-white/5 rounded-lg transition-colors group"
                >
                  <X className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {(() => {
                const op = mode === 'SKETCH' ? null : operations.find(o => o.id === selectedOpId);
                let el = mode === 'SKETCH' 
                  ? sketchElements.find(e => e.id === selectedElementId)
                  : op?.sketch.find(e => e.id === selectedElementId);
                
                if (selectedElementId === 'temp' && currentElement) {
                  el = currentElement;
                }

                if (!el) return null;

                if (el.type === 'circle') {
                  const centerX = el.points[0][0];
                  const centerY = el.points[0][1];
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Center X (mm)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={centerX.toFixed(2)} 
                            onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateElementDimension(op?.id || null, el.id!, { points: [[val, centerY]] });
                            }}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 transition-all placeholder:text-white/10 font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Center Y (mm)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={centerY.toFixed(2)} 
                            onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              updateElementDimension(op?.id || null, el.id!, { points: [[centerX, val]] });
                            }}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 transition-all placeholder:text-white/10 font-bold"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Radius (mm)</label>
                        <input 
                          ref={hudInputRef}
                          type="number" 
                          step="0.1"
                          value={el.radius || 0} 
                          onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                          onChange={(e) => updateElementDimension(op?.id || null, el.id!, { radius: Number(e.target.value) })}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 transition-all placeholder:text-white/10 font-bold"
                        />
                      </div>
                    </div>
                  );
                }

                if (el.type === 'polygon') {
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Radius (mm)</label>
                          <input 
                            ref={hudInputRef}
                            type="number" 
                            step="0.1"
                            value={el.radius || 0} 
                            onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                            onChange={(e) => updateElementDimension(op?.id || null, el.id!, { radius: Number(e.target.value) })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 font-bold transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Sides</label>
                          <input 
                            type="number" 
                            min="3"
                            max="24"
                            value={el.sides || 6} 
                            onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                            onChange={(e) => updateElementDimension(op?.id || null, el.id!, { sides: Math.max(3, Math.min(24, Number(e.target.value))) })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 font-bold transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                if (el.type === 'rectangle' || el.type === 'center-rectangle') {
                  const isCenter = el.type === 'center-rectangle';
                  const dx = Math.abs(el.points[1][0] - el.points[0][0]);
                  const dy = Math.abs(el.points[1][1] - el.points[0][1]);
                  const w = isCenter ? dx * 2 : dx;
                  const h = isCenter ? dy * 2 : dy;

                  return (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Width (mm)</label>
                          <input 
                            ref={hudInputRef}
                            type="number" 
                            step="0.1"
                            value={w.toFixed(2)} 
                            onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (isNaN(val) || val <= 0) return;
                              const newDx = isCenter ? val / 2 : val;
                              const signX = el!.points[1][0] >= el!.points[0][0] ? 1 : -1;
                              const newX = el!.points[0][0] + newDx * (isNaN(signX) ? 1 : signX);
                              updateElementDimension(op?.id || null, el!.id!, { points: [[...el!.points[0]], [newX, el!.points[1][1]]] });
                            }}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 font-bold transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Height (mm)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={h.toFixed(2)} 
                            onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              if (isNaN(val) || val <= 0) return;
                              const newDy = isCenter ? val / 2 : val;
                              const signY = el!.points[1][1] >= el!.points[0][1] ? 1 : -1;
                              const newY = el!.points[0][1] + newDy * signY;
                              updateElementDimension(op?.id || null, el!.id!, { points: [[...el!.points[0]], [el!.points[1][0], newY]] });
                            }}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 font-bold transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-2.5 border-t border-white/5 pt-4">
                        <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Corner Style</label>
                        <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                          {(['none', 'chamfer', 'rounded'] as const).map(type => (
                            <button
                              key={type}
                              onClick={() => updateElementDimension(op?.id || null, el!.id!, { cornerType: type })}
                              className={`py-2 px-1 rounded-lg text-[7px] uppercase font-black tracking-widest transition-all ${el!.cornerType === type || (!el!.cornerType && type === 'none') ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'text-white/30 hover:bg-white/5 hover:text-white/60'}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      {(el.cornerType && el.cornerType !== 'none') && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                          <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Radius (mm)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={el.cornerRadius || 0} 
                            onChange={(e) => updateElementDimension(op?.id || null, el!.id!, { cornerRadius: Number(e.target.value) })}
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 font-bold transition-all"
                          />
                        </div>
                      )}
                    </div>
                  );
                }

                if (el.type === 'line' && el.points.length === 2) {
                  const [p1, p2] = el.points;
                  const length = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));

                  return (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Length (mm)</label>
                        <input 
                          ref={hudInputRef}
                          type="number" 
                          step="0.1"
                          value={length.toFixed(2)} 
                          onKeyDown={(e) => e.key === 'Enter' && commitCurrentElement()}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            if (isNaN(val) || val <= 0) return;
                            if (length < 0.001) {
                              updateElementDimension(op?.id || null, el!.id!, { points: [p1, [p1[0] + val, p1[1]]] });
                              return;
                            }
                            const dx = (p2[0] - p1[0]) / length;
                            const dy = (p2[1] - p1[1]) / length;
                            updateElementDimension(op?.id || null, el!.id!, { points: [p1, [p1[0] + dx * val, p1[1] + dy * val]] });
                          }}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/40 font-bold transition-all"
                        />
                      </div>
                    </div>
                  );
                }

                if (el.type === 'arc' && el.points.length === 3) {
                  const [p1, p2, p3] = el.points;
                  const x1 = p1[0], y1 = p1[1];
                  const x2 = p2[0], y2 = p2[1];
                  const x3 = p3[0], y3 = p3[1];
                  
                  const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
                  let radius = 0;
                  if (Math.abs(D) > 0.0001) {
                    const cx = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
                    const cy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
                    radius = Math.sqrt((x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy));
                  }

                  return (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[7px] font-black uppercase tracking-[0.2em] text-white/30 ml-0.5">Radius (mm)</label>
                        <div className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-xs font-mono text-[#00ff88]/60 transition-all">
                          {radius.toFixed(2)}
                        </div>
                        <p className="text-[7px] text-white/20 uppercase font-bold tracking-widest mt-2 px-1">Radius is derived from 3-point geometry</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {menuPos && (
          <div 
            className="absolute z-50 bg-[#1a1a1a]/95 border border-white/10 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200 min-w-[200px]"
            style={{ left: menuPos.x + 15, top: menuPos.y + 15 }}
          >
            <div className="px-4 py-2 border-b border-white/5 mb-2">
               <span className="text-[10px] uppercase tracking-widest font-black text-white/30 font-mono italic">Select: {activePlane} plane</span>
            </div>
            <div className="p-1 space-y-2">
              <button 
                onClick={enterSketchMode} 
                className="w-full flex items-center gap-3 px-5 py-4 bg-[#1a1a1a] border border-[#00ff88]/30 text-[#00ff88] text-[10px] font-mono font-black uppercase tracking-widest rounded-xl hover:bg-[#00ff88]/10 hover:border-[#00ff88]/60 transition-all shadow-lg shadow-[#00ff88]/5 group"
              >
                <Pencil className="w-4 h-4 transition-transform group-hover:scale-110" /> 
                <span>New Sketch</span>
              </button>
              
              <button 
                onClick={() => setMenuPos(null)} 
                className="w-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {mode === 'SKETCH' && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-[#1a1a1a]/95 border border-white/10 rounded-2xl px-8 py-4 backdrop-blur-2xl flex items-center gap-8 shadow-2xl border-b-[#00ff88]/50">
             <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-widest text-white/30 font-black font-mono">Active Sketch</span>
                <span className="text-[#00ff88] text-xs font-mono font-black uppercase tracking-tighter italic">{activeTool} tool</span>
             </div>
             <div className="flex items-center gap-3">
               <button 
                 onClick={finishSketch} 
                 className="px-8 py-2.5 bg-[#1a1a1a] border border-[#00ff88]/30 text-[#00ff88] text-[10px] font-mono font-black uppercase tracking-widest rounded-xl hover:bg-[#00ff88]/10 hover:border-[#00ff88]/60 transition-all shadow-lg shadow-[#00ff88]/5"
               >
                 Finish
               </button>
             </div>
          </div>
        )}
      </div>

      <div className="w-80 bg-[#1e1e1e]/95 border-l border-white/5 backdrop-blur-3xl flex flex-col shadow-2xl z-40 relative">
        <div className="flex border-b border-white/5 bg-white/[0.02]">
          <button 
            onClick={() => setSidebarTab('features')}
            className={`flex-1 flex items-center justify-center gap-2 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'features' ? 'text-[#00ff88] bg-[#00ff88]/5 border-b-2 border-[#00ff88]' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
          >
            <Settings className="w-3.5 h-3.5" /> Feature Tree
          </button>
          <button 
            onClick={() => setSidebarTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'settings' ? 'text-[#00ff88] bg-[#00ff88]/5 border-b-2 border-[#00ff88]' : 'text-white/20 hover:text-white/40 hover:bg-white/5'}`}
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {sidebarTab === 'features' ? (
            <div className="space-y-2">
              {operations.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center gap-4 text-center opacity-30">
                    <Box className="w-10 h-10 text-white/20" />
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 px-12">No features defined</p>
                </div>
              ) : (
                operations.filter(op => !op.parentId).map((op) => {
                  const children = operations.filter(child => child.parentId === op.id);
                  
                  return (
                    <div key={op.id} className="space-y-1">
                        <div 
                          onClick={() => setSelectedOpId(op.id === selectedOpId ? null : op.id)}
                          onMouseEnter={() => setHoveredOpId(op.id)}
                          onMouseLeave={() => setHoveredOpId(null)}
                          className={`p-4 border rounded-xl transition-all group cursor-pointer shadow-sm ${selectedOpId === op.id ? 'bg-[#00ff88]/10 border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'bg-white/[0.03] border-white/5 hover:border-white/20'}`}
                        >
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${selectedOpId === op.id ? 'text-[#00ff88]' : 'text-white/40 group-hover:text-white/70'}`}>{op.name}</span>
                              <ChevronRight className={`w-3 h-3 transition-transform ${selectedOpId === op.id ? 'text-[#00ff88] rotate-90' : 'text-white/10 group-hover:text-white/30'}`} />
                            </div>
                        </div>
                        
                        {children.map(child => (
                          <div key={child.id} className="ml-6 border-l border-white/5 pl-4 py-1">
                            <div 
                              onClick={() => setSelectedOpId(child.id === selectedOpId ? null : child.id)}
                              className={`p-2 rounded-lg transition-all text-[9px] uppercase font-bold tracking-widest cursor-pointer ${selectedOpId === child.id ? 'bg-[#00ff88]/5 text-[#00ff88] border border-[#00ff88]/20' : 'bg-white/5 text-white/20 hover:text-white/40'}`}
                            >
                              {child.name}
                            </div>
                          </div>
                        ))}

                        {op.type === 'extrude' && selectedOpId === op.id && (
                          <div className="ml-6 border-l border-white/5 pl-4 py-3 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Depth (mm)</span>
                              <input 
                                type="number" 
                                value={op.params.depth || 10} 
                                onChange={(e) => updateOperationParams(op.id, { depth: Number(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[11px] font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/50 transition-all hover:bg-white/10"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Direction</span>
                              <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 gap-1">
                                {(['pos', 'mid', 'neg'] as const).map(dir => (
                                  <button
                                    key={dir}
                                    onClick={() => updateOperationParams(op.id, { direction: dir })}
                                    className={`flex-1 py-1.5 rounded-md text-[8px] font-black uppercase transition-all ${op.params.direction === dir ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'text-white/20 hover:bg-white/5 hover:text-white/40'}`}
                                  >
                                    {dir}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Operation</span>
                              <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 gap-1">
                                {(['add', 'cut'] as const).map(type => (
                                  <button
                                    key={type}
                                    onClick={() => updateOperationParams(op.id, { opType: type })}
                                    className={`flex-1 py-1.5 rounded-md text-[8px] font-black uppercase transition-all ${op.params.opType === type || (!op.params.opType && type === 'add') ? (type === 'add' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/5') : 'text-white/20 hover:bg-white/5 hover:text-white/40'}`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/5">
                              <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Source Sketch</span>
                              <div className="text-[9px] text-white/40 mt-1 flex items-center gap-2">
                                <Pencil className="w-3 h-3" /> {op.sketch.length} regions selected
                              </div>
                            </div>
                          </div>
                        )}

                        {op.type === 'revolve' && selectedOpId === op.id && (
                          <div className="ml-6 border-l border-white/5 pl-4 py-3 space-y-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Angle</span>
                              <input 
                                type="number" 
                                value={op.params.angle || 360} 
                                onChange={(e) => updateOperationParams(op.id, { angle: Number(e.target.value) })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-[11px] font-mono text-[#00ff88] focus:outline-none focus:border-[#00ff88]/50 transition-all hover:bg-white/10"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Operation</span>
                              <div className="flex bg-white/5 p-1 rounded-lg border border-white/5 gap-1">
                                {(['add', 'cut'] as const).map(type => (
                                  <button
                                    key={type}
                                    onClick={() => updateOperationParams(op.id, { opType: type })}
                                    className={`flex-1 py-1.5 rounded-md text-[8px] font-mono font-black uppercase transition-all ${op.params.opType === type || (!op.params.opType && type === 'add') ? (type === 'add' ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-lg shadow-[#00ff88]/5' : 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg shadow-red-500/5') : 'text-white/10 hover:bg-white/5 hover:text-white/40'}`}
                                  >
                                    {type}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-white/5">
                              <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Source Sketch</span>
                              <div className="text-[9px] text-white/40 mt-1 flex items-center gap-2">
                                <Pencil className="w-3 h-3" /> {op.sketch.length} regions selected
                              </div>
                            </div>
                          </div>
                        )}

                        {op.type === 'sketch' && selectedOpId === op.id && (
                          <div className="ml-6 border-l border-white/5 pl-4 py-2 space-y-2">
                            {op.sketch.map((el, i) => (
                              <div 
                                key={el.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedElementId(el.id === selectedElementId ? null : el.id); }}
                                className={`p-2 rounded-lg border text-[8px] font-mono uppercase font-bold tracking-widest cursor-pointer transition-all ${selectedElementId === el.id ? 'bg-[#00ff88]/10 border-[#00ff88]/40 text-[#00ff88]' : 'bg-white/5 border-white/5 text-white/30 hover:text-white/50'}`}
                              >
                                {el.type} {i + 1}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff88]/60 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" />
                   Project Units
                </h3>
                <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 gap-1">
                   {(['mm', 'in'] as const).map(unit => (
                      <button
                        key={unit}
                        onClick={() => setAppSettings(prev => ({ ...prev, units: unit }))}
                        className={`flex-1 py-2.5 rounded-lg text-[9px] font-black uppercase transition-all ${appSettings.units === unit ? 'bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30 shadow-lg shadow-[#00ff88]/5' : 'text-white/20 hover:bg-white/5'}`}
                      >
                        {unit}
                      </button>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff88]/60 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" />
                   Axis Visibility
                </h3>
                <div className="grid grid-cols-3 gap-2">
                   {([['X', 'showX'], ['Y', 'showY'], ['Z', 'showZ']] as const).map(([label, key]) => (
                      <button
                        key={key}
                        onClick={() => setAppSettings(prev => ({ ...prev, [key]: !prev[key as keyof typeof appSettings] }))}
                        className={`py-3 rounded-xl border text-[10px] font-black transition-all ${appSettings[key as keyof typeof appSettings] ? 'bg-[#00ff88]/10 border-[#00ff88]/30 text-[#00ff88] shadow-lg shadow-[#00ff88]/5' : 'bg-white/5 border-white/5 text-white/20 hover:border-white/20'}`}
                      >
                        {label}
                      </button>
                   ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[#00ff88]/60 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" />
                   Display Settings
                </h3>
                <button
                  onClick={() => setAppSettings(prev => ({ ...prev, show3DInSketch: !prev.show3DInSketch }))}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${appSettings.show3DInSketch ? 'bg-[#00ff88]/10 border-[#00ff88]/30 shadow-lg shadow-[#00ff88]/5' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                >
                  <span className={`text-[9px] font-black uppercase tracking-widest ${appSettings.show3DInSketch ? 'text-[#00ff88]' : 'text-white/30'}`}>Show 3D Background</span>
                  <div className={`w-8 h-4 rounded-full relative transition-colors ${appSettings.show3DInSketch ? 'bg-[#00ff88]/40' : 'bg-white/10'}`}>
                    <div className={`absolute top-1 w-2 h-2 rounded-full transition-all ${appSettings.show3DInSketch ? 'right-1 bg-[#00ff88]' : 'left-1 bg-white/20'}`} />
                  </div>
                </button>
                <p className="text-[8px] text-white/20 leading-relaxed px-1">
                  When enabled, other 3D elements will be visible (dimmed) while sketching on a plane.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/[0.02] border-t border-white/5 space-y-3">
            <button 
              onClick={startExtrude}
              disabled={!selectedOpId || mode !== '3D'}
              className={`w-full flex items-center justify-between px-6 py-4 border rounded-2xl transition-all group shadow-sm ${selectedOpId && mode === '3D' ? 'bg-[#1a1a1a] border-[#00ff88]/30 hover:border-[#00ff88]/60 hover:bg-[#00ff88]/5' : 'bg-[#1a1a1a] border-white/5 opacity-40 cursor-not-allowed'}`}
            >
              <div className="flex flex-col items-start gap-0">
                <span className={`text-[10px] font-mono font-black uppercase tracking-[0.2em] transition-colors ${selectedOpId ? 'text-white/40 group-hover:text-[#00ff88]' : 'text-white/10'}`}>Extrude Sketch</span>
                <span className="text-[7px] text-white/20 uppercase font-mono tracking-widest">Linear Solid</span>
              </div>
              <Box className={`w-5 h-5 transition-colors ${selectedOpId ? 'text-white/10 group-hover:text-[#00ff88]' : 'text-white/5'}`} />
            </button>
            <button 
              onClick={startRevolve}
              disabled={!selectedOpId || mode !== '3D'}
              className={`w-full flex items-center justify-between px-6 py-4 border rounded-2xl transition-all group shadow-sm ${selectedOpId && mode === '3D' ? 'bg-[#1a1a1a] border-[#00ff88]/30 hover:border-[#00ff88]/60 hover:bg-[#00ff88]/5' : 'bg-[#1a1a1a] border-white/5 opacity-40 cursor-not-allowed'}`}
            >
              <div className="flex flex-col items-start gap-0">
                <span className={`text-[10px] font-mono font-black uppercase tracking-[0.2em] transition-colors ${selectedOpId ? 'text-white/40 group-hover:text-[#00ff88]' : 'text-white/10'}`}>Revolve Sketch</span>
                <span className="text-[7px] text-white/20 uppercase font-mono tracking-widest">Rotational Solid</span>
              </div>
              <IterationCcw className={`w-5 h-5 transition-colors ${selectedOpId ? 'text-white/10 group-hover:text-[#00ff88]' : 'text-white/5'}`} />
            </button>
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="w-full flex items-center justify-between px-6 py-5 border border-[#00ff88]/30 rounded-2xl transition-all group shadow-sm bg-[#1a1a1a] hover:bg-[#00ff88]/5 hover:border-[#00ff88]/60"
            >
               <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#00ff88]">Export to Explorer</span>
               <Share2 className="w-5 h-5 text-[#00ff88]" />
            </button>
        </div>
      </div>

      {isExportModalOpen && (
        <div className="fixed top-0 left-0 w-screen h-screen z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden">
          <div className="w-[400px] bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-left">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#00ff88]/10 rounded-xl border border-[#00ff88]/20">
                  <Share2 className="w-5 h-5 text-[#00ff88]" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Export Part</h3>
                  <p className="text-[10px] text-[#00ff88] font-mono font-black italic">Provide a name for your custom model</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-widest text-white/30 ml-1">Part Name</label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && exportName.trim() && handleExport()}
                    className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00ff88]/50 transition-colors font-mono"
                    placeholder="Enter part name..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || !exportName.trim()}
                  className="flex-1 py-4 bg-[#1a1a1a] border border-[#00ff88]/30 text-[#00ff88] text-[10px] font-mono font-black uppercase tracking-widest rounded-2xl hover:bg-[#00ff88]/10 hover:border-[#00ff88]/60 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#00ff88]/5"
                >
                  {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
