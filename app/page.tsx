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

  useEffect(() => { const e = new MusicEngine(); engineRef.current = e; if (process.env.NODE_ENV !== "production") (window as unknown as { __music?: MusicEngine }).__music = e; return () => e.dispose(); }, []);

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
            <div className="bob rounded-2xl" style={{ width: "min(82vw, 440px)", aspectRatio: "1 / 1", backgroundImage: "url(/poster.png)", backgroundSize: "cover", backgroundPosition: "center", borderRadius: 20, border: "1px solid #2a3320", boxShadow: "0 0 70px rgba(160,200,80,0.3)" }} />
            <div className="text-base md:text-lg text-white/60 mt-10 max-w-lg">Auto-blast endless waves of jeeters &amp; rug devs. Level up, stack absurd synergies, farm the bag. How long can you survive?</div>
            <div className="mt-14 flex flex-col sm:flex-row gap-8 md:gap-14 items-center">
              <button onClick={enter} className="menu-btn" style={{ minWidth: 300 }}>PLAY AS GUEST</button>
              <button onClick={walletEnter} className="menu-btn-purple" style={{ minWidth: 300 }}>{connected ? "ENTER WALLET" : "CONNECT WALLET"}</button>
            </div>
          </div>
        </div>
      )}

      {/* SELECT — operator-style main menu */}
      {phase === "select" && (() => {
        const sel = CHARACTERS.find((c) => c.id === charId) ?? CHARACTERS[0];
        return (
          <div className="relative z-10 min-h-screen flex flex-col items-center px-6 py-12 cine-in">
            <div className="text-center select-none">
              <div className="text-5xl md:text-7xl gold-text leading-none" style={{ fontFamily: "var(--font-display)" }}>TRENCH SURVIVORS</div>
              <div className="text-xl md:text-3xl tracking-[0.4em] olive-text mt-5" style={{ fontFamily: "var(--font-display)" }}>SELECT TRENCHER</div>
            </div>

            {/* featured operator */}
            <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16 mt-12 md:mt-16 w-full max-w-4xl">
              <div className="bob shrink-0" style={{ width: 210, height: 210, borderRadius: "50%", backgroundImage: `url(${sel.img})`, backgroundSize: "cover", backgroundPosition: "center", border: `4px solid ${sel.color}`, boxShadow: `0 0 60px ${sel.color}66` }} />
              <div className="text-center md:text-left flex-1">
                <div className="text-5xl md:text-7xl gold-text leading-none" style={{ fontFamily: "var(--font-display)" }}>{sel.name}</div>
                <div className="text-white/60 text-lg mt-3">{sel.desc}</div>
                <div className="text-sm text-[#8aa53a] mt-2 tracking-wider" style={{ fontFamily: "var(--font-display)" }}>START WEAPON · {weaponName(sel.startWeapon)}</div>
                <div className="flex flex-col gap-2.5 mt-6 max-w-sm mx-auto md:mx-0">
                  <StatBar label="HP" v={sel.hp} max={160} color="#39d98a" />
                  <StatBar label="SPEED" v={sel.speed} max={190} color="#7fe9ff" />
                  <StatBar label="PICKUP" v={sel.pickup} max={200} color="#a06bff" />
                </div>
              </div>
            </div>

            {/* roster — large avatars, generous spacing */}
            <div className="flex flex-wrap justify-center gap-6 md:gap-9 mt-14">
              {CHARACTERS.map((c) => (
                <button key={c.id} onClick={() => { getSfx().click(); setCharId(c.id); }} className={`roster-pick ${charId === c.id ? "on" : ""}`} title={c.name} aria-label={c.name}>
                  <span style={{ display: "block", width: 100, height: 100, borderRadius: "50%", backgroundImage: `url(${c.img})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                </button>
              ))}
            </div>

            <button onClick={() => startGame(charId)} className="menu-btn mt-20" style={{ minWidth: 340, fontSize: 26 }}>DEPLOY ⚔</button>

            {/* footer */}
            <div className="flex flex-col items-center gap-10 mt-auto pt-24">
              <div className="hud-card px-10 py-2.5 text-3xl gold-text" style={{ fontFamily: "var(--font-display)" }}>{TICKER}</div>
              <CADisplay />
              <div className="flex items-center gap-8">
                <a href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Follow on X" className="hud-btn" style={{ width: 52, height: 52 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                </a>
                <MusicToggle engine={engineRef} />
              </div>
            </div>
          </div>
        );
      })()}
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
    <div className="flex flex-col items-center gap-4">
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
      {/* Pump Fun + DexScreener always shown; links carry the CA variable (auto-fills on launch) */}
      <div className="flex gap-4">
        <a href={PUMP_URL + CA} target="_blank" rel="noopener noreferrer" className="hud-card px-5 py-2.5 text-sm flex items-center gap-2 hover:brightness-125" style={{ color: "#39d98a", fontWeight: 700 }}>💊 Pump Fun</a>
        <a href={DEX_URL + CA} target="_blank" rel="noopener noreferrer" className="hud-card px-5 py-2.5 text-sm flex items-center gap-2 hover:brightness-125" style={{ color: "#7fe9ff", fontWeight: 700 }}>📈 DexScreener</a>
      </div>
    </div>
  );
}

function StatBar({ label, v, max, color }: { label: string; v: number; max: number; color: string }) {
  const pct = Math.max(8, Math.min(100, (v / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] tracking-wider text-white/45 w-16 text-right" style={{ fontFamily: "var(--font-display)" }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(20,26,14,0.85)", border: "1px solid #2a3320" }}>
        <div style={{ width: pct + "%", height: "100%", background: color, transition: "width 0.2s" }} />
      </div>
    </div>
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
