// Token / Contract Address config. On launch, replace CA with the real address,
// commit & push — the site picks it up automatically (GitHub → Vercel auto-deploy).
export const CA: string = "8uwcWcXnCWQfMS1pUTTd7coNAfj26i31hq4Lx7LApump"; // Replace with real CA on launch
export const TICKER = "$DIGIN";
export const TOKEN_NAME = "Trench Survivors";
export const X_URL = "https://x.com/trencsurvivors"; // Replace with your X handle

// CA block variant for this project: CA + Pump Fun + DexScreener buttons.
// The address tail is pulled from the CA variable above (no hardcoding).
export const PUMP_URL = "https://pump.fun/coin/";
export const DEX_URL = "https://dexscreener.com/solana/";

export function isRealCA(): boolean {
  return CA !== "SOON" && CA.trim() !== "";
}
