// Tiny audio engine on top of the Web Audio API.
//
// Responsibilities:
//   - load and decode MP3/WAV tracks (fetch from /assets/audio/...)
//   - playback / pause / track switch with crossfade-free swap
//   - expose an AnalyserNode so AudioAnalyzer can read FFT bins
//
// AudioContext must be created/resumed inside a user gesture, so we expose
// resume() that the click overlay calls.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.gain = null;
    this.analyser = null;
    this.source = null;
    this.buffer = null;
    this.startTime = 0;
    this.pausedAt = 0;
    this.playing = false;
    this.currentTrack = null;
    this.tracks = [];
  }

  async init(volume = 0.7) {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.gain = this.ctx.createGain();
    this.gain.gain.value = volume;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this.gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setVolume(v) {
    if (this.gain) this.gain.gain.value = v;
  }

  // Each track: { name, url }. Loader downloads & decodes lazily on selection.
  registerTracks(list) {
    this.tracks = list.map((t) => ({ ...t, buffer: null }));
  }

  async loadTrack(track) {
    if (track.buffer) return track.buffer;
    const resp = await fetch(track.url);
    if (!resp.ok) throw new Error(`Failed to fetch ${track.url}: ${resp.status}`);
    const arr = await resp.arrayBuffer();
    track.buffer = await this.ctx.decodeAudioData(arr);
    return track.buffer;
  }

  async selectTrack(track) {
    await this.init();
    await this.resume();
    await this.loadTrack(track);
    const wasPlaying = this.playing;
    this.stop();
    this.currentTrack = track;
    this.buffer = track.buffer;
    this.pausedAt = 0;
    if (wasPlaying) this.play();
  }

  play() {
    if (!this.buffer || !this.ctx) return;
    if (this.playing) return;
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.loop = true;
    this.source.connect(this.gain);
    const offset = this.pausedAt % this.buffer.duration;
    this.source.start(0, offset);
    this.startTime = this.ctx.currentTime - offset;
    this.playing = true;
  }

  pause() {
    if (!this.playing || !this.source) return;
    this.pausedAt = this.ctx.currentTime - this.startTime;
    try { this.source.stop(); } catch (_) {}
    this.source.disconnect();
    this.source = null;
    this.playing = false;
  }

  stop() {
    if (this.source) {
      try { this.source.stop(); } catch (_) {}
      this.source.disconnect();
      this.source = null;
    }
    this.playing = false;
    this.pausedAt = 0;
  }

  isPlaying() { return this.playing; }
}
