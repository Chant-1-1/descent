# Acoustic Principles — Implementation Notes

This document maps each of the ten classical acoustic principles onto a
concrete behaviour in the simulation. For each principle we record:

* **Spatial translation** — how the principle is expressed visually.
* **Status** — *Calculated* (real formula with traceable inputs),
  *Approximated* (heuristic that broadly tracks the real behaviour), or
  *Visualised* (purely conceptual, no math behind it).
* **Notes / honesty disclaimer** — what the user should NOT read into it.

## Primary — fully implemented

### 1. Reverberation time (RT60)

* **Spatial translation** — surfaces with high α (felt, fabric, perforated)
  pull RT60 down; closed roof and full panels push it up. The KPI updates
  live as the pavilion adapts. A per-band readout is shown for low/mid/high.
* **Status** — *Calculated* using Sabine:
  `RT60 = 0.161 · V / A` with V from the live volume (footprint × wall height,
  plus opened roof and sunken-floor extras) and A from the registered surface
  list. Surfaces are summed `Σ Sᵢ · αᵢ` per band.
* **Honesty disclaimer** — Sabine assumes a diffuse field. Festival pavilions
  with large openings are not diffuse. Treat the value as a comparative
  metric across configurations, not an absolute prediction.

### 2. Absorption

* **Spatial translation** — every registered surface has an α coefficient.
  Analysis & Raytrace modes recolour surfaces with a continuous gradient:
  red (low α, reflective) → green (mid α) → blue (high α, absorptive). Each
  reflected ray in the raytracer multiplies its remaining energy by `(1-α)`
  per bounce, with visible colour/opacity attenuation.
* **Status** — *Calculated* (α values from architectural acoustics
  references in `Materials.js`; full coefficient × area term in Sabine sum).
* **Honesty disclaimer** — Values are single-number Sabine approximations
  (mid-frequency). The frequency split in `alphaBand` is realistic in shape
  but rounded for clarity.

### 3. Diffusion

* **Spatial translation** — diffusor panels (`MATERIALS.diffusor`) are
  embedded in the wall cycle. The raytracer adds jitter to each reflection
  vector proportional to the hit surface's `diffuse` parameter — visible as
  scattered branching ray paths.
* **Status** — *Approximated*. Index is area-weighted average of material
  `diffuse` values.
* **Honesty disclaimer** — Real diffusion is measured via polar scattering
  (ISO 17497-2). The single-number proxy used here is good enough for
  comparative design decisions, not for prediction.

### 4. Resonance

* **Spatial translation** — the wall-mounted resonator modules
  (`Resonators.js`) open and close their apertures with bass. They are
  materially modeled as `MATERIALS.bassTrap` (bass-biased α), so opening
  them increases low-band absorption and visibly bleeds the room.
* **Status** — *Approximated*. Aperture area enters Sabine as a near-perfect
  absorber (α ≈ 0.95).
* **Honesty disclaimer** — Real Helmholtz/membrane resonators have a tuned
  frequency response. We use a flat bass-heavy α curve as a proxy.

### 5. Frequency response

* **Spatial translation** — separate animation channels for bass, mid, high
  drive different architectural subsystems (roof, panels, fine flicker).
  The right-panel spectrum canvas shows the FFT directly.
* **Status** — *Calculated* (Web Audio AnalyserNode → averaged into bands).
* **Honesty disclaimer** — Band boundaries (250 / 2500 / 16000 Hz) are
  hand-picked. They reflect common DJ-mixing intuition, not a standard.

## Secondary — visualised, not deeply modelled

### 6. Reflection

* **Spatial translation** — every reflective surface (metal panels,
  concrete, stage deck) is tinted red in the absorption heat-map. The
  raytracer shows specular reflection paths with visible energy.
* **Status** — *Approximated* (true specular reflection in the visual ray
  tracer; reflection index is an area-weighted derived metric).
* **Honesty disclaimer** — No air absorption, no diffraction around panel
  edges.

### 7. Echo / flutter echo

* **Spatial translation** — parallel reflective walls produce visible
  ping-pong ray paths in Raytrace mode when bounces are increased.
* **Status** — *Visualised only*. We do not compute echo onset time or
  inter-arrival intervals.
* **Honesty disclaimer** — A real flutter echo analyser would need
  time-of-flight bookkeeping and an inter-arrival histogram.

### 8. Sound insulation / isolation

* **Spatial translation** — wall vs panel mass is suggested by material
  shading and the visible aperture area; opening apertures dump energy
  outside (α ≈ 0.95 leakage).
* **Status** — *Visualised*. Mass-law / STC is not computed.
* **Honesty disclaimer** — This pavilion is open-air; isolation is a
  visualised intuition, not a real spec.

### 9. Directivity

* **Spatial translation** — speakers point at the stage; rays leave a
  hemispherical pattern biased toward horizontal (mimicking line-array
  directivity).
* **Status** — *Approximated* in the raytracer's `_sampleDirection()`.
* **Honesty disclaimer** — Real line-arrays have measured polar plots; we
  use a cosine-biased random sampler.

### 10. Psychoacoustics

* **Spatial translation** — the immersion score gives a one-number "how
  good does this room feel right now" estimate from RT-in-sweet-spot
  (1.0–1.6 s for dance music), bass control, diffusion and energy. Lights
  pulse with peak / level as a perceptual cue.
* **Status** — *Heuristic*.
* **Honesty disclaimer** — No loudness model (no ISO 532), no Bark-band
  weighting. This is a designer's intuition number.

## Raytracing visual notes

See `raytracing-notes.md` for the visual ray tracer's specific energy
accounting and limitations.
