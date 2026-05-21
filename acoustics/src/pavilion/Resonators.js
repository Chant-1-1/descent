import * as THREE from 'three';
import { MATERIALS } from '../acoustics/Materials.js';
import { clamp, lerp } from '../utils/mathHelpers.js';

// Resonator modules sit on the inner side of the walls. They are large
// box-like "bass traps" with circular apertures that open and close on the
// bass impulse. Each module also has an emissive ring inside the aperture
// that pulses with peak energy.
//
// They contribute additional absorption area (with bass-biased α) and a
// dynamic aperture area used for Sabine "leakage".

const COUNT_PER_WALL = 3;
const MODULE_W = 3.2;
const MODULE_H = 2.8;
const MODULE_D = 1.4;

export class Resonators {
  constructor(parent, size, baseHeight) {
    this.parent = parent;
    this.group = new THREE.Group();
    this.apertureArea = 0;
    this.modules = [];

    const half = size / 2;
    const wallPlacements = [
      { pos: new THREE.Vector3(0, MODULE_H / 2 + 1.0, half - MODULE_D / 2 - 0.2), normal: new THREE.Vector3(0, 0, -1), rot: 0 },
      { pos: new THREE.Vector3(0, MODULE_H / 2 + 1.0, -half + MODULE_D / 2 + 0.2), normal: new THREE.Vector3(0, 0, 1), rot: Math.PI },
      { pos: new THREE.Vector3(half - MODULE_D / 2 - 0.2, MODULE_H / 2 + 1.0, 0), normal: new THREE.Vector3(-1, 0, 0), rot: -Math.PI / 2 },
      { pos: new THREE.Vector3(-half + MODULE_D / 2 + 0.2, MODULE_H / 2 + 1.0, 0), normal: new THREE.Vector3(1, 0, 0), rot: Math.PI / 2 },
    ];

    for (let w = 0; w < wallPlacements.length; w++) {
      for (let i = 0; i < COUNT_PER_WALL; i++) {
        const offset = (i - (COUNT_PER_WALL - 1) / 2) * (MODULE_W + 1.2);

        const wp = wallPlacements[w];
        const moduleGroup = new THREE.Group();
        const along = new THREE.Vector3(0, 0, 0);
        if (Math.abs(wp.normal.x) > 0.5) along.set(0, 0, 1);
        else along.set(1, 0, 0);
        moduleGroup.position.copy(wp.pos).add(along.multiplyScalar(offset));
        moduleGroup.rotation.y = wp.rot;

        // Body
        const bodyGeo = new THREE.BoxGeometry(MODULE_W, MODULE_H, MODULE_D);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: MATERIALS.bassTrap.color,
          metalness: 0.3,
          roughness: 0.7,
          emissive: 0x180a0a,
          emissiveIntensity: 0.1,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        body.receiveShadow = true;
        moduleGroup.add(body);
        parent.registerSurface(body, MATERIALS.bassTrap, MODULE_W * MODULE_H, `Bass module ${w}-${i}`);

        // Aperture iris — a circular disk that scales from 0→1.
        const irisGeo = new THREE.CircleGeometry(0.85, 32);
        const irisMat = new THREE.MeshStandardMaterial({
          color: 0x000000,
          emissive: 0xff5ec8,
          emissiveIntensity: 1.2,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
        });
        const iris = new THREE.Mesh(irisGeo, irisMat);
        iris.position.set(0, 0, -MODULE_D / 2 - 0.02);
        iris.rotation.y = Math.PI;
        iris.userData.noRaytrace = true;
        moduleGroup.add(iris);

        // Decorative bolts/perimeter ring
        const ringGeo = new THREE.TorusGeometry(0.95, 0.08, 8, 32);
        const ringMat = new THREE.MeshStandardMaterial({
          color: MATERIALS.metalPanel.color,
          metalness: 0.9, roughness: 0.2,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, 0, -MODULE_D / 2 - 0.01);
        moduleGroup.add(ring);

        this.group.add(moduleGroup);
        this.modules.push({
          group: moduleGroup,
          body,
          iris,
          irisMat,
          ring,
          openness: 0,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  update(dt, drivers) {
    const { bass, peak, intensity, controls } = drivers;
    const aperture = controls.aperture ?? 1;
    let totalOpen = 0;
    for (let i = 0; i < this.modules.length; i++) {
      const m = this.modules[i];
      const localPulse = Math.max(0, Math.sin(performance.now() * 0.003 + m.phase));
      const target = clamp(bass * 1.1 * aperture * intensity + peak * 0.3 * localPulse, 0, 1);
      m.openness += (target - m.openness) * 0.12;

      const scale = 0.05 + m.openness * 1.0;
      m.iris.scale.set(scale, scale, 1);
      m.irisMat.emissiveIntensity = 0.5 + m.openness * 3.0 + peak * 1.2;
      m.irisMat.color.setHSL(0.92 - bass * 0.1, 0.8, 0.5);

      // Body subtly pushes outward with bass (visual "throb").
      m.group.position.y = m.group.userData.baseY ?? (m.group.userData.baseY = m.group.position.y);
      m.group.scale.z = 1 + bass * 0.06 * intensity;

      // Aperture area for Sabine leakage estimate.
      totalOpen += Math.PI * Math.pow(0.85 * scale, 2);
    }
    this.apertureArea = totalOpen;
  }
}
