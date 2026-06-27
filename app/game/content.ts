// Game content: weapons, passives, enemies, characters. Pure data + per-level scaling.

export type WeaponId = "diamond" | "aura" | "laser" | "bonk" | "orbit" | "sniper";
export type PassiveId = "power" | "haste" | "boots" | "vest" | "magnet" | "greed" | "regen";

export interface WeaponLevel {
  damage: number;     // per hit
  cooldown: number;   // seconds between activations
  count?: number;     // projectiles / orbs / beams
  speed?: number;     // projectile speed (px/s)
  pierce?: number;    // extra enemies a projectile can hit
  radius?: number;    // aura / bonk / orbit radius (px)
  knockback?: number; // px impulse
}

export interface WeaponDef {
  id: WeaponId; name: string; desc: string; color: string; max: number;
  levels: WeaponLevel[];
}

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  diamond: {
    id: "diamond", name: "Diamond Hands", desc: "Hurls diamond shards at the nearest jeeter.", color: "#7fe9ff", max: 6,
    levels: [
      { damage: 14, cooldown: 0.85, count: 1, speed: 420, pierce: 0 },
      { damage: 16, cooldown: 0.78, count: 1, speed: 440, pierce: 1 },
      { damage: 18, cooldown: 0.68, count: 2, speed: 460, pierce: 1 },
      { damage: 22, cooldown: 0.60, count: 2, speed: 480, pierce: 2 },
      { damage: 26, cooldown: 0.52, count: 3, speed: 520, pierce: 2 },
      { damage: 32, cooldown: 0.44, count: 4, speed: 560, pierce: 3 },
    ],
  },
  aura: {
    id: "aura", name: "Conviction Aura", desc: "A burning field of conviction damages all nearby FUD.", color: "#ffb347", max: 6,
    levels: [
      { damage: 6, cooldown: 0.5, radius: 72 },
      { damage: 8, cooldown: 0.5, radius: 84 },
      { damage: 10, cooldown: 0.45, radius: 96 },
      { damage: 13, cooldown: 0.42, radius: 110 },
      { damage: 16, cooldown: 0.38, radius: 124 },
      { damage: 21, cooldown: 0.34, radius: 140 },
    ],
  },
  laser: {
    id: "laser", name: "Laser Eyes", desc: "Fires a piercing beam across the trench.", color: "#ff4d6d", max: 6,
    levels: [
      { damage: 22, cooldown: 1.5, count: 1, radius: 14 },
      { damage: 26, cooldown: 1.35, count: 1, radius: 16 },
      { damage: 30, cooldown: 1.2, count: 2, radius: 18 },
      { damage: 36, cooldown: 1.1, count: 2, radius: 20 },
      { damage: 44, cooldown: 1.0, count: 3, radius: 22 },
      { damage: 56, cooldown: 0.85, count: 3, radius: 26 },
    ],
  },
  bonk: {
    id: "bonk", name: "Bonk Bat", desc: "Swings a bat in an arc, knocking enemies back.", color: "#f5c542", max: 6,
    levels: [
      { damage: 20, cooldown: 0.9, radius: 86, knockback: 180 },
      { damage: 24, cooldown: 0.82, radius: 94, knockback: 200 },
      { damage: 30, cooldown: 0.74, radius: 104, knockback: 220 },
      { damage: 38, cooldown: 0.66, radius: 116, knockback: 250 },
      { damage: 48, cooldown: 0.58, radius: 128, knockback: 280 },
      { damage: 62, cooldown: 0.5, radius: 142, knockback: 320 },
    ],
  },
  orbit: {
    id: "orbit", name: "FUD Repellent", desc: "Orbiting shields that shred anything they touch.", color: "#a06bff", max: 6,
    levels: [
      { damage: 12, cooldown: 0, count: 2, radius: 70, speed: 2.6 },
      { damage: 14, cooldown: 0, count: 2, radius: 78, speed: 2.8 },
      { damage: 16, cooldown: 0, count: 3, radius: 84, speed: 3.0 },
      { damage: 20, cooldown: 0, count: 4, radius: 92, speed: 3.2 },
      { damage: 25, cooldown: 0, count: 5, radius: 100, speed: 3.4 },
      { damage: 32, cooldown: 0, count: 6, radius: 108, speed: 3.6 },
    ],
  },
  sniper: {
    id: "sniper", name: "KOL Sniper", desc: "Slow, brutal shots that delete the toughest target.", color: "#39d98a", max: 6,
    levels: [
      { damage: 70, cooldown: 2.2, count: 1, speed: 900, pierce: 2 },
      { damage: 85, cooldown: 2.0, count: 1, speed: 950, pierce: 3 },
      { damage: 105, cooldown: 1.85, count: 1, speed: 1000, pierce: 4 },
      { damage: 130, cooldown: 1.7, count: 2, speed: 1050, pierce: 4 },
      { damage: 165, cooldown: 1.55, count: 2, speed: 1100, pierce: 5 },
      { damage: 210, cooldown: 1.4, count: 3, speed: 1200, pierce: 6 },
    ],
  },
};

