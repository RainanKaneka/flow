// Mechanical asset export only: image_gen supplies the art and transparency.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const manifest = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
for (const asset of manifest.assets) {
  const output = path.resolve(asset.destination);
  await fs.mkdir(path.dirname(output), { recursive: true });
  const source = sharp(asset.source);
  const metadata = await source.metadata();
  if (asset.transparent && !metadata.hasAlpha) throw new Error(`Missing alpha: ${asset.id}`);
  await source.resize(asset.width, asset.height, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(output);
  console.log(`${asset.id}: ${asset.width}x${asset.height}, ${metadata.hasAlpha ? 'RGBA' : 'RGB'}`);
}
