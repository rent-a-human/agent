import { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text as ThreeText, Line as ThreeLine, Html } from '@react-three/drei';
import * as THREE from 'three';

export type PlaneType = 'alzado' | 'planta' | 'lateral';
export type MaterialType = 'clay' | 'metal' | 'coal' | 'glass';
export type Mode = '3D' | 'SKETCH' | 'REGION_SELECT';
export type Tool = 'select' | 'point' | 'line' | 'polyline' | 'circle' | 'rectangle' | 'center-rectangle' | 'polygon' | 'arc' | 'dimension';

export interface SketchElement {
  id: string;
  type: 'line' | 'polyline' | 'circle' | 'point' | 'rectangle' | 'center-rectangle' | 'polygon' | 'arc' | 'dimension';
  points: [number, number][]; // 2D coordinates relative to plane
  radius?: number;
  cornerType?: 'none' | 'chamfer' | 'rounded';
  cornerRadius?: number;
  sides?: number;
}

export interface Operation {
  id: string;
  name: string;
  type: 'sketch' | 'extrude' | 'revolve';
  sketch: SketchElement[];
  parentId?: string;
  params: {
    depth?: number;
    direction?: 'pos' | 'neg' | 'mid';
    plane?: PlaneType;
    material?: MaterialType;
    opType?: 'add' | 'cut';
    angle?: number;
    axisId?: string;
    axisType?: 'main' | 'sketch';
  };
}

export const CoordinatePlane = ({ 
  type, 
  color, 
  onHover, 
  onClick, 
  active,
  mode
}: { 
  type: PlaneType; 
  color: string; 
  onHover?: (hovered: boolean) => void; 
  onClick: (e: any) => void;
  active: boolean;
  mode: Mode;
}) => {
  const [hovered, setHovered] = useState(false);

  const rotation: [number, number, number] = useMemo(() => {
    switch (type) {
      case 'alzado': return [0, 0, 0]; // XY
      case 'planta': return [-Math.PI / 2, 0, 0]; // XZ
      case 'lateral': return [0, Math.PI / 2, 0]; // YZ
      default: return [0, 0, 0];
    }
  }, [type]);

  const label = useMemo(() => {
    switch (type) {
      case 'alzado': return 'Alzado (XY)';
      case 'planta': return 'Planta (XZ)';
      case 'lateral': return 'Lateral (YZ)';
    }
  }, [type]);

  return (
    <group 
      rotation={rotation}
      onPointerOver={(e) => { e.stopPropagation(); if (mode === '3D') { setHovered(true); onHover?.(true); } }}
      onPointerOut={() => { setHovered(false); onHover?.(false); }}
      onClick={(e) => { e.stopPropagation(); if (mode === '3D') onClick(e); }}
    >
      <mesh raycast={mode === '3D' ? undefined : () => null}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={active ? 0.15 : (hovered ? 0.08 : 0.015)} 
          side={THREE.DoubleSide} 
          depthWrite={false}
        />
      </mesh>
      <ThreeLine 
        points={[
          new THREE.Vector3(-50, -50, 0),
          new THREE.Vector3(50, -50, 0),
          new THREE.Vector3(50, 50, 0),
          new THREE.Vector3(-50, 50, 0),
          new THREE.Vector3(-50, -50, 0)
        ]}
        color={active ? "#00ff88" : color}
        lineWidth={3}
        transparent
        opacity={active ? 0.3 : (hovered ? 0.15 : 0.05)}
        raycast={() => null}
      />
      <ThreeLine 
        points={[
          new THREE.Vector3(-50, -50, 0),
          new THREE.Vector3(50, -50, 0),
          new THREE.Vector3(50, 50, 0),
          new THREE.Vector3(-50, 50, 0),
          new THREE.Vector3(-50, -50, 0)
        ]}
        color={active ? "#00ff88" : (hovered ? "#ffffff" : color)}
        lineWidth={1}
        raycast={mode === '3D' ? undefined : () => null}
        transparent
        opacity={active ? 0.8 : 0.4}
      />
      <ThreeText
        raycast={mode === '3D' ? undefined : () => null}
        position={[45, 45, 1]}
        fontSize={1.8}
        color={active ? "#00ff88" : "#ffffff"}
        fillOpacity={active ? 1 : 0.4}
        outlineWidth={0.1}
        outlineColor={active ? "#00ff88" : color}
        outlineOpacity={0.4}
        font="/agent/fonts/SpaceMono-Regular.ttf"
        anchorX="right"
        anchorY="top"
      >
        {label}
      </ThreeText>
    </group>
  );
};
export const InfiniteAxis = ({ onClickAxis, mode, showX = true, showY = true, showZ = true }: { 
  onClickAxis?: (axis: 'x' | 'y' | 'z') => void, 
  mode?: Mode,
  showX?: boolean,
  showY?: boolean,
  showZ?: boolean
}) => {
  const [hoveredAxis, setHoveredAxis] = useState<string | null>(null);
  
  const pointsX = useMemo(() => [new THREE.Vector3(-2000, 0, 0), new THREE.Vector3(2000, 0, 0)], []);
  const pointsY = useMemo(() => [new THREE.Vector3(0, -2000, 0), new THREE.Vector3(0, 2000, 0)], []);
  const pointsZ = useMemo(() => [new THREE.Vector3(0, 0, -2000), new THREE.Vector3(0, 0, 2000)], []);

  return (
    <group>
      {showX && (
        <ThreeLine 
          points={pointsX} 
          color={hoveredAxis === 'x' ? "#00ff88" : "#ff4444"} 
          lineWidth={1.2} 
          dashed 
          dashSize={1} 
          gapSize={1} 
          transparent 
          opacity={hoveredAxis === 'x' ? 0.7 : 0.2} 
          depthTest={false}
          onPointerOver={mode === 'SKETCH' ? undefined : (e) => { e.stopPropagation(); setHoveredAxis('x'); }}
          onPointerOut={mode === 'SKETCH' ? undefined : () => setHoveredAxis(null)}
          onClick={mode === 'SKETCH' ? undefined : (e) => { e.stopPropagation(); onClickAxis?.('x'); }}
          raycast={mode === 'SKETCH' ? () => null : undefined}
        />
      )}
      {showY && (
        <ThreeLine 
          points={pointsY} 
          color={hoveredAxis === 'y' ? "#22d3ee" : "#44ff44"} 
          lineWidth={1.2} 
          dashed 
          dashSize={1} 
          gapSize={1} 
          transparent 
          opacity={hoveredAxis === 'y' ? 0.7 : 0.2} 
          depthTest={false}
          onPointerOver={mode === 'SKETCH' ? undefined : (e) => { e.stopPropagation(); setHoveredAxis('y'); }}
          onPointerOut={mode === 'SKETCH' ? undefined : () => setHoveredAxis(null)}
          onClick={mode === 'SKETCH' ? undefined : (e) => { e.stopPropagation(); onClickAxis?.('y'); }}
          raycast={mode === 'SKETCH' ? () => null : undefined}
        />
      )}
      {showZ && (
        <ThreeLine 
          points={pointsZ} 
          color={hoveredAxis === 'z' ? "#22d3ee" : "#4444ff"} 
          lineWidth={1.2} 
          dashed 
          dashSize={1} 
          gapSize={1} 
          transparent 
          opacity={hoveredAxis === 'z' ? 0.7 : 0.2} 
          depthTest={false}
          onPointerOver={mode === 'SKETCH' ? undefined : (e) => { e.stopPropagation(); setHoveredAxis('z'); }}
          onPointerOut={mode === 'SKETCH' ? undefined : () => setHoveredAxis(null)}
          onClick={mode === 'SKETCH' ? undefined : (e) => { e.stopPropagation(); onClickAxis?.('z'); }}
          raycast={mode === 'SKETCH' ? () => null : undefined}
        />
      )}
    </group>
  );
};

