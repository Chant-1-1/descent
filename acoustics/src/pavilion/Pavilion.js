import * as THREE from 'three';
import { MATERIALS, colorForAbsorption, rgbToHex } from '../acoustics/Materials.js';
import { Roof } from './Roof.js';
import { Panels } from './Panels.js';
import { Floor } from './Floor.js';
import { Resonators } from './Resonators.js';
import { Stage } from './Stage.js';
import { Speakers } from './Speakers.js';
import { clamp, lerp, Smoother } from '../utils/mathHelpers.js';

// The Pavilion is a 20m × 20m × ~9m adaptive structure. The geometry is split
// into named subsystems so each one can react to a different musical band:
//
//   roof        — large folding membrane, opens with BASS / sub-bass impulses
//   panels      — perimeter louvers, tilt with MID energy
//   floor       — sunken zones, lower with LOW energy or overall ENERGY peaks
//   resonators  — wall apertures + bass modules driven by BASS
//   stage       — mobile DJ platform (position drives by Optimizer)
//   speakers    — line arrays (positions drive by Optimizer)
//
// The Pavilion exposes:
//   .object3d                          — the THREE.Group to add to scene
//   .update(dt, audio, controls)       — animate from audio bands
//   .getAcousticGeometry()             — {volume, surfaces[]} for Sabine etc.
//   .getReflectiveMeshes()             — meshes the raytracer should hit
//   .surfaceFor(mesh)                  — returns material/metadata for picking

const SIZE = 20; // pavilion footprint (m)
const BASE_HEIGHT = 8.5; // wall height before roof (m)

export class Pavilion {
  constructor() {
    this.group = new THREE.Group();
    this.SIZE = SIZE;
    this.BASE_HEIGHT = BASE_HEIGHT;

    // Per-surface bookkeeping: every mesh used in acoustic calculations
    // is registered so we can recolour and report it.
    this.surfaces = []; // {mesh, material, area, name}
    this.reflective = []; // meshes the raytracer should intersect

    // Audio smoothers — keep animations stable.
    this.sBass = new Smoother(0.08);
    this.sMid = new Smoother(0.12);
    this.sHigh = new Smoother(0.18);
    this.sLevel = new Smoother(0.05);
    this.sPeak = new Smoother(0.20);

    this._buildBase();

    this.roof = new Roof(this, SIZE, BASE_HEIGHT);
    this.panels = new Panels(this, SIZE, BASE_HEIGHT);
    this.floor = new Floor(this, SIZE);
    this.resonators = new Resonators(this, SIZE, BASE_HEIGHT);
    this.stage = new Stage(this, SIZE);
    this.speakers = new Speakers(this, SIZE);

    this.group.add(this.roof.group);
    this.group.add(this.panels.group);
    this.group.add(this.floor.group);
    this.group.add(this.resonators.group);
    this.group.add(this.stage.group);
    this.group.add(this.speakers.group);

    this.modeShowAbsorption = false;
  }

  get object3d() { return this.group; }

