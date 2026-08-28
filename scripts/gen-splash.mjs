// Regenera las pantallas de arranque (apple-touch-startup-image) de
// public/splash/ a partir de design/icon-source.svg.
//
// Cada PNG es el fondo sólido de la marca (#F1F3F9, = background_color del
// manifest) con la "D" centrada — sin texto, igual que una launch screen de
// iOS. Correr con: node scripts/gen-splash.mjs
//
// Los archivos llevan un sufijo de versión (-r2, -r3, ...) porque
// public/splash/ va con Cache-Control immutable (un año) y el sistema
// operativo congela estos assets al instalar la PWA. Al cambiar la marca hay
// que subir SPLASH_REV y actualizar las referencias en app/layout.tsx para
// que un teléfono ya instalado baje las nuevas.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const SPLASH_REV = "r2";
const BG = "#F1F3F9";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mark = await readFile(join(root, "design/icon-source.svg"));

// device -> [ancho, alto] en píxeles físicos: los mismos que espera cada
// media query de <link rel="apple-touch-startup-image"> en app/layout.tsx.
const devices = [
  ["iphone-15-14-pro-max", 1290, 2796],
  ["iphone-15-14-pro", 1179, 2556],
  ["iphone-14-plus-13-pro-max", 1284, 2778],
  ["iphone-14-13-12", 1170, 2532],
  ["iphone-11-pro-max-xs-max", 1242, 2688],
  ["iphone-11-xr", 828, 1792],
  ["iphone-se-8-7", 750, 1334],
];

for (const [name, w, h] of devices) {
  // Icono ≈ 20% del lado corto (el ancho, en retrato), redondeado a par.
  const icon = Math.round((Math.min(w, h) * 0.2) / 2) * 2;
  const iconPng = await sharp(mark, { density: 384 }).resize(icon, icon).png().toBuffer();

  const rel = `public/splash/${name}-${SPLASH_REV}.png`;
  await sharp({ create: { width: w, height: h, channels: 4, background: BG } })
    .composite([{ input: iconPng, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(join(root, rel));
  console.log("wrote", rel, `(${w}x${h}, icono ${icon}px)`);
}