const AxisDimensions = ({ point, isSelected }: { point: [number, number], isSelected: boolean }) => {
  if (!isSelected) return null;
  const [x, y] = point;
  
  return (
    <group>
      {/* Horizontal distance line (distance to Y axis) */}
      <group>
        <ThreeLine 
          points={[new THREE.Vector3(0, y, 0.1), new THREE.Vector3(x, y, 0.1)]} 
          color="#00ff88" 
          lineWidth={0.5} 
          transparent 
          opacity={0.4} 
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
        <Html position={[x / 2, y, 0.15]} center pointerEvents="none">
          <div className="bg-[#121212]/90 backdrop-blur-md border border-[#00ff88]/30 px-1 py-0.5 rounded-[4px] text-[7px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-lg shadow-black/50">
            {Math.abs(x).toFixed(1)}
          </div>
        </Html>
      </group>
      {/* Vertical distance line (distance to X axis) */}
      <group>
        <ThreeLine 
          points={[new THREE.Vector3(x, 0, 0.1), new THREE.Vector3(x, y, 0.1)]} 
          color="#00ff88" 
          lineWidth={0.5} 
          transparent 
          opacity={0.4} 
          dashed
          dashSize={0.5}
          gapSize={0.3}
        />
        <Html position={[x, y / 2, 0.15]} center pointerEvents="none">
          <div className="bg-[#121212]/90 backdrop-blur-md border border-[#00ff88]/30 px-1 py-0.5 rounded-[4px] text-[7px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-lg shadow-black/50">
            {Math.abs(y).toFixed(1)}
          </div>
        </Html>
      </group>
    </group>
  );
};

export const CameraController = ({ targetView, onAnimationComplete }: { targetView: PlaneType | null, onAnimationComplete: () => void }) => {
  const { camera, controls } = useThree() as any;
  const animating = useRef(false);

  useFrame(() => {
    if (!targetView || !animating.current) return;

    let targetPos = new THREE.Vector3();
    let targetUp = new THREE.Vector3(0, 1, 0);

    switch (targetView) {
      case 'alzado': targetPos.set(0, 0, 150); targetUp.set(0, 1, 0); break;
      case 'planta': targetPos.set(0, 150, 0); targetUp.set(0, 0, -1); break;
      case 'lateral': targetPos.set(150, 0, 0); targetUp.set(0, 1, 0); break;
    }

    camera.position.lerp(targetPos, 0.1);
    camera.up.lerp(targetUp, 0.1);
    controls?.target?.lerp(new THREE.Vector3(0, 0, 0), 0.1);

    if (camera.position.distanceTo(targetPos) < 1) {
      animating.current = false;
      onAnimationComplete();
    }
  });

  useEffect(() => {
    if (targetView) animating.current = true;
  }, [targetView]);

  return null;
};

