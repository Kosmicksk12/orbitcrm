// Regenera los PNG e ICO de la marca a partir de design/icon-source.svg y
// design/icon-maskable-source.svg. Correr con: node scripts/gen-brand-icons.mjs
//
// Los archivos de public/icons/ llevan un sufijo de versión (-r2, -r3, ...).
// Al cambiar la marca hay que subir ese número y actualizar las referencias en
// public/manifest.webmanifest y app/layout.tsx — así el navegador y el sistema
// operativo bajan íconos nuevos en vez de servir el viejo desde caché.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const REV = "r2";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rounded = await readFile(join(root, "design/icon-source.svg"));
const square = await readFile(join(root, "design/icon-maskable-source.svg"));

const png = (svg, size) =>
  sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

const jobs = [
  [`public/icons/favicon-16.png`, rounded, 16],
  [`public/icons/favicon-32.png`, rounded, 32],
  [`public/icons/icon-${REV}-192.png`, rounded, 192],
  [`public/icons/icon-${REV}-512.png`, rounded, 512],
  [`public/icons/icon-maskable-${REV}-192.png`, square, 192],
  [`public/icons/icon-maskable-${REV}-512.png`, square, 512],
  [`public/icons/apple-touch-icon-${REV}.png`, square, 180],
];

for (const [rel, svg, size] of jobs) {
  await writeFile(join(root, rel), await png(svg, size));
  console.log("wrote", rel, `(${size}px)`);
}

// favicon.ico = contenedor ICO con dos PNG (16 y 32)
const ico16 = await png(rounded, 16);
const ico32 = await png(rounded, 32);
const entries = [
  { size: 16, buf: ico16 },
  { size: 32, buf: ico32 },
];
const header = Buffer.alloc(6 + 16 * entries.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(entries.length, 4);
let offset = header.length;
entries.forEach((e, i) => {
  const p = 6 + i * 16;
  header.writeUInt8(e.size === 256 ? 0 : e.size, p);
  header.writeUInt8(e.size === 256 ? 0 : e.size, p + 1);
  header.writeUInt8(0, p + 2);
  header.writeUInt8(0, p + 3);
  header.writeUInt16LE(1, p + 4);
  header.writeUInt16LE(32, p + 6);
  header.writeUInt32LE(e.buf.length, p + 8);
  header.writeUInt32LE(offset, p + 12);
  offset += e.buf.length;
});
await writeFile(
  join(root, "public/favicon.ico"),
  Buffer.concat([header, ...entries.map((e) => e.buf)])
);
console.log("wrote public/favicon.ico (16 + 32)");
