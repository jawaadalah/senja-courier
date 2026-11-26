// terrain.js: the dusk archipelago. Four islands, each with a flat airstrip;
// the sea between them. Height is pure function of x (plus a fixed seed),
// so the ground never moves between runs.
import { WORLD } from './config.js';
import { hillNoise } from './random.js';

export const ISLANDS = [
  { name: 'Pulau Landas', centre: 400,  halfWidth: 700, height: 96,  strip: true,  palms: 5, village: 6 },
  { name: 'Pulau Karang', centre: 4200, halfWidth: 640, height: 128, strip: true,  palms: 7, village: 9 },
  { name: 'Pulau Lentera', centre: 7800, halfWidth: 660, height: 110, strip: true,  palms: 4, village: 12, lighthouse: true },
  { name: 'Pulau Senja', centre: 11200, halfWidth: 760, height: 140, strip: true, palms: 9, village: 16 },
];
export const STRIPS = ISLANDS.filter((island) => island.strip).map((island) => ({
  island: island.name, centre: island.centre, halfWidth: 230,
}));

/** Island bump: a smooth dome that falls to the sea at its edges. */
function islandBump(x, island) {
  const d = (x - island.centre) / island.halfWidth;
  if (d <= -1 || d >= 1) return 0;
  const dome = Math.cos(d * Math.PI / 2);
  return dome * dome * island.height;
}

/** Ground height (px above the sea) at world x. Flat across each airstrip. */
export function terrainHeightAt(x) {
  for (const strip of STRIPS) {
    if (Math.abs(x - strip.centre) <= strip.halfWidth) {
      const island = ISLANDS.find((isle) => isle.centre === strip.centre);
      return island.height * 0.94;
    }
  }
  let height = 0;
  for (const island of ISLANDS) height += islandBump(x, island);
  height += hillNoise(7, x, 520, 26) + hillNoise(21, x, 190, 12);
  return Math.max(0, height);
}

/** The airstrip under world x, or null when the plane is not over one. */
export function stripAt(x) {
  for (const strip of STRIPS) {
    if (Math.abs(x - strip.centre) <= strip.halfWidth) return strip;
  }
  return null;
}

/** Seeded cloud puffs, fixed in the sky so screenshots are stable. */
export function cloudPuffs(seed, count) {
  const puffs = [];
  let s = seed;
  const next = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < count; i += 1) {
    puffs.push({
      x: next() * WORLD.length, y: 90 + next() * 260,
      w: 120 + next() * 260, h: 26 + next() * 42, speed: 4 + next() * 9,
    });
  }
  return puffs;
}
