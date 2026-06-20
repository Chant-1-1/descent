import * as THREE from 'three';
import { MATERIALS } from '../acoustics/Materials.js';
import { clamp, lerp } from '../utils/mathHelpers.js';

// Floor consists of:
//  - A static outer ring (the main dancefloor surface)
//  - A grid of square "tiles" in the inner area, some of which DESCEND with
//    bass or overall energy to expand the apparent volume and reveal a sunken
//    "bass pit" — adding volume to Sabine and altering reflection paths.

const GRID = 6; // 6x6 = 36 tiles inside the inner area
const TILE_SIZE = 18 / GRID; // tile footprint
const TILE_THICK = 0.4;
const MAX_DESCENT = 1.6;

export class Floor {
  constructor(parent, size) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.descentFactor = 0; // average normalized descent across tiles

    // Outer ring — static, reflective wood-ish deck.
    const ringGeo = new THREE.RingGeometry(9, 10, 64, 1);
    const ringMat = new THREE.MeshStandardMaterial({
      color: MATERIALS.stage.color,
      metalness: 0.2,
      roughness: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    ring.receiveShadow = true;
    this.group.add(ring);
    parent.registerSurface(ring, MATERIALS.stage, Math.PI * (10 * 10 - 9 * 9), 'Outer deck');

    this.tiles = [];
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const x = -9 + TILE_SIZE / 2 + i * TILE_SIZE;
        const z = -9 + TILE_SIZE / 2 + j * TILE_SIZE;
        const mat = (i + j) % 2 === 0 ? MATERIALS.metalPanel : MATERIALS.concrete;

        const geo = new THREE.BoxGeometry(TILE_SIZE * 0.94, TILE_THICK, TILE_SIZE * 0.94);
        const m3 = new THREE.MeshStandardMaterial({
          color: mat.color,
          metalness: 0.4,
          roughness: 0.6,
          emissive: 0x050a10,
          emissiveIntensity: 0.05,
        });
        const mesh = new THREE.Mesh(geo, m3);
        mesh.position.set(x, TILE_THICK / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);

        const area = TILE_SIZE * 0.94 * TILE_SIZE * 0.94;
        parent.registerSurface(mesh, mat, area, `Floor tile ${i},${j} (${mat.name})`);

        this.tiles.push({
          mesh,
          baseY: TILE_THICK / 2,
          phase: Math.random() * Math.PI * 2,
          waveScale: 0.4 + Math.random() * 0.8,
          descent: 0,
          distFromCenter: Math.hypot(x, z),
        });
      }
    }
  }

  update(dt, drivers) {
    const { bass, mid, high, level, peak, intensity, controls, stagePos } = drivers;
    const descentCtrl = controls.floor ?? 1;
    const target = clamp((bass * 0.7 + level * 0.4) * descentCtrl * intensity, 0, 1);

    const now = performance.now();
    // Radial wave originates under the stage and travels outward on the beat.
    const sx = stagePos ? stagePos.x : 0;
    const sz = stagePos ? stagePos.z : 0;
    const waveSpeed = 4.0 + bass * 6.0;   // ripples accelerate with bass
    const waveK = 0.55;                    // spatial frequency of the ripple

    // Emissive hue follows the track character (bass→magenta, treble→cyan).
    const hue = 0.55 - bass * 0.12 + high * 0.04;

    let avg = 0;
    for (const t of this.tiles) {
      // Tiles closer to centre descend more strongly to form a "pit".
      const ringFalloff = 1 - clamp(t.distFromCenter / 9, 0, 1) * 0.6;
      const localPhase = Math.sin(now * 0.001 * t.waveScale + t.phase) * 0.4 + 0.6;
      const tgt = target * ringFalloff * localPhase + peak * 0.08;
      t.descent += (tgt - t.descent) * 0.08;

      t.mesh.position.y = t.baseY - t.descent * MAX_DESCENT;

      // Travelling radial ripple from the stage: bright crest sweeps outward.
      const distToStage = Math.hypot(t.mesh.position.x - sx, t.mesh.position.z - sz);
      const ripple = Math.sin(now * 0.001 * waveSpeed - distToStage * waveK) * 0.5 + 0.5;
      const glow = 0.05 + bass * 0.3 + peak * 0.35 + ripple * level * 0.6;
      t.mesh.material.emissiveIntensity = glow;
      t.mesh.material.emissive.setHSL(hue, 0.85, 0.5);
      avg += t.descent;
    }
    this.descentFactor = avg / this.tiles.length;
  }
}
