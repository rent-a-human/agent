import { create } from 'zustand';

export type GestureType = 'IDLE' | 'PINCH' | 'OPEN' | 'POINT';

export interface HandState {
    present: boolean;
    x: number; // Normalized 0-1
    y: number; // Normalized 0-1
    z: number; // Depth (approx)
    scale: number; // Apparent size (proxy for distance to camera)
    gesture: GestureType;
    landmarks: { x: number; y: number; z: number }[];
}

export interface FaceState {
    present: boolean;
    x: number; // Nose Tip X (normalized)
    y: number; // Nose Tip Y (normalized)
    z: number; // Nose Tip Z
    rotationY: number; // Yaw (Head Turn)
    rotationX: number; // Pitch (Head Nod)
    // Eye Data
    leftEyeOpen: number; // 0 (Closed) -> 1 (Open)
    rightEyeOpen: number;
    iris: {
        x: number; // Normalized -1 (Left) to 1 (Right) relative to eye center
        y: number; // Normalized -1 (Up) to 1 (Down)
    };
    gesture: 'IDLE' | 'CLICK' | 'SCROLL'; // Derived from winks
}

export interface CameraGoal {
    target: { x: number; y: number; z: number };
    radius: number;
    theta: number;
    camY?: number;
}


interface AppState {
    hands: {
        left: HandState;
        right: HandState;
    };
    face: FaceState;
    lastHandActivity: number; // Timestamp

    debugCameraState: { position: { x: number, y: number, z: number }, lookAt: { x: number, y: number, z: number } } | null;
    setDebugCameraState: (state: { position: { x: number, y: number, z: number }, lookAt: { x: number, y: number, z: number } } | null) => void;

    hoveredObject: string | null;
    dwellProgress: number; // 0 to 1
    selectedObject: string | null;

    trackingMode: 'EYE' | 'HAND' | 'MOUSE' | 'TV';
    setTrackingMode: (mode: 'EYE' | 'HAND' | 'MOUSE' | 'TV') => void;

    tvCursor: { x: number; y: number };
    setTvCursor: (cursor: { x: number; y: number }) => void;

    tvControlMode: 'CURSOR' | 'CAMERA' | 'ROTATE';
    setTvControlMode: (mode: 'CURSOR' | 'CAMERA' | 'ROTATE') => void;

    tvOrbitInput: { dx: number; dy: number };
    setTvOrbitInput: (input: { dx: number; dy: number }) => void;

    joystickInput: { x: number; y: number };
    setJoystickInput: (input: { x: number; y: number }) => void;

    scene: 'dashboard' | 'city' | 'forest';
    setScene: (scene: 'dashboard' | 'city' | 'forest') => void;

    hdMode: boolean;
    setHdMode: (val: boolean) => void;

    showWebPanel: boolean;
    setShowWebPanel: (val: boolean) => void;
    showVideoPanel: boolean;
    setShowVideoPanel: (val: boolean) => void;
    showChessAssistant: boolean;
    setShowChessAssistant: (val: boolean) => void;
    showAnimeAssistant: boolean;
    setShowAnimeAssistant: (val: boolean) => void;
    showRealisticAssistant: boolean;
    setShowRealisticAssistant: (val: boolean) => void;

    clampSensibility: number;
    setClampSensibility: (val: number) => void;
    isSettingsOpen: boolean;
    setSettingsOpen: (val: boolean) => void;

    isSettingsOverlayOpen: boolean;
    setSettingsOverlayOpen: (val: boolean) => void;

    gravity: number;
    setGravity: (val: number) => void;
    minHeight: number;
    setMinHeight: (val: number) => void;

    cameraGoal: CameraGoal | null;
    setCameraGoal: (goal: CameraGoal | null) => void;

    setHand: (handedness: 'left' | 'right', data: Partial<HandState>) => void;
    setFace: (data: Partial<FaceState>) => void;
    setDwellProgress: (progress: number) => void;
    setHovered: (id: string | null) => void;
    setSelected: (id: string | null) => void;
}

