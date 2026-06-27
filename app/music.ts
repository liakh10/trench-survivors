// Game music — plays the provided track (public/music/gangstas.mp3) on loop.
// Started by a user gesture (the intro gate click) so autoplay policies allow it.

const TRACK_SRC = "/music/gangstas.mp3";

export class MusicEngine {
  private audio: HTMLAudioElement | null = null;
  playing = false; muted = false; volume = 0.5;
  trackName = "GANGSTAS";

  private ensure() {
    if (this.audio) return;
    try {
      const a = new Audio(TRACK_SRC);
      a.loop = true; a.preload = "auto"; a.volume = this.muted ? 0 : this.volume;
      this.audio = a;
    } catch { /* */ }
  }

  play() {
    this.ensure(); if (!this.audio) return;
    this.playing = true;
    const p = this.audio.play();
    if (p && typeof p.catch === "function") p.catch(() => { /* blocked until gesture */ });
  }
  pause() { this.playing = false; this.audio?.pause(); }
  toggle() { if (this.playing) this.pause(); else this.play(); }
  next() { if (this.audio) { this.audio.currentTime = 0; if (this.playing) this.audio.play().catch(() => { /* */ }); } }
  setMuted(m: boolean) { this.muted = m; if (this.audio) this.audio.volume = m ? 0 : this.volume; }
  setVolume(v: number) { this.volume = v; if (this.audio && !this.muted) this.audio.volume = v; }

  dispose() { this.pause(); if (this.audio) { this.audio.src = ""; this.audio = null; } }
}
