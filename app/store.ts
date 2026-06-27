// Local persistence: best run + audio prefs. No accounts, device-local only.
export interface BestRun { time: number; mc: number; level: number; char: string; }

const KEY = "digin_best";

export function getBest(): BestRun | null {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) as BestRun : null; } catch { return null; }
}

export function saveBest(run: BestRun): boolean {
  const cur = getBest();
  if (cur && cur.mc >= run.mc) return false;
  try { localStorage.setItem(KEY, JSON.stringify(run)); return true; } catch { return false; }
}

export function getMusicOff(): boolean { try { return localStorage.getItem("digin_music_off") === "1"; } catch { return false; } }
export function setMusicOff(v: boolean) { try { localStorage.setItem("digin_music_off", v ? "1" : "0"); } catch { /* */ } }