export const DrawnElements = ({ 
  elements, 
  type, 
  color, 
  opacity = 1,
  selectedElementId,
  hoveredElementId,
  onHoverElement,
  onClickElement
}: { 
  elements: SketchElement[], 
  type: PlaneType, 
  color: string, 
  opacity?: number,
  selectedElementId?: string | null,
  hoveredElementId?: string | null,
  onHoverElement?: (id: string | null) => void,
  onClickElement?: (id: string) => void
}) => {
  const rotation: [number, number, number] = useMemo(() => {
    switch (type) {
      case 'alzado': return [0, 0, 0];
      case 'planta': return [-Math.PI / 2, 0, 0];
      case 'lateral': return [0, Math.PI / 2, 0];
      default: return [0, 0, 0];
    }
  }, [type]);

  return (
    <group rotation={rotation}>
      {elements.map(el => {
        if (el.type === 'dimension' && el.points.length === 2) {
          const [p1, p2] = el.points;
          const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
          const dist = Math.sqrt((p2[0] - p1[0])**2 + (p2[1] - p1[1])**2);
          
          return (
            <group key={el.id}>
              <ThreeLine 
                points={[new THREE.Vector3(p1[0], p1[1], 0.2), new THREE.Vector3(p2[0], p2[1], 0.2)]} 
                color="#00ff88" 
                lineWidth={0.5} 
                transparent 
                opacity={0.4} 
                dashed
                dashSize={1}
                gapSize={0.5}
              />
              <Html position={[mid[0], mid[1], 0.3]} center pointerEvents="none">
                <div className="bg-[#121212]/90 border border-[#00ff88]/30 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-xl">
                  {dist.toFixed(2)}mm
                </div>
              </Html>
            </group>
          );
        }

        if (el.type === 'point' && el.points[0]) {
          const isSelected = el.id === selectedElementId;
          const isHovered = el.id === hoveredElementId;
          const finalColor = isSelected ? "#00ff88" : (isHovered ? "#0e7490" : color);

          return (
            <group key={el.id}>
              <mesh 
                position={[el.points[0][0], el.points[0][1], 0.2]}
                onPointerOver={(e) => { e.stopPropagation(); onHoverElement?.(el.id); }}
                onPointerOut={(e) => { e.stopPropagation(); onHoverElement?.(null); }}
                onClick={(e) => { e.stopPropagation(); onClickElement?.(el.id); }}
              >
                <circleGeometry args={[0.5, 16]} />
                <meshBasicMaterial color={finalColor} transparent opacity={opacity} />
              </mesh>
              {isSelected && <AxisDimensions point={el.points[0]} isSelected={isSelected} />}
            </group>
          );
        }
        if ((el.type === 'line' || el.type === 'polyline') && el.points.length > 1) {
          const isSelected = el.id === selectedElementId;
          const isHovered = el.id === hoveredElementId;
          const finalColor = isSelected ? "#00ff88" : (isHovered ? "#0e7490" : color);
          const pts = el.points.map(p => new THREE.Vector3(p[0], p[1], 0.2));
          return (
            <group
              key={el.id}
              onPointerOver={(e) => { e.stopPropagation(); onHoverElement?.(el.id); }}
              onPointerOut={(e) => { e.stopPropagation(); onHoverElement?.(null); }}
              onClick={(e) => { e.stopPropagation(); onClickElement?.(el.id); }}
            >
              <ThreeLine points={pts} color={finalColor} lineWidth={0.8} transparent opacity={opacity} />
              {isSelected && el.points.length === 2 && el.type === 'line' && (
                <>
                  <Html position={[((pts[0].x + pts[1].x) / 2), ((pts[0].y + pts[1].y) / 2), 0.3]} center pointerEvents="none">
                    <div className="bg-[#121212]/90 border border-[#00ff88]/30 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-xl">
                      {Math.sqrt((el.points[1][0] - el.points[0][0])**2 + (el.points[1][1] - el.points[0][1])**2).toFixed(1)}mm
                    </div>
                  </Html>
                  <AxisDimensions point={el.points[0]} isSelected={isSelected} />
                  <AxisDimensions point={el.points[1]} isSelected={isSelected} />
                </>
              )}
              {isSelected && el.type === 'polyline' && (
                <>
                  {el.points.map((p, i) => <AxisDimensions key={i} point={p} isSelected={isSelected} />)}
                </>
              )}
            </group>
          );
        }
        if (el.type === 'circle' && el.points[0] && el.radius) {
          const isSelected = el.id === selectedElementId;
          const isHovered = el.id === hoveredElementId;
          const finalColor = isSelected ? "#00ff88" : (isHovered ? "#0e7490" : color);
          return (
            <group key={el.id}>
              <mesh 
                position={[el.points[0][0], el.points[0][1], 0.2]}
                onPointerOver={(e) => { e.stopPropagation(); onHoverElement?.(el.id); }}
                onPointerOut={(e) => { e.stopPropagation(); onHoverElement?.(null); }}
                onClick={(e) => { e.stopPropagation(); onClickElement?.(el.id); }}
              >
                <ringGeometry args={[el.radius - 0.2, el.radius + 0.2, 64]} />
                <meshBasicMaterial color={finalColor} side={THREE.DoubleSide} transparent opacity={opacity} />
                {isSelected && (
                  <Html position={[el.radius, 0, 0.1]} center pointerEvents="none">
                    <div className="bg-[#121212]/90 border border-[#00ff88]/30 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-xl">
                      Ø{(el.radius * 2).toFixed(1)}mm
                    </div>
                  </Html>
                )}
              </mesh>
              {isSelected && <AxisDimensions point={el.points[0]} isSelected={isSelected} />}
            </group>
          );
        }
        if ((el.type === 'rectangle' || el.type === 'center-rectangle') && el.points.length > 1) {
          const isSelected = el.id === selectedElementId;
          const isHovered = el.id === hoveredElementId;
          const finalColor = isSelected ? "#00ff88" : (isHovered ? "#0e7490" : color);
          const [p1, p2] = el.points;
          let minX, maxX, minY, maxY;
          if (el.type === 'rectangle') {
            minX = Math.min(p1[0], p2[0]); maxX = Math.max(p1[0], p2[0]);
            minY = Math.min(p1[1], p2[1]); maxY = Math.max(p1[1], p2[1]);
          } else {
            const dx = Math.abs(p2[0] - p1[0]); const dy = Math.abs(p2[1] - p1[1]);
            minX = p1[0] - dx; maxX = p1[0] + dx;
            minY = p1[1] - dy; maxY = p1[1] + dy;
          }

          const r = Math.min(el.cornerRadius || 0, (maxX - minX) / 2, (maxY - minY) / 2);
          const pts: THREE.Vector3[] = [];

          if (el.cornerType === 'rounded' && r > 0) {
            // Top right
            for (let i = 0; i <= 16; i++) {
              const angle = (i / 16) * Math.PI / 2;
              pts.push(new THREE.Vector3(maxX - r + Math.cos(angle) * r, maxY - r + Math.sin(angle) * r, 0.2));
            }
            // Top left
            for (let i = 0; i <= 16; i++) {
              const angle = Math.PI / 2 + (i / 16) * Math.PI / 2;
              pts.push(new THREE.Vector3(minX + r + Math.cos(angle) * r, maxY - r + Math.sin(angle) * r, 0.2));
            }
            // Bottom left
            for (let i = 0; i <= 16; i++) {
              const angle = Math.PI + (i / 16) * Math.PI / 2;
              pts.push(new THREE.Vector3(minX + r + Math.cos(angle) * r, minY + r + Math.sin(angle) * r, 0.2));
            }
            // Bottom right
            for (let i = 0; i <= 16; i++) {
              const angle = (3 * Math.PI) / 2 + (i / 16) * Math.PI / 2;
              pts.push(new THREE.Vector3(maxX - r + Math.cos(angle) * r, minY + r + Math.sin(angle) * r, 0.2));
            }
            pts.push(pts[0].clone());
          } else if (el.cornerType === 'chamfer' && r > 0) {
            pts.push(new THREE.Vector3(maxX - r, maxY, 0.2));
            pts.push(new THREE.Vector3(minX + r, maxY, 0.2));
            pts.push(new THREE.Vector3(minX, maxY - r, 0.2));
            pts.push(new THREE.Vector3(minX, minY + r, 0.2));
            pts.push(new THREE.Vector3(minX + r, minY, 0.2));
            pts.push(new THREE.Vector3(maxX - r, minY, 0.2));
            pts.push(new THREE.Vector3(maxX, minY + r, 0.2));
            pts.push(new THREE.Vector3(maxX, maxY - r, 0.2));
            pts.push(new THREE.Vector3(maxX - r, maxY, 0.2));
          } else {
            pts.push(new THREE.Vector3(minX, minY, 0.2));
            pts.push(new THREE.Vector3(maxX, minY, 0.2));
            pts.push(new THREE.Vector3(maxX, maxY, 0.2));
            pts.push(new THREE.Vector3(minX, maxY, 0.2));
            pts.push(new THREE.Vector3(minX, minY, 0.2));
          }

          return (
            <group
              key={el.id}
              onPointerOver={(e) => { e.stopPropagation(); onHoverElement?.(el.id); }}
              onPointerOut={(e) => { e.stopPropagation(); onHoverElement?.(null); }}
              onClick={(e) => { e.stopPropagation(); onClickElement?.(el.id); }}
            >
              <ThreeLine points={pts} color={finalColor} lineWidth={0.8} transparent opacity={opacity} />
              {isSelected && (
                <>
                  <Html position={[(minX + maxX) / 2, maxY + 2, 0.3]} center pointerEvents="none">
                    <div className="bg-[#121212]/90 border border-[#00ff88]/30 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-xl">
                      W:{(maxX - minX).toFixed(1)}mm
                    </div>
                  </Html>
                  <Html position={[maxX + 2, (minY + maxY) / 2, 0.3]} center pointerEvents="none">
                    <div className="bg-[#121212]/90 border border-[#00ff88]/30 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-xl">
                      H:{(maxY - minY).toFixed(1)}mm
                    </div>
                  </Html>
                  <AxisDimensions point={el.points[0]} isSelected={isSelected} />
                </>
              )}
            </group>
          );
        }
        if (el.type === 'polygon' && el.points[0] && el.radius) {
          const isSelected = el.id === selectedElementId;
          const isHovered = el.id === hoveredElementId;
          const finalColor = isSelected ? "#00ff88" : (isHovered ? "#0e7490" : color);
          const center = el.points[0];
          const sides = el.sides || 6;
          const r = el.radius;
          const pts: THREE.Vector3[] = [];
          for (let i = 0; i <= sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            pts.push(new THREE.Vector3(center[0] + Math.cos(angle) * r, center[1] + Math.sin(angle) * r, 0.2));
          }
          return (
            <group
              key={el.id}
              onPointerOver={(e) => { e.stopPropagation(); onHoverElement?.(el.id); }}
              onPointerOut={(e) => { e.stopPropagation(); onHoverElement?.(null); }}
              onClick={(e) => { e.stopPropagation(); onClickElement?.(el.id); }}
            >
              <ThreeLine points={pts} color={finalColor} lineWidth={0.8} transparent opacity={opacity} />
              {isSelected && (
                <>
                  <Html position={[center[0], center[1] + r + 2, 0.3]} center pointerEvents="none">
                    <div className="bg-[#121212]/90 border border-[#00ff88]/30 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-[#00ff88] whitespace-nowrap shadow-xl">
                      R:{r.toFixed(1)}mm
                    </div>
                  </Html>
                  <AxisDimensions point={center} isSelected={isSelected} />
                </>
              )}
            </group>
          );
        }
        if (el.type === 'arc' && el.points.length >= 2) {
          const isSelected = el.id === selectedElementId;
          const isHovered = el.id === hoveredElementId;
          const finalColor = isSelected ? "#00ff88" : (isHovered ? "#0e7490" : color);
          
          let arcPts: THREE.Vector3[] = [];
          
          if (el.points.length === 2) {
             arcPts = [
               new THREE.Vector3(el.points[0][0], el.points[0][1], 0.2),
               new THREE.Vector3(el.points[1][0], el.points[1][1], 0.2)
             ];
          } else if (el.points.length >= 3) {
            const [p1, p2, p3] = el.points;
            const x1 = p1[0], y1 = p1[1];
            const x2 = p2[0], y2 = p2[1];
            const x3 = p3[0], y3 = p3[1];
            
            const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
            if (Math.abs(D) > 0.0001) {
              const cx = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
              const cy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
              const radius = Math.sqrt((x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy));
              
              const startAngle = Math.atan2(y1 - cy, x1 - cx);
              const endAngle = Math.atan2(y2 - cy, x2 - cx);
              let midAngle = Math.atan2(y3 - cy, x3 - cx);
              
              let clockWise = false;
              let diff = endAngle - startAngle;
              while (diff < 0) diff += Math.PI * 2;
              while (diff > Math.PI * 2) diff -= Math.PI * 2;
              
              let midDiff = midAngle - startAngle;
              while (midDiff < 0) midDiff += Math.PI * 2;
              while (midDiff > Math.PI * 2) midDiff -= Math.PI * 2;
              
              if (midDiff > diff) clockWise = true;
              
              const curve = new THREE.EllipseCurve(cx, cy, radius, radius, startAngle, endAngle, clockWise, 0);
              arcPts = curve.getPoints(50).map(p => new THREE.Vector3(p.x, p.y, 0.2));
            } else {
              arcPts = [
                new THREE.Vector3(x1, y1, 0.2),
                new THREE.Vector3(x2, y2, 0.2)
              ];
            }
          }
          return (
            <group
              key={el.id}
              onPointerOver={(e) => { e.stopPropagation(); onHoverElement?.(el.id); }}
              onPointerOut={(e) => { e.stopPropagation(); onHoverElement?.(null); }}
              onClick={(e) => { e.stopPropagation(); onClickElement?.(el.id); }}
            >
              <ThreeLine points={arcPts} color={finalColor} lineWidth={0.8} transparent opacity={opacity} />
            </group>
          );
        }
        return null;
      })}
    </group>
  );
};

