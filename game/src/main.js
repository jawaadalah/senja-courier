// main.js: the game loop — title, flying, landing, crash and the final
// delivery. Fixed-step simulation, requestAnimationFrame rendering, and
// a ?shot= mode that stages one deterministic scene for screenshots.
import { VIEW, STEP, WORLD } from './config.js';
import { MISSIONS, missionRings, windAt } from './missions.js';
import { createPlane, updatePlane, landingScore } from './plane.js';
import { stripAt, terrainHeightAt } from './terrain.js';
import { createInput, bindControls, readControls } from './input.js';
import { drawSky, drawSea, drawTerrain, drawRunway, drawRings, drawPlane, worldToScreen } from './render.js';
import { drawHud, drawTitle, drawEndScreen } from './hud.js';
import { ensureAudio, setEngineSound, setMuted, playRingChime, playLandingThud, playCrashSound } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

export function createWorld() {
  return {
    screen: 'title', plane: createPlane(), missionIndex: 0,
    mission: MISSIONS[0], rings: missionRings(MISSIONS[0]),
    score: 0, best: 0, time: 0, message: null,
    camera: { x: 0, y: 0 }, landedTimer: 0, legScore: 0,
  };
}

const world = createWorld();
const input = createInput();
bindControls(input, canvas, null);

function resetLeg(world, index) {
  const mission = MISSIONS[index];
  world.missionIndex = index;
  world.mission = mission;
  world.rings = missionRings(mission);
  const start = index === 0 ? 400 : MISSIONS[index - 1].dest;
  world.plane = createPlane();
  world.plane.x = start;
  world.plane.alt = terrainHeightAt(start);
  world.plane.onGround = true;
  world.screen = 'fly';
  world.landedTimer = 0;
  world.legScore = 0;
  showMessage(world, `${mission.name} — ${mission.brief}`, '#fff3d6', 4);
}

function showMessage(world, text, colour, seconds) {
  world.message = { text, colour: colour || '#ffd25e', until: world.time + seconds };
}

function updateCamera(world) {
  const plane = world.plane;
  const targetX = Math.max(0, Math.min(WORLD.length - VIEW.width, plane.x - 420));
  world.camera.x += (targetX - world.camera.x) * 0.12;
  const targetY = Math.max(-80, Math.min(320, plane.alt - 270));
  world.camera.y += (targetY - world.camera.y) * 0.08;
}

export function stepWorld(world, dt, pitch, throttle, idle) {
  world.time += dt;
  if (world.screen !== 'fly') return;
  const wind = windAt(world.mission, world.time);
  const event = updatePlane(world.plane, dt, pitch, throttle, wind, world.rings);
  updateCamera(world);
  if (event === 'ring') {
    world.score += 250;
    world.legScore += 250;
    playRingChime();
    showMessage(world, 'RING +250', '#ffd25e', 1.6);
  } else if (event === 'landed') {
    const strip = stripAt(world.plane.x);
    const bonus = landingScore(world.plane, strip);
    const fuelBonus = Math.round(world.plane.fuel * 4);
    world.score += bonus + fuelBonus;
    world.legScore += bonus + fuelBonus;
    playLandingThud();
    showMessage(world, `LANDED! +${bonus}  ·  fuel bonus +${fuelBonus}`, '#7ddb8a', 3);
    world.screen = 'landed';
    world.landedTimer = 2.6;
  } else if (event === 'crashed') {
    playCrashSound();
    world.screen = 'crashed';
    if (world.score > world.best) world.best = world.score;
  } else if (event === 'bounced') {
    showMessage(world, 'Hard touchdown — watch the descent!', '#ff9a7a', 1.8);
  }
  if (world.plane.fuel <= 0 && !world.message) {
    showMessage(world, 'FUEL EMPTY — gliding on fumes', '#ff5d5d', 2);
  }
}

