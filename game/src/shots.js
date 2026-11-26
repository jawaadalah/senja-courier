// shots.js: the four screenshot scenes. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so every frame is what a short game really looks like
// and the same seed always gives the same frame.
import { STEP } from './config.js';
import { nextWaypoint } from './missions.js';
import { terrainHeightAt } from './terrain.js';

const SAMPLE = 1 / 30;

/** Steer toward the next waypoint: pitch to hold a glide path, throttle to hold speed. */
export function autopilotFly(state) {
  const plane = state.plane;
  const target = nextWaypoint(state.mission, state.rings);
  const dx = target.x - plane.x;
  const dy = target.y - plane.alt;
  const wantPitch = Math.max(-0.45, Math.min(0.45, Math.atan2(dy, Math.max(60, dx)) * 0.9));
  const groundAhead = terrainHeightAt(plane.x + 260);
  const clearance = plane.alt - groundAhead;
  let pitch = 0;
  if (clearance < 70) pitch = 1;
  else if (plane.pitch < wantPitch - 0.06) pitch = 1;
  else if (plane.pitch > wantPitch + 0.06) pitch = -1;
  let throttle = 0;
  if (plane.speed < 250) throttle = 1;
  else if (plane.speed > 300) throttle = -1;
  // Final approach (no ring left): glide to the destination strip's own
  // ground height, and commit to the descent once over the strip.
  if (!target.ring) {
    const stripGround = terrainHeightAt(state.mission.dest);
    const wantAlt = dx < 150 ? stripGround - 8 : stripGround + 20 + Math.max(0, dx) * 0.10;
    const glidePitch = Math.max(-0.35, Math.min(0.3, -(plane.alt - wantAlt) * 0.006));
    pitch = plane.pitch < glidePitch - 0.05 ? 1 : plane.pitch > glidePitch + 0.05 ? -1 : 0;
    // Commit: once over the strip, hold a gentle nose-down attitude until
    // the wheels touch — the glide deadband would otherwise level the
    // plane off just above the runway.
    if (dx < 150) pitch = plane.pitch > -0.25 ? -1 : 0;
    if (dx < 500) throttle = -1;
    else if (plane.speed > 210) throttle = -1;
    else if (plane.speed < 190) throttle = 1;
    else throttle = 0;
  }
  return { pitch, throttle };
}

/**
 * Set the world to the named scene (start, play, ring or land) and return
 * the screen to draw and the best score to show.
 */
export function stageShot(name, world) {
  world.reset(1);
  if (name === 'start') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, 0, -1, true);
    return { screen: 'title', best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < 15 / STEP; i += 1) {
      const c = autopilotFly(world.state);
      world.step(STEP, c.pitch, c.throttle, false);
      if (world.state.screen !== 'fly') break;
    }
    return { screen: 'fly', best: world.state.score };
  }
  if (name === 'ring') {
    // Fly until the first ring is just ahead of the nose, so the frame
    // shows the plane and the gold ring it is about to thread.
    for (let i = 0; i < 60 / STEP; i += 1) {
      const c = autopilotFly(world.state);
      world.step(STEP, c.pitch, c.throttle, false);
      const ring = world.state.rings[0];
      const dx = ring.x - world.state.plane.x;
      const dy = ring.y - world.state.plane.alt;
      if (dx > 0 && dx < 220 && Math.abs(dy) < 120) break;
      if (world.state.screen !== 'fly') break;
    }
    return { screen: 'fly', best: world.state.score };
  }
  // land: fly the whole first leg on autopilot until touchdown.
  for (let i = 0; i < 240 / STEP; i += 1) {
    const c = autopilotFly(world.state);
    world.step(STEP, c.pitch, c.throttle, false);
    if (world.state.screen !== 'fly') break;
  }
  return { screen: world.state.screen, best: world.state.score };
}
