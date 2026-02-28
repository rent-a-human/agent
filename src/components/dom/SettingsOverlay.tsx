import { useStore } from '../../store/useStore';
import { X } from 'lucide-react';

const ToggleSwitch = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => {
    return (
        <div className="flex items-center justify-between py-2 border-b border-[rgba(0,240,255,0.1)] last:border-0">
            <span className="text-[rgba(0,240,255,0.8)] font-mono text-sm">{label}</span>
            <button
                onClick={onClick}
                className={`
                    w-12 h-6 rounded-full transition-colors duration-200 ease-in-out relative
                    ${active ? 'bg-[rgba(0,240,255,0.4)] border border-[rgba(0,240,255,0.8)]' : 'bg-black/50 border border-white/20'}
                `}
            >
                <div 
                    className={`
                        absolute top-1 left-1 w-4 h-4 rounded-full transition-transform duration-200 ease-in-out
                        ${active ? 'transform translate-x-6 bg-[rgba(0,240,255,1)] shadow-[0_0_8px_rgba(0,240,255,0.8)]' : 'bg-white/50'}
                    `}
                />
            </button>
        </div>
    );
};

const SliderControl = ({ label, value, min, max, step, onChange, formatValue }: { label: string, value: number, min: number, max: number, step: number, onChange: (val: number) => void, formatValue?: (val: number) => string }) => {
    return (
        <div className="flex items-center justify-between py-3 border-b border-[rgba(0,240,255,0.1)] last:border-0 gap-4">
            <span className="text-[rgba(0,240,255,0.8)] font-mono text-sm w-1/3">{label}</span>
            <div className="flex-1 flex items-center gap-3">
                <button 
                    onClick={() => onChange(Math.max(min, Number((value - step).toFixed(1))))}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 border border-white/20 text-[rgba(0,240,255,0.8)] hover:bg-[rgba(0,240,255,0.2)] hover:border-[rgba(0,240,255,0.6)] hover:text-[rgba(0,240,255,1)] transition-all font-mono font-bold"
                >
                    -
                </button>
                <input 
                    type="range" 
                    min={min} 
                    max={max} 
                    step={step} 
                    value={value} 
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="flex-1 h-1.5 bg-black/50 rounded-lg appearance-none cursor-pointer outline-none border border-white/20
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                               [&::-webkit-slider-thumb]:bg-[rgba(0,240,255,1)] [&::-webkit-slider-thumb]:rounded-full 
                               [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                />
                <button 
                    onClick={() => onChange(Math.min(max, Number((value + step).toFixed(1))))}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-black/50 border border-white/20 text-[rgba(0,240,255,0.8)] hover:bg-[rgba(0,240,255,0.2)] hover:border-[rgba(0,240,255,0.6)] hover:text-[rgba(0,240,255,1)] transition-all font-mono font-bold"
                >
                    +
                </button>
                <span className="text-[rgba(0,240,255,1)] font-mono text-xs w-12 text-right">
                    {formatValue ? formatValue(value) : value}
                </span>
            </div>
        </div>
    );
};

const SceneCard = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => {
    return (
        <button
            onClick={onClick}
            className={`
                flex-1 py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 border
                ${active 
                    ? 'bg-[rgba(0,240,255,0.15)] border-[rgba(0,240,255,0.8)] shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                    : 'bg-black/30 border-white/10 hover:bg-white/5 hover:border-white/30'
                }
            `}
        >
            <span className={`font-mono text-xs tracking-widest ${active ? 'text-[rgba(0,240,255,1)] font-bold' : 'text-white/60'}`}>
                {label}
            </span>
        </button>
    );
};

export const SettingsOverlay = () => {
    const { 
        isSettingsOverlayOpen, 
        setSettingsOverlayOpen,
        showWebPanel, setShowWebPanel,
        showVideoPanel, setShowVideoPanel,
        showChessAssistant, setShowChessAssistant,
        showAnimeAssistant, setShowAnimeAssistant,
        showRealisticAssistant, setShowRealisticAssistant,
        hdMode, setHdMode,
        scene, setScene,
        gravity, setGravity,
        minHeight, setMinHeight
    } = useStore();

    if (!isSettingsOverlayOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center w-screen h-screen pointer-events-auto">
            {/* Backdrop click to close */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
                onClick={() => setSettingsOverlayOpen(false)}
            />
            
            {/* Modal Container matching TV DPAD styling requested by user */}
            <div className="relative w-[90vw] max-w-lg bg-[rgba(0,0,0,0.75)] backdrop-blur-xl border border-[rgba(0,240,255,0.4)] rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[rgba(0,240,255,0.2)] bg-gradient-to-r from-[rgba(0,240,255,0.1)] to-transparent">
                    <h2 className="text-[rgba(0,240,255,1)] font-mono text-xl font-bold tracking-widest">SYSTEM PREFERENCES</h2>
                    <button 
                        onClick={() => setSettingsOverlayOpen(false)}
                        className="p-2 rounded-full text-[rgba(0,240,255,0.6)] hover:bg-[rgba(0,240,255,0.2)] hover:text-[rgba(0,240,255,1)] transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex flex-col gap-8">
                    
                    {/* Section: Environment Selector */}
                    <div className="space-y-4">
                        <h3 className="text-white/80 font-mono text-sm tracking-wider uppercase border-b border-white/10 pb-2">Environment Overlay</h3>
                        <div className="flex gap-4">
                            <SceneCard 
                                label="DASHBOARD" 
                                active={scene === 'dashboard'} 
                                onClick={() => setScene('dashboard')} 
                            />
                            <SceneCard 
                                label="CITY SCENE" 
                                active={scene === 'city'} 
                                onClick={() => setScene('city')} 
                            />
                            <SceneCard 
                                label="FOREST" 
                                active={scene === 'forest'} 
                                onClick={() => setScene('forest')} 
                            />
                        </div>
                    </div>

                    {/* Section: Physics & Mechanics */}
                    <div className="space-y-4">
                        <h3 className="text-white/80 font-mono text-sm tracking-wider uppercase border-b border-white/10 pb-2">Physics & Movement</h3>
                        <div className="space-y-2 bg-black/30 rounded-xl p-4 border border-[rgba(0,240,255,0.1)]">
                            <SliderControl 
                                label="Gravity Scale" 
                                value={gravity} 
                                min={0} max={1} step={0.1} 
                                onChange={setGravity} 
                                formatValue={(v) => `${(v * 100).toFixed(0)}%`} 
                            />
                            <SliderControl 
                                label="Floor Limit (m)" 
                                value={minHeight} 
                                min={0} max={5} step={0.1} 
                                onChange={setMinHeight} 
                                formatValue={(v) => `${v.toFixed(1)}m`} 
                            />
                        </div>
                    </div>

                    {/* Section: Render Toggles */}
                    <div className="space-y-4">
                        <h3 className="text-white/80 font-mono text-sm tracking-wider uppercase border-b border-white/10 pb-2">Render Optimization</h3>
                        <div className="space-y-2 bg-black/30 rounded-xl p-4 border border-[rgba(0,240,255,0.1)]">
                            <ToggleSwitch label="Web Panel (Strategy iframe)" active={showWebPanel} onClick={() => setShowWebPanel(!showWebPanel)} />
                            <ToggleSwitch label="Music Video Player" active={showVideoPanel} onClick={() => setShowVideoPanel(!showVideoPanel)} />
                            <ToggleSwitch label="Chess AI Widget" active={showChessAssistant} onClick={() => setShowChessAssistant(!showChessAssistant)} />
                            <ToggleSwitch label="Anime Guide Avatar" active={showAnimeAssistant} onClick={() => setShowAnimeAssistant(!showAnimeAssistant)} />
                            <ToggleSwitch label="Realistic Guide Avatar (Heavy)" active={showRealisticAssistant} onClick={() => setShowRealisticAssistant(!showRealisticAssistant)} />
                            
                            <div className="my-4 border-t border-white/10" />
                            
                            <ToggleSwitch label="HD Mode (Bloom & Res)" active={hdMode} onClick={() => setHdMode(!hdMode)} />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-[rgba(0,240,255,0.2)] bg-black/40 flex justify-end">
                    <button 
                        className="px-6 py-2 bg-[rgba(0,240,255,0.2)] border border-[rgba(0,240,255,0.8)] rounded-full text-[rgba(0,240,255,1)] font-mono text-sm font-bold tracking-widest hover:bg-[rgba(0,240,255,0.4)] shadow-[0_0_10px_rgba(0,240,255,0.2)] transition-all"
                        onClick={() => setSettingsOverlayOpen(false)}
                    >
                        APPLY & CLOSE
                    </button>
                </div>

            </div>
        </div>
    );
};
