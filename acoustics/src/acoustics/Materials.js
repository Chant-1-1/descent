// Plausible acoustic absorption coefficients for typical surfaces.
// Values are mid-frequency (~500 Hz–1 kHz) Sabine absorption coefficients α.
// Source: standard architectural acoustics handbooks (Cox/d'Antonio, Fasold/Veres),
// rounded to one decimal for clarity. Values are CONCEPTUAL approximations,
// not material-spec measurements.
//
// Each material also stores frequency-dependent α (low/mid/high) for the
// raytracing energy attenuation, plus a `diffuse` parameter that scales how
// much a reflected ray is scattered (visual approximation).

export const MATERIALS = {
  concrete: {
    name: 'Concrete (sealed)',
    alpha: 0.02,
    alphaBand: { low: 0.01, mid: 0.02, high: 0.03 },
    diffuse: 0.05,
    color: 0xb0b6bc,
    // visual mapping handled centrally — see colorForAbsorption()
  },
  glass: {
    name: 'Glass panel',
    alpha: 0.04,
    alphaBand: { low: 0.18, mid: 0.04, high: 0.02 },
    diffuse: 0.04,
    color: 0x9ad5e2,
  },
  metalPanel: {
    name: 'Aluminium panel',
    alpha: 0.06,
    alphaBand: { low: 0.10, mid: 0.06, high: 0.05 },
    diffuse: 0.08,
    color: 0xd6dde6,
  },
  perforatedMetal: {
    name: 'Perforated metal',
    alpha: 0.45,
    alphaBand: { low: 0.30, mid: 0.45, high: 0.55 },
    diffuse: 0.45,
    color: 0x6d7a85,
  },
  fabric: {
    name: 'Acoustic fabric',
    alpha: 0.65,
    alphaBand: { low: 0.40, mid: 0.65, high: 0.78 },
    diffuse: 0.20,
    color: 0x2b1f33,
  },
  felt: {
    name: 'Felt absorber',
    alpha: 0.82,
    alphaBand: { low: 0.55, mid: 0.82, high: 0.88 },
    diffuse: 0.15,
    color: 0x402030,
  },
  diffusor: {
    name: 'QRD diffusor',
    alpha: 0.18,
    alphaBand: { low: 0.10, mid: 0.18, high: 0.22 },
    diffuse: 0.85,
    color: 0xaa8855,
  },
  bassTrap: {
    name: 'Bass trap',
    alpha: 0.75,
    alphaBand: { low: 0.85, mid: 0.50, high: 0.30 },
    diffuse: 0.25,
    color: 0x6e2c2c,
  },
  ground: {
    name: 'Festival ground',
    alpha: 0.35,
    alphaBand: { low: 0.20, mid: 0.35, high: 0.45 },
    diffuse: 0.30,
    color: 0x18202b,
  },
  membrane: {
    name: 'Tensioned membrane',
    alpha: 0.28,
    alphaBand: { low: 0.45, mid: 0.28, high: 0.18 },
    diffuse: 0.20,
    color: 0x202832,
  },
  stage: {
    name: 'Wood stage deck',
    alpha: 0.10,
    alphaBand: { low: 0.15, mid: 0.10, high: 0.07 },
    diffuse: 0.10,
    color: 0x3a2818,
  },
};

// Pick a Three.js-friendly color from the absorption coefficient α.
// Visualization: Red/Orange = strong reflection (low α),
// Green = mid α, Blue = high α (heavy absorption).
// Linear segmented map keeps it easy to read.
export function colorForAbsorption(alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  if (a < 0.33) {
    // red → orange → yellow
    const t = a / 0.33;
    return [1.0, 0.25 + 0.55 * t, 0.15 * t];
  } else if (a < 0.66) {
    // yellow → green
    const t = (a - 0.33) / 0.33;
    return [1.0 - t, 0.8, 0.15 + 0.2 * t];
  } else {
    // green → cyan → blue
    const t = (a - 0.66) / 0.34;
    return [0.0, 0.8 - 0.55 * t, 0.35 + 0.55 * t];
  }
}

// Convert [r,g,b] in 0..1 to a hex usable by Three.js.
export function rgbToHex([r, g, b]) {
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

// Estimate the effective α at the current excitation across bands.
// Useful when the music pumps mostly bass — bass-trap walls become "more useful"
// and the displayed Reverberation tends down for that band.
export function effectiveAlpha(material, bands) {
  const { low = 0.33, mid = 0.33, high = 0.33 } = bands || {};
  const a = material.alphaBand || { low: material.alpha, mid: material.alpha, high: material.alpha };
  const total = (low + mid + high) || 1;
  return (a.low * low + a.mid * mid + a.high * high) / total;
}
