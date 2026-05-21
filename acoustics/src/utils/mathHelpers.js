// Small math helpers shared across modules.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, t) => {
  const x = clamp((t - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
};

// Exponential smoothing — used heavily for audio meters and animation easing.
// `alpha` ~ 0.05..0.3 — higher means more reactive, lower means smoother.
export class Smoother {
  constructor(alpha = 0.15, init = 0) {
    this.alpha = alpha;
    this.v = init;
  }
  update(target) {
    this.v += (target - this.v) * this.alpha;
    return this.v;
  }
  reset(v = 0) { this.v = v; }
}

// Peak follower with slow decay — for impulse / "drop" detection.
export class PeakDetector {
  constructor(decay = 0.965) {
    this.decay = decay;
    this.peak = 0;
  }
  update(v) {
    this.peak = Math.max(v, this.peak * this.decay);
    return this.peak;
  }
}

export const deg = (r) => (r * 180) / Math.PI;
export const rad = (d) => (d * Math.PI) / 180;

// Random helpers — seeded for reproducible scene generation when needed.
export function mulberry32(seed) {
  let a = seed | 0;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted(rng, items) {
  const total = items.reduce((s, x) => s + x.w, 0);
  let r = rng() * total;
  for (const it of items) {
    r -= it.w;
    if (r <= 0) return it.v;
  }
  return items[items.length - 1].v;
}
