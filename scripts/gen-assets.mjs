import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Hand-authored key art: a meme cat-soldier in the trenches. Rasterized to
// favicon (square, face dominates so it reads small) + a blurred menu background.
const ART = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <radialGradient id="sky" cx="50%" cy="30%" r="80%">
      <stop offset="0%" stop-color="#3a4a1e"/><stop offset="55%" stop-color="#1a2410"/><stop offset="100%" stop-color="#080a06"/>
    </radialGradient>
    <radialGradient id="boom" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#d6ff7a"/><stop offset="60%" stop-color="#7aa53a"/><stop offset="100%" stop-color="rgba(122,165,58,0)"/>
    </radialGradient>
  </defs>
  <rect width="600" height="600" fill="url(#sky)"/>
  <!-- distant explosions -->
  <circle cx="120" cy="150" r="70" fill="url(#boom)" opacity="0.8"/>
  <circle cx="470" cy="120" r="55" fill="url(#boom)" opacity="0.7"/>
  <!-- enemy swarm silhouettes -->
  <g fill="#e6356f" opacity="0.9">
    <circle cx="80" cy="300" r="16"/><circle cx="150" cy="330" r="13"/><circle cx="520" cy="300" r="16"/><circle cx="455" cy="335" r="12"/><circle cx="40" cy="250" r="11"/><circle cx="560" cy="250" r="11"/>
  </g>
  <!-- trench mound -->
  <path d="M0 470 Q150 410 300 460 Q450 410 600 470 L600 600 L0 600 Z" fill="#1c2412"/>
  <path d="M0 500 Q150 450 300 495 Q450 450 600 500 L600 600 L0 600 Z" fill="#141a0d"/>
  <!-- $ bags -->
  <g fill="#f5c542">
    <path d="M90 510 l16 -20 l16 20 l-16 20 z"/><path d="M470 520 l14 -18 l14 18 l-14 18 z"/><path d="M300 540 l13 -16 l13 16 l-13 16 z"/>
  </g>
  <g font-family="monospace" font-size="16" fill="#0b0d08" font-weight="bold" text-anchor="middle">
    <text x="106" y="516">$</text><text x="484" y="525">$</text><text x="313" y="545">$</text>
  </g>
  <!-- cat soldier (center, dominates for favicon) -->
  <g transform="translate(300 300)">
    <ellipse cx="0" cy="150" rx="140" ry="40" fill="rgba(0,0,0,0.45)"/>
    <circle cx="0" cy="0" r="130" fill="#f1c27d"/>
    <path d="M-92 -66 L-120 -170 L-38 -104 Z" fill="#f1c27d"/>
    <path d="M92 -66 L120 -170 L38 -104 Z" fill="#f1c27d"/>
    <path d="M-92 -66 L-110 -132 L-58 -96 Z" fill="#e0a85a"/>
    <path d="M92 -66 L110 -132 L58 -96 Z" fill="#e0a85a"/>
    <!-- eyes -->
    <circle cx="-44" cy="-8" r="18" fill="#241a10"/><circle cx="44" cy="-8" r="18" fill="#241a10"/>
    <circle cx="-38" cy="-14" r="6" fill="#fff"/><circle cx="50" cy="-14" r="6" fill="#fff"/>
    <!-- nose + mouth -->
    <circle cx="0" cy="40" r="15" fill="#3a2a1a"/>
    <path d="M0 48 L0 70 M0 64 Q-26 76 -40 62 M0 64 Q26 76 40 62" stroke="#3a2a1a" stroke-width="6" fill="none" stroke-linecap="round"/>
    <!-- whiskers -->
    <g stroke="#241a10" stroke-width="4" stroke-linecap="round">
      <path d="M-120 24 L-50 36"/><path d="M-122 50 L-50 52"/><path d="M120 24 L50 36"/><path d="M122 50 L50 52"/>
    </g>
    <!-- helmet -->
    <path d="M-140 -20 A140 140 0 0 1 140 -20 Z" fill="#3c4a2e"/>
    <rect x="-144" y="-28" width="288" height="26" rx="8" fill="#4f6138"/>
    <circle cx="0" cy="-92" r="12" fill="#2f3a22"/>
  </g>
</svg>`;

async function main() {
  const buf = Buffer.from(ART);
  await sharp(buf).resize(256, 256).png({ compressionLevel: 9 }).toFile(join(root, "app/icon.png"));
  await sharp(buf).resize(180, 180).png({ compressionLevel: 9 }).toFile(join(root, "app/apple-icon.png"));
  await sharp(buf).resize(1400, 1400, { fit: "cover" }).blur(30).modulate({ brightness: 0.62, saturation: 1.04 }).jpeg({ quality: 78 }).toFile(join(root, "public/bg-blur.jpg"));
  console.log("assets: app/icon.png, app/apple-icon.png, public/bg-blur.jpg");
}
main().catch((e) => { console.error(e); process.exit(1); });
