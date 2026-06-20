import * as THREE from 'three';
import { colorForAbsorption } from '../acoustics/Materials.js';
import { clamp } from '../utils/mathHelpers.js';

// Raytracer that traces visible sound paths from each speaker emitter.
//
// This is NOT a physically accurate acoustic ray simulation. It traces a
// chosen number of rays per source per frame and visualizes:
//   * the reflection paths
//   * the per-bounce energy loss (color & opacity attenuation)
//   * material absorption (line colour interpolates toward absorptive blue
//     at hits with high α)
//   * diffusion (a random small jitter is added to each reflection vector,
//     proportional to the material's `diffuse` parameter)
//
// All visualization is done with line segments — fast and demonstrative.

const SPEED = 343; // m/s (Snell-style use only — we don't simulate time yet)

export class Raytracer {
  constructor(pavilion, scene) {
    this.pavilion = pavilion;
    this.scene = scene;
    this.enabled = false;

    this.maxRays = 64;
    this.maxBounces = 4;

    // Geometry: a single BufferGeometry holding all line segments. We
    // reallocate when ray/bounce counts change. Each segment uses 2 vertices.
    this.maxSegments = this.maxRays * this.maxBounces;
    this.positions = new Float32Array(this.maxSegments * 2 * 3);
    this.colors = new Float32Array(this.maxSegments * 2 * 3);

    this.geom = new THREE.BufferGeometry();
    this.geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geom.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.lines = new THREE.LineSegments(this.geom, this.mat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    this.scene.add(this.lines);

    // Hit markers — small spheres at reflection points coloured by material α.
    // Each marker owns its material (set per-frame), so no shared material here.
    const sphereGeo = new THREE.SphereGeometry(0.07, 8, 8);
    this.markersGroup = new THREE.Group();
    this.markersGroup.visible = false;
    this.scene.add(this.markersGroup);
    this.markerPool = [];
    this._sphereGeo = sphereGeo;

    this.raycaster = new THREE.Raycaster();
  }

  setEnabled(v) {
    this.enabled = v;
    this.lines.visible = v;
    this.markersGroup.visible = v;
  }

  setRayDensity(n) {
    const v = Math.max(4, Math.min(256, n));
    if (v === this.maxRays) return; // guard: avoid per-frame buffer reallocation
    this.maxRays = v;
    this._reallocate();
  }

  setMaxBounces(n) {
    const v = Math.max(1, Math.min(8, n));
    if (v === this.maxBounces) return; // guard: avoid per-frame buffer reallocation
    this.maxBounces = v;
    this._reallocate();
  }

  _reallocate() {
    this.maxSegments = this.maxRays * this.maxBounces;
    this.positions = new Float32Array(this.maxSegments * 2 * 3);
    this.colors = new Float32Array(this.maxSegments * 2 * 3);
    this.geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geom.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geom.setDrawRange(0, 0);
  }

  _getMarker(i) {
    if (i < this.markerPool.length) return this.markerPool[i];
    const m = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ transparent: true }));
    this.markersGroup.add(m);
    this.markerPool.push(m);
    return m;
  }

  // Direction sampling: hemispheric outward from speaker, mostly horizontal
  // (line-array model — most energy aimed at audience).
  _sampleDirection(i, total) {
    const theta = (i / total) * Math.PI * 2;
    const phi = (Math.random() - 0.5) * 0.5 + Math.PI / 2.1; // mostly horizontal
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
  }

  update(audio) {
    if (!this.enabled) return;

    const meshes = this.pavilion.getReflectiveMeshes();
    if (meshes.length === 0) return;

    const emitters = this.pavilion.speakers.emitterPositions();
    const energyScale = 0.6 + (audio?.level ?? 0.4) * 0.4 + (audio?.peak ?? 0) * 0.5;

    const raysPerEmitter = Math.max(1, Math.floor(this.maxRays / emitters.length));

    let segIdx = 0;
    let markerIdx = 0;

    for (let e = 0; e < emitters.length; e++) {
      const start = emitters[e].clone();
      for (let r = 0; r < raysPerEmitter; r++) {
        const dir = this._sampleDirection(r + e * 137, raysPerEmitter);
        let origin = start.clone();
        let energy = 1.0 * energyScale;

        for (let b = 0; b < this.maxBounces; b++) {
          if (segIdx >= this.maxSegments) break;

          this.raycaster.set(origin, dir);
          this.raycaster.far = 50;
          const hits = this.raycaster.intersectObjects(meshes, false);
          if (!hits.length) {
            // No hit — draw a fading "into the void" segment.
            const end = origin.clone().add(dir.clone().multiplyScalar(20));
            this._writeSegment(segIdx, origin, end, energy, energy * 0.05, [0.4, 0.7, 1.0], [0.0, 0.4, 0.7]);
            segIdx++;
            break;
          }

          const hit = hits[0];
          const hitPoint = hit.point;
          const surf = this.pavilion.surfaceFor(hit.object);
          const alpha = surf ? surf.material.alpha : 0.1;
          const diffuse = surf ? (surf.material.diffuse ?? 0.1) : 0.05;

          // Pre/post energy for colouring
          const e0 = energy;
          energy *= (1 - alpha);
          const e1 = energy;

          // Pre-segment colour interpolates from cyan(high energy) → blue (depleted).
          // Post-segment tint biases toward the material's absorption colour
          // so the user can SEE the surface's nature.
          const colHit = colorForAbsorption(alpha);
          const colA = [0.4 + e0 * 0.6, 1.0 * e0, 1.0 * e0];
          const colB = [colHit[0] * e1, colHit[1] * e1, colHit[2] * e1];

          this._writeSegment(segIdx, origin, hitPoint, e0, e1, colA, colB);
          segIdx++;

          // Hit marker — tint by absorption colour, size by remaining energy.
          if (markerIdx < 256) {
            const marker = this._getMarker(markerIdx);
            marker.visible = true;
            marker.position.copy(hitPoint);
            marker.scale.setScalar(0.5 + e1 * 1.6);
            marker.material.color.setRGB(...colHit);
            marker.material.opacity = 0.4 + e1 * 0.5;
            markerIdx++;
          }

          // Reflect with diffuse jitter.
          const normal = hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0);
          // Convert face normal from local to world.
          normal.transformDirection(hit.object.matrixWorld);

          const refl = dir.clone().reflect(normal);
          if (diffuse > 0.01) {
            refl.add(new THREE.Vector3(
              (Math.random() - 0.5) * diffuse,
              (Math.random() - 0.5) * diffuse,
              (Math.random() - 0.5) * diffuse,
            )).normalize();
          }

          origin = hitPoint.clone().addScaledVector(normal, 0.01); // offset to avoid re-hit
          dir.copy(refl);

          if (e1 < 0.02) break;
        }
      }
    }

    // Hide unused markers
    for (let i = markerIdx; i < this.markerPool.length; i++) {
      this.markerPool[i].visible = false;
    }

    this.geom.setDrawRange(0, segIdx * 2);
    this.geom.attributes.position.needsUpdate = true;
    this.geom.attributes.color.needsUpdate = true;
  }

  _writeSegment(idx, a, b, e0, e1, colA, colB) {
    const pos = this.positions;
    const col = this.colors;
    const o = idx * 6;
    pos[o] = a.x; pos[o + 1] = a.y; pos[o + 2] = a.z;
    pos[o + 3] = b.x; pos[o + 4] = b.y; pos[o + 5] = b.z;
    col[o] = colA[0]; col[o + 1] = colA[1]; col[o + 2] = colA[2];
    col[o + 3] = colB[0]; col[o + 4] = colB[1]; col[o + 5] = colB[2];
  }
}
