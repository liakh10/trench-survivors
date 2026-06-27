"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Game, type Upgrade } from "./engine";
import { WEAPONS, fmtMC, fmtTime, CHARACTERS } from "./content";
import { drawAnimal, drawEnemy, WEAPON_ICON, PASSIVE_ICON } from "./sprites";
import { getSfx } from "../sfx";
import { getBest, saveBest } from "../store";

interface HudState { hp: number; maxHp: number; time: number; mc: number; level: number; xp: number; xpToNext: number; weapons: { id: string; level: number; color: string }[]; }

export default function GameCanvas({ charId, onExit }: { charId: string; onExit: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const joyRef = useRef<{ active: boolean; ox: number; oy: number; vx: number; vy: number }>({ active: false, ox: 0, oy: 0, vx: 0, vy: 0 });
  const pausedRef = useRef(false);

  const [hud, setHud] = useState<HudState>({ hp: 100, maxHp: 100, time: 0, mc: 0, level: 1, xp: 0, xpToNext: 6, weapons: [] });
  const [upgrade, setUpgrade] = useState<Upgrade[] | null>(null);
  const [dead, setDead] = useState(false);
  const [paused, setPaused] = useState(false);
  const [joyUi, setJoyUi] = useState<{ active: boolean; ox: number; oy: number; kx: number; ky: number }>({ active: false, ox: 0, oy: 0, kx: 0, ky: 0 });
  const [newBest, setNewBest] = useState(false);

  // init game
  useEffect(() => {
    const sfx = getSfx();
    const g = new Game(charId);
    g.onLevelUp = () => { sfx.levelup(); setUpgrade(g.pendingUpgrade); };
    g.onHurt = () => sfx.hurt();
    g.onKill = () => sfx.kill();
    g.onShoot = () => sfx.shoot();
    g.onBoss = () => sfx.boss();
    g.onDead = () => {
      sfx.dead();
      const nb = saveBest({ time: g.time, mc: g.mc, level: g.level, char: g.char.id });
      setNewBest(nb); setDead(true);
    };
    gameRef.current = g;
    if (process.env.NODE_ENV !== "production") (window as unknown as { __game?: Game }).__game = g;

    const canvas = canvasRef.current!; const ctx = canvas.getContext("2d")!;
    let raf = 0; let last = performance.now(); let dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr; canvas.style.width = window.innerWidth + "px"; canvas.style.height = window.innerHeight + "px"; }
    resize(); window.addEventListener("resize", resize);

    function frame(now: number) {
      const dt = (now - last) / 1000; last = now;
      const W = window.innerWidth, H = window.innerHeight;
      g.viewR = Math.hypot(W, H) / 2 + 80;
      // input → move vector
      const j = joyRef.current; const k = keysRef.current;
      if (j.active) { g.moveX = j.vx; g.moveY = j.vy; }
      else { let mx = 0, my = 0; if (k.has("w") || k.has("arrowup")) my -= 1; if (k.has("s") || k.has("arrowdown")) my += 1; if (k.has("a") || k.has("arrowleft")) mx -= 1; if (k.has("d") || k.has("arrowright")) mx += 1; g.moveX = mx; g.moveY = my; }
      if (!pausedRef.current) g.update(dt);
      draw(ctx, g, W, H, dpr);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // HUD sync (10/s — avoids re-render per frame)
    const hudTimer = window.setInterval(() => {
      setHud({ hp: Math.ceil(g.hp), maxHp: g.maxHp, time: g.time, mc: g.mc, level: g.level, xp: g.xp, xpToNext: g.xpToNext, weapons: g.weaponList() });
    }, 100);

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); clearInterval(hudTimer); };
  }, [charId]);

  // keyboard
  useEffect(() => {
    const dn = (e: KeyboardEvent) => { keysRef.current.add(e.key.toLowerCase()); if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(e.key.toLowerCase())) e.preventDefault(); };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up); };
  }, []);

  // pointer joystick
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (upgrade || dead || paused) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    joyRef.current = { active: true, ox: e.clientX, oy: e.clientY, vx: 0, vy: 0 };
    setJoyUi({ active: true, ox: e.clientX, oy: e.clientY, kx: 0, ky: 0 });
  }, [upgrade, dead, paused]);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const j = joyRef.current; if (!j.active) return;
    const R = 56; const dx = e.clientX - j.ox, dy = e.clientY - j.oy; const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, R); const nx = (dx / len), ny = (dy / len);
    j.vx = nx * (cl / R); j.vy = ny * (cl / R);
    setJoyUi({ active: true, ox: j.ox, oy: j.oy, kx: nx * cl, ky: ny * cl });
  }, []);
  const onPointerUp = useCallback(() => { joyRef.current = { active: false, ox: 0, oy: 0, vx: 0, vy: 0 }; setJoyUi((s) => ({ ...s, active: false })); }, []);

  function pick(i: number) { const g = gameRef.current!; getSfx().click(); g.chooseUpgrade(i); setUpgrade(g.pendingUpgrade); }
  function togglePause() { const n = !pausedRef.current; pausedRef.current = n; setPaused(n); }
  function restart() { window.location.reload(); }

  const hpPct = Math.max(0, hud.hp / hud.maxHp) * 100;
  const xpPct = Math.min(100, (hud.xp / hud.xpToNext) * 100);

  return (
    <div className="fixed inset-0 overflow-hidden select-none" style={{ touchAction: "none", background: "#0b0d08" }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <canvas ref={canvasRef} className="block" />

      {/* ── HUD ── */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none px-3 pt-3 flex items-start justify-between" style={{ fontFamily: "var(--font-ui)" }}>
        <div className="flex flex-col gap-1.5" style={{ minWidth: 150 }}>
          <div className="hud-card px-2 py-1.5">
            <div className="flex items-center justify-between text-[11px] text-white/70 mb-1"><span>HP</span><span>{hud.hp}/{Math.round(hud.maxHp)}</span></div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#241c12" }}><div style={{ width: hpPct + "%", height: "100%", background: "linear-gradient(90deg,#39d98a,#9bffb0)", transition: "width 0.1s" }} /></div>
          </div>
          <div className="flex gap-1 flex-wrap" style={{ maxWidth: 180 }}>
            {hud.weapons.map((w) => (
              <div key={w.id} className="hud-card flex items-center justify-center" style={{ width: 30, height: 30, fontSize: 15, color: w.color, position: "relative" }}>
                {WEAPON_ICON[w.id] ?? "•"}
                <span className="absolute -bottom-1 -right-1 text-[9px] px-1 rounded" style={{ background: "#0b0d08", color: "#fff", border: `1px solid ${w.color}` }}>{w.level}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="hud-card px-4 py-1.5 text-center">
            <div className="text-xl leading-none" style={{ fontFamily: "var(--font-display)", color: "#f5c542" }}>{fmtTime(hud.time)}</div>
            <div className="text-[11px] text-[#39d98a] mt-0.5">MC {fmtMC(hud.mc)}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
          <div className="hud-card px-3 py-1.5 text-sm" style={{ fontFamily: "var(--font-display)", color: "#fff" }}>LV {hud.level}</div>
          <button onClick={togglePause} className="hud-btn" aria-label="pause">{paused ? "▶" : "❚❚"}</button>
        </div>
      </div>

      {/* XP bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none px-2 pb-2">
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(20,24,14,0.85)", border: "1px solid #2a3320" }}>
          <div style={{ width: xpPct + "%", height: "100%", background: "linear-gradient(90deg,#7fe9ff,#a06bff)", transition: "width 0.12s" }} />
        </div>
      </div>

      {/* joystick */}
      {joyUi.active && (
        <div className="absolute z-30 pointer-events-none" style={{ left: joyUi.ox, top: joyUi.oy, transform: "translate(-50%,-50%)" }}>
          <div style={{ width: 124, height: 124, borderRadius: "50%", border: "2px solid rgba(245,197,66,0.4)", background: "rgba(0,0,0,0.25)" }} />
          <div style={{ position: "absolute", left: "50%", top: "50%", width: 54, height: 54, borderRadius: "50%", background: "rgba(245,197,66,0.55)", transform: `translate(calc(-50% + ${joyUi.kx}px), calc(-50% + ${joyUi.ky}px))` }} />
        </div>
      )}

      {/* ── LEVEL-UP MODAL ── */}
      {upgrade && !dead && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-4" style={{ background: "rgba(8,10,6,0.82)", fontFamily: "var(--font-ui)" }}>
          <div className="text-4xl md:text-5xl gold-text mb-1 levelup-pop" style={{ fontFamily: "var(--font-display)" }}>LEVEL UP</div>
          <div className="text-white/50 mb-6 text-sm tracking-widest">CHOOSE AN UPGRADE</div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl">
            {upgrade.map((o, i) => (
              <button key={i} onClick={() => pick(i)} className="upgrade-card flex-1 p-4 text-left" style={{ ["--ac" as string]: o.color }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 10, background: "#11140c", border: `2px solid ${o.color}`, color: o.color, fontSize: 20 }}>{o.id ? (WEAPON_ICON[o.id] ?? PASSIVE_ICON[o.id] ?? "★") : "★"}</span>
                  <div>
                    <div style={{ color: o.color, fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 16 }}>{o.name}</div>
                    <div className="text-[11px] text-white/45">{o.level > 0 ? (o.kind.includes("new") ? "NEW" : `LV ${o.level}`) : "BONUS"}</div>
                  </div>
                </div>
                <div className="text-sm text-white/70">{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── PAUSE ── */}
      {paused && !upgrade && !dead && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5" style={{ background: "rgba(8,10,6,0.8)", fontFamily: "var(--font-ui)" }}>
          <div className="text-4xl gold-text" style={{ fontFamily: "var(--font-display)" }}>PAUSED</div>
          <button onClick={togglePause} className="menu-btn">RESUME</button>
          <button onClick={onExit} className="menu-btn-ghost">QUIT TO MENU</button>
        </div>
      )}

      {/* ── DEATH ── */}
      {dead && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center cine-in" style={{ background: "rgba(8,10,6,0.9)", fontFamily: "var(--font-ui)" }}>
          <div className="text-5xl md:text-6xl mb-1" style={{ fontFamily: "var(--font-display)", color: "#e6356f" }}>REKT</div>
          <div className="text-white/50 mb-6 tracking-widest text-sm">YOU GOT TRENCHED</div>
          <div className="hud-card px-8 py-5 flex flex-col gap-2 mb-2" style={{ minWidth: 240 }}>
            <Stat label="SURVIVED" value={fmtTime(hud.time)} />
            <Stat label="MC FARMED" value={fmtMC(hud.mc)} hl />
            <Stat label="LEVEL" value={`${hud.level}`} />
          </div>
          {newBest && <div className="text-[#f5c542] mb-3 text-sm" style={{ fontFamily: "var(--font-display)" }}>★ NEW BEST RUN ★</div>}
          <BestLine />
          <div className="flex gap-4 mt-5">
            <button onClick={restart} className="menu-btn">RUN IT BACK</button>
            <button onClick={onExit} className="menu-btn-ghost">MENU</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hl }: { label: string; value: string; hl?: boolean }) {
  return <div className="flex items-center justify-between gap-8"><span className="text-white/50 text-sm">{label}</span><span style={{ fontFamily: "var(--font-display)", color: hl ? "#39d98a" : "#fff", fontSize: 18 }}>{value}</span></div>;
}
function BestLine() {
  const b = getBest();
  if (!b) return null;
  return <div className="text-white/40 text-xs">best: {fmtMC(b.mc)} · {fmtTime(b.time)} · {CHARACTERS.find((c) => c.id === b.char)?.name ?? b.char}</div>;
}

// ── RENDERER ──
function draw(ctx: CanvasRenderingContext2D, g: Game, W: number, H: number, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // ground
  ctx.fillStyle = "#0e1109"; ctx.fillRect(0, 0, W, H);
  const shake = g.shakeT > 0 ? g.shakeMag * (g.shakeT / 0.5) : 0;
  const ox = W / 2 - g.px + (Math.random() - 0.5) * shake, oy = H / 2 - g.py + (Math.random() - 0.5) * shake;
  ctx.save(); ctx.translate(ox, oy);

  // trench grid + craters
  const grid = 80; const x0 = g.px - W / 2 - grid, x1 = g.px + W / 2 + grid, y0 = g.py - H / 2 - grid, y1 = g.py + H / 2 + grid;
  ctx.strokeStyle = "rgba(120,140,80,0.07)"; ctx.lineWidth = 1;
  for (let x = Math.floor(x0 / grid) * grid; x < x1; x += grid) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  for (let y = Math.floor(y0 / grid) * grid; y < y1; y += grid) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke(); }
  // stable craters via hashing
  ctx.fillStyle = "rgba(40,30,18,0.5)";
  for (let cx = Math.floor(x0 / 240) * 240; cx < x1; cx += 240) for (let cy = Math.floor(y0 / 240) * 240; cy < y1; cy += 240) {
    const h = Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5; const r = (h - Math.floor(h)); if (r < 0.5) continue;
    ctx.beginPath(); ctx.arc(cx + (r * 180) % 200, cy + (r * 90) % 200, 18 + r * 26, 0, Math.PI * 2); ctx.fill();
  }

  // bags
  for (const b of g.bags) {
    if (b.kind === "heal") { ctx.fillStyle = "#39d98a"; ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#0b0d08"; ctx.fillRect(b.x - 1.5, b.y - 4, 3, 8); ctx.fillRect(b.x - 4, b.y - 1.5, 8, 3); }
    else if (b.kind === "chest") { ctx.fillStyle = "#f5c542"; ctx.fillRect(b.x - 9, b.y - 7, 18, 14); ctx.fillStyle = "#a8791a"; ctx.fillRect(b.x - 9, b.y - 1, 18, 3); }
    else { ctx.fillStyle = "#f5c542"; ctx.beginPath(); ctx.moveTo(b.x, b.y - 6); ctx.lineTo(b.x + 5, b.y); ctx.lineTo(b.x, b.y + 6); ctx.lineTo(b.x - 5, b.y); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#0b0d08"; ctx.font = "8px monospace"; ctx.textAlign = "center"; ctx.fillText("$", b.x, b.y + 3); }
  }

  // aura & orbit (owned-weapon visuals)
  for (const w of g.weapons) {
    if (w.id === "aura") { const r = WEAPONS.aura.levels[w.level - 1].radius!; const grd = ctx.createRadialGradient(g.px, g.py, r * 0.4, g.px, g.py, r); grd.addColorStop(0, "rgba(255,179,71,0.02)"); grd.addColorStop(0.8, "rgba(255,179,71,0.12)"); grd.addColorStop(1, "rgba(255,179,71,0.02)"); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(g.px, g.py, r, 0, Math.PI * 2); ctx.fill(); }
    if (w.id === "orbit") { const lv = WEAPONS.orbit.levels[w.level - 1]; for (let i = 0; i < lv.count!; i++) { const a = g.orbitAngle * lv.speed! + (i / lv.count!) * Math.PI * 2; const oxp = g.px + Math.cos(a) * lv.radius!, oyp = g.py + Math.sin(a) * lv.radius!; ctx.fillStyle = "#a06bff"; ctx.beginPath(); ctx.arc(oxp, oyp, 9, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#d9c2ff"; ctx.beginPath(); ctx.arc(oxp, oyp, 4, 0, Math.PI * 2); ctx.fill(); } }
  }

  // enemy projectiles
  ctx.fillStyle = "#ff5a5a"; for (const p of g.eprojectiles) { ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); }

  // enemies
  for (const e of g.enemies) { drawEnemy(ctx, e, e.x, e.y); if (e.boss || e.maxHp > 60) { const w = e.radius * 2; ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4); ctx.fillStyle = "#e6356f"; ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * (e.hp / e.maxHp), 4); } }

  // beams
  for (const b of g.beams) { ctx.save(); ctx.globalAlpha = Math.min(1, b.life / 0.14); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.dy, b.dx)); const grd = ctx.createLinearGradient(0, 0, b.len, 0); grd.addColorStop(0, b.color); grd.addColorStop(1, "rgba(255,77,109,0)"); ctx.fillStyle = grd; ctx.fillRect(0, -b.w / 2, b.len, b.w); ctx.restore(); }
  // swings
  for (const s of g.swings) { ctx.save(); ctx.globalAlpha = Math.min(1, s.life / 0.16); ctx.strokeStyle = s.color; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, s.angle - 1.2, s.angle + 1.2); ctx.stroke(); ctx.restore(); }

  // projectiles
  for (const p of g.projectiles) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2); ctx.fill(); }

  // player
  const meme = CHARACTERS.find((c) => c.id === g.char.id)?.meme ?? "cat";
  drawAnimal(ctx, meme, g.px, g.py, 17, g.invuln > 0 && Math.floor(g.time * 20) % 2 === 0);

  // particles
  for (const p of g.particles) { ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
  // damage numbers
  ctx.font = "bold 13px var(--font-ui), sans-serif"; ctx.textAlign = "center";
  for (const d of g.dmgnums) { ctx.globalAlpha = Math.max(0, d.life / 0.6); ctx.fillStyle = d.color; ctx.fillText(d.text, d.x, d.y); }
  ctx.globalAlpha = 1;

  ctx.restore();

  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.6)"); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  // hurt flash
  if (g.flashT > 0) { ctx.fillStyle = `rgba(230,53,111,${Math.min(0.4, g.flashT)})`; ctx.fillRect(0, 0, W, H); }
}
