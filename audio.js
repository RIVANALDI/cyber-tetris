/**
 * Web Audio API Sound Synthesizer for Modern Tetris
 * Generates dynamic 8-bit & synthwave sound effects and background music
 * without requiring any external audio files.
 */

class TetrisAudio {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.sfxVolume = 0.6;
        this.bgmVolume = 0.35;
        this.bgmPlaying = false;
        this.bgmNode = null;
        this.currentNoteTimer = null;
        this.tempo = 140; // BPM
        this.bgmGainNode = null;
        this.sfxGainNode = null;
        this.activeBgmOscillators = [];

        // Load preferences if available
        try {
            const savedMute = localStorage.getItem('tetris_muted');
            if (savedMute !== null) this.isMuted = savedMute === 'true';
            const savedSfx = localStorage.getItem('tetris_sfx_vol');
            if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
            const savedBgm = localStorage.getItem('tetris_bgm_vol');
            if (savedBgm !== null) this.bgmVolume = parseFloat(savedBgm);
        } catch (e) {
            console.warn('Storage unavailable', e);
        }
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.sfxGainNode = this.ctx.createGain();
            this.sfxGainNode.gain.value = this.isMuted ? 0 : this.sfxVolume;
            this.sfxGainNode.connect(this.ctx.destination);

