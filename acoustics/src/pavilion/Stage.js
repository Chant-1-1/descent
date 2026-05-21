import * as THREE from 'three';
import { MATERIALS } from '../acoustics/Materials.js';
import { clamp, lerp } from '../utils/mathHelpers.js';

// Mobile DJ stage — a circular platform that travels around the pavilion's
// interior. Its target position is chosen by a heuristic that depends on the
// audio "character":
//   * heavy-bass tracks → central position (room-mode excitation)
//   * mid-rich tracks    → off-centre, near a diffuse wall
//   * high-rich tracks   → close to a reflective wall to "spray" treble around
//
// Optimizer logic lives in utils/optimizer.js — this module just animates
// toward whatever target it receives via setTarget().

const STAGE_RADIUS = 2.8;
const STAGE_HEIGHT = 0.7;

export class Stage {
  constructor(parent, size) {
    this.parent = parent;
    this.size = size;
    this.group = new THREE.Group();
    this.targetPos = new THREE.Vector3(0, 0, -size / 4);
    this.currentPos = new THREE.Vector3(0, 0, -size / 4);

    // Platform base
    const baseGeo = new THREE.CylinderGeometry(STAGE_RADIUS, STAGE_RADIUS * 1.05, STAGE_HEIGHT, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: MATERIALS.stage.color,
      metalness: 0.5,
      roughness: 0.4,
      emissive: 0x101822,
      emissiveIntensity: 0.2,
    });
    this.base = new THREE.Mesh(baseGeo, baseMat);
    this.base.position.y = STAGE_HEIGHT / 2;
    this.base.castShadow = true;
    this.base.receiveShadow = true;
    this.group.add(this.base);
    parent.registerSurface(this.base, MATERIALS.stage, Math.PI * STAGE_RADIUS * STAGE_RADIUS, 'Stage deck');

    // DJ booth — a hexagonal console-shaped block.
    const boothGeo = new THREE.BoxGeometry(2.4, 1.0, 0.9);
    const boothMat = new THREE.MeshStandardMaterial({
      color: 0x1a2230,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0x5ee2ff,
      emissiveIntensity: 0.15,
    });
    this.booth = new THREE.Mesh(boothGeo, boothMat);
    this.booth.position.set(0, STAGE_HEIGHT + 0.5, 0);
    this.booth.castShadow = true;
    this.group.add(this.booth);

    // Holographic screens
    const screenGeo = new THREE.PlaneGeometry(3.2, 1.8);
    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x5ee2ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });
    this.screen = new THREE.Mesh(screenGeo, screenMat);
    this.screen.position.set(0, STAGE_HEIGHT + 1.6, -0.5);
    this.group.add(this.screen);

    // Floor ring around stage that pulses with peak.
    const ringGeo = new THREE.RingGeometry(STAGE_RADIUS + 0.1, STAGE_RADIUS + 0.6, 64, 1);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5ee2ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.haloRing = new THREE.Mesh(ringGeo, ringMat);
    this.haloRing.rotation.x = -Math.PI / 2;
    this.haloRing.position.y = 0.07;
    this.group.add(this.haloRing);

    this.group.position.copy(this.currentPos);
  }

  setTarget(pos) {
    this.targetPos.copy(pos);
  }

  position() { return this.currentPos.clone(); }

  update(dt, drivers) {
    const { bass, peak, level, intensity, controls } = drivers;
    const speed = (controls.stage ?? 1) * 0.8;

    // Move toward target slowly — stage shouldn't teleport.
    this.currentPos.lerp(this.targetPos, dt * speed);
    this.group.position.copy(this.currentPos);

    // Bouncy bass kicks visualised by a small vertical bob.
    this.base.position.y = STAGE_HEIGHT / 2 + bass * 0.12 * intensity + peak * 0.18;
    this.haloRing.scale.setScalar(1 + peak * 0.35 + bass * 0.18);
    this.haloRing.material.opacity = 0.3 + peak * 0.6;
    this.booth.material.emissiveIntensity = 0.15 + level * 0.6 + peak * 1.0;
    this.screen.material.opacity = 0.15 + level * 0.5;
  }
}
