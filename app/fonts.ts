import { Black_Ops_One, Rajdhani } from "next/font/google";

// Trench Survivors identity — military stencil display + condensed techy UI.
// Deliberately distinct from the other hub games (no Press Start 2P / Bungee here).
export const display = Black_Ops_One({ subsets: ["latin"], weight: "400", variable: "--font-display" });
export const ui = Rajdhani({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-ui" });
