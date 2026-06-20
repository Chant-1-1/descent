// Acoustics — entry point.
// Wires the scene, pavilion, audio, analyzer, optimiser, raytracer and UI
// together into a single render loop. See docs/internal-readme.md for the
// architecture overview.

import * as THREE from 'three';
import { SceneManager } from './scene/SceneManager.js';
import { Pavilion } from './pavilion/Pavilion.js';
import { AudioEngine } from './audio/AudioEngine.js';
import { AudioAnalyzer } from './audio/AudioAnalyzer.js';
import { TRACKS } from './audio/tracks.js';
import { Controls } from './ui/Controls.js';
import { Diagrams } from './ui/Diagrams.js';
import { ModeSwitcher } from './ui/ModeSwitcher.js';
import { Raytracer } from './raytracing/Raytracer.js';
import { SurfacePicker } from './raytracing/SurfacePicker.js';
import { Optimizer } from './utils/optimizer.js';
import { computeAcousticSnapshot } from './acoustics/Metrics.js';

const canvas = document.getElementById('scene');
const sceneManager = new SceneManager(canvas);
const pavilion = new Pavilion();
sceneManager.add(pavilion.object3d);

const audioEngine = new AudioEngine();
const analyzer = new AudioAnalyzer(audioEngine);
const controls = new Controls();
const diagrams = new Diagrams();
const optimizer = new Optimizer();
const raytracer = new Raytracer(pavilion, sceneManager.scene);
const picker = new SurfacePicker(pavilion, sceneManager, diagrams);

// ────────────────────────────────────────────────────────────
// Track list UI — populate from manifest
// ────────────────────────────────────────────────────────────
const trackListEl = document.getElementById('track-list');
audioEngine.registerTracks(TRACKS);

function renderTrackList(activeId) {
  trackListEl.innerHTML = '';
  for (const t of TRACKS) {
    const div = document.createElement('div');
    div.className = 'track' + (t.id === activeId ? ' active' : '');
    div.innerHTML = `<span>${t.name}</span><small style="color:var(--muted)">${t.tags[1] ?? ''}</small>`;
    div.addEventListener('click', () => selectTrack(t));
    trackListEl.appendChild(div);
  }
}
renderTrackList(null);

async function selectTrack(t) {
  try {
    await audioEngine.selectTrack(t);
    renderTrackList(t.id);
  } catch (err) {
    console.error(err);
    // Show inline error so users understand if their asset folder is empty
    const errorEl = document.createElement('div');
    errorEl.className = 'muted';
    errorEl.style.color = '#ff8a5e';
    errorEl.style.marginTop = '4px';
    errorEl.textContent = `Could not load ${t.url}. Drop a file in assets/audio/.`;
    trackListEl.appendChild(errorEl);
  }
}

document.getElementById('play-btn').addEventListener('click', async () => {
  await audioEngine.init();
  await audioEngine.resume();
  // Pick a default track if none is loaded yet.
  if (!audioEngine.currentTrack && TRACKS.length) {
    try { await audioEngine.selectTrack(TRACKS[0]); } catch (e) { console.warn(e); }
  }
  audioEngine.play();
});
document.getElementById('pause-btn').addEventListener('click', () => audioEngine.pause());
document.getElementById('volume').addEventListener('input', (e) => audioEngine.setVolume(parseFloat(e.target.value)));

// ────────────────────────────────────────────────────────────
// Mode switcher
// ────────────────────────────────────────────────────────────
const modeSwitcher = new ModeSwitcher((mode) => {
  raytracer.setEnabled(mode === 'raytrace');
  picker.setEnabled(mode === 'raytrace');
  // Absorption visualization is driven live in the render loop (it also depends
  // on the live "Show absorption" checkbox), so nothing else to do here.
  // Analysis mode also highlights absorption — a quick architectural map.
});

