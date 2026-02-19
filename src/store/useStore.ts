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


interface AppState {
    hands: {
        left: HandState;
        right: HandState;
    };
    face: FaceState;
    lastHandActivity: number; // Timestamp

    hoveredObject: string | null;
    dwellProgress: number; // 0 to 1
    selectedObject: string | null;

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
