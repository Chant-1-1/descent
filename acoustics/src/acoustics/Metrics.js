import {
  sabineRT60,
  sabineRT60PerBand,
  totalAbsorption,
  diffusionIndex,
  reflectionIndex,
} from './Sabine.js';
import { clamp } from '../utils/mathHelpers.js';

// Aggregates the acoustic snapshot for a given pavilion state.
// Pavilion supplies geometry summary; this module only cares about
// {volume, surfaces[]} so it can also be used for arbitrary configurations.
//
// Returns a flat object designed for direct UI binding.

export function computeAcousticSnapshot(pavilion, audio) {
  const { volume, surfaces } = pavilion.getAcousticGeometry();
  const { A, alphaAvg, totalArea } = totalAbsorption(surfaces);
  const rt60 = sabineRT60(volume, A);
  const bands = sabineRT60PerBand(volume, surfaces);
  const dIdx = diffusionIndex(surfaces);
  const rIdx = reflectionIndex(surfaces);

  // Heuristic "immersion score" — higher when:
  //   * RT60 is in a sweet spot for dance music (1.0..1.6 s)
  //   * Diffusion is moderate-to-high
  //   * Bass RT60 not blown out
  //   * Speakers spread evenly relative to dance floor (added by Optimizer)
  const sweetRT = gaussianBand(rt60, 1.3, 0.45);
  const lowControl = 1 - clamp((bands.low - 1.6) / 1.5, 0, 1);
  const diffuseScore = clamp(dIdx * 1.4, 0, 1);
  const energyScore = audio ? clamp(audio.level * 0.6 + audio.peak * 0.4, 0, 1) : 0.5;

  const immersion = clamp(
    0.4 * sweetRT + 0.2 * lowControl + 0.2 * diffuseScore + 0.2 * energyScore,
    0, 1,
  );

  return {
    volume,
    totalArea,
    absorption: A,
    alphaAvg,
    rt60,
    rt60Low: bands.low,
    rt60Mid: bands.mid,
    rt60High: bands.high,
    diffusion: dIdx,
    reflection: rIdx,
    immersion,
  };
}

// Centered Gaussian — peaks at 1 when value == center.
function gaussianBand(value, center, width) {
  const x = (value - center) / width;
  return Math.exp(-x * x);
}
