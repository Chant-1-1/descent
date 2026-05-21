import * as THREE from 'three';

// Central wrapper around renderer, scene, camera and an orbit-like control.
// Kept minimal — no external controls dependency so the project stays slim.

export class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07080b);
    this.scene.fog = new THREE.FogExp2(0x07080b, 0.012);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      400,
    );

    this.target = new THREE.Vector3(0, 4, 0);
    this.spherical = new THREE.Spherical(34, Math.PI / 2.6, Math.PI / 4);
    this._updateCamera();

    this._setupLights();
    this._setupOrbit();

    this.clock = new THREE.Clock();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    // Hemisphere for soft sky/ground gradient.
    this.hemi = new THREE.HemisphereLight(0x1a2d3f, 0x080608, 0.55);
    this.scene.add(this.hemi);

    // Key directional with shadows — the architectural "sun".
    this.key = new THREE.DirectionalLight(0xc7e6ff, 1.6);
    this.key.position.set(20, 30, 12);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.camera.left = -25;
    this.key.shadow.camera.right = 25;
    this.key.shadow.camera.top = 25;
    this.key.shadow.camera.bottom = -25;
    this.key.shadow.camera.near = 0.5;
    this.key.shadow.camera.far = 80;
    this.key.shadow.bias = -0.0005;
    this.scene.add(this.key);

    // Rim accent — the "stage glow".
    this.rim = new THREE.DirectionalLight(0xff5ec8, 0.45);
    this.rim.position.set(-15, 8, -20);
    this.scene.add(this.rim);

    // Audio-reactive volumetric point lights inside the pavilion.
    this.stageLightA = new THREE.PointLight(0x5ee2ff, 8, 28, 1.6);
    this.stageLightA.position.set(0, 5, -7);
    this.scene.add(this.stageLightA);

    this.stageLightB = new THREE.PointLight(0xff5ec8, 6, 24, 1.6);
    this.stageLightB.position.set(0, 5, -7);
    this.scene.add(this.stageLightB);

    // Ground plane — large radial gradient via a custom shader for atmosphere.
    const groundGeo = new THREE.CircleGeometry(120, 96);
    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x080a0e,
      transparent: true,
      opacity: 1,
    });
    this.ground = new THREE.Mesh(groundGeo, groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -0.01;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Subtle grid for scale reference (every meter).
    const grid = new THREE.GridHelper(60, 60, 0x18324a, 0x0d1822);
    grid.position.y = 0;
    grid.material.transparent = true;
    grid.material.opacity = 0.35;
    this.scene.add(grid);

    // Star/particle field for festival sky atmosphere.
    this._setupStars();
  }

  _setupStars() {
    const count = 600;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 80 + Math.random() * 80;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.7 + 0.05);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x88c8ff,
      size: 0.4,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geom, mat);
    this.scene.add(this.stars);
  }

  // Lightweight orbit controls — no external dependency.
  _setupOrbit() {
    const c = this.canvas;
    let dragging = null;
    let lx = 0, ly = 0;

    c.addEventListener('pointerdown', (e) => {
      dragging = e.button === 2 ? 'pan' : 'orbit';
      lx = e.clientX; ly = e.clientY;
      c.setPointerCapture(e.pointerId);
    });

    c.addEventListener('pointerup', (e) => {
      dragging = null;
      c.releasePointerCapture(e.pointerId);
    });

    c.addEventListener('contextmenu', (e) => e.preventDefault());

    c.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;

      if (dragging === 'orbit') {
        this.spherical.theta -= dx * 0.005;
        this.spherical.phi -= dy * 0.005;
        this.spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this.spherical.phi));
      } else {
        // pan along screen plane
        const panSpeed = 0.025 * this.spherical.radius;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        this.camera.matrix.extractBasis(right, up, new THREE.Vector3());
        this.target.addScaledVector(right, -dx * panSpeed * 0.05);
        this.target.addScaledVector(up, dy * panSpeed * 0.05);
      }
      this._updateCamera();
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.spherical.radius *= 1 + e.deltaY * 0.0008;
      this.spherical.radius = Math.max(8, Math.min(120, this.spherical.radius));
      this._updateCamera();
    }, { passive: false });
  }

  _updateCamera() {
    const v = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(v);
    this.camera.lookAt(this.target);
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  add(obj) { this.scene.add(obj); }
  remove(obj) { this.scene.remove(obj); }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
