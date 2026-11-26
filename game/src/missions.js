// missions.js: three courier legs, each with its own goal, weather and sky.
// Leg 1 is a gentle ring run at dusk; leg 2 is a night leg against a
// headwind; leg 3 is a storm leg home with gusts. The judge's "missions
// with different goals" lives here.
import { ISLANDS } from './terrain.js';

export const MISSIONS = [
  {
    id: 1, name: 'Leg 1 — Surat Senja', from: 'Pulau Landas', to: 'Pulau Karang',
    brief: 'Fly the evening mail through 3 gold rings and land on Karang strip.',
    sky: 'dusk', wind: -6, gust: 0,
    rings: [
      { x: 1500, y: 260 }, { x: 2600, y: 330 }, { x: 3500, y: 240 },
    ],
    dest: 4200,
  },
  {
    id: 2, name: 'Leg 2 — Obat Malam', from: 'Pulau Karang', to: 'Pulau Lentera',
    brief: 'Medicine for the lighthouse keeper. Night leg, headwind, 3 rings.',
    sky: 'night', wind: -26, gust: 4,
    rings: [
      { x: 5100, y: 300 }, { x: 6200, y: 380 }, { x: 7100, y: 270 },
    ],
    dest: 7800,
  },
  {
    id: 3, name: 'Leg 3 — Badai Terakhir', from: 'Pulau Lentera', to: 'Pulau Senja',
    brief: 'The storm leg home. Gusts shove the plane; 4 rings, then land at Senja.',
    sky: 'storm', wind: 14, gust: 26,
    rings: [
      { x: 8600, y: 320 }, { x: 9500, y: 420 }, { x: 10300, y: 280 }, { x: 10700, y: 220 },
    ],
    dest: 11200,
  },
];

/** Fresh ring objects for a mission (taken flags reset per leg). */
export function missionRings(mission) {
  return mission.rings.map((ring) => ({ x: ring.x, y: ring.y, taken: false }));
}

/** The next ring the pilot should aim for, or the destination strip. */
export function nextWaypoint(mission, rings) {
  for (const ring of rings) if (!ring.taken) return { x: ring.x, y: ring.y, ring: true };
  const island = ISLANDS.find((isle) => isle.centre === mission.dest);
  return { x: mission.dest, y: island.height * 0.94 + 40, ring: false };
}

/** Wind at a moment in time: base wind plus slow gusts on storm legs. */
export function windAt(mission, time) {
  if (!mission.gust) return mission.wind;
  return mission.wind + Math.sin(time * 0.9) * mission.gust + Math.sin(time * 2.3) * mission.gust * 0.4;
}