export const SolidModel = ({ op, hoveredOpId, opacity = 1.0 }: { op: Operation; hoveredOpId?: string | null, opacity?: number }) => {
  const shape = useMemo(() => {
    // ... existing shape logic ...
    if ((op.type !== 'extrude' && op.type !== 'revolve') || op.sketch.length === 0) return null;

    const getBounds = (el: SketchElement) => {
      if (el.type === 'circle' || el.type === 'polygon') {
        const r = el.radius || 0;
        return { 
          minX: el.points[0][0] - r, maxX: el.points[0][0] + r, 
          minY: el.points[0][1] - r, maxY: el.points[0][1] + r,
          width: r * 2, height: r * 2
        };
      }
      if ((el.type === 'line' || el.type === 'polyline' || el.type === 'arc') && el.points.length > 1) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        el.points.forEach(p => {
          minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
          minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
        });
        return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
      }
      const [p1, p2] = el.points;
      if (el.type === 'rectangle') {
        const minX = Math.min(p1[0], p2[0]); const maxX = Math.max(p1[0], p2[0]);
        const minY = Math.min(p1[1], p2[1]); const maxY = Math.max(p1[1], p2[1]);
        return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
      } else { // center-rectangle
        const dx = Math.abs(p2[0] - p1[0]); const dy = Math.abs(p2[1] - p1[1]);
        return { minX: p1[0]-dx, maxX: p1[0]+dx, minY: p1[1]-dy, maxY: p1[1]+dy, width: dx*2, height: dy*2 };
      }
    };

    const sorted = op.sketch.filter(el => (el.type === 'circle' || el.type === 'polygon') && el.radius || ((el.type === 'rectangle' || el.type === 'center-rectangle' || el.type === 'line' || el.type === 'arc') && el.points.length > 1))
      .sort((a, b) => {
        const boundsA = getBounds(a);
        const boundsB = getBounds(b);
        const areaA = a.type === 'circle' ? Math.PI * (a.radius || 0)**2 : 
                     a.type === 'polygon' ? (a.sides || 6) * (a.radius || 0)**2 * Math.sin(Math.PI * 2 / (a.sides || 6)) / 2 :
                      (a.type === 'line' || a.type === 'polyline' || a.type === 'arc') ? 0.0001 : 
                     boundsA.width * boundsA.height;

        const areaB = b.type === 'circle' ? Math.PI * (b.radius || 0)**2 : 
                     b.type === 'polygon' ? (b.sides || 6) * (b.radius || 0)**2 * Math.sin(Math.PI * 2 / (b.sides || 6)) / 2 :
                      (b.type === 'line' || b.type === 'polyline' || b.type === 'arc') ? 0.0001 :
                     boundsB.width * boundsB.height;
        
        return areaB - areaA;
      });
    
    if (sorted.length === 0) return null;

    const createPath = (el: SketchElement, isHole: boolean, targetPath?: THREE.Path) => {
      const path = targetPath || (isHole ? new THREE.Path() : new THREE.Path());
      if (el.type === 'circle' && el.radius) {
        path.absarc(el.points[0][0], el.points[0][1], el.radius, 0, Math.PI * 2, isHole);
      } else if (el.type === 'polygon' && el.radius) {
        const center = el.points[0];
        const sides = el.sides || 6;
        const r = el.radius;
        for (let i = 0; i < sides; i++) {
          const angle = (i / sides) * Math.PI * 2;
          const x = center[0] + Math.cos(angle) * r;
          const y = center[1] + Math.sin(angle) * r;
          if (i === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        const x0 = center[0] + Math.cos(0) * r;
        const y0 = center[1] + Math.sin(0) * r;
        path.lineTo(x0, y0);
      } else if ((el.type === 'rectangle' || el.type === 'center-rectangle') && el.points.length > 1) {
        const { minX, maxX, minY, maxY } = getBounds(el);
        const r = Math.min(el.cornerRadius || 0, (maxX - minX) / 2, (maxY - minY) / 2);

        if (el.cornerType === 'rounded' && r > 0) {
          path.moveTo(maxX, maxY - r);
          path.absarc(maxX - r, maxY - r, r, 0, Math.PI / 2, false);
          path.lineTo(minX + r, maxY);
          path.absarc(minX + r, maxY - r, r, Math.PI / 2, Math.PI, false);
          path.lineTo(minX, minY + r);
          path.absarc(minX + r, minY + r, r, Math.PI, (3 * Math.PI) / 2, false);
          path.lineTo(maxX - r, minY);
          path.absarc(maxX - r, minY + r, r, (3 * Math.PI) / 2, Math.PI * 2, false);
          path.lineTo(maxX, maxY - r);
        } else if (el.cornerType === 'chamfer' && r > 0) {
          path.moveTo(maxX - r, maxY);
          path.lineTo(minX + r, maxY);
          path.lineTo(minX, maxY - r);
          path.lineTo(minX, minY + r);
          path.lineTo(minX + r, minY);
          path.lineTo(maxX - r, minY);
          path.lineTo(maxX, minY + r);
          path.lineTo(maxX, maxY - r);
          path.lineTo(maxX - r, maxY);
        } else {
          path.moveTo(minX, minY);
          path.lineTo(maxX, minY);
          path.lineTo(maxX, maxY);
          path.lineTo(minX, maxY);
          path.lineTo(minX, minY);
        }
      } else if (el.type === 'polyline' && el.points.length > 1) {
        for (let i = 0; i < el.points.length; i++) {
          if (i === 0) path.moveTo(el.points[i][0], el.points[i][1]);
          else path.lineTo(el.points[i][0], el.points[i][1]);
        }
      } else if (el.type === 'arc' && el.points.length >= 3) {
        const [p1, p2, p3] = el.points;
        const x1 = p1[0], y1 = p1[1];
        const x2 = p2[0], y2 = p2[1];
        const x3 = p3[0], y3 = p3[1];
        
        const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
        if (Math.abs(D) > 0.0001) {
          const cx = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
          const cy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
          const radius = Math.sqrt((x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy));
          
          const startAngle = Math.atan2(y1 - cy, x1 - cx);
          const endAngle = Math.atan2(y2 - cy, x2 - cx);
          const midAngle = Math.atan2(y3 - cy, x3 - cx);
          
          let clockWise = false;
          let diff = endAngle - startAngle;
          while (diff < 0) diff += Math.PI * 2;
          let midDiff = midAngle - startAngle;
          while (midDiff < 0) midDiff += Math.PI * 2;
          if (midDiff > (diff % (Math.PI * 2))) clockWise = true;
          
          path.absarc(cx, cy, radius, startAngle, endAngle, clockWise);
        } else {
          path.lineTo(x2, y2);
        }
      }
      return path;
    };

    const pathPool = [...sorted.filter(el => el.type === 'line' || el.type === 'polyline' || el.type === 'arc')];
    const loopShapes: THREE.Shape[] = [];
    
    while (pathPool.length > 0) {
      const segments: SketchElement[] = [];
      let first = pathPool.shift()!;
      segments.push(first);
      
      // Walk forward from the end of the first segment
      let lastPoint = first.points[first.points.length - 1];
      let foundForward = true;
      while (foundForward) {
        const idx = pathPool.findIndex(l => 
          (Math.abs(l.points[0][0] - lastPoint[0]) < 0.5 && Math.abs(l.points[0][1] - lastPoint[1]) < 0.5) ||
          (Math.abs(l.points[1][0] - lastPoint[0]) < 0.5 && Math.abs(l.points[1][1] - lastPoint[1]) < 0.5)
        );
        if (idx !== -1) {
          const l = pathPool.splice(idx, 1)[0];
          const isReversed = Math.abs(l.points[l.points.length - 1][0] - lastPoint[0]) < 0.1 && Math.abs(l.points[l.points.length - 1][1] - lastPoint[1]) < 0.1;
          const oriented = isReversed ? { ...l, points: [...l.points].reverse() as [number, number][] } : l;
          segments.push(oriented);
          lastPoint = oriented.points[oriented.points.length - 1];
        } else {
          foundForward = false;
        }
      }

      // Walk backward from the start of the first segment
      let firstPoint = first.points[0];
      let foundBackward = true;
      while (foundBackward) {
        const idx = pathPool.findIndex(l => 
          (Math.abs(l.points[0][0] - firstPoint[0]) < 0.1 && Math.abs(l.points[0][1] - firstPoint[1]) < 0.1) ||
          (Math.abs(l.points[1][0] - firstPoint[0]) < 0.1 && Math.abs(l.points[1][1] - firstPoint[1]) < 0.1)
        );
        if (idx !== -1) {
          const l = pathPool.splice(idx, 1)[0];
          // If l.points[1] matches firstPoint, it's already "upstream" correctly oriented.
          // If l.points[0] matches firstPoint, we must reverse it to be [tip, tail=firstPoint].
          const isCorrect = Math.abs(l.points[l.points.length - 1][0] - firstPoint[0]) < 0.5 && Math.abs(l.points[l.points.length - 1][1] - firstPoint[1]) < 0.5;
          const oriented = isCorrect ? l : { ...l, points: [...l.points].reverse() as [number, number][] };
          segments.unshift(oriented);
          firstPoint = oriented.points[0];
        } else {
          foundBackward = false;
        }
      }

      const isClosed = (pts: [number, number][]) => 
        pts.length >= 3 && 
        Math.abs(pts[0][0] - pts[pts.length - 1][0]) < 0.1 && 
        Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 0.1;

      if (segments.length >= 2 || (segments.length === 1 && isClosed(segments[0].points))) {
        const s = new THREE.Shape();
        s.moveTo(segments[0].points[0][0], segments[0].points[0][1]);
        
        segments.forEach(el => {
          if (el.type === 'line' || el.type === 'polyline') {
            for (let i = 1; i < el.points.length; i++) {
              s.lineTo(el.points[i][0], el.points[i][1]);
            }
          } else if (el.type === 'arc' && el.points.length >= 3) {
            const [p1, p2, p3] = el.points;
            const x1 = p1[0], y1 = p1[1];
            const x2 = p2[0], y2 = p2[1];
            const x3 = p3[0], y3 = p3[1];
            const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
            if (Math.abs(D) > 0.0001) {
              const cx = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / D;
              const cy = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / D;
              const radius = Math.sqrt((x1 - cx) * (x1 - cx) + (y1 - cy) * (y1 - cy));
              const startAngle = Math.atan2(y1 - cy, x1 - cx);
              const endAngle = Math.atan2(y2 - cy, x2 - cx);
              const midAngle = Math.atan2(y3 - cy, x3 - cx);
              let clockWise = false;
              let diff = endAngle - startAngle;
              while (diff < 0) diff += Math.PI * 2;
              let midDiff = midAngle - startAngle;
              while (midDiff < 0) midDiff += Math.PI * 2;
              if (midDiff > (diff % (Math.PI * 2))) clockWise = true;
              s.absarc(cx, cy, radius, startAngle, endAngle, clockWise);
            } else {
              s.lineTo(el.points[1][0], el.points[1][1]);
            }
          }
        });
        s.closePath();
        loopShapes.push(s);
      }
    }

    const otherShapes = sorted.filter(el => el.type !== 'line' && el.type !== 'polyline' && el.type !== 'arc');
    
    // We need to decide if loop is the outer container or a hole
    // We calculate the area of the largest loop and compare with the largest other shape
    let largestLoopArea = 0;
    let outerLoopIdx = -1;
    
    loopShapes.forEach((s, idx) => {
      const pts = s.extractPoints(12).shape;
      let area = 0;
      for (let i = 0; i < pts.length; i++) {
        area += (pts[i].x * pts[(i + 1) % pts.length].y) - (pts[(i + 1) % pts.length].x * pts[i].y);
      }
      area = Math.abs(area) / 2;
      if (area > largestLoopArea) {
        largestLoopArea = area;
        outerLoopIdx = idx;
      }
    });

    const largestOtherShapeArea = otherShapes.length > 0 
      ? (otherShapes[0].type === 'circle' ? Math.PI * (otherShapes[0].radius || 0)**2 : (getBounds(otherShapes[0]).width * getBounds(otherShapes[0]).height))
      : 0;

    let finalShape: THREE.Shape;
    if (largestLoopArea > largestOtherShapeArea) {
      finalShape = loopShapes[outerLoopIdx];
      
      loopShapes.forEach((s, i) => {
        if (i === outerLoopIdx) return;
        finalShape.holes.push(s as any);
      });
      
      otherShapes.forEach(el => {
        const hole = createPath(el, true);
        if (hole instanceof THREE.Path) finalShape.holes.push(hole);
      });
    } else if (otherShapes.length > 0) {
      finalShape = new THREE.Shape();
      createPath(otherShapes[0], false, finalShape);
      for (let i = 1; i < otherShapes.length; i++) {
          const hole = createPath(otherShapes[i], true);
          if (hole instanceof THREE.Path) finalShape.holes.push(hole);
      }
      loopShapes.forEach(s => {
        finalShape.holes.push(s as any);
      });
    } else {
      return null;
    }

    return finalShape;
  }, [op.sketch, op.type]);

  const lathePoints = useMemo(() => {
    if (op.type !== 'revolve' || !shape) return null;
    // getPoints(64) gives a smoother silhouette and ensures line segments are sampled.
    const pts = shape.getPoints(64);
    
    // The axisId determines which local axis of the sketch to revolve around.
    // Three.js LatheGeometry always revolves around the local Y-axis.
    // Coordinates are (x, y). 
    // If revolving around Y: Radius = X, Height = Y. -> Vector2(x, y)
    // If revolving around X: Radius = Y, Height = X. -> Vector2(y, x)
    
    if (op.params.axisId === 'x') {
      return pts.map(p => new THREE.Vector2(Math.abs(p.y), p.x));
    }
    
    // Default or 'y' - revolve around Y
    return pts.map(p => new THREE.Vector2(Math.abs(p.x), p.y));
  }, [shape, op.type, op.params.axisId]);

  const extrudeSettings = useMemo(() => ({
    depth: op.params.depth || 10,
    bevelEnabled: false,
  }), [op.params.depth]);

  const planeRotation = useMemo(() => {
    switch (op.params.plane) {
      case 'planta': return [-Math.PI / 2, 0, 0] as [number, number, number];
      case 'lateral': return [0, Math.PI / 2, 0] as [number, number, number];
      default: return [0, 0, 0] as [number, number, number];
    }
  }, [op.params.plane]);

  const axisRotation = useMemo(() => {
    if (op.type === 'revolve' && op.params.axisId === 'x') {
      return [0, 0, -Math.PI / 2] as [number, number, number];
    }
    return [0, 0, 0] as [number, number, number];
  }, [op.type, op.params.axisId]);

  const extrudePosition = useMemo(() => {
    if (op.type !== 'extrude') return [0, 0, 0] as [number, number, number];
    const depth = op.params.depth || 10;
    const direction = op.params.direction || 'pos';
    if (direction === 'neg') return [0, 0, -depth] as [number, number, number];
    if (direction === 'mid') return [0, 0, -depth / 2] as [number, number, number];
    return [0, 0, 0] as [number, number, number];
  }, [op.type, op.params.depth, op.params.direction]);

  const materialColor = useMemo(() => {
    switch (op.params.material) {
      case 'metal': return '#a7bccc';
      case 'coal': return '#111111';
      default: return '#888888'; // clay
    }
  }, [op.params.material]);

  const color = op.params.opType === 'cut' ? '#ff3333' : materialColor;

  if (op.type === 'revolve') {
    if (!lathePoints || lathePoints.length === 0) return null;
    return (
      <group rotation={planeRotation}>
        <mesh rotation={axisRotation}>
          <latheGeometry args={[lathePoints, 64, 0, (op.params.angle || 360) * (Math.PI / 180)]} />
          <meshStandardMaterial 
            color={color} 
            metalness={op.params.opType === 'cut' ? 0.1 : (op.params.material === 'metal' ? 0.8 : 0.2)} 
            roughness={op.params.opType === 'cut' ? 0.5 : (op.params.material === 'clay' ? 0.9 : 0.4)}
            transparent={op.params.opType === 'cut' || opacity < 1.0}
            opacity={op.params.opType === 'cut' ? 0.6 * opacity : (hoveredOpId === op.id ? 0.9 * opacity : opacity)}
            side={THREE.DoubleSide} 
          />
        </mesh>
      </group>
    );
  }

  if (!shape) return null;

  return (
    <group rotation={planeRotation}>
      <mesh castShadow receiveShadow position={extrudePosition}>
        <extrudeGeometry args={[shape!, extrudeSettings]} />
        <meshStandardMaterial 
          color={color} 
          metalness={op.params.opType === 'cut' ? 0.1 : (op.params.material === 'metal' ? 0.8 : 0.2)} 
          roughness={op.params.opType === 'cut' ? 0.5 : (op.params.material === 'clay' ? 0.9 : 0.4)} 
          transparent={op.params.opType === 'cut' || opacity < 1.0}
          opacity={op.params.opType === 'cut' ? 0.6 * opacity : (hoveredOpId === op.id ? 0.9 * opacity : opacity)}
          side={THREE.DoubleSide}
          envMapIntensity={1}
        />
      </mesh>
    </group>
  );
};
