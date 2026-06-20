# Acoustics — Internal README

Adaptive simulation of a futuristic 20 × 20 m festival pavilion that reacts
to techno music. Built with Vite + Three.js + Web Audio API.

> This is an internal note, not a public install guide. The intended audience
> is the architect/designer using the simulation and anyone hacking on the
> code.

## Project goal

Show how an architecturally interesting pavilion (mobile stage, mobile
speakers, opening roof, descending floor zones, breathing resonator modules,
louvre panels) can adapt to the music it's hosting — and visualise the
acoustic consequences of those changes.

The pavilion is presentable (video & demo grade) but the acoustic model is
deliberately a *simplified, traceable* model — not Odeon. See
`acoustic-principles.md` for what's computed vs visualised.

## Technical structure

```
src/
  main.js                 — entry point: wires modules into a render loop
  scene/SceneManager.js   — renderer, camera, lights, orbit controls, ground
  audio/AudioEngine.js    — load, decode, play, gain, AnalyserNode
  audio/AudioAnalyzer.js  — bass / mid / high / level / peak / spectrum
  audio/tracks.js         — track manifest (edit to add tracks)
  acoustics/Materials.js  — α values + colour mapping for absorption viz
  acoustics/Sabine.js     — Sabine RT60 (single + per-band) helpers
  acoustics/Metrics.js    — aggregated snapshot for UI binding
  pavilion/Pavilion.js    — composes Roof, Panels, Floor, Resonators, Stage, Speakers
  pavilion/Roof.js        — 8 hinged petals, opens with bass
  pavilion/Panels.js      — 32 louvre panels, tilt with mid
  pavilion/Floor.js       — 36 tiles, sink with bass / level
  pavilion/Resonators.js  — wall bass-trap modules with opening apertures
  pavilion/Stage.js       — mobile DJ platform driven by optimizer
  pavilion/Speakers.js    — 4 line-array stacks driven by optimizer
  raytracing/Raytracer.js — visual ray + absorption energy attenuation
  raytracing/SurfacePicker.js — click-to-inspect any registered surface
  ui/Controls.js          — slider/checkbox → state object
  ui/Diagrams.js          — meters, KPIs, spectrum canvas, inspector
  ui/ModeSwitcher.js      — normal / analysis / raytrace
  ui/styles.css           — full UI styling
  utils/mathHelpers.js    — clamp/lerp/smoother/peakdetector/rng
  utils/optimizer.js      — heuristic stage + speaker placement
```

The pavilion is composed of subsystems each responsible for one architectural
behaviour. Each subsystem:

1. registers its surfaces with `Pavilion.registerSurface(mesh, material, area, name)`
2. updates itself each frame from the smoothed audio bands
3. optionally exposes properties used in the Sabine calculation
   (`openingFactor`, `descentFactor`, `apertureArea`)

## Modes

* **Normal** — pure cinematic mode. No diagrams, soft lights, atmosphere.
* **Analysis** — surfaces tint by absorption coefficient (red = reflective,
  blue = absorptive). KPIs visible on the right.
* **Raytrace** — sound rays from each speaker, energy attenuation per
  bounce, click to inspect a surface.

## Rendering & camera

* **Bloom** — the scene renders through an `EffectComposer`
  (RenderPass → UnrealBloomPass → OutputPass) so emissive surfaces glow.
  Tuned in `SceneManager._setupComposer()` (threshold 0.82 keeps only bright
  elements blooming).
* **Exposure** — `toneMappingExposure` and the three key lights are set ~15%
  brighter than the original baseline for a more vivid look.
* **Cinematic camera** — press **C** to toggle a slow hands-free auto-orbit
  (for video capture). Any mouse interaction pauses it for ~2.5 s.

## Keyboard shortcuts

* **R** — force the stage/speaker optimizer to re-evaluate immediately.
* **C** — toggle cinematic auto-orbit camera.

## How tracks are added

1. Drop MP3s into `assets/audio/` (Vite's `publicDir` exposes the folder
   at `/audio/<filename>`).
2. Edit `src/audio/tracks.js` so each entry's `url` matches the file name.
3. Reload — the tracks appear in the left panel.

Decoding happens lazily on first selection, so even multi-minute tracks
don't slow page load.

## What is calculated vs visualised

See `acoustic-principles.md` for the full mapping. Quick version:

| Domain                  | Status                                           |
|-------------------------|--------------------------------------------------|
| Sabine RT60             | **Calculated** (V, A from registered surfaces)  |
| Per-band RT60           | **Calculated** (low/mid/high)                   |
| Absorption surface map  | **Calculated** (α coefficient → colour gradient)|
| Diffusion index         | **Approximated** (area-weighted material `diffuse`) |
| Reflection index        | **Approximated** ((1−α)(1−diffuse) weighted)   |
| Immersion score         | **Heuristic** (sweet-spot RT, diffusion, energy) |
| Raytracer paths         | **Visual approximation** (geometric reflection + diffuse jitter) |
| Stage/Speaker optimiser | **Heuristic** (continuous, audio-tracking base + jittered candidates, weighted score) |
| Frequency response      | **Visualised** (spectrum canvas)                |
| Time-of-flight / echoes | **Not simulated** (would need image-source / ISM) |

## Sliders → behaviour mapping

| Slider             | Effect                                                          |
|--------------------|-----------------------------------------------------------------|
| Adaptation intensity | Master multiplier for all motion amplitudes                  |
| Stage mobility     | Lerp speed of stage toward its optimised target                 |
| Speaker mobility   | Lerp speed of speakers toward optimised targets                 |
| Opening aperture   | Static bias added to resonator + panel apertures                |
| Roof deformation   | Multiplier on bass-driven petal hinge                           |
| Floor descent      | Multiplier on bass+level-driven tile descent                    |
| Panel travel       | Multiplier on mid-driven louvre tilt                            |
| Absorption bias    | (Reserved) — used by future material swap logic                 |
| Diffusion bias     | Adds a constant to diffusion KPI to compare configurations      |
| Transformation speed | Time-scale on all `update(dt)` deltas                         |
| Ray density        | Total rays per frame (split across the 4 emitters)              |
| Max reflections    | Bounce depth in the raytracer                                   |
| Absorption viz     | Toggle the heat-map colouring                                   |

## Known limitations

* Air absorption is ignored.
* Diffuse field assumption (Sabine) is poor for large open pavilions.
* Raytracer does no time-of-flight, so no echo / flutter detection.
* Optimizer derives a continuous base position from the audio character and
  only compares a few jittered variants around it — it can't discover
  non-obvious global geometries.
* No 360 panel material editing in the UI — change `MATERIAL_CYCLE` in
  `Panels.js` if you want a different perimeter mix.

These are deliberate scope cuts. The simulation is a *presentation* tool
first; a sketchpad for further acoustic research second.
