import Packet from '#/io/Packet.js';

import Envelope from './Envelope.js';

export default class Tone {
    frequencyBase: Envelope | null = null;
    amplitudeBase: Envelope | null = null;

    frequencyModRate: Envelope | null = null;
    frequencyModRange: Envelope | null = null;

    amplitudeModRate: Envelope | null = null;
    amplitudeModRange: Envelope | null = null;

    release: Envelope | null = null;
    attack: Envelope | null = null;

    harmonicVolume: Int32Array = new Int32Array(5);
    harmonicSemitone: Int32Array = new Int32Array(5);
    harmonicDelay: Int32Array = new Int32Array(5);

    reverbDelay: number = 0;
    reverbVolume: number = 100;

    length: number = 500;
    start: number = 0;

    static buf: Int32Array | null = null;
    static noise: Int32Array | null = null;
    static sine: Int32Array | null = null;

    static fPos: Int32Array = new Int32Array(5);
    static fDel: Int32Array = new Int32Array(5);
    static fAmp: Int32Array = new Int32Array(5);
    static fMulti: Int32Array = new Int32Array(5);
    static fOffset: Int32Array = new Int32Array(5);

    static init(): void {
        this.noise = new Int32Array(32768);
        for (let i: number = 0; i < 32768; i++) {
            if (Math.random() > 0.5) {
                this.noise[i] = 1;
            } else {
                this.noise[i] = -1;
            }
        }

        this.sine = new Int32Array(32768);
        for (let i: number = 0; i < 32768; i++) {
            this.sine[i] = (Math.sin(i / 5215.1903) * 16384.0) | 0;
        }

        this.buf = new Int32Array(22050 * 10); // 22050 KHz * 10s
    }

    generate(sampleCount: number, length: number): Int32Array {
        if (!this.frequencyBase || !this.amplitudeBase) {
            return Tone.buf!;
        }

        for (let sample: number = 0; sample < sampleCount; sample++) {
            Tone.buf![sample] = 0;
        }

        if (length < 10) {
            return Tone.buf!;
        }

        const samplesPerStep: number = (sampleCount / length) | 0;

        this.frequencyBase.genInit();
        this.amplitudeBase.genInit();

        let frequencyStart: number = 0;
        let frequencyDuration: number = 0;
        let frequencyPhase: number = 0;

        if (this.frequencyModRate && this.frequencyModRange) {
            this.frequencyModRate.genInit();
            this.frequencyModRange.genInit();
            frequencyStart = (((this.frequencyModRate.end - this.frequencyModRate.start) * 32.768) / samplesPerStep) | 0;
            frequencyDuration = ((this.frequencyModRate.start * 32.768) / samplesPerStep) | 0;
        }

        let amplitudeStart: number = 0;
        let amplitudeDuration: number = 0;
        let amplitudePhase: number = 0;
        if (this.amplitudeModRate && this.amplitudeModRange) {
            this.amplitudeModRate.genInit();
            this.amplitudeModRange.genInit();
            amplitudeStart = (((this.amplitudeModRate.end - this.amplitudeModRate.start) * 32.768) / samplesPerStep) | 0;
            amplitudeDuration = ((this.amplitudeModRate.start * 32.768) / samplesPerStep) | 0;
        }

        for (let harmonic: number = 0; harmonic < 5; harmonic++) {
            if (this.frequencyBase && this.harmonicVolume[harmonic] !== 0) {
                Tone.fPos[harmonic] = 0;
                Tone.fDel[harmonic] = this.harmonicDelay[harmonic] * samplesPerStep;
                Tone.fAmp[harmonic] = ((this.harmonicVolume[harmonic] << 14) / 100) | 0;
                Tone.fMulti[harmonic] = (((this.frequencyBase.end - this.frequencyBase.start) * 32.768 * Math.pow(1.0057929410678534, this.harmonicSemitone[harmonic])) / samplesPerStep) | 0;
                Tone.fOffset[harmonic] = ((this.frequencyBase.start * 32.768) / samplesPerStep) | 0;
            }
        }

        for (let sample: number = 0; sample < sampleCount; sample++) {
            let frequency: number = this.frequencyBase.genNext(sampleCount);
            let amplitude: number = this.amplitudeBase.genNext(sampleCount);

            if (this.frequencyModRate && this.frequencyModRange) {
                const rate: number = this.frequencyModRate.genNext(sampleCount);
                const range: number = this.frequencyModRange.genNext(sampleCount);
                frequency += this.waveFunc(range, frequencyPhase, this.frequencyModRate.form) >> 1;
                frequencyPhase += ((rate * frequencyStart) >> 16) + frequencyDuration;
            }

            if (this.amplitudeModRate && this.amplitudeModRange) {
                const rate: number = this.amplitudeModRate.genNext(sampleCount);
                const range: number = this.amplitudeModRange.genNext(sampleCount);
                amplitude = (amplitude * ((this.waveFunc(range, amplitudePhase, this.amplitudeModRate.form) >> 1) + 32768)) >> 15;
                amplitudePhase += ((rate * amplitudeStart) >> 16) + amplitudeDuration;
            }

            for (let harmonic: number = 0; harmonic < 5; harmonic++) {
                if (this.harmonicVolume[harmonic] !== 0) {
                    const position: number = sample + Tone.fDel[harmonic];

                    if (position < sampleCount) {
                        Tone.buf![position] += this.waveFunc((amplitude * Tone.fAmp[harmonic]) >> 15, Tone.fPos[harmonic], this.frequencyBase.form);
                        Tone.fPos[harmonic] += ((frequency * Tone.fMulti[harmonic]) >> 16) + Tone.fOffset[harmonic];
                    }
                }
            }
        }

        if (this.release && this.attack) {
            this.release.genInit();
            this.attack.genInit();

            let counter: number = 0;
            let muted: boolean = true;

            for (let sample: number = 0; sample < sampleCount; sample++) {
                const releaseValue: number = this.release.genNext(sampleCount);
                const attackValue: number = this.attack.genNext(sampleCount);

                let threshold: number;
                if (muted) {
                    threshold = this.release.start + (((this.release.end - this.release.start) * releaseValue) >> 8);
                } else {
                    threshold = this.release.start + (((this.release.end - this.release.start) * attackValue) >> 8);
                }

                counter += 256;
                if (counter >= threshold) {
                    counter = 0;
                    muted = !muted;
                }

                if (muted) {
                    Tone.buf![sample] = 0;
                }
            }
        }

        if (this.reverbDelay > 0 && this.reverbVolume > 0) {
            const start: number = this.reverbDelay * samplesPerStep;

            for (let sample: number = start; sample < sampleCount; sample++) {
                Tone.buf![sample] += ((Tone.buf![sample - start] * this.reverbVolume) / 100) | 0;
                Tone.buf![sample] |= 0;
            }
        }

        for (let sample: number = 0; sample < sampleCount; sample++) {
            if (Tone.buf![sample] < -32768) {
                Tone.buf![sample] = -32768;
            }

            if (Tone.buf![sample] > 32767) {
                Tone.buf![sample] = 32767;
            }
        }

        return Tone.buf!;
    }

