import type { Metadata } from "next";
import "./globals.css";
import { SolanaProviders } from "./providers";
import { TICKER, TOKEN_NAME } from "./config";

export const metadata: Metadata = {
  title: TICKER,
  description: `${TOKEN_NAME} — a top-down trench survival roguelite on Solana. Survive the jeeters, farm the bag.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SolanaProviders>{children}</SolanaProviders>
      </body>
    </html>
  );
}
