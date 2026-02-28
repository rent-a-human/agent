import { useStore } from '../../store/useStore';

export const DebugOverlay = () => {
    const { debugCameraState } = useStore();

    if (!debugCameraState) return null;

    // The CameraController places the camera at:
    // pos = target + radius * (sin(theta), cos(theta))
    // Therefore, the vector is from TARGET to CAMERA.
    const dx_cam = debugCameraState.position.x - debugCameraState.lookAt.x;
    const dz_cam = debugCameraState.position.z - debugCameraState.lookAt.z;
    const dy_cam = debugCameraState.position.y - debugCameraState.lookAt.y;
    
    // Orbital Radius (horizontal XZ plane distance)
    const orbitRadius = Math.sqrt(dx_cam * dx_cam + dz_cam * dz_cam);
    
    // Angle around Y axis
    const theta = Math.atan2(dx_cam, dz_cam);
    
    // Total 3D Distance
    const distance = Math.sqrt(dx_cam * dx_cam + dy_cam * dy_cam + dz_cam * dz_cam);

    return (
        <div className="absolute top-[166px] right-4 z-50 pointer-events-none bg-black/60 backdrop-blur-sm border border-white/20 p-4 rounded-xl font-mono text-[10px] text-[rgba(0,240,255,0.8)] shadow-lg max-w-[280px]">
            <h3 className="text-white font-bold mb-2 pb-1 border-b border-white/20 text-xs">CAMERA DATA TRACKER</h3>
            
            <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1 mb-2">
                <span className="opacity-60">CAM_POS:</span>
                <span>
                    [{debugCameraState.position.x.toFixed(2)}, {debugCameraState.position.y.toFixed(2)}, {debugCameraState.position.z.toFixed(2)}]
                </span>
                
                <span className="opacity-60">LOOK_AT:</span>
                <span>
                    [{debugCameraState.lookAt.x.toFixed(2)}, {debugCameraState.lookAt.y.toFixed(2)}, {debugCameraState.lookAt.z.toFixed(2)}]
                </span>
            </div>

            <div className="my-2 border-t border-white/10" />
            
            <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                <span className="opacity-60">DISTANCE:</span>
                <span>{distance.toFixed(2)}m (Total)</span>
                
                <span className="opacity-60">XZ RADIUS:</span>
                <span>{orbitRadius.toFixed(2)}m (Orbit)</span>
                
                <span className="opacity-60">THETA (Y):</span>
                <span>{theta.toFixed(3)} rad</span>
            </div>
            
            <div className="mt-3 pt-2 border-t border-white/20 text-[9px] text-white/50 leading-tight">
                To reproduce this view via API:<br/>
                <span className="text-[rgba(0,240,255,0.6)] break-all">
                    action: "focusAssistant",<br/>
                    payload: &#123;<br/>
                    &nbsp;&nbsp;targetId: "eve",<br/>
                    &nbsp;&nbsp;position: [{debugCameraState.lookAt.x.toFixed(2)}, {debugCameraState.lookAt.y.toFixed(2)}, {debugCameraState.lookAt.z.toFixed(2)}],<br/>
                    &nbsp;&nbsp;radius: {orbitRadius.toFixed(2)},<br/>
                    &nbsp;&nbsp;theta: {theta.toFixed(3)},<br/>
                    &nbsp;&nbsp;camY: {debugCameraState.position.y.toFixed(2)}<br/>
                    &#125;
                </span>
            </div>
        </div>
    );
};
