import * as THREE from 'three';
import { clamp, lerp } from './mathHelpers.js';

// Heuristic optimizer for stage + speaker placement.
//
// The optimization is intentionally simple and EXPLAINABLE rather than
// physically rigorous. For each candidate configuration we compute a score
// from:
//   * coverage: how uniformly the 4 speakers cover the dance floor (variance
//     of distances from a 6x6 grid of listener points)
//   * bassControl: how much of the energy lands far from corners (corner
//     room-modes blow out the low end)
//   * sightline: how visible the stage is from the floor centroid
//   * sourceSeparation: speakers shouldn't bunch up
//
// The current implementation simply re-evaluates a small candidate set at
// regular intervals and picks the best. It's deliberately not gradient-based
// because the user wanted something "heuristic and traceable".

const PAVILION_HALF = 9.0;

export class Optimizer {
  constructor() {
    this.lastEval = 0;
    this.score = 0;
    this.bestStagePos = new THREE.Vector3();
    this.bestSpeakerPos = [];
    this.audioCharacter = { bassDom: 0.5, midDom: 0.5, highDom: 0.5 };
  }

  // Update audio character — bass-dominant / mid-dominant / high-dominant.
  setAudioCharacter(audio) {
    const total = audio.bass + audio.mid + audio.high + 1e-6;
    this.audioCharacter.bassDom = audio.bass / total;
    this.audioCharacter.midDom = audio.mid / total;
    this.audioCharacter.highDom = audio.high / total;
  }

  // Generate a small candidate set for stage + 4 speaker positions.
  candidates(now) {
    const t = now * 0.0001;
    const list = [];
    const presets = [
      // centred
      { stage: [0, -3], spread: 5.5, rot: 0 },
      // back-wall
      { stage: [0, -6.5], spread: 6.5, rot: 0 },
      // off-centre, slight rotation
      { stage: [-3, -4], spread: 6, rot: Math.PI / 8 },
      // forward thrust
      { stage: [0, 0], spread: 5, rot: 0 },
    ];
    for (const p of presets) {
      const stage = new THREE.Vector3(p.stage[0], 0, p.stage[1]);
      const speakers = [];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4 + p.rot;
        const x = stage.x + Math.cos(a) * p.spread;
        const z = stage.z + Math.sin(a) * p.spread;
        speakers.push(new THREE.Vector3(
          clamp(x, -PAVILION_HALF + 1, PAVILION_HALF - 1),
          0,
          clamp(z, -PAVILION_HALF + 1, PAVILION_HALF - 1),
        ));
      }
      list.push({ stage, speakers });
    }
    return list;
  }

  score_(config, character) {
    const listeners = [];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
      listeners.push(new THREE.Vector3(i * 3, 0, j * 3));
    }

    // coverage variance (low variance = good)
    const meanDist = [];
    for (const l of listeners) {
      let sum = 0;
      for (const s of config.speakers) sum += l.distanceTo(s);
      meanDist.push(sum / config.speakers.length);
    }
    const mean = meanDist.reduce((a, b) => a + b, 0) / meanDist.length;
    const variance = meanDist.reduce((a, b) => a + (b - mean) ** 2, 0) / meanDist.length;
    const coverage = clamp(1 - variance / 12, 0, 1);

    // bass control: penalize speakers near corners
    let cornerPenalty = 0;
    for (const s of config.speakers) {
      const dCorner = Math.min(
        s.clone().sub(new THREE.Vector3(-PAVILION_HALF, 0, -PAVILION_HALF)).length(),
        s.clone().sub(new THREE.Vector3(PAVILION_HALF, 0, -PAVILION_HALF)).length(),
        s.clone().sub(new THREE.Vector3(-PAVILION_HALF, 0, PAVILION_HALF)).length(),
        s.clone().sub(new THREE.Vector3(PAVILION_HALF, 0, PAVILION_HALF)).length(),
      );
      cornerPenalty += clamp(1 - dCorner / 5, 0, 1);
    }
    const bassControl = clamp(1 - cornerPenalty / 4, 0, 1);

    // separation
    let sep = 0;
    for (let i = 0; i < config.speakers.length; i++) {
      for (let j = i + 1; j < config.speakers.length; j++) {
        sep += config.speakers[i].distanceTo(config.speakers[j]);
      }
    }
    const separation = clamp(sep / 36, 0, 1);

    // sightline: how visible stage is from origin
    const stageVis = clamp(1 - config.stage.length() / 9, 0.3, 1);

    // weight by audio character — bass-heavy → bassControl matters more
    const w = {
      coverage: 0.35,
      bass: 0.25 + character.bassDom * 0.25,
      separation: 0.2,
      stage: 0.2,
    };
    const score = (
      w.coverage * coverage +
      w.bass * bassControl +
      w.separation * separation +
      w.stage * stageVis
    );

    return { score, coverage, bassControl, separation, stageVis };
  }

  // Pick best of candidates and emit targets to stage + speakers.
  optimize(stage, speakers, audio, now) {
    // throttle — 1 evaluation per second is plenty for smooth motion
    if (now - this.lastEval < 1200) return;
    this.lastEval = now;
    this.setAudioCharacter(audio);

    const cands = this.candidates(now);
    let bestS = -Infinity;
    let best = null;
    let bestDetails = null;
    for (const c of cands) {
      const r = this.score_(c, this.audioCharacter);
      if (r.score > bestS) { bestS = r.score; best = c; bestDetails = r; }
    }

    this.score = bestS;
    this.lastDetails = bestDetails;
    this.bestStagePos.copy(best.stage);
    this.bestSpeakerPos = best.speakers.map((p) => p.clone());

    stage.setTarget(this.bestStagePos);
    speakers.setTargets(this.bestSpeakerPos);
  }
}
