# Raytracing Notes

## Goal

Visualise the qualitative behaviour of sound propagation inside the pavilion:
specular reflection paths, energy attenuation with each hit, the contribution
of diffusing surfaces, and the influence of openings.

This is **not** a physically accurate room acoustic ray tracer. It does not:

* track time-of-flight,
* compute impulse responses,
* respect frequency-dependent reflection coefficients per ray,
* do receiver gathering or energy integration.

It **does**:

* shoot N rays per frame from each speaker (`maxRays` slider),
* trace up to M bounces (`maxBounces` slider),
* multiply remaining ray energy by `(1 − α)` of the hit material,
* recolour both the incoming and outgoing line segments to make energy
  loss visible (cyan = full energy, fading to absorption-coded colour),
* add per-bounce scatter jitter proportional to the material's `diffuse`
  parameter,
* place a coloured marker at every reflection point. Marker colour matches
  the absorption colour scale, marker size shrinks with remaining energy.

## Energy book-keeping

Pseudo-code:

```
energy = 1.0 * audio_excitation_scale
for bounce in 0..maxBounces:
    hit = raycast(origin, dir)
    if not hit:
        draw fading-into-void segment; break
    α  = material(hit).alpha
    e0 = energy           # incident
    energy *= (1 - α)     # post-absorption
    e1 = energy           # outgoing
    draw segment(origin → hit) tint(cyan*e0 → α-colour*e1)
    if energy < 0.02: break
    dir = reflect(dir, hit.normal)
    dir = jitter(dir, diffuse=material.diffuse)
    origin = hit + ε * hit.normal
```

The `audio_excitation_scale` couples ray brightness to the actual music
loudness. A louder track produces brighter rays — purely a visual aid.

## Absorption visualisation

Pavilion meshes registered for acoustic calculation can be recoloured in
two modes:

* **Analysis mode** — the entire pavilion paints by α.
* **Raytrace mode** with "Show absorption heatmap" checked — same.

When the heatmap is off, materials use their normal (designed) colour and
the colour signal is carried only by the ray segments.

Colour mapping (`colorForAbsorption(α)` in `Materials.js`):

* 0.00 – 0.33 → red → orange → yellow (highly reflective)
* 0.33 – 0.66 → yellow → green (mid)
* 0.66 – 1.00 → green → cyan → blue (highly absorptive)

## Surface inspector

Click any registered surface in Raytrace mode. The right-hand "Surface
Inspector" panel updates with:

* Material name
* α (single, mid-frequency)
* α low / α mid / α high (frequency-resolved coefficients)
* Diffusion coefficient
* Area
* Surface ID (which sub-system created it)
* Reflected/Absorbed energy ratio (`1-α` / `α`)

The picker uses Three.js' built-in `Raycaster` against the same mesh list
the visual ray tracer hits.

## Performance

* All ray lines live in a single `BufferGeometry` (line segments), so the
  GPU draws them in one call.
* Marker spheres reuse a pool that grows to whatever density the user
  chooses; unused markers are hidden, not destroyed.
* `maxRays * maxBounces` segments are allocated up-front; changing either
  slider reallocates buffers (rare, so the cost is amortised).

## Future improvements (not in MVP)

* Image-source method for first-order reflections with time-of-flight.
* Per-frequency-band ray batches → frequency-resolved impulse response.
* Listener gathering and a polar energy plot.
* Diffraction approximation around aperture edges (geometrical theory of
  diffraction, single-edge).