            this.bgmGainNode = this.ctx.createGain();
            this.bgmGainNode.gain.value = this.isMuted ? 0 : this.bgmVolume;
            this.bgmGainNode.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.isMuted = muted;
        try {
            localStorage.setItem('tetris_muted', muted);
        } catch (e) {}
        if (this.sfxGainNode && this.bgmGainNode) {
            this.sfxGainNode.gain.value = muted ? 0 : this.sfxVolume;
            this.bgmGainNode.gain.value = muted ? 0 : this.bgmVolume;
        }
    }

    setSfxVolume(vol) {
        this.sfxVolume = Math.max(0, Math.min(1, vol));
        try {
            localStorage.setItem('tetris_sfx_vol', this.sfxVolume);
        } catch (e) {}
        if (this.sfxGainNode && !this.isMuted) {
            this.sfxGainNode.gain.value = this.sfxVolume;
        }
    }

    setBgmVolume(vol) {
        this.bgmVolume = Math.max(0, Math.min(1, vol));
        try {
            localStorage.setItem('tetris_bgm_vol', this.bgmVolume);
        } catch (e) {}
        if (this.bgmGainNode && !this.isMuted) {
            this.bgmGainNode.gain.value = this.bgmVolume;
        }
    }

    // --- Sound Effects ---

    playMove() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(340, now + 0.04);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    playRotate() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.07);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

        osc.connect(gain);
        gain.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playSoftDrop() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.03);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.03);

        osc.connect(gain);
        gain.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    playHardDrop() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // Thud
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);

        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGainNode);

        // Click
        const click = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();
        click.type = 'square';
        click.frequency.setValueAtTime(800, now);
        click.frequency.exponentialRampToValueAtTime(200, now + 0.04);
        clickGain.gain.setValueAtTime(0.4, now);
        clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
        click.connect(clickGain);
        clickGain.connect(this.sfxGainNode);

        osc.start(now);
        click.start(now);
        osc.stop(now + 0.13);
        click.stop(now + 0.05);
    }

    playHold() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.linearRampToValueAtTime(480, now + 0.05);
        osc.frequency.linearRampToValueAtTime(380, now + 0.1);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    playCountdownBeep(isGo = false) {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (isGo) {
            // GO! Sound (High bright chime)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(587.33, now); // D5
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.3);

            osc.connect(gain);
            gain.connect(this.sfxGainNode);

            osc.start(now);
            osc.stop(now + 0.32);
        } else {
            // 3, 2, 1 Beep
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now); // A4

            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

            osc.connect(gain);
            gain.connect(this.sfxGainNode);

            osc.start(now);
            osc.stop(now + 0.15);
        }
    }

    playLineClear(lines = 1) {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;

        if (lines === 4) {
            // TETRIS fanfare!
            this.playTetrisFanfare();
            return;
        }

        const baseFreqs = [440, 554.37, 659.25, 880];
        const freqs = baseFreqs.slice(0, Math.min(lines + 1, 4));

        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + idx * 0.06;

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.35, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.005, noteStart + 0.18);

            osc.connect(gain);
            gain.connect(this.sfxGainNode);

            osc.start(noteStart);
            osc.stop(noteStart + 0.2);
        });
    }

    playTetrisFanfare() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [
            { f: 523.25, d: 0.08, t: 0 },    // C5
            { f: 659.25, d: 0.08, t: 0.08 }, // E5
            { f: 783.99, d: 0.08, t: 0.16 }, // G5
            { f: 1046.50, d: 0.35, t: 0.24 } // C6
        ];

        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + note.t;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(note.f, noteStart);

            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.4, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.005, noteStart + note.d);

            osc.connect(gain);
            gain.connect(this.sfxGainNode);

            osc.start(noteStart);
            osc.stop(noteStart + note.d + 0.05);
        });
    }

    playLevelUp() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [330, 415.3, 493.88, 659.25, 830.61];

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + idx * 0.07;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.3, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGainNode);

            osc.start(noteStart);
            osc.stop(noteStart + 0.16);
        });
    }

    playGameOver() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const notes = [440, 392, 349.23, 293.66, 220, 146.83];

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const noteStart = now + idx * 0.14;

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, noteStart);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.9, noteStart + 0.18);

            gain.gain.setValueAtTime(0.35, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.01, noteStart + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGainNode);

            osc.start(noteStart);
            osc.stop(noteStart + 0.22);
        });
    }

    playButtonClick() {
        if (this.isMuted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.04);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGainNode);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    // --- Background Chiptune Music (Korobeiniki / Tetris Theme A) ---

    startBGM() {
        this.init();
        this.stopBGM(); // Stop and cancel any currently active or scheduled BGM nodes
        this.bgmPlaying = true;
        this._playNextBGMSection();
    }

    stopBGM() {
        this.bgmPlaying = false;
        if (this.currentNoteTimer) {
            clearTimeout(this.currentNoteTimer);
            this.currentNoteTimer = null;
        }
        if (this.activeBgmOscillators && this.activeBgmOscillators.length > 0) {
            this.activeBgmOscillators.forEach(osc => {
                try {
                    osc.stop();
                    osc.disconnect();
                } catch (e) {}
            });
            this.activeBgmOscillators = [];
        }
    }

    _playNextBGMSection() {
        if (!this.bgmPlaying || !this.ctx) return;
        this.activeBgmOscillators = [];

        // Note frequencies
        const N = {
            REST: 0,
            C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, GS4: 415.30, A4: 440.00, B4: 493.88,
            C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, GS5: 830.61, A5: 880.00, B5: 987.77,
            C6: 1046.50
        };

        // Standard Tetris Melody: [note, duration in beats]
        const melody = [
            // Part 1
            [N.E5, 1], [N.B4, 0.5], [N.C5, 0.5], [N.D5, 1], [N.C5, 0.5], [N.B4, 0.5],
            [N.A4, 1], [N.A4, 0.5], [N.C5, 0.5], [N.E5, 1], [N.D5, 0.5], [N.C5, 0.5],
            [N.B4, 1.5], [N.C5, 0.5], [N.D5, 1], [N.E5, 1],
            [N.C5, 1], [N.A4, 1], [N.A4, 1], [N.REST, 1],

            // Part 2
            [N.D5, 1.5], [N.F5, 0.5], [N.A5, 1], [N.G5, 0.5], [N.F5, 0.5],
            [N.E5, 1.5], [N.C5, 0.5], [N.E5, 1], [N.D5, 0.5], [N.C5, 0.5],
            [N.B4, 1], [N.B4, 0.5], [N.C5, 0.5], [N.D5, 1], [N.E5, 1],
            [N.C5, 1], [N.A4, 1], [N.A4, 1], [N.REST, 1],

            // Repeat Part 1
            [N.E5, 1], [N.B4, 0.5], [N.C5, 0.5], [N.D5, 1], [N.C5, 0.5], [N.B4, 0.5],
            [N.A4, 1], [N.A4, 0.5], [N.C5, 0.5], [N.E5, 1], [N.D5, 0.5], [N.C5, 0.5],
            [N.B4, 1.5], [N.C5, 0.5], [N.D5, 1], [N.E5, 1],
            [N.C5, 1], [N.A4, 1], [N.A4, 1], [N.REST, 1],

            // Repeat Part 2
            [N.D5, 1.5], [N.F5, 0.5], [N.A5, 1], [N.G5, 0.5], [N.F5, 0.5],
            [N.E5, 1.5], [N.C5, 0.5], [N.E5, 1], [N.D5, 0.5], [N.C5, 0.5],
            [N.B4, 1], [N.B4, 0.5], [N.C5, 0.5], [N.D5, 1], [N.E5, 1],
            [N.C5, 1], [N.A4, 1], [N.A4, 1], [N.REST, 1]
        ];

        const beatDuration = 60 / this.tempo;
        const startTime = this.ctx.currentTime + 0.05;
        let melodyCurrentTime = startTime;

        melody.forEach(([freq, duration]) => {
            const noteLength = duration * beatDuration;
            if (freq > 0 && !this.isMuted) {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, melodyCurrentTime);

                gain.gain.setValueAtTime(0, melodyCurrentTime);
                gain.gain.linearRampToValueAtTime(0.12, melodyCurrentTime + 0.015);
                gain.gain.setValueAtTime(0.12, melodyCurrentTime + noteLength * 0.85);
                gain.gain.exponentialRampToValueAtTime(0.001, melodyCurrentTime + noteLength * 0.95);

                osc.connect(gain);
                gain.connect(this.bgmGainNode);

                this.activeBgmOscillators.push(osc);

                osc.start(melodyCurrentTime);
                osc.stop(melodyCurrentTime + noteLength);
            }
            melodyCurrentTime += noteLength;
        });

        // Loop repetition
        const totalDuration = melodyCurrentTime - startTime;
        this.currentNoteTimer = setTimeout(() => {
            if (this.bgmPlaying) {
                this._playNextBGMSection();
            }
        }, totalDuration * 1000 - 50);
    }
}

window.tetrisAudio = new TetrisAudio();
