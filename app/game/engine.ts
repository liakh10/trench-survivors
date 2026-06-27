// Trench Survivors — core simulation. Framework-agnostic; no React per frame.
import {
  WEAPONS, PASSIVES, ENEMIES, CHARACTERS,
  type WeaponId, type PassiveId, type EnemyId, type CharDef,
} from "./content";

export interface Vec { x: number; y: number; }

export interface Enemy {
  type: EnemyId; x: number; y: number; hp: number; maxHp: number;
  speed: number; damage: number; radius: number; xp: number; mc: number;
  ranged?: boolean; shootCd: number; orbCd: number; hitFlash: number;
  kx: number; ky: number; // knockback velocity
  boss?: boolean;
}
export interface Projectile { x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; radius: number; life: number; color: string; hits: Set<Enemy>; }
export interface EProjectile { x: number; y: number; vx: number; vy: number; dmg: number; radius: number; life: number; }
export interface Bag { x: number; y: number; vx: number; vy: number; value: number; kind: "xp" | "heal" | "chest"; }
export interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
export interface DmgNum { x: number; y: number; vy: number; life: number; text: string; color: string; crit?: boolean; }
export interface Beam { x: number; y: number; dx: number; dy: number; len: number; w: number; life: number; color: string; }
export interface Swing { x: number; y: number; angle: number; radius: number; life: number; color: string; }

export type UpgradeKind = "weapon-new" | "weapon-up" | "passive-new" | "passive-up" | "heal" | "mc";
export interface Upgrade { kind: UpgradeKind; id?: string; name: string; desc: string; level: number; color: string; }

interface OwnedWeapon { id: WeaponId; level: number; cd: number; }
interface OwnedPassive { id: PassiveId; level: number; }

