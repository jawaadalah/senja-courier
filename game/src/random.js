// random.js: a tiny seeded generator so the same seed always builds the same islands,
// the same clouds and the same mission rings. No Math.random anywhere in the world.
export function mulberry32Seed(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A deterministic 1-D value-noise: smooth hills from a seed, no per-frame randomness. */
export function hillNoise(seed, x, wavelength, amplitude) {
  const r = mulberry32Seed(seed);
  const knots = [];
  const count = Math.ceil(WORLD_LENGTH_HINT / wavelength) + 2;
  for (let i = 0; i < count; i += 1) knots.push(r() * 2 - 1);
  const t = x / wavelength;
  const i = Math.floor(t);
  const f = t - i;
  const smooth = f * f * (3 - 2 * f);
  const a = knots[Math.max(0, Math.min(knots.length - 1, i))];
  const b = knots[Math.max(0, Math.min(knots.length - 1, i + 1))];
  return (a + (b - a) * smooth) * amplitude;
}
const WORLD_LENGTH_HINT = 13000;
