// render.js: everything the pilot sees — dusk sky, sea, islands, runway,
// gold rings and the courier plane itself. One clear draw function per layer.
import { VIEW, WORLD } from './config.js';
import { terrainHeightAt, ISLANDS, STRIPS, cloudPuffs } from './terrain.js';

const SKIES = {
  dusk:  { top: '#2b1e4e', mid: '#b34a6b', low: '#ff9a56', sun: '#ffd9a0', sunY: 0.42 },
  night: { top: '#050914', mid: '#12233f', low: '#2c4a6b', sun: '#e8eef7', sunY: 0.24 },
  storm: { top: '#1c1a2e', mid: '#4a4460', low: '#8a6f7d', sun: '#c9b8a8', sunY: 0.55 },
};
const CLOUDS = cloudPuffs(11, 14);

/** World x/y to screen: camera follows the plane, y flipped (up is up). */
export function worldToScreen(camera, x, alt) {
  return { x: x - camera.x, y: VIEW.height - 150 - alt + camera.y };
}

export function drawSky(ctx, skyName, time) {
  const sky = SKIES[skyName] || SKIES.dusk;
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, sky.top);
  grad.addColorStop(0.55, sky.mid);
  grad.addColorStop(0.8, sky.low);
  grad.addColorStop(1, '#1a2233');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Sun low on the horizon (moon at night), with a soft halo.
  const sunX = VIEW.width * 0.78, sunY = VIEW.height * sky.sunY;
  const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 180);
  halo.addColorStop(0, sky.sun);
  halo.addColorStop(0.25, sky.sun + '55');
  halo.addColorStop(1, 'transparent');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 180, sunY - 180, 360, 360);
  ctx.fillStyle = sky.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, skyName === 'night' ? 26 : 44, 0, Math.PI * 2);
  ctx.fill();
  if (skyName === 'night') {
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i += 1) {
      const sx = (i * 173.3) % VIEW.width, sy = (i * 97.7) % 300;
      ctx.globalAlpha = 0.35 + ((i * 37) % 60) / 100;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
  }
  // Slow clouds drifting across the sky.
  ctx.fillStyle = 'rgba(255,220,200,0.16)';
  for (const cloud of CLOUDS) {
    const cx = ((cloud.x * 0.12 + time * cloud.speed) % (VIEW.width + 400)) - 200;
    ctx.beginPath();
    ctx.ellipse(cx, cloud.y * 0.55, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSea(ctx, camera) {
  const horizon = VIEW.height - 150 + camera.y;
  const grad = ctx.createLinearGradient(0, horizon, 0, VIEW.height);
  grad.addColorStop(0, '#e8836b');
  grad.addColorStop(0.35, '#7d4a63');
  grad.addColorStop(1, '#16233a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, horizon, VIEW.width, VIEW.height - horizon);
  ctx.strokeStyle = 'rgba(255,200,160,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    const y = horizon + 24 + i * 34;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 32) {
      const wave = Math.sin((x + camera.x * 0.7) * 0.02 + i * 1.7) * 4;
      if (x === 0) ctx.moveTo(x, y + wave); else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

export function drawTerrain(ctx, camera, time) {
  const horizon = VIEW.height - 150 + camera.y;
  ctx.beginPath();
  ctx.moveTo(0, VIEW.height);
  for (let x = 0; x <= VIEW.width; x += 8) {
    const wx = x + camera.x;
    const h = terrainHeightAt(wx);
    ctx.lineTo(x, horizon - h);
  }
  ctx.lineTo(VIEW.width, VIEW.height);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, horizon - 160, 0, VIEW.height);
  grad.addColorStop(0, '#3a2b4a');
  grad.addColorStop(0.5, '#241a30');
  grad.addColorStop(1, '#120e1c');
  ctx.fillStyle = grad;
  ctx.fill();
  // Rim light along the ridge, so the islands read against the sea.
  ctx.strokeStyle = 'rgba(255,170,110,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x <= VIEW.width; x += 8) {
    const wx = x + camera.x;
    const h = terrainHeightAt(wx);
    if (x === 0) ctx.moveTo(x, horizon - h); else ctx.lineTo(x, horizon - h);
  }
  ctx.stroke();
  drawIslandDetails(ctx, camera, horizon, time);
}

function drawIslandDetails(ctx, camera, horizon, time) {
  for (const island of ISLANDS) {
    const sx = island.centre - camera.x;
    if (sx < -800 || sx > VIEW.width + 800) continue;
    const groundY = horizon - island.height * 0.94;
    // Palm trees: trunk + five fronds, silhouetted against the dusk.
    for (let i = 0; i < island.palms; i += 1) {
      const px = sx - island.halfWidth * 0.7 + i * (island.halfWidth * 1.4 / Math.max(1, island.palms - 1));
      const py = horizon - terrainHeightAt(island.centre - island.halfWidth * 0.7 + i * (island.halfWidth * 1.4 / Math.max(1, island.palms - 1)));
      ctx.strokeStyle = '#160f22';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 6, py - 26, px + 14, py - 34); ctx.stroke();
      ctx.lineWidth = 3;
      for (let f = 0; f < 5; f += 1) {
        const a = -Math.PI * (0.15 + f * 0.18);
        ctx.beginPath(); ctx.moveTo(px + 14, py - 34);
        ctx.quadraticCurveTo(px + 14 + Math.cos(a) * 22, py - 34 + Math.sin(a) * 14, px + 14 + Math.cos(a) * 34, py - 34 + Math.sin(a) * 22 + 8);
        ctx.stroke();
      }
    }
    // Village windows: tiny warm lights.
    ctx.fillStyle = '#ffca7a';
    for (let v = 0; v < island.village; v += 1) {
      const vx = sx - island.halfWidth * 0.5 + v * 13;
      const vy = horizon - terrainHeightAt(island.centre - island.halfWidth * 0.5 + v * 13) - 8;
      if ((v * 7 + island.centre) % 3 === 0) ctx.fillRect(vx, vy, 4, 5);
    }
    // The lighthouse on Pulau Lentera, beam sweeping the dusk.
    if (island.lighthouse) {
      const lx = sx + 120, ly = groundY;
      ctx.fillStyle = '#e8ddc8';
      ctx.fillRect(lx - 7, ly - 64, 14, 64);
      ctx.fillStyle = '#c94f4f';
      ctx.fillRect(lx - 7, ly - 64, 14, 12);
      ctx.fillRect(lx - 7, ly - 34, 14, 10);
      const beam = (time / 2.4) % (Math.PI * 2);
      const beamGrad = ctx.createLinearGradient(lx, ly - 64, lx + Math.cos(beam) * 260, ly - 64 + Math.sin(beam) * 120);
      beamGrad.addColorStop(0, 'rgba(255,240,180,0.35)');
      beamGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 64);
      ctx.lineTo(lx + Math.cos(beam - 0.12) * 260, ly - 64 + Math.sin(beam - 0.12) * 120);
      ctx.lineTo(lx + Math.cos(beam + 0.12) * 260, ly - 64 + Math.sin(beam + 0.12) * 120);
      ctx.closePath();
      ctx.fill();
    }
  }
}

