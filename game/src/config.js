// Senja Courier — a dusk island-courier flight game.
// config.js: every tunable number of the game in one place.
export const VIEW = { width: 1280, height: 800 };
export const WORLD = { length: 12000, seaLevel: 0 };
export const PLANE = {
  maxSpeed: 380,        // px/s at full throttle
  stallSpeed: 110,      // below this the plane sinks
  thrustAccel: 70,      // px/s^2 toward throttle speed
  drag: 22,             // px/s^2 bleed when throttle is low
  pitchRate: 1.5,       // rad/s the pilot can pitch
  climbPenalty: 0.9,    // sink factor while slow
  fuelBurnIdle: 0.15,   // fuel/s at throttle 0
  fuelBurnFull: 0.9,    // extra fuel/s at throttle 1
  startFuel: 100,
  maxDamage: 100,
  safeLandingSpeed: 230,
  safeDescent: 95,      // px/s vertical speed allowed on touchdown
};
export const RING = { radius: 58, score: 250 };
export const STRIP = { width: 460, score: 500 };
export const SCORE = { ring: 250, landing: 500, fuelBonusPerUnit: 4, timeBonusPerSecond: 2 };
export const STEP = 1 / 60;
export const SHOTS = ['start', 'play', 'ring', 'land'];
