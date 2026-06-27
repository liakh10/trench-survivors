// Minimal WebAudio combat blips, created lazily after a user gesture.
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled = true;

  constructor() { try { this.enabled = localStorage.getItem("digin_muted") !== "1"; } catch { /* */ } }

  private ac(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { this.enabled = false; return null; } }
    return this.ctx;
  }
  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    const ac = this.ac(); if (!ac) return;
    const t = ac.currentTime; const o = ac.createOscillator(); const g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
  }
  setEnabled(b: boolean) { this.enabled = b; try { localStorage.setItem("digin_muted", b ? "0" : "1"); } catch { /* */ } }
  shoot() { this.blip(620, 0.05, "square", 0.035, 980); }
  hit() { this.blip(220, 0.04, "square", 0.03, 120); }
  kill() { this.blip(320, 0.08, "triangle", 0.045, 520); }
  pickup() { this.blip(880, 0.05, "sine", 0.035, 1320); }
  hurt() { this.blip(160, 0.18, "sawtooth", 0.07, 60); }
  levelup() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.14, "triangle", 0.06, f * 1.4), i * 55)); }
  boss() { this.blip(90, 0.5, "sawtooth", 0.09, 50); }
  dead() { this.blip(200, 0.5, "sawtooth", 0.09, 40); }
  click() { this.blip(440, 0.04, "square", 0.04, 660); }
}

let _sfx: Sfx | null = null;
export function getSfx(): Sfx { if (!_sfx) _sfx = new Sfx(); return _sfx; }