export interface PassiveDef { id: PassiveId; name: string; desc: string; color: string; max: number; values: number[]; }

// values are cumulative bonuses at each level (e.g. +0.10 = +10%).
export const PASSIVES: Record<PassiveId, PassiveDef> = {
  power:  { id: "power",  name: "Leverage",     desc: "+ damage on everything.", color: "#ff6b6b", max: 5, values: [0.12, 0.24, 0.38, 0.54, 0.72] },
  haste:  { id: "haste",  name: "Degen Speed",  desc: "+ fire rate.",            color: "#7fe9ff", max: 5, values: [0.10, 0.20, 0.32, 0.46, 0.62] },
  boots:  { id: "boots",  name: "Gravy Boots",  desc: "+ movement speed.",       color: "#39d98a", max: 5, values: [0.10, 0.20, 0.30, 0.42, 0.55] },
  vest:   { id: "vest",   name: "Conviction",   desc: "+ max HP.",               color: "#ffd166", max: 5, values: [25, 55, 90, 135, 190] },
  magnet: { id: "magnet", name: "Bag Magnet",   desc: "+ pickup range.",         color: "#a06bff", max: 5, values: [40, 85, 140, 210, 300] },
  greed:  { id: "greed",  name: "Insider Edge",  desc: "+ XP from bags.",        color: "#f5c542", max: 5, values: [0.15, 0.32, 0.5, 0.72, 1.0] },
  regen:  { id: "regen",  name: "Copium",       desc: "Regenerate HP over time.", color: "#9bffb0", max: 5, values: [0.6, 1.3, 2.2, 3.4, 5.0] },
};

export type EnemyId = "jeeter" | "paper" | "fudbot" | "whale" | "boss";

export interface EnemyDef {
  id: EnemyId; name: string; color: string;
  hp: number; speed: number; damage: number; radius: number; xp: number; mc: number;
  ranged?: boolean;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  jeeter:  { id: "jeeter",  name: "Jeeter",       color: "#e6356f", hp: 12,  speed: 56, damage: 6,  radius: 16, xp: 1, mc: 120 },
  paper:   { id: "paper",   name: "Paperhand",    color: "#dfe7ef", hp: 7,   speed: 94, damage: 5,  radius: 13, xp: 1, mc: 90 },
  fudbot:  { id: "fudbot",  name: "FUD Bot",      color: "#8a93a3", hp: 22,  speed: 44, damage: 9,  radius: 17, xp: 3, mc: 260, ranged: true },
  whale:   { id: "whale",   name: "Whale Dumper", color: "#3b7dd8", hp: 90,  speed: 34, damage: 15, radius: 26, xp: 6, mc: 800 },
  boss:    { id: "boss",    name: "Rug Dev",      color: "#1c1428", hp: 900, speed: 40, damage: 24, radius: 40, xp: 60, mc: 12000 },
};

export interface CharDef {
  id: string; name: string; img: string; desc: string; color: string;
  hp: number; speed: number; pickup: number;
  startWeapon: WeaponId;
  bonus: Partial<Record<PassiveId, number>>; // flat passive levels granted at start (as multipliers added directly)
}

// Roster = real trenchers (their PFPs, unified circular avatars in /public/trenchers).
export const CHARACTERS: CharDef[] = [
  { id: "cupsey", name: "Cupsey",       img: "/trenchers/cupsey.png", desc: "Balanced all-rounder.",          color: "#f5c542", hp: 110, speed: 156, pickup: 130, startWeapon: "diamond", bonus: {} },
  { id: "t9ndra", name: "t9ndra",       img: "/trenchers/t9ndra.png", desc: "Fast & aggressive.",             color: "#e2ad5e", hp: 95,  speed: 184, pickup: 130, startWeapon: "bonk",    bonus: { boots: 0.12 } },
  { id: "donutt", name: "Donuttcrypto", img: "/trenchers/donutt.png", desc: "Tanky, burns the swarm.",        color: "#e6356f", hp: 155, speed: 142, pickup: 130, startWeapon: "aura",    bonus: { vest: 20 } },
  { id: "cented", name: "cented",       img: "/trenchers/cented.png", desc: "Sniper. Deletes the toughest.",  color: "#7fe9ff", hp: 105, speed: 150, pickup: 160, startWeapon: "sniper",  bonus: { magnet: 50 } },
  { id: "decu",   name: "decu",         img: "/trenchers/decu.png",   desc: "Glass-cannon assassin.",         color: "#a06bff", hp: 85,  speed: 168, pickup: 160, startWeapon: "laser",   bonus: { greed: 0.15 } },
];

export function fmtMC(n: number): string {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + Math.floor(n);
}
export function fmtTime(s: number): string {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${ss.toString().padStart(2, "0")}`;
}
