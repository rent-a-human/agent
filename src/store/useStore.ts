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

interface AppState {
    hands: {
        left: HandState;
        right: HandState;
    };
    hoveredObject: string | null;
    selectedObject: string | null;
    setHand: (handedness: 'left' | 'right', data: Partial<HandState>) => void;
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

export const useStore = create<AppState>((set) => ({
    hands: {
        left: { ...initialHand },
        right: { ...initialHand },
    },
    hoveredObject: null,
    selectedObject: null,
    setHand: (handedness, data) =>
        set((state) => ({
            hands: {
                ...state.hands,
                [handedness]: { ...state.hands[handedness], ...data },
            },
        })),
    setHovered: (id) => set({ hoveredObject: id }),
    setSelected: (id) => set({ selectedObject: id }),
}));