function render(world) {
  const sky = world.mission.sky;
  drawSky(ctx, sky, world.time);
  drawSea(ctx, world.camera);
  drawTerrain(ctx, world.camera, world.time);
  drawRunway(ctx, world.camera);
  drawRings(ctx, world.camera, world.rings);
  drawPlane(ctx, world.camera, world.plane, world.time);
  const ringsLeft = world.rings.filter((r) => !r.taken).length;
  drawHud(ctx, world.plane, world.mission, world.score, ringsLeft, world.message, world.time);
  if (world.screen === 'title') drawTitle(ctx, world.score, world.best, world.time);
  if (world.screen === 'crashed') {
    drawEndScreen(ctx, 'PESAWAT JATUH', [
      'The courier went down in the dusk.',
      'Throttle discipline keeps a sortie alive —',
      'slow flight sinks, and the ground is patient.',
    ], world.score);
  }
  if (world.screen === 'done') {
    drawEndScreen(ctx, 'SEMUA PAKET TERKIRIM!', [
      'Three legs, three landings, the mail is home.',
      'The islands sleep; the courier flies again tomorrow.',
    ], world.score);
  }
  if (world.screen === 'landed') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3d6';
    ctx.font = 'bold 30px sans-serif';
    const next = world.missionIndex + 1 < MISSIONS.length ? MISSIONS[world.missionIndex + 1].name : 'route complete';
    ctx.fillText(`Leg complete — ${next} next`, VIEW.width / 2, 250);
    ctx.textAlign = 'left';
  }
}

function handleButtons(world) {
  if (input.clicked) {
    const { x, y } = input.clicked;
    input.clicked = null;
    ensureAudio();
    if (world.screen === 'title' && y > 180) {
      resetLeg(world, 0);
      world.score = 0;
      return;
    }
    if ((world.screen === 'crashed' || world.screen === 'done') && y > 180) {
      resetLeg(world, 0);
      world.score = 0;
    }
  }
  // Mouse drag on the throttle slider sets the throttle directly.
  if (input.throttleDrag && world.screen === 'fly') {
    const d = input.throttleDrag;
    if (d.x > VIEW.width - 316 && d.y > VIEW.height - 96) {
      world.plane.throttle = Math.max(0, Math.min(1, (d.x - (VIEW.width - 302)) / 272));
    }
  }
}

let last = 0;
let accumulator = 0;
function frame(timestamp) {
  const now = timestamp / 1000;
  const dt = Math.min(0.1, last ? now - last : STEP);
  last = now;
  readControls(input);
  handleButtons(input);
  setMuted(input.muted);
  if (world.screen === 'title' && input.pressedEnter) {
    ensureAudio();
    resetLeg(world, 0);
    world.score = 0;
  }
  if ((world.screen === 'crashed' || world.screen === 'done') && input.pressedRestart) {
    resetLeg(world, 0);
    world.score = 0;
  }
  if (world.screen === 'fly' && input.pressedPause) {
    showMessage(world, 'PAUSED — press P to fly on', '#fff3d6', 999);
  }
  if (world.screen === 'landed') {
    world.landedTimer -= dt;
    if (world.landedTimer <= 0) {
      if (world.missionIndex + 1 < MISSIONS.length) resetLeg(world, world.missionIndex + 1);
      else {
        world.screen = 'done';
        if (world.score > world.best) world.best = world.score;
      }
    }
  }
  if (world.screen === 'fly') {
    accumulator += dt;
    while (accumulator >= STEP) {
      stepWorld(world, STEP, input.pitch, input.throttle, false);
      accumulator -= STEP;
    }
    setEngineSound(world.plane.throttle, true);
  } else {
    setEngineSound(0, false);
  }
  render(world);
  requestAnimationFrame(frame);
}

// Screenshot mode: ?shot=start|play|ring|land — one deterministic scene.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const staged = stageShot(shot, { reset: (leg) => { Object.assign(world, createWorld()); resetLeg(world, 0); }, step: (dt, p, t, idle) => stepWorld(world, dt, p, t, idle), state: world });
  // stageShot drives world through its own reset/step; re-render the staged frame.
  world.screen = staged.screen === 'title' ? 'title' : world.screen;
  updateCamera(world);
  render(world);
  window.__shotReady = true;
} else {
  requestAnimationFrame(frame);
}