// ────────────────────────────────────────────────────────────
// Keyboard shortcuts:
//   R — force the optimizer to re-evaluate immediately
//   C — toggle cinematic auto-orbit camera (for video capture)
// ────────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    optimizer.lastEval = 0; // force re-eval next tick
  } else if (e.key === 'c' || e.key === 'C') {
    const on = sceneManager.toggleCinematic();
    const hint = document.getElementById('hint');
    if (hint) hint.dataset.cinematic = on ? 'Cinematic ON' : '';
  }
});

// ────────────────────────────────────────────────────────────
// Click-to-start overlay (needed for AudioContext gesture)
// ────────────────────────────────────────────────────────────
const overlay = document.createElement('div');
overlay.className = 'notice';
overlay.innerHTML = `
  <div class="inner">
    <h1>ACOUSTICS · PAVILION 01</h1>
    <p>Adaptive 20 × 20 m festival pavilion. Click to begin.</p>
    <p style="margin-top:10px;color:var(--accent)">CLICK TO START</p>
  </div>`;
document.body.appendChild(overlay);
overlay.addEventListener('click', async () => {
  overlay.remove();
  await audioEngine.init(parseFloat(document.getElementById('volume').value));
  await audioEngine.resume();
});

// ────────────────────────────────────────────────────────────
// Render loop
// ────────────────────────────────────────────────────────────
let lastUI = 0;
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, sceneManager.clock.getDelta());
  const now = performance.now();

  const audio = analyzer.update();

  // Stage / speaker optimisation — slow, throttled internally.
  optimizer.optimize(pavilion.stage, pavilion.speakers, audio, now);

  // Pavilion animations driven by audio bands + controls.
  pavilion.update(dt, audio, controls.state);
  pavilion.modeShowAbsorption =
    (modeSwitcher.mode === 'raytrace' && controls.state.showAbsorption) ||
    modeSwitcher.mode === 'analysis';

  // Drive stage lighting from audio.
  sceneManager.stageLightA.intensity = 4 + audio.level * 18 + audio.peak * 12;
  sceneManager.stageLightB.intensity = 2 + audio.bass * 12 + audio.peak * 14;
  sceneManager.stageLightA.position.copy(pavilion.stage.currentPos).add(new THREE.Vector3(0, 5, 0));
  sceneManager.stageLightB.position.copy(pavilion.stage.currentPos).add(new THREE.Vector3(0, 3, -1));

  // Global colour theme shifts with the track character: bass-dominant tracks
  // skew the lighting toward magenta, treble-dominant toward cyan. The lights
  // ease toward the target hue so colour transitions stay smooth.
  const total = audio.bass + audio.mid + audio.high + 1e-6;
  const bassDom = audio.bass / total;
  const highDom = audio.high / total;
  const hueA = 0.5 + highDom * 0.06 - bassDom * 0.04; // cyan-ish key
  const hueB = 0.9 - highDom * 0.08;                   // magenta-ish accent
  sceneManager.stageLightA.color.setHSL(hueA, 0.85, 0.6);
  sceneManager.stageLightB.color.setHSL(hueB, 0.85, 0.55);

  // Cinematic camera (no-op unless toggled with 'C').
  sceneManager.tickCamera(dt);

  // Raytracing only when its mode is active.
  raytracer.setRayDensity(controls.state.rayDensity);
  raytracer.setMaxBounces(controls.state.bounces);
  raytracer.update(audio);

  // UI ~30Hz
  if (now - lastUI > 33) {
    lastUI = now;
    diagrams.setMeters(audio);
    diagrams.drawSpectrum(audio.spectrum);

    const snap = computeAcousticSnapshot(pavilion, audio);
    snap.diffusion = Math.min(1, snap.diffusion + controls.state.diffusion * 0.2);
    diagrams.setKPIs(snap, {
      stage: pavilion.stage.currentPos,
      speakers: pavilion.speakers.positions(),
      score: optimizer.score,
    });
  }

  sceneManager.render();
}
tick();

// Expose for debugging in browser console.
window.__acoustics = { sceneManager, pavilion, audioEngine, analyzer, optimizer, raytracer, controls };
