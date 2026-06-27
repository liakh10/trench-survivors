// Procedural canvas sprites — meme animal "soldiers" + enemy memes. No image assets.
import type { Enemy } from "./engine";
import { ENEMIES } from "./content";

type C = CanvasRenderingContext2D;

// image cache for trencher avatars (loaded once, drawn each frame)
const imgCache = new Map<string, HTMLImageElement>();
function getImg(src: string): HTMLImageElement {
  let im = imgCache.get(src);
  if (!im) { im = new Image(); im.src = src; imgCache.set(src, im); }
  return im;
}

export function drawTrencher(ctx: C, src: string, x: number, y: number, r: number, ring: string, hurt = false) {
  ctx.save(); ctx.translate(x, y);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.beginPath(); ctx.ellipse(0, r * 0.92, r * 0.85, r * 0.38, 0, 0, Math.PI * 2); ctx.fill();
  // circular avatar
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  const im = getImg(src);
  if (im.complete && im.naturalWidth) ctx.drawImage(im, -r, -r, r * 2, r * 2);
  else { ctx.fillStyle = "#2a3320"; ctx.fillRect(-r, -r, r * 2, r * 2); }
  if (hurt) { ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillRect(-r, -r, r * 2, r * 2); }
  ctx.restore();
  // unified ring
  ctx.lineWidth = 3; ctx.strokeStyle = ring; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx: C, e: Enemy, x: number, y: number) {
  ctx.save(); ctx.translate(x, y);
  const r = e.radius; const flash = e.hitFlash > 0;
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(0, r * 0.85, r * 0.8, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  const col = flash ? "#fff" : ENEMIES[e.type].color;
  if (e.type === "jeeter") {
    ctx.fillStyle = col; circle(ctx, 0, 0, r);
    ctx.fillStyle = flash ? "#222" : "#2a0d18"; ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.4); ctx.lineTo(-r * 0.1, -r * 0.15); ctx.lineTo(-r * 0.5, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 0.4); ctx.lineTo(r * 0.1, -r * 0.15); ctx.lineTo(r * 0.5, -r * 0.05); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = flash ? "#222" : "#2a0d18"; ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.arc(0, r * 0.55, r * 0.45, Math.PI + 0.3, -0.3); ctx.stroke();
  } else if (e.type === "paper") {
    ctx.fillStyle = col; roundRect(ctx, -r * 0.8, -r, r * 1.6, r * 2, r * 0.2); ctx.fill();
    ctx.strokeStyle = "#9bb"; ctx.lineWidth = 1.5; line(ctx, -r * 0.5, -r * 0.4, r * 0.5, -r * 0.4); line(ctx, -r * 0.5, 0, r * 0.5, 0); line(ctx, -r * 0.5, r * 0.4, r * 0.3, r * 0.4);
  } else if (e.type === "fudbot") {
    ctx.fillStyle = col; roundRect(ctx, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, r * 0.25); ctx.fill();
    ctx.fillStyle = flash ? "#222" : "#ff4d4d"; circle(ctx, -r * 0.3, -r * 0.1, r * 0.18); circle(ctx, r * 0.3, -r * 0.1, r * 0.18);
    ctx.fillStyle = "#222"; ctx.fillRect(-r * 0.4, r * 0.4, r * 0.8, r * 0.16);
    ctx.strokeStyle = col; ctx.lineWidth = 2; line(ctx, 0, -r * 0.85, 0, -r * 1.3); ctx.fillStyle = "#ff4d4d"; circle(ctx, 0, -r * 1.35, r * 0.12);
  } else if (e.type === "whale") {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.78, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = flash ? "#fff" : "#2a5aa0"; ctx.beginPath(); ctx.moveTo(r * 0.8, 0); ctx.lineTo(r * 1.35, -r * 0.5); ctx.lineTo(r * 1.35, r * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; circle(ctx, -r * 0.3, -r * 0.2, r * 0.16); ctx.fillStyle = "#111"; circle(ctx, -r * 0.3, -r * 0.2, r * 0.08);
    ctx.strokeStyle = "#bcd6ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -r * 0.78, r * 0.18, Math.PI, 0); ctx.stroke();
  } else if (e.type === "boss") {
    ctx.fillStyle = flash ? "#fff" : "#15101f"; circle(ctx, 0, 0, r);
    ctx.fillStyle = "#e6356f"; circle(ctx, -r * 0.35, -r * 0.1, r * 0.2); circle(ctx, r * 0.35, -r * 0.1, r * 0.2);
    ctx.strokeStyle = "#e6356f"; ctx.lineWidth = r * 0.16; ctx.beginPath(); ctx.arc(0, r * 0.6, r * 0.45, Math.PI + 0.4, -0.4); ctx.stroke();
    ctx.fillStyle = "#f5c542"; ctx.font = `${Math.round(r * 0.5)}px monospace`; ctx.textAlign = "center"; ctx.fillText("DEV", 0, -r * 0.6);
  }
  ctx.restore();
}

// helpers
function circle(ctx: C, x: number, y: number, r: number) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function line(ctx: C, x1: number, y1: number, x2: number, y2: number) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function roundRect(ctx: C, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

export const WEAPON_ICON: Record<string, string> = { diamond: "◆", aura: "◎", laser: "✶", bonk: "⚒", orbit: "⟳", sniper: "✜" };
export const PASSIVE_ICON: Record<string, string> = { power: "⚔", haste: "⚡", boots: "👟", vest: "🛡", magnet: "🧲", greed: "💰", regen: "✚" };
