// AudioAnalyzer reads the engine's AnalyserNode and produces normalized,
// smoothed band energies that the rest of the simulation consumes.
//
//   bass  — 20–250 Hz
//   mid   — 250–2500 Hz
//   high  — 2500–16000 Hz
//   level — full RMS (0..1)
//   peak  — short-term peak follower used as "drop / impulse" gate
//   energy — derivative of level, useful for transient detection
//
// All outputs are in [0,1] (clamped). Empty/no-audio yields zeros.

import { clamp, Smoother, PeakDetector } from '../utils/mathHelpers.js';

export class AudioAnalyzer {
  constructor(engine) {
    this.engine = engine;
    this.bins = null;
    this.sampleRate = 44100;
    this.freqPerBin = 22050 / 1024;

    this.smBass = new Smoother(0.18);
    this.smMid = new Smoother(0.22);
    this.smHigh = new Smoother(0.28);
    this.smLevel = new Smoother(0.10);
    this.peakDet = new PeakDetector(0.93);
    this.lastLevel = 0;

    this.state = {
      bass: 0, mid: 0, high: 0, level: 0, peak: 0, energy: 0,
      spectrum: new Float32Array(0),
    };
  }

  _ensureBins() {
    const a = this.engine.analyser;
    if (!a) return false;
    if (!this.bins || this.bins.length !== a.frequencyBinCount) {
      this.bins = new Uint8Array(a.frequencyBinCount);
      this.sampleRate = this.engine.ctx.sampleRate;
      this.freqPerBin = (this.sampleRate / 2) / a.frequencyBinCount;
      this.state.spectrum = new Float32Array(a.frequencyBinCount);
    }
    return true;
  }

  update() {
    if (!this._ensureBins()) {
      // No audio yet — gently decay state.
      this.state.bass *= 0.95;
      this.state.mid *= 0.95;
      this.state.high *= 0.95;
      this.state.level *= 0.95;
      this.state.peak *= 0.95;
      this.state.energy *= 0.95;
      return this.state;
    }
    const a = this.engine.analyser;
    a.getByteFrequencyData(this.bins);

    // Convert to 0..1 spectrum.
    for (let i = 0; i < this.bins.length; i++) {
      this.state.spectrum[i] = this.bins[i] / 255;
    }

    const binEnd = (hz) => Math.min(this.bins.length - 1, Math.floor(hz / this.freqPerBin));

    const bassEnd = binEnd(250);
    const midEnd = binEnd(2500);
    const highEnd = binEnd(16000);

    let bass = 0, mid = 0, high = 0, all = 0;
    for (let i = 1; i <= bassEnd; i++) bass += this.state.spectrum[i];
    for (let i = bassEnd + 1; i <= midEnd; i++) mid += this.state.spectrum[i];
    for (let i = midEnd + 1; i <= highEnd; i++) high += this.state.spectrum[i];
    for (let i = 1; i < this.bins.length; i++) all += this.state.spectrum[i];

    const norm = (sum, n) => (n > 0 ? sum / n : 0);

    // Normalize and boost — typical FFT byte data peaks around 0.3-0.5 for
    // dance music, so we scale to make the visual response sensible.
    const bassN = clamp(norm(bass, bassEnd) * 2.4, 0, 1);
    const midN = clamp(norm(mid, midEnd - bassEnd) * 2.6, 0, 1);
    const highN = clamp(norm(high, highEnd - midEnd) * 3.0, 0, 1);
    const lvlN = clamp(norm(all, this.bins.length - 1) * 2.6, 0, 1);

    this.state.bass = this.smBass.update(bassN);
    this.state.mid = this.smMid.update(midN);
    this.state.high = this.smHigh.update(highN);
    this.state.level = this.smLevel.update(lvlN);
    this.state.peak = this.peakDet.update(lvlN);

    const dLevel = lvlN - this.lastLevel;
    this.lastLevel = lvlN;
    this.state.energy = clamp(Math.max(0, dLevel) * 6, 0, 1);

    return this.state;
  }
}
