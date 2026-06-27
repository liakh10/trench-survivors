import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public/trenchers");
mkdirSync(out, { recursive: true });

// Real trencher PFPs → unified circular avatars (kept close to the original visual).
const SRC = "/Users/artem/Desktop";
const LIST = [
  { id: "cupsey", file: "Cupsey.jpg" },
  { id: "t9ndra", file: "t9ndra.jpg" },
  { id: "donutt", file: "Donuttcrypto.png" },
  { id: "cented", file: "cented.jpg" },
  { id: "decu",   file: "Decu.jpg" },
];

const S = 256;
// circular mask + a subtle baked vignette ring so they read as one set
const mask = Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="#fff"/></svg>`);
const vignette = Buffer.from(`<svg width="${S}" height="${S}"><defs><radialGradient id="v" cx="50%" cy="46%" r="55%"><stop offset="62%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.5)"/></radialGradient></defs><circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" fill="url(#v)"/></svg>`);

async function main() {
  for (const t of LIST) {
    await sharp(join(SRC, t.file))
      .resize(S, S, { fit: "cover", position: "attention" }) // focus on the salient region
      .composite([{ input: vignette, blend: "over" }, { input: mask, blend: "dest-in" }])
      .png({ compressionLevel: 9 })
      .toFile(join(out, `${t.id}.png`));
    console.log("avatar:", t.id);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
