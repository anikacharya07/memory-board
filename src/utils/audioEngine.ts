// High-Fidelity Web Audio Engine for Romantic Memory Board
// Supports both procedural romantic soundscapes (zero external dependencies/network lag)
// and custom user-uploaded audio files (MP3/WAV/AAC) with smooth gain fading.

import type { AudioPresetType } from '../types';

class MemoryAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public analyser: AnalyserNode | null = null;
  private currentActiveNodeId: string | null = null;
  private activeGenerators: Map<string, { stop: () => void; gainNode: GainNode }> = new Map();
  private activeAudioElements: Map<string, { element: HTMLAudioElement; source: MediaElementAudioSourceNode; gainNode: GainNode }> = new Map();
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public unlockAudio() {
    this.initContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : 1.0, now + 0.1);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getActiveNodeId(): string | null {
    return this.currentActiveNodeId;
  }

  // Smoothly fade in audio for a memory card
  public playMemory(
    nodeId: string, 
    audioPreset: AudioPresetType = 'lofi_piano', 
    audioUrl?: string, 
    durationMs: number = 300
  ) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;

    // If another memory is currently playing, smoothly fade it out
    if (this.currentActiveNodeId && this.currentActiveNodeId !== nodeId) {
      this.stopMemory(this.currentActiveNodeId, 250);
    }

    this.currentActiveNodeId = nodeId;

    // Check if custom audioUrl is provided
    if (audioUrl) {
      this.playCustomAudio(nodeId, audioUrl, durationMs);
      return;
    }

    // Otherwise play procedural romantic theme
    this.playProceduralTheme(nodeId, audioPreset, durationMs);
  }

  // Smoothly fade out audio for a memory card
  public stopMemory(nodeId: string, durationMs: number = 350) {
    if (!this.ctx) return;
    if (this.currentActiveNodeId === nodeId) {
      this.currentActiveNodeId = null;
    }

    // Stop procedural synth
    const gen = this.activeGenerators.get(nodeId);
    if (gen) {
      const now = this.ctx.currentTime;
      gen.gainNode.gain.cancelScheduledValues(now);
      gen.gainNode.gain.setValueAtTime(gen.gainNode.gain.value, now);
      gen.gainNode.gain.linearRampToValueAtTime(0.0001, now + durationMs / 1000);

      window.setTimeout(() => {
        gen.stop();
        this.activeGenerators.delete(nodeId);
      }, durationMs + 50);
    }

    // Stop custom audio element
    const aud = this.activeAudioElements.get(nodeId);
    if (aud) {
      const now = this.ctx.currentTime;
      aud.gainNode.gain.cancelScheduledValues(now);
      aud.gainNode.gain.setValueAtTime(aud.gainNode.gain.value, now);
      aud.gainNode.gain.linearRampToValueAtTime(0.0001, now + durationMs / 1000);

      window.setTimeout(() => {
        aud.element.pause();
        this.activeAudioElements.delete(nodeId);
      }, durationMs + 50);
    }
  }

  // Stop all active audio
  public stopAll(durationMs: number = 200) {
    if (this.currentActiveNodeId) {
      this.stopMemory(this.currentActiveNodeId, durationMs);
    }
    this.activeGenerators.forEach((_, id) => this.stopMemory(id, durationMs));
    this.activeAudioElements.forEach((_, id) => this.stopMemory(id, durationMs));
  }

  private playCustomAudio(nodeId: string, url: string, durationMs: number) {
    if (!this.ctx || !this.masterGain) return;

    let aud = this.activeAudioElements.get(nodeId);
    if (!aud) {
      const element = new Audio(url);
      element.loop = true;
      element.crossOrigin = 'anonymous';

      const source = this.ctx.createMediaElementSource(element);
      const gainNode = this.ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      aud = { element, source, gainNode };
      this.activeAudioElements.set(nodeId, aud);
    }

    aud.element.play().catch(() => {});

    const now = this.ctx.currentTime;
    aud.gainNode.gain.cancelScheduledValues(now);
    aud.gainNode.gain.setValueAtTime(aud.gainNode.gain.value, now);
    aud.gainNode.gain.linearRampToValueAtTime(0.7, now + durationMs / 1000);
  }

  // Procedural synthesizers tuned for nostalgic romantic atmosphere
  private playProceduralTheme(nodeId: string, preset: AudioPresetType, durationMs: number) {
    if (!this.ctx || !this.masterGain) return;

    // Clean up any existing generator for this node
    if (this.activeGenerators.has(nodeId)) {
      this.activeGenerators.get(nodeId)?.stop();
      this.activeGenerators.delete(nodeId);
    }

    const nodeGain = this.ctx.createGain();
    nodeGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    nodeGain.connect(this.masterGain);

    let isRunning = true;
    const timeouts: number[] = [];

    const stop = () => {
      isRunning = false;
      timeouts.forEach(t => clearTimeout(t));
      try {
        nodeGain.disconnect();
      } catch {}
    };

    this.activeGenerators.set(nodeId, { stop, gainNode: nodeGain });

    // Fade in
    const now = this.ctx.currentTime;
    nodeGain.gain.cancelScheduledValues(now);
    nodeGain.gain.setValueAtTime(0.0001, now);
    nodeGain.gain.linearRampToValueAtTime(0.28, now + durationMs / 1000);

    // Launch preset melody sequencer
    switch (preset) {
      case 'acoustic_guitar':
        this.startAcousticGuitarLoop(nodeGain, () => isRunning, timeouts);
        break;
      case 'music_box':
        this.startMusicBoxLoop(nodeGain, () => isRunning, timeouts);
        break;
      case 'lofi_piano':
        this.startLofiPianoLoop(nodeGain, () => isRunning, timeouts);
        break;
      case 'sunset_chords':
        this.startSunsetChordsLoop(nodeGain, () => isRunning, timeouts);
        break;
      case 'rain_ambient':
        this.startRainAmbientLoop(nodeGain, () => isRunning, timeouts);
        break;
      case 'starlight_pads':
      default:
        this.startStarlightPadsLoop(nodeGain, () => isRunning, timeouts);
        break;
    }
  }

  // Warm Acoustic Guitar Arpeggios (D maj - Bm - G - A)
  private startAcousticGuitarLoop(dest: GainNode, checkRunning: () => boolean, timeouts: number[]) {
    if (!this.ctx) return;

    // Guitar pluck frequencies (Hz)
    const chords = [
      [146.83, 220.00, 293.66, 369.99, 440.00], // D, A, D4, F#4, A4
      [123.47, 185.00, 246.94, 293.66, 369.99], // B, F#, B3, D4, F#4
      [98.00, 146.83, 196.00, 246.94, 293.66],  // G, D, G3, B3, D4
      [110.00, 164.81, 220.00, 277.18, 329.63], // A, E, A3, C#4, E4
    ];

    let chordIdx = 0;
    const playArp = () => {
      if (!checkRunning() || !this.ctx) return;

      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach((freq, i) => {
        const tId = window.setTimeout(() => {
          if (!checkRunning() || !this.ctx) return;
          this.triggerPluckNote(freq, dest, 0.16);
        }, i * 220);
        timeouts.push(tId);
      });

      const nextLoop = window.setTimeout(playArp, 1800);
      timeouts.push(nextLoop);
    };

    playArp();
  }

  private triggerPluckNote(freq: number, dest: GainNode, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const noteGain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.5, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, this.ctx.currentTime + 1.2);

    const now = this.ctx.currentTime;
    noteGain.gain.setValueAtTime(0.0001, now);
    noteGain.gain.linearRampToValueAtTime(vol, now + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(filter);
    filter.connect(noteGain);
    noteGain.connect(dest);

    osc.start(now);
    osc.stop(now + 1.8);
  }

  // Nostalgic Music Box Lullaby (Delicate bell chimes)
  private startMusicBoxLoop(dest: GainNode, checkRunning: () => boolean, timeouts: number[]) {
    if (!this.ctx) return;

    // Pentatonic romantic music box sequence
    const notes = [
      523.25, 659.25, 783.99, 1046.50, // C5, E5, G5, C6
      880.00, 783.99, 659.25, 523.25,  // A5, G5, E5, C5
      659.25, 783.99, 880.00, 1046.50, // E5, G5, A5, C6
      1174.66, 1046.50, 880.00, 783.99 // D6, C6, A5, G5
    ];

    let noteIdx = 0;
    const playNote = () => {
      if (!checkRunning() || !this.ctx) return;

      const freq = notes[noteIdx % notes.length];
      noteIdx++;

      const osc = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const noteGain = this.ctx.createGain();

      osc.type = 'sine';
      oscHarmonic.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      oscHarmonic.frequency.setValueAtTime(freq * 2.02, this.ctx.currentTime); // Slight bell overtone

      const now = this.ctx.currentTime;
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.12, now + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc.connect(noteGain);
      oscHarmonic.connect(noteGain);
      noteGain.connect(dest);

      osc.start(now);
      oscHarmonic.start(now);
      osc.stop(now + 1.5);
      oscHarmonic.stop(now + 1.5);

      const nextNote = window.setTimeout(playNote, 380);
      timeouts.push(nextNote);
    };

    playNote();
  }

  // Lofi Electric Piano Chords (Rhodes warm vibe with gentle vibrato)
  private startLofiPianoLoop(dest: GainNode, checkRunning: () => boolean, timeouts: number[]) {
    if (!this.ctx) return;

    // Fmaj7 - Em7 - Dm7 - Cmaj7
    const chords = [
      [174.61, 261.63, 329.63, 392.00], // F3, C4, E4, G4
      [164.81, 246.94, 293.66, 392.00], // E3, B3, D4, G4
      [146.83, 220.00, 261.63, 349.23], // D3, A3, C4, F4
      [130.81, 196.00, 246.94, 329.63], // C3, G3, B3, E4
    ];

    let chordIdx = 0;
    const playChord = () => {
      if (!checkRunning() || !this.ctx) return;

      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach(freq => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // Lofi vibrato LFO
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(4.2, this.ctx.currentTime);
        lfoGain.gain.setValueAtTime(1.5, this.ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.09, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 2.5);
        lfo.stop(now + 2.5);
      });

      const next = window.setTimeout(playChord, 2200);
      timeouts.push(next);
    };

    playChord();
  }

  // Sunset Warm Analog Pad Chords
  private startSunsetChordsLoop(dest: GainNode, checkRunning: () => boolean, timeouts: number[]) {
    if (!this.ctx) return;

    const chords = [
      [220.0, 277.18, 329.63, 440.0], // A maj
      [196.0, 246.94, 293.66, 392.0], // G maj
      [174.61, 220.0, 261.63, 349.23],// F maj
      [164.81, 196.0, 246.94, 329.63],// E min
    ];

    let chordIdx = 0;
    const playPad = () => {
      if (!checkRunning() || !this.ctx) return;
      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach(freq => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, this.ctx.currentTime);
        filter.Q.setValueAtTime(2, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.8);
        gain.gain.linearRampToValueAtTime(0.0001, now + 3.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 3.2);
      });

      const next = window.setTimeout(playPad, 2800);
      timeouts.push(next);
    };

    playPad();
  }

  // Rain Ambient + Cozy Chimes
  private startRainAmbientLoop(dest: GainNode, checkRunning: () => boolean, timeouts: number[]) {
    if (!this.ctx) return;

    // Procedural Pink Noise Rain
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

    const rainGain = this.ctx.createGain();
    rainGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    whiteNoise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(dest);

    whiteNoise.start();

    // Distant occasional romantic chime drops
    const chimePitches = [440, 554.37, 659.25, 880, 1108.73];
    const triggerRainDropChime = () => {
      if (!checkRunning() || !this.ctx) return;
      const freq = chimePitches[Math.floor(Math.random() * chimePitches.length)];
      this.triggerPluckNote(freq, dest, 0.06);

      const nextChime = window.setTimeout(triggerRainDropChime, 700 + Math.random() * 900);
      timeouts.push(nextChime);
    };

    triggerRainDropChime();
  }

  // Dreamy Starlight Ambient Pads
  private startStarlightPadsLoop(dest: GainNode, checkRunning: () => boolean, timeouts: number[]) {
    if (!this.ctx) return;

    // Ethereal chord progression (Cmaj9 - Am9 - Fmaj9 - Gsus4)
    const chords = [
      [261.63, 329.63, 392.00, 493.88, 587.33], // C, E, G, B, D
      [220.00, 261.63, 329.63, 392.00, 493.88], // A, C, E, G, B
      [174.61, 261.63, 329.63, 349.23, 440.00], // F, C, E, F, A
      [196.00, 261.63, 293.66, 392.00, 587.33], // G, C, D, G, D
    ];

    let chordIdx = 0;
    const playStarlight = () => {
      if (!checkRunning() || !this.ctx) return;
      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach(freq => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq, this.ctx.currentTime);
        filter.Q.setValueAtTime(4, this.ctx.currentTime);

        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.start(now);
        osc.stop(now + 3.8);
      });

      const next = window.setTimeout(playStarlight, 3200);
      timeouts.push(next);
    };

    playStarlight();
  }

  // Get live audio frequency data for visualizer (0 - 255 values)
  public getByteFrequencyData(dataArray: Uint8Array<ArrayBuffer>) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    } else {
      dataArray.fill(0);
    }
  }

}

export const audioEngine = new MemoryAudioEngine();
