import * as THREE from 'three';

// Click-to-inspect for any acoustically-registered surface.
// Updates the right-hand "Surface Inspector" UI block.

export class SurfacePicker {
  constructor(pavilion, sceneManager, ui) {
    this.pavilion = pavilion;
    this.sceneManager = sceneManager;
    this.ui = ui;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.enabled = false;

    sceneManager.canvas.addEventListener('click', (e) => {
      if (!this.enabled) return;
      const rect = sceneManager.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, sceneManager.camera);
      const meshes = pavilion.getReflectiveMeshes();
      const hits = this.raycaster.intersectObjects(meshes, false);
      if (hits.length) {
        const surf = pavilion.surfaceFor(hits[0].object);
        if (surf) ui.showSurface(surf, hits[0]);
      }
    });
  }

  setEnabled(v) { this.enabled = v; }
}
