"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useEffect, useRef, useState } from "react";
import { CA, TICKER, X_URL, PUMP_URL, DEX_URL, isRealCA } from "./config";
import { display, ui } from "./fonts";
import { MusicEngine } from "./music";
import { getSfx } from "./sfx";
import { getMusicOff, setMusicOff } from "./store";
import { CHARACTERS } from "./game/content";
import GameCanvas from "./game/GameCanvas";

type Phase = "intro" | "select" | "game";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [phase, setPhase] = useState<Phase>("intro");
  const [introLeaving, setIntroLeaving] = useState(false);
  const [charId, setCharId] = useState<string>(CHARACTERS[0].id);
  const engineRef = useRef<MusicEngine | null>(null);

  useEffect(() => { const e = new MusicEngine(); engineRef.current = e; return () => e.dispose(); }, []);

  // hidden lifehack: the first gate click is the user gesture that unlocks + starts music
  function enter() {
    if (!getMusicOff() && engineRef.current) engineRef.current.play();
    getSfx().click();
    setIntroLeaving(true);
    setTimeout(() => { setPhase("select"); setIntroLeaving(false); }, 620);
  }
  function walletEnter() {
    if (connected) enter();
    else { try { sessionStorage.setItem("digin_wallet_pending", "1"); } catch { /* */ } setVisible(true); }
  }
  useEffect(() => {
    if (connected && publicKey && phase === "intro" && sessionStorage.getItem("digin_wallet_pending")) {
      sessionStorage.removeItem("digin_wallet_pending");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      enter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  function startGame(id: string) { getSfx().click(); setCharId(id); setPhase("game"); }

  if (phase === "game") return <GameCanvas charId={charId} onExit={() => setPhase("select")} />;

  return (
    <main className={`fixed inset-0 overflow-y-auto ${display.variable} ${ui.variable}`} style={{ fontFamily: "var(--font-ui)", background: "radial-gradient(ellipse at 50% 0%, #1a2410 0%, #0e1109 55%, #07080a 100%)" }}>
      <TrenchBg />

      {/* INTRO GATE */}
      {phase === "intro" && (
        <div className={`fixed inset-0 z-30 flex flex-col items-center justify-center text-center px-6 ${introLeaving ? "intro-leaving" : ""}`}>
          <div className="pop-in flex flex-col items-center">
            <div className="bob flicker mb-3"><HeroArt size={150} /></div>
            <div className="text-xs tracking-[0.5em] text-white/45 mb-2">WELCOME TO THE TRENCHES</div>
            <h1 className="text-5xl md:text-7xl olive-text leading-none" style={{ fontFamily: "var(--font-display)" }}>TRENCH</h1>
            <h1 className="text-5xl md:text-7xl gold-text leading-none mt-1" style={{ fontFamily: "var(--font-display)" }}>SURVIVORS</h1>
            <div className="text-sm text-white/55 mt-4 max-w-md">Auto-blast endless waves of jeeters &amp; rug devs. Level up, stack absurd synergies, farm the bag. How long can you survive?</div>
            <div className="mt-10 flex flex-col sm:flex-row gap-5 items-center">
              <button onClick={enter} className="menu-btn" style={{ minWidth: 230 }}>PLAY AS GUEST</button>
              <button onClick={walletEnter} className="menu-btn-purple" style={{ minWidth: 230 }}>{connected ? "ENTER WALLET" : "CONNECT WALLET"}</button>
            </div>
          </div>
        </div>
      )}

      {/* SELECT (main menu) */}
      {phase === "select" && (
        <div className="relative z-10 min-h-screen flex flex-col items-center px-4 pb-12 cine-in">
          <div className="text-center mt-8 select-none">
            <div className="text-4xl md:text-6xl olive-text leading-none" style={{ fontFamily: "var(--font-display)" }}>TRENCH SURVIVORS</div>
            <div className="text-sm tracking-[0.35em] text-white/45 mt-2">CHOOSE YOUR TRENCHER</div>
          </div>

          <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-8">
            {CHARACTERS.map((c) => (
              <button key={c.id} onClick={() => setCharId(c.id)} className={`char-tile flex flex-col items-center text-center ${charId === c.id ? "on" : ""}`}>
                <CharBadge meme={c.meme} color={c.color} size={68} />
                <div className="mt-2" style={{ fontFamily: "var(--font-display)", fontSize: 14, color: charId === c.id ? "#f5c542" : "#dfe7c8" }}>{c.name}</div>
                <div className="text-[11px] text-white/45 mt-1 leading-tight">{c.desc}</div>
                <div className="text-[10px] text-[#8aa53a] mt-1">START: {weaponName(c.startWeapon)}</div>
              </button>
            ))}
          </div>

          <button onClick={() => startGame(charId)} className="menu-btn mt-9" style={{ minWidth: 260, fontSize: 22 }}>DEPLOY ⚔</button>

          {/* bottom: ticker + CA + X */}
          <div className="flex flex-col items-center gap-5 mt-12">
            <div className="hud-card px-8 py-2 text-2xl gold-text" style={{ fontFamily: "var(--font-display)" }}>{TICKER}</div>
            <CADisplay />
            <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow on X" className="hud-btn" style={{ width: 48, height: 48 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
            <MusicToggle engine={engineRef} />
          </div>
        </div>
      )}
    </main>
  );
}

function weaponName(id: string) {
  const m: Record<string, string> = { diamond: "Diamond Hands", aura: "Conviction Aura", laser: "Laser Eyes", bonk: "Bonk Bat", orbit: "FUD Repellent", sniper: "KOL Sniper" };
  return m[id] ?? id;
}

function MusicToggle({ engine }: { engine: React.RefObject<MusicEngine | null> }) {
  const [off, setOff] = useState(false);
  // post-mount sync (localStorage is client-only; effect avoids hydration mismatch)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOff(getMusicOff()); }, []);
  function toggle() { const n = !off; setOff(n); setMusicOff(n); const e = engine.current; if (e) { if (n) e.pause(); else e.play(); } }
  return <button onClick={toggle} className="text-xs text-white/40 hover:text-white/70" style={{ fontFamily: "var(--font-display)" }}>MUSIC: {off ? "OFF" : "ON"}</button>;
}

function CADisplay() {
  const [copied, setCopied] = useState(false);
  const real = isRealCA();
  function copy() { if (!real) return; navigator.clipboard.writeText(CA); setCopied(true); setTimeout(() => setCopied(false), 1400); }
  return (
    <div className="flex flex-col items-center gap-2">
      {/* address always ONE line; box grows to fit, scrolls on narrow screens */}
      <div className="hud-card inline-flex items-center gap-3 px-4 py-2.5" style={{ maxWidth: "94vw" }}>
        <span className="shrink-0" style={{ color: "#8aa53a", fontWeight: 800, fontSize: 14 }}>CA:</span>
        <span onClick={copy} title={real ? CA : undefined}
          style={{ color: copied ? "#39d98a" : real ? "#e9f0d8" : "#7a845f", fontWeight: 600, fontSize: 14, fontFamily: real ? "ui-monospace, monospace" : "inherit", whiteSpace: "nowrap", overflowX: "auto", maxWidth: "100%", cursor: real ? "pointer" : "default" }}>
          {copied ? "COPIED!" : CA}
        </span>
        {real && (
          <button onClick={copy} aria-label="Copy CA" className="shrink-0 flex items-center justify-center cursor-pointer" style={{ width: 28, height: 28, border: "2px solid #8aa53a", borderRadius: 6, color: copied ? "#39d98a" : "#8aa53a", fontSize: 14, background: "transparent" }}>{copied ? "✓" : "⧉"}</button>
        )}
      </div>
      {real && (
        <div className="flex gap-3">
          <a href={PUMP_URL + CA} target="_blank" rel="noopener noreferrer" className="hud-card px-4 py-2 text-sm flex items-center gap-2" style={{ color: "#39d98a", fontWeight: 700 }}>💊 Pump Fun</a>
          <a href={DEX_URL + CA} target="_blank" rel="noopener noreferrer" className="hud-card px-4 py-2 text-sm flex items-center gap-2" style={{ color: "#7fe9ff", fontWeight: 700 }}>📈 DexScreener</a>
        </div>
      )}
    </div>
  );
}

// ── SVG art ──
function HeroArt({ size = 150 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs><radialGradient id="hg" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#2a3a18" /><stop offset="100%" stopColor="#0e1109" /></radialGradient></defs>
      <circle cx="60" cy="60" r="58" fill="url(#hg)" stroke="#3a472a" strokeWidth="2" />
      {/* trench mound */}
      <path d="M0 96 Q30 80 60 92 Q90 80 120 96 L120 120 L0 120 Z" fill="#1c2412" />
      {/* $ bags */}
      <g fill="#f5c542"><path d="M18 100 l5 -6 l5 6 l-5 6 z" /><path d="M98 102 l4 -5 l4 5 l-4 5 z" /></g>
      {/* cat soldier */}
      <g transform="translate(60 58)">
        <ellipse cx="0" cy="26" rx="22" ry="8" fill="rgba(0,0,0,0.4)" />
        <circle cx="0" cy="0" r="24" fill="#f1c27d" />
        <path d="M-17 -12 L-22 -30 L-7 -19 Z" fill="#f1c27d" /><path d="M17 -12 L22 -30 L7 -19 Z" fill="#f1c27d" />
        <circle cx="-8" cy="-2" r="3.4" fill="#241a10" /><circle cx="8" cy="-2" r="3.4" fill="#241a10" />
        <circle cx="0" cy="7" r="2.8" fill="#3a2a1a" />
        <path d="M-26 -4 A26 26 0 0 1 26 -4 Z" fill="#3c4a2e" /><rect x="-27" y="-7" width="54" height="5" fill="#4f6138" />
      </g>
    </svg>
  );
}

function CharBadge({ meme, color, size = 68 }: { meme: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="48" fill="#0e1109" />
      <g>
        {meme === "toad" ? (
          <>
            <circle cx="50" cy="54" r="34" fill={color} />
            <circle cx="38" cy="40" r="11" fill="#7cc265" /><circle cx="62" cy="40" r="11" fill="#7cc265" />
            <circle cx="38" cy="41" r="4" fill="#241a10" /><circle cx="62" cy="41" r="4" fill="#241a10" />
          </>
        ) : (
          <>
            <circle cx="50" cy="54" r="32" fill={color} />
            <path d="M28 38 L22 18 L40 32 Z" fill={color} /><path d="M72 38 L78 18 L60 32 Z" fill={color} />
            <circle cx="40" cy="50" r="4" fill="#241a10" /><circle cx="60" cy="50" r="4" fill="#241a10" />
            <circle cx="50" cy="62" r="3.6" fill="#3a2a1a" />
          </>
        )}
        {/* helmet */}
        <path d="M14 44 A36 36 0 0 1 86 44 Z" fill="#3c4a2e" />
        <rect x="12" y="40" width="76" height="7" rx="2" fill="#4f6138" />
      </g>
      <circle cx="50" cy="50" r="47" fill="none" stroke="#3a472a" strokeWidth="3" />
    </svg>
  );
}

function TrenchBg() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.5 }}>
      <div className="absolute inset-0" style={{ backgroundImage: "url(/bg-blur.jpg)", backgroundSize: "cover", backgroundPosition: "center", transform: "scale(1.08)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 35%, rgba(11,13,8,0.3), rgba(11,13,8,0.85) 75%)" }} />
    </div>
  );
}