  // ────────────────────────────────────────────────────────────────
  // Base / shared geometry
  // ────────────────────────────────────────────────────────────────
  _buildBase() {
    // Decorative outer ring / podium — futuristic festival platform.
    const ringGeo = new THREE.RingGeometry(15, 18, 96, 1);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x12303f,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.001;
    this.group.add(ring);

    // Pillar markers — 4 corner pillars used as visual scaffolding and as
    // reflective surfaces for the raytracer.
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.25, BASE_HEIGHT, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: MATERIALS.metalPanel.color,
      metalness: 0.85,
      roughness: 0.25,
    });
    const half = SIZE / 2;
    const corners = [
      [-half, -half], [half, -half], [half, half], [-half, half],
    ];
    this.pillars = [];
    for (const [x, z] of corners) {
      const m = new THREE.Mesh(pillarGeo, pillarMat.clone());
      m.position.set(x, BASE_HEIGHT / 2, z);
      m.castShadow = true;
      m.receiveShadow = true;
      this.group.add(m);
      this.pillars.push(m);
      this.registerSurface(m, MATERIALS.metalPanel, BASE_HEIGHT * Math.PI * 0.5, 'Corner pillar');
    }

    // Internal rim of perimeter ground (around panels).
    const innerRingGeo = new THREE.RingGeometry(half + 0.6, half + 1.6, 64, 1);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0x101820,
      metalness: 0.4,
      roughness: 0.7,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.005;
    innerRing.receiveShadow = true;
    this.group.add(innerRing);
  }

  // ────────────────────────────────────────────────────────────────
  // Surface registry — every acoustically-relevant mesh registers here
  // ────────────────────────────────────────────────────────────────
  registerSurface(mesh, material, area, name) {
    const surf = { mesh, material, area, name, baseColor: material.color };
    this.surfaces.push(surf);
    if (mesh) {
      this.reflective.push(mesh);
      mesh.userData.acoustic = surf;
    }
    return surf;
  }

  getAcousticGeometry() {
    // Effective room volume depends on roof opening + floor descent. Both are
    // expressed as 0..1 factors by sub-modules.
    const roofFactor = this.roof.openingFactor;     // 0=closed, 1=fully open
    const floorFactor = this.floor.descentFactor;   // 0=flat, 1=fully sunk
    const baseVolume = SIZE * SIZE * BASE_HEIGHT;
    // Open roof → physically OPEN means "more apparent volume + leakage"
    // We model that approximately by adding the roof prism volume scaled by openness.
    const roofVol = SIZE * SIZE * (this.roof.heightExtra * (1 - roofFactor * 0.4));
    const floorVol = SIZE * SIZE * 1.5 * floorFactor; // additional pit volume
    const volume = baseVolume + roofVol + floorVol;

    // Aperture acts like a large open hole — treated as α≈0.95 (escape).
    const apertureArea = this.panels.apertureArea + this.resonators.apertureArea;
    const surfaces = this.surfaces.slice();
    if (apertureArea > 0.5) {
      surfaces.push({
        area: apertureArea,
        material: {
          name: 'Opening (sound escape)',
          alpha: 0.95,
          alphaBand: { low: 0.92, mid: 0.95, high: 0.97 },
          diffuse: 0,
        },
      });
    }
    return { volume, surfaces };
  }

  getReflectiveMeshes() {
    return this.reflective.filter((m) => m.visible && !m.userData.noRaytrace);
  }

  surfaceFor(mesh) {
    return mesh && mesh.userData ? mesh.userData.acoustic : null;
  }

  // ────────────────────────────────────────────────────────────────
  // Update — drive sub-systems from analyzed audio
  // ────────────────────────────────────────────────────────────────
  update(dt, audio, controls) {
    const speed = controls.speed ?? 1;
    const intensity = controls.intensity ?? 1;

    const bass = this.sBass.update(audio.bass);
    const mid = this.sMid.update(audio.mid);
    const high = this.sHigh.update(audio.high);
    const level = this.sLevel.update(audio.level);
    const peak = this.sPeak.update(audio.peak);

    // stagePos lets the floor emit radial energy waves from under the stage.
    const drivers = { bass, mid, high, level, peak, intensity, controls, stagePos: this.stage.currentPos };

    this.roof.update(dt * speed, drivers);
    this.panels.update(dt * speed, drivers);
    this.floor.update(dt * speed, drivers);
    this.resonators.update(dt * speed, drivers);
    this.stage.update(dt * speed, drivers);
    this.speakers.update(dt * speed, drivers, this.stage);

    // Refresh absorption visualization if requested.
    if (this.modeShowAbsorption !== this._lastShowAbsorption) {
      this._applyAbsorptionVisualization(this.modeShowAbsorption);
      this._lastShowAbsorption = this.modeShowAbsorption;
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Absorption colourization — surfaces tint by their α coefficient
  // ────────────────────────────────────────────────────────────────
  _applyAbsorptionVisualization(enabled) {
    for (const s of this.surfaces) {
      if (!s.mesh || !s.mesh.material) continue;
      const matObj = s.mesh.material;
      if (enabled) {
        const c = rgbToHex(colorForAbsorption(s.material.alpha));
        if (!s.mesh.userData._origColor) {
          s.mesh.userData._origColor = matObj.color.getHex();
          s.mesh.userData._origEmissive = matObj.emissive ? matObj.emissive.getHex() : 0;
        }
        matObj.color.setHex(c);
        if (matObj.emissive) matObj.emissive.setHex(0x000000);
      } else {
        if (s.mesh.userData._origColor !== undefined) {
          matObj.color.setHex(s.mesh.userData._origColor);
          if (matObj.emissive && s.mesh.userData._origEmissive !== undefined) {
            matObj.emissive.setHex(s.mesh.userData._origEmissive);
          }
        }
      }
    }
  }
}
