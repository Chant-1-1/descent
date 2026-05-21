// Reads slider/checkbox state into a plain object that the rest of the app
// consumes. No frameworks, no event bus — just polling on update().

export class Controls {
  constructor() {
    this.state = {
      intensity: 1,
      stage: 0.6,
      speaker: 0.7,
      aperture: 0.4,
      roof: 0.6,
      floor: 0.3,
      panels: 0.6,
      absorption: 0.4,
      diffusion: 0.5,
      speed: 1,
      rayDensity: 64,
      bounces: 4,
      showAbsorption: true,
    };
    this._bind('c-intensity', 'intensity');
    this._bind('c-stage', 'stage');
    this._bind('c-speaker', 'speaker');
    this._bind('c-aperture', 'aperture');
    this._bind('c-roof', 'roof');
    this._bind('c-floor', 'floor');
    this._bind('c-panels', 'panels');
    this._bind('c-absorption', 'absorption');
    this._bind('c-diffusion', 'diffusion');
    this._bind('c-speed', 'speed');
    this._bind('c-raydensity', 'rayDensity', parseInt);
    this._bind('c-bounces', 'bounces', parseInt);

    const sa = document.getElementById('c-showabs');
    if (sa) {
      sa.addEventListener('change', () => { this.state.showAbsorption = sa.checked; });
      this.state.showAbsorption = sa.checked;
    }
  }

  _bind(id, key, parser = parseFloat) {
    const el = document.getElementById(id);
    if (!el) return;
    const apply = () => { this.state[key] = parser(el.value); };
    el.addEventListener('input', apply);
    apply();
  }
}
