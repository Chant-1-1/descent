// Diagrams + KPI panel updater. Manages:
//   - meters for bass/mid/high/level
//   - KPI numeric readouts (RT60, absorption, diffusion, immersion, ...)
//   - spectrum canvas drawing
//   - the Surface Inspector panel
//
// All UI updates throttled to ~30Hz to keep DOM cheap.

export class Diagrams {
  constructor() {
    this.bars = {
      bass: document.getElementById('m-bass'),
      mid: document.getElementById('m-mid'),
      high: document.getElementById('m-high'),
      level: document.getElementById('m-level'),
    };
    this.kpis = {
      rt60: document.getElementById('kpi-rt60'),
      volume: document.getElementById('kpi-volume'),
      absorption: document.getElementById('kpi-absorption'),
      alpha: document.getElementById('kpi-alpha'),
      diffusion: document.getElementById('kpi-diffusion'),
      reflection: document.getElementById('kpi-reflection'),
      immersion: document.getElementById('kpi-immersion'),
      stage: document.getElementById('kpi-stage'),
      speakers: document.getElementById('kpi-speakers'),
      score: document.getElementById('kpi-score'),
    };
    this.surfaceData = document.getElementById('surface-data');
    this.spectrumCanvas = document.getElementById('spectrum');
    this.specCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext('2d') : null;

    this.lastUpdate = 0;
  }

  setMeters(audio) {
    if (!this.bars.bass) return;
    const pct = (v) => `${Math.round(v * 100)}%`;
    this.bars.bass.style.width = pct(audio.bass);
    this.bars.mid.style.width = pct(audio.mid);
    this.bars.high.style.width = pct(audio.high);
    this.bars.level.style.width = pct(audio.level);
  }

  setKPIs(snapshot, opt) {
    if (!this.kpis.rt60) return;
    this.kpis.rt60.textContent = `${snapshot.rt60.toFixed(2)} s`;
    this.kpis.volume.textContent = `${snapshot.volume.toFixed(0)} m³`;
    this.kpis.absorption.textContent = `${snapshot.absorption.toFixed(1)} m²·sa`;
    this.kpis.alpha.textContent = snapshot.alphaAvg.toFixed(2);
    this.kpis.diffusion.textContent = snapshot.diffusion.toFixed(2);
    this.kpis.reflection.textContent = snapshot.reflection.toFixed(2);
    this.kpis.immersion.textContent = snapshot.immersion.toFixed(2);

    if (opt) {
      this.kpis.stage.textContent = `(${opt.stage.x.toFixed(1)}, ${opt.stage.z.toFixed(1)})`;
      this.kpis.speakers.textContent = `${opt.speakers.length}× active`;
      this.kpis.score.textContent = opt.score.toFixed(2);
    }
  }

  drawSpectrum(spectrum) {
    if (!this.specCtx || !spectrum || spectrum.length === 0) return;
    const ctx = this.specCtx;
    const w = this.spectrumCanvas.width;
    const h = this.spectrumCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const bars = 64;
    const step = Math.floor(spectrum.length / bars);
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#5ee2ff');
    grad.addColorStop(0.5, '#ff5ec8');
    grad.addColorStop(1, '#ffb866');
    ctx.fillStyle = grad;

    const bw = w / bars;
    for (let i = 0; i < bars; i++) {
      let s = 0;
      for (let j = 0; j < step; j++) s += spectrum[i * step + j];
      s /= step;
      const bh = s * h;
      ctx.fillRect(i * bw, h - bh, bw - 1, bh);
    }
  }

  showSurface(surf, hit) {
    if (!this.surfaceData) return;
    const m = surf.material;
    const rows = [
      ['Material', m.name],
      ['α (mid)', (m.alpha ?? 0).toFixed(2)],
      ['α low', (m.alphaBand?.low ?? m.alpha).toFixed(2)],
      ['α mid', (m.alphaBand?.mid ?? m.alpha).toFixed(2)],
      ['α high', (m.alphaBand?.high ?? m.alpha).toFixed(2)],
      ['Diffusion', (m.diffuse ?? 0).toFixed(2)],
      ['Area', `${surf.area.toFixed(1)} m²`],
      ['Surface', surf.name],
      ['Reflected E', (1 - m.alpha).toFixed(2)],
      ['Absorbed E', (m.alpha).toFixed(2)],
    ];
    this.surfaceData.innerHTML = rows.map(([k, v]) => `
      <div class="label">${k}</div>
      <div class="value">${v}</div>
    `).join('');
  }
}
