import * as THREE from 'three';
import { MATERIALS } from '../acoustics/Materials.js';
import { clamp, lerp } from '../utils/mathHelpers.js';

// Perimeter louvre panels. The pavilion has 4 walls × N panels, each panel
// rotates around its vertical edge driven by MID energy.
//
// Each wall has alternating materials so a music piece reveals contrast
// between reflective metal panels and absorptive fabric/felt elements.

const PANELS_PER_WALL = 8;
const PANEL_HEIGHT = 6.5;
const PANEL_WIDTH = 20 / PANELS_PER_WALL;
const PANEL_THICK = 0.12;

const MATERIAL_CYCLE = [
  MATERIALS.metalPanel,
  MATERIALS.perforatedMetal,
  MATERIALS.fabric,
  MATERIALS.felt,
  MATERIALS.metalPanel,
  MATERIALS.diffusor,
  MATERIALS.fabric,
  MATERIALS.perforatedMetal,
];

export class Panels {
  constructor(parent, size, baseHeight) {
    this.parent = parent;
    this.size = size;
    this.baseHeight = baseHeight;
    this.group = new THREE.Group();
    this.panels = [];

    this.apertureArea = 0; // how much area is "open" — feeds back into Sabine

    // Build four walls.
    const half = size / 2;
    const wallSpecs = [
      { axis: 'x', dir: 1, pos: new THREE.Vector3(0, 0, half), rot: 0 },
      { axis: 'x', dir: -1, pos: new THREE.Vector3(0, 0, -half), rot: Math.PI },
      { axis: 'z', dir: 1, pos: new THREE.Vector3(half, 0, 0), rot: -Math.PI / 2 },
      { axis: 'z', dir: -1, pos: new THREE.Vector3(-half, 0, 0), rot: Math.PI / 2 },
    ];

    let panelIndex = 0;
    for (const w of wallSpecs) {
      const wallGroup = new THREE.Group();
      wallGroup.position.copy(w.pos);
      wallGroup.rotation.y = w.rot;
      this.group.add(wallGroup);

      for (let i = 0; i < PANELS_PER_WALL; i++) {
        const localX = -size / 2 + (i + 0.5) * PANEL_WIDTH;
        const mat = MATERIAL_CYCLE[(panelIndex + i) % MATERIAL_CYCLE.length];

        const geo = new THREE.BoxGeometry(PANEL_WIDTH * 0.92, PANEL_HEIGHT, PANEL_THICK);
        const m3 = new THREE.MeshStandardMaterial({
          color: mat.color,
          metalness: mat === MATERIALS.metalPanel || mat === MATERIALS.perforatedMetal ? 0.85 : 0.15,
          roughness: mat === MATERIALS.felt || mat === MATERIALS.fabric ? 0.95 : 0.35,
          emissive: 0x040608,
          emissiveIntensity: 0.05,
        });
        const mesh = new THREE.Mesh(geo, m3);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Hinge pivot at the panel's left edge so panels open like louvres.
        const pivot = new THREE.Group();
        pivot.position.set(localX - PANEL_WIDTH * 0.46, PANEL_HEIGHT / 2 + 0.2, 0);
        mesh.position.set(PANEL_WIDTH * 0.46, 0, 0);
        pivot.add(mesh);
        wallGroup.add(pivot);

        const area = PANEL_WIDTH * 0.92 * PANEL_HEIGHT;
        this.parent.registerSurface(mesh, mat, area, `Wall panel ${panelIndex + i} (${mat.name})`);

        this.panels.push({
          pivot,
          mesh,
          baseY: PANEL_HEIGHT / 2 + 0.2,
          material: mat,
          phase: Math.random() * Math.PI * 2,
          openness: 0,
          area,
        });
      }
      panelIndex += PANELS_PER_WALL;
    }
  }

  update(dt, drivers) {
    const { mid, high, peak, intensity, controls } = drivers;
    const reach = controls.panels ?? 1;
    const apertureCtrl = controls.aperture ?? 0;

    let openArea = 0;

    for (let i = 0; i < this.panels.length; i++) {
      const p = this.panels[i];
      // Mid energy drives a global panel tilt; high adds fine flicker per-panel.
      const wave = Math.sin(performance.now() * 0.0014 + p.phase) * 0.5 + 0.5;
      const targetOpen = clamp(
        mid * 1.1 * reach * intensity +
        wave * apertureCtrl * 0.6 +
        peak * 0.3,
        0, 1,
      );
      p.openness += (targetOpen - p.openness) * 0.06;

      // Rotation angle — louvres swing up to ~70 deg.
      const tilt = (Math.PI / 180) * 70 * p.openness;
      p.pivot.rotation.y = lerp(p.pivot.rotation.y, -tilt, 0.1);

      // Subtle vertical bob from high freq.
      p.mesh.position.y = lerp(p.mesh.position.y, high * 0.15 * intensity, 0.1);

      // Emissive flicker on high frequencies for "sparkle".
      p.mesh.material.emissiveIntensity = lerp(
        p.mesh.material.emissiveIntensity,
        0.05 + high * 0.35,
        0.2,
      );

      // Effective opening area = projection of how much the panel has rotated out.
      openArea += p.area * p.openness * 0.6;
    }

    this.apertureArea = openArea;
  }
}
