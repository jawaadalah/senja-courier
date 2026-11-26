// plane.js: the courier aircraft and its arcade flight model.
// Throttle sets speed, pitch sets climb; slow flight sinks, so throttle
// discipline is what keeps a sortie alive. Fuel burns with throttle,
// damage comes from hard ground contact.
import { PLANE, RING, STRIP, SCORE } from './config.js';
import { terrainHeightAt, stripAt } from './terrain.js';

export function createPlane() {
  return {
    x: 400, alt: 92, speed: 0, pitch: 0,
    throttle: 0.55, fuel: PLANE.startFuel, damage: 0,
    onGround: true, crashed: false, landed: false,
    verticalSpeed: 0, propAngle: 0,
  };
}

/**
 * Advance the plane one step. Returns an event string: 'ring' when a ring
 * is flown through (handled by missions), 'landed', 'crashed', or ''.
 * `pitchInput` is -1 (nose down), 0 or 1 (nose up); `throttleInput` the same.
 */
export function updatePlane(plane, dt, pitchInput, throttleInput, wind, rings) {
  if (plane.crashed || plane.landed) return '';
  const prevAlt = plane.alt;
  plane.throttle = Math.max(0, Math.min(1, plane.throttle + throttleInput * dt * 0.9));
  plane.pitch += pitchInput * PLANE.pitchRate * dt;
  plane.pitch = Math.max(-0.6, Math.min(0.6, plane.pitch));
  if (Math.abs(pitchInput) < 0.01) plane.pitch *= Math.max(0, 1 - dt * 1.4);

  const targetSpeed = plane.throttle * PLANE.maxSpeed;
  const accel = targetSpeed > plane.speed ? PLANE.thrustAccel : PLANE.drag;
  plane.speed += Math.sign(targetSpeed - plane.speed) * Math.min(Math.abs(targetSpeed - plane.speed), accel * dt);
  plane.speed = Math.max(0, plane.speed);

  const sink = Math.max(0, PLANE.stallSpeed - plane.speed) * PLANE.climbPenalty;
  plane.verticalSpeed = plane.speed * Math.sin(plane.pitch) - sink;
  plane.x += (plane.speed * Math.cos(plane.pitch) + wind) * dt;
  plane.alt += plane.verticalSpeed * dt;
  plane.propAngle += (2 + plane.throttle * 26) * dt;
  plane.fuel = Math.max(0, plane.fuel - (PLANE.fuelBurnIdle + plane.throttle * PLANE.fuelBurnFull) * dt);
  if (plane.fuel <= 0) plane.throttle = Math.max(plane.throttle, 0.12);

  // Ring pickup: close enough to a ring centre counts, once per ring.
  for (const ring of rings) {
    if (ring.taken) continue;
    const dx = plane.x - ring.x, dy = plane.alt - ring.y;
    if (dx * dx + dy * dy < RING.radius * RING.radius) {
      ring.taken = true;
      return 'ring';
    }
  }

  // Ground contact: runway landing, soft field landing, or a crash.
  // A plane settled on the runway (onGround) just rolls; anything arriving
  // from the air is judged as a landing or a crash.
  const ground = terrainHeightAt(plane.x);
  if (plane.alt > ground + 1) plane.onGround = false;
  if (plane.alt <= ground) {
    plane.alt = ground;
    if (plane.onGround) {
      plane.verticalSpeed = 0;
      return '';
    }
    const strip = stripAt(plane.x);
    const gentle = Math.abs(plane.verticalSpeed) < PLANE.safeDescent && plane.speed < PLANE.safeLandingSpeed;
    if (strip && gentle && Math.abs(plane.pitch) < 0.35) {
      plane.landed = true;
      plane.onGround = true;
      plane.speed = Math.max(0, plane.speed - 120 * dt);
      return 'landed';
    }
    const impact = Math.abs(plane.verticalSpeed) + Math.max(0, plane.speed - 160) * 0.4;
    plane.damage = Math.min(PLANE.maxDamage, plane.damage + Math.max(18, impact * 0.9));
    if (plane.damage >= PLANE.maxDamage || impact > 120) {
      plane.crashed = true;
      return 'crashed';
    }
    plane.alt = ground + 2;
    plane.verticalSpeed = Math.abs(plane.verticalSpeed) * 0.3;
    plane.speed *= 0.55;
    return 'bounced';
  }
  return '';
}

/** Landing bonus: soft touchdown near the strip centre pays best. */
export function landingScore(plane, strip) {
  const centre = 1 - Math.min(1, Math.abs(plane.x - strip.centre) / strip.halfWidth);
  const soft = 1 - Math.min(1, Math.abs(plane.verticalSpeed) / PLANE.safeDescent);
  return Math.round(SCORE.landing * (0.5 + 0.5 * centre) * (0.6 + 0.4 * soft));
}
