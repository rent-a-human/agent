import { Settings } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const SettingsButton = () => {
    const { setSettingsOverlayOpen } = useStore();

    return (
        <button 
            onClick={() => setSettingsOverlayOpen(true)}
            style={{ right: '2rem', top: '6rem' }}
            className="fixed z-[100] w-12 h-12 aspect-square p-0 flex items-center justify-center bg-[#141414]/70 backdrop-blur-md border border-transparent rounded-2xl text-white transition-all duration-200 hover:bg-[#282828]/80 hover:border-white/20 hover:-translate-y-0.5 pointer-events-auto shadow-lg"
            aria-label="Open Settings"
        >
            <Settings size={24} />
        </button>
    );
};
