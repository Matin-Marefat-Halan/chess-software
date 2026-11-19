export class SoundEffects {
    constructor() {
        this.enabled = true;
        this.ctx = null;
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playMove() {
        this.#tone(320, 0.06, "triangle", 0.14);
    }

    playCapture() {
        this.#tone(175, 0.11, "sawtooth", 0.18);
    }

    playCheck() {
        this.#tone(580, 0.12, "sine", 0.22);
        setTimeout(() => this.#tone(760, 0.16, "sine", 0.22), 110);
    }

    playGameOver() {
        this.#tone(440, 0.14, "triangle", 0.2);
        setTimeout(() => this.#tone(554, 0.14, "triangle", 0.2), 130);
        setTimeout(() => this.#tone(659, 0.26, "triangle", 0.22), 260);
    }

    #tone(freq, duration, type, volume) {
        if (!this.enabled) return;
        try {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                this.ctx = new AudioCtx();
            }
            if (this.ctx.state === "suspended") {
                this.ctx.resume();
            }
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (error) {
        }
    }
}