    waveFunc(amplitude: number, phase: number, form: number): number {
        if (form === 1) {
            return (phase & 0x7fff) < 16384 ? amplitude : -amplitude;
        } else if (form === 2) {
            return (Tone.sine![phase & 0x7fff] * amplitude) >> 14;
        } else if (form === 3) {
            return (((phase & 0x7fff) * amplitude) >> 14) - amplitude;
        } else if (form === 4) {
            return Tone.noise![((phase / 2607) | 0) & 0x7fff] * amplitude;
        } else {
            return 0;
        }
    }

    load(dat: Packet): void {
        this.frequencyBase = new Envelope();
        this.frequencyBase.load(dat);

        this.amplitudeBase = new Envelope();
        this.amplitudeBase.load(dat);

        if (dat.g1() !== 0) {
            dat.pos--;

            this.frequencyModRate = new Envelope();
            this.frequencyModRate.load(dat);

            this.frequencyModRange = new Envelope();
            this.frequencyModRange.load(dat);
        }

        if (dat.g1() !== 0) {
            dat.pos--;

            this.amplitudeModRate = new Envelope();
            this.amplitudeModRate.load(dat);

            this.amplitudeModRange = new Envelope();
            this.amplitudeModRange.load(dat);
        }

        if (dat.g1() !== 0) {
            dat.pos--;

            this.release = new Envelope();
            this.release.load(dat);

            this.attack = new Envelope();
            this.attack.load(dat);
        }

        for (let harmonic: number = 0; harmonic < 10; harmonic++) {
            const volume: number = dat.gsmarts();
            if (volume === 0) {
                break;
            }

            this.harmonicVolume[harmonic] = volume;
            this.harmonicSemitone[harmonic] = dat.gsmart();
            this.harmonicDelay[harmonic] = dat.gsmarts();
        }

        this.reverbDelay = dat.gsmarts();
        this.reverbVolume = dat.gsmarts();
        this.length = dat.g2();
        this.start = dat.g2();
    }
}
