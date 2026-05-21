// Three-state mode switch wired into #mode-switcher.
// Modes: 'normal', 'analysis', 'raytrace'

export class ModeSwitcher {
  constructor(onChange) {
    this.mode = 'normal';
    this.onChange = onChange;
    document.querySelectorAll('#mode-switcher button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.mode;
        if (next === this.mode) return;
        this.mode = next;
        document.querySelectorAll('#mode-switcher button').forEach((b) => b.classList.toggle('active', b === btn));
        if (this.onChange) this.onChange(this.mode);
      });
    });
  }
}
