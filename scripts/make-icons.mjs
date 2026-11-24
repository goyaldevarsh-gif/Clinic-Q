import sharp from 'sharp';
function icon(size, pad, round) {
  const w = size * (1 - pad * 2), o = (size - w) / 2, k = w / 64;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3A86C8"/><stop offset="1" stop-color="#1E5D94"/></linearGradient></defs>
  <rect width="${size}" height="${size}" ${round ? `rx="${size * 0.22}"` : ''} fill="url(#g)"/>
  <g transform="translate(${o} ${o}) scale(${k})" fill="none" stroke-linecap="round">
    <rect x="8" y="12" width="48" height="44" rx="10" stroke="#fff" stroke-width="5"/>
    <path d="M8 26h48" stroke="#fff" stroke-width="5"/><path d="M21 6v12M43 6v12" stroke="#fff" stroke-width="5"/>
    <path d="M32 33v16M24 41h16" stroke="#7FE8DE" stroke-width="5"/></g></svg>`);
}
await sharp(icon(192, 0.2, true)).png().toFile('public/icon-192.png');
await sharp(icon(512, 0.2, true)).png().toFile('public/icon-512.png');
await sharp(icon(512, 0.3, false)).png().toFile('public/icon-maskable-512.png');
console.log('icons done');