const TAU = Math.PI * 2;
function dist(ax: number, ay: number, bx: number, by: number) { return Math.hypot(ax - bx, ay - by); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function shuffle<T>(arr: T[]): T[] { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

export class Game {
  char: CharDef;
  // player
  px = 0; py = 0; facingX = 1; facingY = 0;
  hp: number; baseHp: number; level = 1; xp = 0; xpToNext = 5;
  invuln = 0; regenAccum = 0;
  moveX = 0; moveY = 0;
  basePickup: number; baseSpeed: number;

  weapons: OwnedWeapon[] = [];
  passives: OwnedPassive[] = [];
  orbitAngle = 0;

  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  eprojectiles: EProjectile[] = [];
  bags: Bag[] = [];
  particles: Particle[] = [];
  dmgnums: DmgNum[] = [];
  beams: Beam[] = [];
  swings: Swing[] = [];

  time = 0; mc = 0; kills = 0;
  spawnTimer = 0; bossTimer = 120; bossAlive = false;
  shakeT = 0; shakeMag = 0; flashT = 0;
  pendingUpgrade: Upgrade[] | null = null;
  levelUpQueue = 0;
  gameOver = false;
  viewR = 700; // updated by renderer (offscreen spawn ring)

  onLevelUp?: () => void; onHurt?: () => void; onKill?: () => void; onShoot?: () => void; onBoss?: () => void; onDead?: () => void;

  constructor(charId: string) {
    this.char = CHARACTERS.find((c) => c.id === charId) ?? CHARACTERS[0];
    this.baseHp = this.char.hp; this.baseSpeed = this.char.speed; this.basePickup = this.char.pickup;
    this.hp = this.maxHp;
    this.weapons.push({ id: this.char.startWeapon, level: 1, cd: 0 });
  }

  // ── derived stats ──
  private passiveVal(id: PassiveId): number {
    const owned = this.passives.find((p) => p.id === id);
    const base = owned ? PASSIVES[id].values[owned.level - 1] : 0;
    const bonus = this.char.bonus[id] ?? 0;
    return base + bonus;
  }
  get damageMult() { return 1 + this.passiveVal("power"); }
  get fireMult() { return 1 + this.passiveVal("haste"); }
  get speedMult() { return 1 + this.passiveVal("boots"); }
  get maxHp() { return this.baseHp + this.passiveVal("vest"); }
  get pickupR() { return this.basePickup + this.passiveVal("magnet"); }
  get xpMult() { return 1 + this.passiveVal("greed"); }
  get regenRate() { return this.passiveVal("regen"); }

  // ── main update ──
  update(dt: number) {
    if (this.gameOver || this.pendingUpgrade) return;
    dt = Math.min(dt, 0.05);
    this.time += dt;
    if (this.shakeT > 0) this.shakeT -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.invuln > 0) this.invuln -= dt;

    // movement
    let mx = this.moveX, my = this.moveY; const ml = Math.hypot(mx, my);
    if (ml > 0.01) { mx /= Math.max(ml, 1); my /= Math.max(ml, 1); this.facingX = mx; this.facingY = my; }
    const sp = this.baseSpeed * this.speedMult;
    this.px += mx * sp * dt; this.py += my * sp * dt;

    // regen
    if (this.regenRate > 0 && this.hp < this.maxHp) { this.regenAccum += this.regenRate * dt; if (this.regenAccum >= 1) { const h = Math.floor(this.regenAccum); this.hp = Math.min(this.maxHp, this.hp + h); this.regenAccum -= h; } }

    this.spawnLogic(dt);
    this.updateWeapons(dt);
    this.updateProjectiles(dt);
    this.updateEnemies(dt);
    this.updateBags(dt);
    this.updateTransient(dt);

    if (this.hp <= 0 && !this.gameOver) { this.hp = 0; this.gameOver = true; this.onDead?.(); }
  }

  // ── spawning ──
  private spawnLogic(dt: number) {
    this.spawnTimer -= dt;
    const interval = lerp(1.3, 0.38, Math.min(1, this.time / 320));
    if (this.spawnTimer <= 0) {
      this.spawnTimer = interval;
      const batch = 1 + Math.floor(this.time / 48) + (Math.random() < 0.25 ? 1 : 0);
      for (let i = 0; i < batch; i++) this.spawnEnemy();
    }
    // boss
    this.bossTimer -= dt;
    if (this.bossTimer <= 0 && !this.bossAlive) { this.bossTimer = 120; this.spawnEnemy("boss"); this.bossAlive = true; this.flashT = 0.4; this.onBoss?.(); }
  }

  private pickType(): EnemyId {
    const t = this.time; const pool: EnemyId[] = ["jeeter"];
    if (t > 18) pool.push("paper");
    if (t > 45) pool.push("fudbot");
    if (t > 90) pool.push("whale");
    // weight toward newer/tougher slightly
    return pool[(Math.random() * pool.length) | 0];
  }

  private spawnEnemy(forced?: EnemyId) {
    const type = forced ?? this.pickType();
    const def = ENEMIES[type];
    const hpMult = 1 + this.time / 120;
    const ang = Math.random() * TAU; const r = this.viewR + 40 + Math.random() * 80;
    const e: Enemy = {
      type, x: this.px + Math.cos(ang) * r, y: this.py + Math.sin(ang) * r,
      hp: def.hp * (type === "boss" ? hpMult * 1.2 : hpMult), maxHp: def.hp * (type === "boss" ? hpMult * 1.2 : hpMult),
      speed: def.speed, damage: def.damage, radius: def.radius, xp: def.xp, mc: def.mc,
      ranged: def.ranged, shootCd: 1.5 + Math.random(), orbCd: 0, hitFlash: 0, kx: 0, ky: 0, boss: type === "boss",
    };
    this.enemies.push(e);
  }

  // ── weapons ──
  private nearest(maxR = Infinity): Enemy | null {
    let best: Enemy | null = null, bd = maxR;
    for (const e of this.enemies) { const d = dist(e.x, e.y, this.px, this.py); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  private toughest(): Enemy | null {
    let best: Enemy | null = null, bh = -1;
    for (const e of this.enemies) { if (e.hp > bh) { bh = e.hp; best = e; } }
    return best;
  }

  private updateWeapons(dt: number) {
    // orbit is continuous
    this.orbitAngle += dt * 2.4;
    for (const w of this.weapons) {
      const lvl = WEAPONS[w.id].levels[w.level - 1];
      if (w.id === "orbit") { this.tickOrbit(w, lvl.count!, lvl.radius!, lvl.damage * this.damageMult, lvl.speed!); continue; }
      if (w.id === "aura") { w.cd -= dt; if (w.cd <= 0) { w.cd = lvl.cooldown / this.fireMult; this.tickAura(lvl.radius!, lvl.damage * this.damageMult); } continue; }
      w.cd -= dt;
      if (w.cd <= 0) { w.cd = lvl.cooldown / this.fireMult; this.fire(w.id, w.level); }
    }
  }

  private fire(id: WeaponId, level: number) {
    const lvl = WEAPONS[id].levels[level - 1]; const col = WEAPONS[id].color; const dmg = lvl.damage * this.damageMult;
    if (id === "diamond") {
      const targets = this.pickTargets(lvl.count ?? 1);
      const aim = targets[0] ?? null;
      for (let i = 0; i < (lvl.count ?? 1); i++) {
        const tgt = targets[i] ?? aim;
        let ax = this.facingX, ay = this.facingY;
        if (tgt) { const d = dist(tgt.x, tgt.y, this.px, this.py) || 1; ax = (tgt.x - this.px) / d; ay = (tgt.y - this.py) / d; }
        this.projectiles.push({ x: this.px, y: this.py, vx: ax * lvl.speed!, vy: ay * lvl.speed!, dmg, pierce: lvl.pierce ?? 0, radius: 9, life: 1.6, color: col, hits: new Set() });
      }
      this.onShoot?.();
    } else if (id === "sniper") {
      const tgt = this.toughest();
      let ax = this.facingX, ay = this.facingY;
      if (tgt) { const d = dist(tgt.x, tgt.y, this.px, this.py) || 1; ax = (tgt.x - this.px) / d; ay = (tgt.y - this.py) / d; }
      for (let i = 0; i < (lvl.count ?? 1); i++) {
        const spread = ((lvl.count ?? 1) > 1) ? (i - ((lvl.count ?? 1) - 1) / 2) * 0.12 : 0;
        const c = Math.cos(spread), s = Math.sin(spread);
        this.projectiles.push({ x: this.px, y: this.py, vx: (ax * c - ay * s) * lvl.speed!, vy: (ax * s + ay * c) * lvl.speed!, dmg, pierce: lvl.pierce ?? 0, radius: 7, life: 1.2, color: col, hits: new Set() });
      }
      this.onShoot?.();
    } else if (id === "laser") {
      const tgt = this.nearest(); let ax = this.facingX, ay = this.facingY;
      if (tgt) { const d = dist(tgt.x, tgt.y, this.px, this.py) || 1; ax = (tgt.x - this.px) / d; ay = (tgt.y - this.py) / d; }
      const beams = lvl.count ?? 1; const baseAng = Math.atan2(ay, ax);
      for (let i = 0; i < beams; i++) {
        const a = baseAng + (beams > 1 ? (i - (beams - 1) / 2) * 0.28 : 0);
        const dx = Math.cos(a), dy = Math.sin(a); const len = 900, w = lvl.radius ?? 16;
        this.laserDamage(dx, dy, len, w, dmg);
        this.beams.push({ x: this.px, y: this.py, dx, dy, len, w, life: 0.14, color: col });
      }
      this.onShoot?.();
    } else if (id === "bonk") {
      const r = lvl.radius ?? 90; const baseAng = Math.atan2(this.facingY, this.facingX);
      for (const e of this.enemies) {
        const d = dist(e.x, e.y, this.px, this.py); if (d > r) continue;
        const ang = Math.atan2(e.y - this.py, e.x - this.px); let da = Math.abs(ang - baseAng); if (da > Math.PI) da = TAU - da;
        if (da < 1.2) { this.hurtEnemy(e, dmg); const kb = lvl.knockback ?? 150; e.kx += Math.cos(ang) * kb; e.ky += Math.sin(ang) * kb; }
      }
      this.swings.push({ x: this.px, y: this.py, angle: baseAng, radius: r, life: 0.16, color: WEAPONS.bonk.color });
      this.onShoot?.();
    }
  }

  private pickTargets(n: number): Enemy[] {
    const sorted = [...this.enemies].sort((a, b) => dist(a.x, a.y, this.px, this.py) - dist(b.x, b.y, this.px, this.py));
    return sorted.slice(0, n);
  }

  private laserDamage(dx: number, dy: number, len: number, w: number, dmg: number) {
    for (const e of this.enemies) {
      const rx = e.x - this.px, ry = e.y - this.py; const proj = rx * dx + ry * dy; if (proj < 0 || proj > len) continue;
      const perp = Math.abs(rx * -dy + ry * dx); if (perp < w + e.radius) this.hurtEnemy(e, dmg);
    }
  }
  private tickAura(r: number, dmg: number) {
    for (const e of this.enemies) { if (dist(e.x, e.y, this.px, this.py) < r + e.radius) this.hurtEnemy(e, dmg); }
  }
  private tickOrbit(w: OwnedWeapon, count: number, r: number, dmg: number, spin: number) {
    for (let i = 0; i < count; i++) {
      const a = this.orbitAngle * spin + (i / count) * TAU; const ox = this.px + Math.cos(a) * r, oy = this.py + Math.sin(a) * r;
      for (const e of this.enemies) { if (e.orbCd > 0) continue; if (dist(e.x, e.y, ox, oy) < 18 + e.radius) { this.hurtEnemy(e, dmg); e.orbCd = 0.35; } }
    }
  }

  private hurtEnemy(e: Enemy, dmg: number) {
    e.hp -= dmg; e.hitFlash = 0.08;
    this.dmgnums.push({ x: e.x, y: e.y - e.radius, vy: -40, life: 0.6, text: Math.round(dmg).toString(), color: "#fff" });
    if (e.hp <= 0) this.killEnemy(e);
  }
  private killEnemy(e: Enemy) {
    const i = this.enemies.indexOf(e); if (i < 0) return; this.enemies.splice(i, 1);
    this.kills++; this.mc += e.mc; if (e.boss) this.bossAlive = false;
    // drops
    this.bags.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: e.xp, kind: "xp" });
    if (e.boss) { for (let k = 0; k < 8; k++) this.bags.push({ x: e.x + (Math.random() - 0.5) * 80, y: e.y + (Math.random() - 0.5) * 80, vx: 0, vy: 0, value: 4, kind: "xp" }); this.bags.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: 0, kind: "chest" }); }
    else if (Math.random() < 0.018) this.bags.push({ x: e.x, y: e.y, vx: 0, vy: 0, value: 0, kind: "heal" });
    // particles
    const n = e.boss ? 26 : 7;
    for (let k = 0; k < n; k++) { const a = Math.random() * TAU, s = 40 + Math.random() * (e.boss ? 220 : 120); this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5, maxLife: 0.5, color: ENEMIES[e.type].color, size: 2 + Math.random() * 3 }); }
    if (e.boss) { this.shakeT = 0.5; this.shakeMag = 14; }
    this.onKill?.();
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      let dead = p.life <= 0;
      if (!dead) for (const e of this.enemies) {
        if (p.hits.has(e)) continue;
        if (dist(p.x, p.y, e.x, e.y) < p.radius + e.radius) { this.hurtEnemy(e, p.dmg); p.hits.add(e); if (p.pierce <= 0) { dead = true; break; } p.pierce--; }
      }
      if (dead) this.projectiles.splice(i, 1);
    }
    // enemy projectiles
    for (let i = this.eprojectiles.length - 1; i >= 0; i--) {
      const p = this.eprojectiles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) { this.eprojectiles.splice(i, 1); continue; }
      if (this.invuln <= 0 && dist(p.x, p.y, this.px, this.py) < p.radius + 14) { this.takeDamage(p.dmg); this.eprojectiles.splice(i, 1); }
    }
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      if (e.hitFlash > 0) e.hitFlash -= dt;
      if (e.orbCd > 0) e.orbCd -= dt;
      const d = dist(e.x, e.y, this.px, this.py) || 1; const ux = (this.px - e.x) / d, uy = (this.py - e.y) / d;
      // knockback decay
      e.kx *= Math.pow(0.0001, dt); e.ky *= Math.pow(0.0001, dt);
      e.x += (ux * e.speed + e.kx) * dt; e.y += (uy * e.speed + e.ky) * dt;
      // ranged attack
      if (e.ranged) { e.shootCd -= dt; if (e.shootCd <= 0 && d < this.viewR) { e.shootCd = 2.2; this.eprojectiles.push({ x: e.x, y: e.y, vx: ux * 200, vy: uy * 200, dmg: e.damage, radius: 7, life: 4 }); } }
      // contact
      if (this.invuln <= 0 && d < e.radius + 14) this.takeDamage(e.damage);
    }
  }

  private takeDamage(d: number) {
    this.hp -= d; this.invuln = 0.85; this.shakeT = 0.18; this.shakeMag = 8; this.flashT = 0.12; this.onHurt?.();
  }

  private updateBags(dt: number) {
    const pr = this.pickupR;
    for (let i = this.bags.length - 1; i >= 0; i--) {
      const b = this.bags[i]; const d = dist(b.x, b.y, this.px, this.py);
      const ux = (this.px - b.x) / (d || 1), uy = (this.py - b.y) / (d || 1);
      if (d < pr) { const pull = lerp(440, 940, 1 - d / pr); b.x += ux * pull * dt; b.y += uy * pull * dt; }
      else { b.x += ux * 42 * dt; b.y += uy * 42 * dt; } // weak global drift so bags are never abandoned
      if (d < 20) { this.collect(b); this.bags.splice(i, 1); }
    }
  }
  private collect(b: Bag) {
    if (b.kind === "heal") { this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.25)); this.dmgnums.push({ x: this.px, y: this.py - 20, vy: -50, life: 0.8, text: "+HP", color: "#39d98a" }); return; }
    if (b.kind === "chest") { for (const e of [...this.enemies]) if (!e.boss) this.hurtEnemy(e, 9999); this.flashT = 0.25; this.gainXp(12); return; }
    this.gainXp(b.value);
  }
  private gainXp(v: number) {
    this.xp += v * this.xpMult;
    while (this.xp >= this.xpToNext) { this.xp -= this.xpToNext; this.level++; this.levelUpQueue++; this.xpToNext = Math.floor(5 + this.level * 3.2 + this.level * this.level * 0.4); }
    if (this.levelUpQueue > 0 && !this.pendingUpgrade) this.openUpgrade();
  }

  private updateTransient(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) { const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt); p.life -= dt; if (p.life <= 0) this.particles.splice(i, 1); }
    for (let i = this.dmgnums.length - 1; i >= 0; i--) { const d = this.dmgnums[i]; d.y += d.vy * dt; d.vy *= Math.pow(0.1, dt); d.life -= dt; if (d.life <= 0) this.dmgnums.splice(i, 1); }
    for (let i = this.beams.length - 1; i >= 0; i--) { this.beams[i].life -= dt; if (this.beams[i].life <= 0) this.beams.splice(i, 1); }
    for (let i = this.swings.length - 1; i >= 0; i--) { this.swings[i].life -= dt; if (this.swings[i].life <= 0) this.swings.splice(i, 1); }
  }

  // ── upgrades ──
  private openUpgrade() {
    this.pendingUpgrade = this.buildOptions();
    this.onLevelUp?.();
  }
  private buildOptions(): Upgrade[] {
    const cand: Upgrade[] = [];
    for (const w of this.weapons) { const def = WEAPONS[w.id]; if (w.level < def.max) cand.push({ kind: "weapon-up", id: w.id, name: def.name, desc: def.desc, level: w.level + 1, color: def.color }); }
    if (this.weapons.length < 6) for (const id of Object.keys(WEAPONS) as WeaponId[]) { if (!this.weapons.find((w) => w.id === id)) { const def = WEAPONS[id]; cand.push({ kind: "weapon-new", id, name: def.name, desc: def.desc, level: 1, color: def.color }); } }
    for (const p of this.passives) { const def = PASSIVES[p.id]; if (p.level < def.max) cand.push({ kind: "passive-up", id: p.id, name: def.name, desc: def.desc, level: p.level + 1, color: def.color }); }
    if (this.passives.length < 7) for (const id of Object.keys(PASSIVES) as PassiveId[]) { if (!this.passives.find((p) => p.id === id)) { const def = PASSIVES[id]; cand.push({ kind: "passive-new", id, name: def.name, desc: def.desc, level: 1, color: def.color }); } }
    const out = shuffle(cand).slice(0, 3);
    while (out.length < 3) out.push(Math.random() < 0.5 ? { kind: "heal", name: "Field Medic", desc: "Restore 35% HP.", level: 0, color: "#39d98a" } : { kind: "mc", name: "Insider Bag", desc: "+5,000 MC farmed.", level: 0, color: "#f5c542" });
    return out;
  }
  chooseUpgrade(i: number) {
    const opt = this.pendingUpgrade?.[i]; if (!opt) return;
    if (opt.kind === "weapon-new") this.weapons.push({ id: opt.id as WeaponId, level: 1, cd: 0 });
    else if (opt.kind === "weapon-up") { const w = this.weapons.find((x) => x.id === opt.id); if (w) w.level++; }
    else if (opt.kind === "passive-new") { this.passives.push({ id: opt.id as PassiveId, level: 1 }); this.hp = Math.min(this.maxHp, this.hp + (opt.id === "vest" ? PASSIVES.vest.values[0] : 0)); }
    else if (opt.kind === "passive-up") { const p = this.passives.find((x) => x.id === opt.id); if (p) { p.level++; if (opt.id === "vest") this.hp += PASSIVES.vest.values[p.level - 1] - PASSIVES.vest.values[p.level - 2]; } }
    else if (opt.kind === "heal") this.hp = Math.min(this.maxHp, this.hp + Math.round(this.maxHp * 0.35));
    else if (opt.kind === "mc") this.mc += 5000;
    this.levelUpQueue--;
    this.pendingUpgrade = null;
    if (this.levelUpQueue > 0) this.openUpgrade();
  }

  // snapshot for HUD
  weaponList() { return this.weapons.map((w) => ({ id: w.id, level: w.level, color: WEAPONS[w.id].color })); }
  passiveList() { return this.passives.map((p) => ({ id: p.id, level: p.level, color: PASSIVES[p.id].color })); }
}
