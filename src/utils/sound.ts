class SoundManager {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;

    constructor() {
        try {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Lower volume
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.error("AudioContext not supported");
        }
    }

    private playTone(freq: number, type: OscillatorType, duration: number, fadeOut: boolean = true) {
        if (!this.ctx || !this.masterGain) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        gain.connect(this.masterGain);
        osc.connect(gain);

        osc.start();

        if (fadeOut) {
            gain.gain.setValueAtTime(1, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        }

        osc.stop(this.ctx.currentTime + duration);
    }

    playHover() {
        // High pitched short chirp
        this.playTone(800, 'sine', 0.1);
        this.playTone(1200, 'sine', 0.05);
    }

    playClick() {
        // Sci-fi confirm sound
        this.playTone(400, 'square', 0.1);
        this.playTone(600, 'sine', 0.2);
    }

    playActivate() {
        // Power up sound
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
    }
}

export const playSound = new SoundManager();
