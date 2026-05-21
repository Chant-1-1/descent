import * as THREE from 'three';
import { MATERIALS } from '../acoustics/Materials.js';
import { clamp, lerp } from '../utils/mathHelpers.js';

// Roof = 8 trapezoidal "petal" segments arranged around the centre.
// Each petal hinges along the perimeter and lifts upward driven by BASS energy.
// At full BASS the petals splay open — the room "breathes".

export class Roof {
  constructor(parent, size, baseHeight) {
    this.parent = parent;
    this.size = size;
    this.baseHeight = baseHeight;
    this.heightExtra = 4.2; // peak crown height when closed

    this.group = new THREE.Group();
    this.group.position.y = baseHeight;

    this.petals = [];
    this.openingFactor = 0;

    const petalCount = 8;
    const halfSide = size / 2;
    const baseRadius = Math.SQRT2 * halfSide; // corner reach

    // Construct a single trapezoidal petal as a triangle mesh fan.
    // Geometry is defined locally with hinge along its z-axis at y=0.
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petal = this._buildPetal(i, petalCount, baseRadius);

      const pivot = new THREE.Group();
      pivot.rotation.y = angle;
      pivot.add(petal.group);

      this.group.add(pivot);
      this.petals.push({ pivot, ...petal, angle });
    }

    // Central crown ring — small reflective metallic disc that lifts with bass.
    const crownGeo = new THREE.CylinderGeometry(2.4, 3.2, 0.4, 32);
    const crownMat = new THREE.MeshStandardMaterial({
      color: MATERIALS.metalPanel.color,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0x081820,
      emissiveIntensity: 0.4,
    });
    this.crown = new THREE.Mesh(crownGeo, crownMat);
    this.crown.position.y = this.heightExtra;
    this.crown.castShadow = true;
    this.crown.receiveShadow = true;
    this.group.add(this.crown);
    parent.registerSurface(this.crown, MATERIALS.metalPanel, Math.PI * 3.2 * 3.2, 'Roof crown');
  }

  _buildPetal(i, total, radius) {
    // Petal: triangle from origin (hinge corner) to outer arc.
    // Width approximates one segment of the perimeter.
    const half = this.size / 2;
    const arcSpan = (Math.PI * 2) / total;

    // outer points on the square's perimeter approximated by an octagon arc
    const v0 = new THREE.Vector3(0, 0, 0); // hinge centre
    const v1 = new THREE.Vector3(Math.cos(-arcSpan / 2) * half, 0, Math.sin(-arcSpan / 2) * half);
    const v2 = new THREE.Vector3(Math.cos(arcSpan / 2) * half, 0, Math.sin(arcSpan / 2) * half);
    const apex = new THREE.Vector3(half * 0.6, this.heightExtra, 0);

    // Triangulate two faces: hinge-edge to outer points to apex.
    const positions = new Float32Array([
      v1.x, v1.y, v1.z,
      v2.x, v2.y, v2.z,
      apex.x, apex.y, apex.z,
    ]);
    const indices = [0, 1, 2];
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: MATERIALS.membrane.color,
      metalness: 0.25,
      roughness: 0.55,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      emissive: 0x101824,
      emissiveIntensity: 0.18,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // The petal is hinged along the v1→v2 outer edge — we apply hinge tilt
    // by rotating a pivot positioned at the midpoint of that outer edge.
    const hingeMid = v1.clone().add(v2).multiplyScalar(0.5);
    const hinge = new THREE.Group();
    hinge.position.copy(hingeMid);
    mesh.position.sub(hingeMid);

    // Re-bias geometry positions so they're relative to the hinge.
    const posAttr = mesh.geometry.getAttribute('position');
    for (let k = 0; k < posAttr.count; k++) {
      posAttr.setX(k, posAttr.getX(k) - hingeMid.x);
      posAttr.setY(k, posAttr.getY(k) - hingeMid.y);
      posAttr.setZ(k, posAttr.getZ(k) - hingeMid.z);
    }
    posAttr.needsUpdate = true;
    mesh.position.set(0, 0, 0);

    hinge.add(mesh);

    const wrap = new THREE.Group();
    wrap.add(hinge);

    // Estimated area of triangle (Heron-ish via cross product).
    const a = v2.clone().sub(v1);
    const b = apex.clone().sub(v1);
    const area = a.cross(b).length() * 0.5;

    this.parent.registerSurface(mesh, MATERIALS.membrane, area, `Roof petal ${i}`);

    return { group: wrap, hinge, mesh, area };
  }

  update(dt, drivers) {
    const { bass, peak, intensity, controls } = drivers;
    const target = clamp(bass * 1.2 * (controls.roof ?? 1) * intensity, 0, 1);
    this.openingFactor += (target - this.openingFactor) * 0.08;

    // Each petal hinges outward.
    const tiltMax = 1.2; // radians
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      // Phase offset per petal so the roof "waves" rather than opening uniformly.
      const phase = Math.sin(performance.now() * 0.001 + i * 0.7) * 0.1;
      p.hinge.rotation.x = lerp(p.hinge.rotation.x, -tiltMax * this.openingFactor + phase * peak, 0.08);
    }

    // Crown lifts up with bass; emissive pulses with peak.
    this.crown.position.y = this.heightExtra + 1.8 * this.openingFactor + 0.3 * peak;
    this.crown.material.emissiveIntensity = 0.3 + peak * 1.8;
  }
}
