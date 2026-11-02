import sharp from "sharp";
import { mkdirSync } from "node:fs";

const outDir = "public/icons";
mkdirSync(outDir, { recursive: true });

const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)"/>
  <path d="M256 110 L298 214 L402 256 L298 298 L256 402 L214 298 L110 256 L214 214 Z" fill="#ffffff"/>
</svg>`;

// Maskable: full-bleed gradient background, spark kept inside the safe zone (~60%).
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c3aed"/>
      <stop offset="1" stop-color="#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#g2)"/>
  <path d="M256 168 L284 244 L360 256 L284 268 L256 344 L228 268 L152 256 L228 244 Z" fill="#ffffff"/>
</svg>`;

const jobs = [
  { svg: normalSvg, size: 192, file: "icon-192.png" },
  { svg: normalSvg, size: 512, file: "icon-512.png" },
  { svg: maskableSvg, size: 512, file: "icon-maskable-512.png" },
  { svg: normalSvg, size: 180, file: "apple-touch-icon.png" },
];

for (const job of jobs) {
  await sharp(Buffer.from(job.svg)).resize(job.size, job.size).png().toFile(`${outDir}/${job.file}`);
  console.log("wrote", job.file);
}

// favicon (small, from normal svg)
await sharp(Buffer.from(normalSvg)).resize(64, 64).png().toFile("public/favicon.png");
console.log("wrote favicon.png");