const initialHand: HandState = {
    present: false,
    x: 0.5,
    y: 0.5,
    z: 0,
    scale: 0,
    gesture: 'IDLE',
    landmarks: [],
};

const initialFace: FaceState = {
    present: false,
    x: 0.5,
    y: 0.5,
    z: 0,
    rotationY: 0,
    rotationX: 0,
    leftEyeOpen: 1,
    rightEyeOpen: 1,
    iris: { x: 0, y: 0 },
    gesture: 'IDLE'
};

import { isTVBrowser } from '../utils/device';

// Get initial scene from URL
const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const initialScene = (searchParams.get('scene') as 'dashboard' | 'city' | 'forest') || 'dashboard';

export const useStore = create<AppState>((set) => ({
    hands: {
        left: { ...initialHand },
        right: { ...initialHand },
    },
    face: { ...initialFace },
    lastHandActivity: Date.now(),
    hoveredObject: null,
    dwellProgress: 0,
    selectedObject: null,
    trackingMode: isTVBrowser() ? 'TV' : 'EYE',
    tvCursor: { x: 0.5, y: 0.5 }, // Start at center (0-1 range like hands/face)
    tvControlMode: 'CURSOR',
    tvOrbitInput: { dx: 0, dy: 0 },
    joystickInput: { x: 0, y: 0 },
    scene: initialScene,
    hdMode: false,
    showWebPanel: true,
    showVideoPanel: false, // Default heavy off
    showChessAssistant: true,
    showAnimeAssistant: true,
    showRealisticAssistant: false, // Default heavy off
    clampSensibility: 1.0,
    isSettingsOpen: false,
    isSettingsOverlayOpen: false,
    gravity: 1.0,
    minHeight: 1.8,
    cameraGoal: null,
    debugCameraState: null,
    setTrackingMode: (mode) => set({ trackingMode: mode }),
    setTvCursor: (cursor) => set({ tvCursor: cursor }),
    setTvControlMode: (mode) => set({ tvControlMode: mode }),
    setTvOrbitInput: (input) => set({ tvOrbitInput: input }),
    setJoystickInput: (input) => set({ joystickInput: input }),
    setHdMode: (val) => set({ hdMode: val }),
    setShowWebPanel: (val) => set({ showWebPanel: val }),
    setShowVideoPanel: (val) => set({ showVideoPanel: val }),
    setShowChessAssistant: (val) => set({ showChessAssistant: val }),
    setShowAnimeAssistant: (val) => set({ showAnimeAssistant: val }),
    setShowRealisticAssistant: (val) => set({ showRealisticAssistant: val }),
    setClampSensibility: (val) => set({ clampSensibility: val }),
    setSettingsOpen: (val) => set({ isSettingsOpen: val }),
    setSettingsOverlayOpen: (val) => set({ isSettingsOverlayOpen: val }),
    setGravity: (val) => set({ gravity: val }),
    setMinHeight: (val) => set({ minHeight: val }),
    setCameraGoal: (goal) => set({ cameraGoal: goal }),
    setDebugCameraState: (val) => set({ debugCameraState: val }),
    setScene: (scene) => {
        // Build URL sync logic into setter
        if (typeof window !== 'undefined') {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('scene', scene);
            window.history.pushState({}, '', currentUrl.toString());
        }
        set({ scene });
    },
    setHand: (handedness, data) =>
        set((state) => {
            const isPresent = data.present !== false;
            return {
                hands: {
                    ...state.hands,
                    [handedness]: { ...state.hands[handedness], ...data },
                },
                lastHandActivity: isPresent ? Date.now() : state.lastHandActivity,
            };
        }),
    setFace: (data) =>
        set((state) => ({
            face: { ...state.face, ...data },
        })),
    setDwellProgress: (progress) => set({ dwellProgress: progress }),
    setHovered: (id) => set({ hoveredObject: id }),
    setSelected: (id) => set({ selectedObject: id }),
}));
