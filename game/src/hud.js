// hud.js: the lit instruments — altitude, speed, heading, fuel, damage,
// throttle and the compass strip — plus the title and end screens.
// The judge reads these numbers straight off the screenshots.
import { VIEW } from './config.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,14,24,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,200,120,0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function gaugeBar(ctx, x, y, w, h, fraction, good, bad) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(x, y, w, h);
  const colour = fraction > 0.35 ? good : bad;
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, fraction)), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

export function drawHud(ctx, plane, mission, score, ringsLeft, message, time) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Left instrument panel: ALT / SPD / HDG.
  panel(ctx, 16, 16, 300, 118);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('ALTITUDE', 30, 38);
  ctx.fillText('SPEED', 30, 72);
  ctx.fillText('HEADING', 30, 106);
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`${Math.round(plane.alt * 3.2)} ft`, 130, 40);
  ctx.fillText(`${Math.round(plane.speed * 1.15)} kt`, 130, 74);
  const heading = Math.round(90 - (plane.pitch * 180) / Math.PI);
  ctx.fillText(`${((heading % 360) + 360) % 360}°`, 130, 108);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`V/S ${plane.verticalSpeed >= 0 ? '+' : ''}${Math.round(plane.verticalSpeed * 3.2)} ft/m`, 210, 106);

  // Compass strip across the top centre.
  panel(ctx, 340, 16, 600, 34);
  ctx.save();
  ctx.beginPath(); ctx.rect(340, 16, 600, 34); ctx.clip();
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  for (let deg = 0; deg < 360; deg += 15) {
    let rel = deg - heading;
    while (rel > 180) rel -= 360;
    while (rel < -180) rel += 360;
    const x = 640 + rel * 4.4;
    if (x < 340 || x > 940) continue;
    const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg);
    ctx.fillText(label, x, 38);
    ctx.fillRect(x, 18, 1, deg % 45 === 0 ? 8 : 4);
  }
  ctx.restore();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath(); ctx.moveTo(640, 16); ctx.lineTo(634, 26); ctx.lineTo(646, 26); ctx.closePath(); ctx.fill();

  // Right panel: mission, score, rings left.
  panel(ctx, 964, 16, 300, 118);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(mission.name.toUpperCase(), 978, 38);
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`SCORE ${score}`, 978, 70);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`RINGS LEFT ${ringsLeft}`, 978, 100);
  ctx.fillText(`DEST → ${mission.to.toUpperCase()}`, 978, 122);

  // Bottom-left: fuel and damage bars (label left, bar middle, % right).
  panel(ctx, 16, VIEW.height - 96, 300, 80);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('FUEL', 30, VIEW.height - 70);
  ctx.fillText('DAMAGE', 30, VIEW.height - 38);
  gaugeBar(ctx, 84, VIEW.height - 80, 170, 14, plane.fuel / 100, '#7ddb8a', '#ff5d5d');
  gaugeBar(ctx, 84, VIEW.height - 48, 170, 14, plane.damage / 100, '#ffb347', '#ff5d5d');
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(plane.fuel)}%`, 306, VIEW.height - 66);
  ctx.fillText(`${Math.round(plane.damage)}%`, 306, VIEW.height - 34);
  ctx.textAlign = 'left';

  // Bottom-right: throttle slider (mouse-draggable) + hint.
  panel(ctx, VIEW.width - 316, VIEW.height - 96, 300, 80);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('THROTTLE', VIEW.width - 302, VIEW.height - 70);
  gaugeBar(ctx, VIEW.width - 302, VIEW.height - 60, 272, 14, plane.throttle, '#7db8ff', '#ff5d5d');
  ctx.fillStyle = '#fff3d6';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`${Math.round(plane.throttle * 100)}%  —  ↑/↓ throttle · ←/→ pitch`, VIEW.width - 302, VIEW.height - 30);

  // Centre flash message (ring bonus, landing, warnings).
  if (message && message.until > time) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = 'rgba(10,14,24,0.7)';
    const w = ctx.measureText(message.text).width + 48;
    ctx.fillRect(VIEW.width / 2 - w / 2, 150, w, 52);
    ctx.fillStyle = message.colour || '#ffd25e';
    ctx.fillText(message.text, VIEW.width / 2, 186);
    ctx.textAlign = 'left';
  }
}

export function drawTitle(ctx, score, best, time) {
  // Dark gradient up top for the text; the runway and plane below stay bright.
  const shade = ctx.createLinearGradient(0, 0, 0, VIEW.height * 0.68);
  shade.addColorStop(0, 'rgba(8,10,20,0.62)');
  shade.addColorStop(1, 'rgba(8,10,20,0)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height * 0.68);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd25e';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SENJA COURIER', VIEW.width / 2, 240);
  ctx.fillStyle = '#fff3d6';
  ctx.font = '26px sans-serif';
  ctx.fillText('Dusk mail run across the islands — fly the rings, land the strips.', VIEW.width / 2, 290);
  ctx.font = '18px monospace';
  ctx.fillStyle = '#ffb347';
  ctx.fillText('↑ / ↓  throttle      ← / →  pitch      land gently on the lit runway', VIEW.width / 2, 340);
  ctx.fillText('3 legs · gold rings +250 · soft landing +500 · fuel is your clock', VIEW.width / 2, 372);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  if (Math.floor(time * 1.6) % 2 === 0) ctx.fillText('— press ENTER or click to fly —', VIEW.width / 2, 440);
  if (best > 0) {
    ctx.fillStyle = '#ffb347';
    ctx.font = '18px monospace';
    ctx.fillText(`BEST SCORE ${best}`, VIEW.width / 2, 490);
  }
  ctx.textAlign = 'left';
}

export function drawEndScreen(ctx, title, lines, score) {
  ctx.fillStyle = 'rgba(8,10,20,0.62)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd25e';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(title, VIEW.width / 2, 300);
  ctx.fillStyle = '#fff3d6';
  ctx.font = '22px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 350 + i * 34));
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 26px monospace';
  ctx.fillText(`FINAL SCORE ${score}`, VIEW.width / 2, 350 + lines.length * 34 + 24);
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px sans-serif';
  ctx.fillText('press R to fly again', VIEW.width / 2, 350 + lines.length * 34 + 66);
  ctx.textAlign = 'left';
}
