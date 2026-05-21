// Sabine reverberation calculator.
//
// RT60 = 0.161 * V / A
//   V — room volume (m³)
//   A — total equivalent absorption (Σ Sᵢ * αᵢ, m²·sa)
//
// This is a well-known SIMPLIFICATION:
//   - assumes diffuse field (rarely true in tall open festival pavilions)
//   - ignores air absorption
//   - ignores frequency-dependent α (we ALSO compute per-band as a separate value)
//
// We expose:
//   - sabineRT60(volume, absorption) — single-band classic formula
//   - sabineRT60PerBand(volume, surfaces, bands) — low/mid/high RT60 estimates

const SPEED_OF_SOUND = 343; // m/s — used for raytracing time-of-flight, not Sabine.

export function sabineRT60(volume, absorption) {
  if (absorption <= 0.0001) return 99; // pathological — surface clamp
  return 0.161 * volume / absorption;
}

// Compute equivalent absorption from a list of {area, material}.
export function totalAbsorption(surfaces) {
  let A = 0;
  let totalArea = 0;
  for (const s of surfaces) {
    A += s.area * s.material.alpha;
    totalArea += s.area;
  }
  return { A, totalArea, alphaAvg: totalArea > 0 ? A / totalArea : 0 };
}

// Per-band RT60 — gives a more honest picture than a single value.
export function sabineRT60PerBand(volume, surfaces) {
  const bands = ['low', 'mid', 'high'];
  const out = {};
  for (const band of bands) {
    let A = 0;
    for (const s of surfaces) {
      const a = s.material.alphaBand ? s.material.alphaBand[band] : s.material.alpha;
      A += s.area * a;
    }
    out[band] = sabineRT60(volume, A);
    out[`A_${band}`] = A;
  }
  return out;
}

// Diffusion index (0..1) — area-weighted average of material `diffuse`.
// CONCEPTUAL: a real diffusion index follows ISO 17497-2 and requires polar
// scattering measurements. Here it's a usable visual proxy.
export function diffusionIndex(surfaces) {
  let total = 0;
  let area = 0;
  for (const s of surfaces) {
    const d = s.material.diffuse ?? 0.1;
    total += s.area * d;
    area += s.area;
  }
  return area > 0 ? total / area : 0;
}

// Reflection index — inverse-weighted from absorption + diffusion.
// CONCEPTUAL: real specular reflection depends on geometry and incidence angle.
export function reflectionIndex(surfaces) {
  let total = 0;
  let area = 0;
  for (const s of surfaces) {
    const refl = (1 - s.material.alpha) * (1 - (s.material.diffuse ?? 0.1));
    total += s.area * refl;
    area += s.area;
  }
  return area > 0 ? total / area : 0;
}

export { SPEED_OF_SOUND };
