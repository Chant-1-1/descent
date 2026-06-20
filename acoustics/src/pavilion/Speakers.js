import * as THREE from 'three';
import { MATERIALS } from '../acoustics/Materials.js';
import { clamp, lerp } from '../utils/mathHelpers.js';

// Speaker array — 4 line-array stacks. Each stack consists of N driver cabinets
// arranged vertically. Their position relative to the stage is updated based
// on the optimiser output. They are the SOURCES used by the raytracer.

const STACK_CABS = 4;
const CAB_W = 0.55;
const CAB_H = 0.35;
const CAB_D = 0.45;

export class Speakers {
  constructor(parent, size) {
    this.parent = parent;
    this.size = size;
    this.group = new THREE.Group();
    this.stacks = [];
    this.targetPositions = [];
    this.basePositions = [];

    // We allocate 4 stacks. Initial positions form a square around the centre.
    const r = 4.5;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      const stackGroup = new THREE.Group();
      stackGroup.position.set(x, 0, z);
      this.group.add(stackGroup);

      const cabs = [];
      for (let k = 0; k < STACK_CABS; k++) {
        const geo = new THREE.BoxGeometry(CAB_W, CAB_H, CAB_D);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x080a10,
          metalness: 0.6,
          roughness: 0.4,
          emissive: 0x0a1820,
          emissiveIntensity: 0.2,
        });
        const cab = new THREE.Mesh(geo, mat);
        cab.position.y = 1.2 + k * (CAB_H + 0.04);
        cab.castShadow = true;
        cab.receiveShadow = true;
        stackGroup.add(cab);

        // Driver cone — a small bright cylinder on the front face.
        const coneGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.02, 16);
        const coneMat = new THREE.MeshBasicMaterial({ color: 0x5ee2ff });
        const cone = new THREE.Mesh(coneGeo, coneMat);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, 0, CAB_D / 2 + 0.005);
        cab.add(cone);

        cabs.push({ cab, cone });
      }

      // Subwoofer at ground level.
      const subGeo = new THREE.BoxGeometry(1.0, 0.8, 0.8);
      const subMat = new THREE.MeshStandardMaterial({
        color: 0x06080d,
        metalness: 0.5,
        roughness: 0.5,
        emissive: 0x180a18,
        emissiveIntensity: 0.3,
      });
      const sub = new THREE.Mesh(subGeo, subMat);
      sub.position.y = 0.4;
      sub.castShadow = true;
      stackGroup.add(sub);

      // Vertical hang truss
      const trussGeo = new THREE.CylinderGeometry(0.05, 0.05, 4.0, 8);
      const trussMat = new THREE.MeshStandardMaterial({
        color: MATERIALS.metalPanel.color, metalness: 0.9, roughness: 0.3,
      });
      const truss = new THREE.Mesh(trussGeo, trussMat);
      truss.position.y = 2;
      stackGroup.add(truss);

      // Sound-pulse rings at the sub — two concentric rings that expand and
      // fade with bass/peak, visible in ALL modes as an emission cue.
      const pulseRings = [];
      for (let p = 0; p < 2; p++) {
        const pgeo = new THREE.RingGeometry(0.6, 0.78, 40, 1);
        const pmat = new THREE.MeshBasicMaterial({
          color: 0x5ee2ff,
          transparent: true,
          opacity: 0.0,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const ring = new THREE.Mesh(pgeo, pmat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.08;
        ring.userData.noRaytrace = true;
        ring.userData.phase = p * 0.5; // stagger the two rings
        stackGroup.add(ring);
        pulseRings.push(ring);
      }

      const stack = {
        group: stackGroup,
        cabs,
        sub,
        truss,
        pulseRings,
        index: i,
        baseAngle: angle,
        baseRadius: r,
      };
      this.stacks.push(stack);
      this.basePositions.push(new THREE.Vector3(x, 0, z));
      this.targetPositions.push(new THREE.Vector3(x, 0, z));
    }
  }

  // Optimizer sets these.
  setTargets(positions) {
    for (let i = 0; i < this.stacks.length && i < positions.length; i++) {
      this.targetPositions[i].copy(positions[i]);
    }
  }

  positions() {
    return this.stacks.map((s) => s.group.position.clone().add(new THREE.Vector3(0, 1.8, 0)));
  }

  // Useful for raytracer: where do "rays" start from?
  emitterPositions() {
    const out = [];
    for (const s of this.stacks) {
      const stackPos = s.group.position;
      // Emit from one cabinet — taking the middle one for stability.
      const cab = s.cabs[Math.floor(STACK_CABS / 2)];
      const p = new THREE.Vector3();
      cab.cab.getWorldPosition(p);
      out.push(p);
    }
    return out;
  }

  update(dt, drivers, stage) {
    const { bass, mid, high, peak, level, intensity, controls } = drivers;
    const speed = (controls.speaker ?? 1) * 0.9;

    for (let i = 0; i < this.stacks.length; i++) {
      const s = this.stacks[i];
      s.group.position.lerp(this.targetPositions[i], dt * speed);

      // Aim speakers loosely toward the stage.
      if (stage) {
        const dir = new THREE.Vector3()
          .copy(stage.currentPos)
          .sub(s.group.position);
        s.group.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
      }

      // Cab cones pulse with mid/high.
      for (let k = 0; k < s.cabs.length; k++) {
        const c = s.cabs[k];
        c.cone.scale.setScalar(1 + (mid * 0.6 + high * 0.4) * intensity * (0.7 + k * 0.1));
        c.cab.material.emissiveIntensity = 0.15 + level * 0.4 + peak * 0.8;
      }

      // Sub pulses with bass.
      s.sub.scale.set(1 + bass * 0.12, 1 + bass * 0.08, 1 + bass * 0.12);
      s.sub.material.emissiveIntensity = 0.3 + bass * 1.4;

      // Expanding sound-pulse rings: each ring grows on a looping phase driven
      // by bass and fades as it expands. Two staggered rings = continuous emission.
      const drive = bass * 0.7 + peak * 0.6;
      const tphase = performance.now() * 0.001 * (1.2 + bass * 1.5);
      for (const ring of s.pulseRings) {
        const cycle = (tphase + ring.userData.phase) % 1; // 0→1 expansion
        const scale = 1 + cycle * (4 + drive * 5);
        ring.scale.set(scale, scale, 1);
        ring.material.opacity = (1 - cycle) * (0.15 + drive * 0.5);
        ring.material.color.setHSL(0.55 - bass * 0.12, 0.85, 0.55);
      }
    }
  }
}