export function drawRunway(ctx, camera) {
  const horizon = VIEW.height - 150 + camera.y;
  for (const strip of STRIPS) {
    const sx = strip.centre - camera.x;
    if (sx < -400 || sx > VIEW.width + 400) continue;
    const island = ISLANDS.find((isle) => isle.centre === strip.centre);
    const y = horizon - island.height * 0.94;
    ctx.fillStyle = '#2c2f3a';
    ctx.fillRect(sx - strip.halfWidth, y - 6, strip.halfWidth * 2, 8);
    ctx.fillStyle = '#e8e4d8';
    for (let d = -strip.halfWidth + 20; d < strip.halfWidth - 20; d += 46) {
      ctx.fillRect(sx + d, y - 3, 22, 3);
    }
    // Edge lights, warm amber, lit.
    for (let d = -strip.halfWidth; d <= strip.halfWidth; d += 58) {
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(sx + d, y - 8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,179,71,0.25)';
      ctx.beginPath(); ctx.arc(sx + d, y - 8, 9, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function drawRings(ctx, camera, rings) {
  for (const ring of rings) {
    if (ring.taken) continue;
    const p = worldToScreen(camera, ring.x, ring.y);
    if (p.x < -90 || p.x > VIEW.width + 90) continue;
    const glow = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 66);
    glow.addColorStop(0, 'rgba(255,205,90,0.5)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(p.x - 66, p.y - 66, 132, 132);
    ctx.strokeStyle = '#ffd25e';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(p.x, p.y, 52, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(p.x, p.y, 44, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd25e';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('◈', p.x, p.y + 5);
  }
}

export function drawPlane(ctx, camera, plane, time) {
  const p = worldToScreen(camera, plane.x, plane.alt);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-plane.pitch);
  // Exhaust puffs behind the tail.
  ctx.fillStyle = 'rgba(255,220,190,0.35)';
  for (let i = 0; i < 3; i += 1) {
    const t = ((time * 2 + i * 0.33) % 1);
    ctx.beginPath();
    ctx.arc(-46 - t * 26, 4 + Math.sin(i * 9) * 3, 3 + t * 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Fuselage, tail and wing — a small courier plane, amber and cream.
  ctx.fillStyle = '#e8a33d';
  ctx.beginPath();
  ctx.ellipse(0, 0, 42, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.ellipse(-2, -2, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8a33d';
  ctx.beginPath();
  ctx.moveTo(-34, -2); ctx.lineTo(-52, -20); ctx.lineTo(-44, -2); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, 2); ctx.lineTo(-48, 16); ctx.lineTo(-38, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c97e22';
  ctx.fillRect(-14, -16, 30, 5);
  // Cockpit window, lit.
  ctx.fillStyle = '#bfe8ff';
  ctx.beginPath();
  ctx.ellipse(20, -5, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Spinning propeller.
  const a = plane.propAngle;
  ctx.strokeStyle = 'rgba(240,240,240,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(44 + Math.cos(a) * 20, Math.sin(a) * 20);
  ctx.lineTo(44 - Math.cos(a) * 20, -Math.sin(a) * 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(44 + Math.cos(a + Math.PI / 2) * 20, Math.sin(a + Math.PI / 2) * 20);
  ctx.lineTo(44 - Math.cos(a + Math.PI / 2) * 20, -Math.sin(a + Math.PI / 2) * 20);
  ctx.stroke();
  ctx.fillStyle = '#5a3a1a';
  ctx.beginPath(); ctx.arc(44, 0, 4, 0, Math.PI * 2); ctx.fill();
  // Navigation lights: red port, green starboard, blinking white tail.
  ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(-14, -16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4dff88'; ctx.beginPath(); ctx.arc(16, -16, 3, 0, Math.PI * 2); ctx.fill();
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-52, -18, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
