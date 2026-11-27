// Every pixel of Skyline Courier: sky, the island in pseudo-3D, the runway,
// the glowing rings, the Courier herself, the lit cockpit and the HUD.
import { CONFIG } from './config.js';
import { coastX, terrainHeight } from './world.js';
import { mulberry32 } from './random.js';

const W = 1280;
const H = 720;
const FOCAL = 620;
const TEX_W = 1024;
const TEX_H = 2048;
const WORLD_X0 = -14000; // world x at texture column 0
const WORLD_X1 = 16000;
const COURSE_Z = 28000; // world z mapped over the texture height

function texX(x) { return ((x - WORLD_X0) / (WORLD_X1 - WORLD_X0)) * TEX_W; }
function texY(z) { return ((z % COURSE_Z) / COURSE_Z) * TEX_H; }

// --- the island, painted once top-down into a texture -----------------------
function paintTerrain(seed) {
  const c = document.createElement('canvas');
  c.width = TEX_W; c.height = TEX_H;
  const g = c.getContext('2d');
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const pxPerFt = TEX_W / (WORLD_X1 - WORLD_X0);
  const pzPerFt = TEX_H / COURSE_Z;
  for (let z = 0; z < COURSE_Z; z += 40) {
    const y = z * pzPerFt;
    const coast = coastX(z);
    // sea
    g.fillStyle = '#1b6ea8';
    g.fillRect(0, y, texX(coast), 40 * pzPerFt + 1);
    // sand
    g.fillStyle = '#e8d49a';
    g.fillRect(texX(coast), y, 90 * pxPerFt, 40 * pzPerFt + 1);
    // fields
    g.fillStyle = (Math.floor(z / 400) % 2 === 0) ? '#5da24a' : '#6fae57';
    g.fillRect(texX(coast) + 90 * pxPerFt, y, texX(CONFIG.mountainBase) - texX(coast) - 90 * pxPerFt, 40 * pzPerFt + 1);
    // mountains
    const mg = g.createLinearGradient(texX(CONFIG.mountainBase), 0, TEX_W, 0);
    mg.addColorStop(0, '#7a6a55'); mg.addColorStop(0.5, '#5d5348'); mg.addColorStop(1, '#8a8f96');
    g.fillStyle = mg;
    g.fillRect(texX(CONFIG.mountainBase), y, TEX_W - texX(CONFIG.mountainBase), 40 * pzPerFt + 1);
  }
  // field patchwork
  for (let i = 0; i < 260; i++) {
    const x = coastX(rand() * COURSE_Z) + 200 + rand() * 2400;
    const z = rand() * COURSE_Z;
    g.fillStyle = ['#4c8a3f', '#7fb069', '#a3b86b', '#5b9e4d'][i % 4];
    g.globalAlpha = 0.5;
    g.fillRect(texX(x), texY(z), (120 + rand() * 260) * pxPerFt, (120 + rand() * 260) * pzPerFt);
  }
  g.globalAlpha = 1;
  // city: blocks and roads around downtown
  for (let i = 0; i < 320; i++) {
    const x = CONFIG.cityCentre - 620 + rand() * 1240;
    const z = 1200 + rand() * (COURSE_Z - 3600);
    g.fillStyle = ['#9aa0a8', '#b7bcc4', '#7e858e', '#c2c7cd'][i % 4];
    g.fillRect(texX(x), texY(z), (50 + rand() * 90) * pxPerFt, (50 + rand() * 90) * pzPerFt);
  }
  g.strokeStyle = 'rgba(40,44,52,0.55)';
  g.lineWidth = 3;
  for (let i = 0; i < 14; i++) {
    const x = CONFIG.cityCentre - 620 + i * 95;
    g.beginPath(); g.moveTo(texX(x), 0); g.lineTo(texX(x), TEX_H); g.stroke();
  }
  // river winding to the sea
  g.strokeStyle = '#2f7fb8'; g.lineWidth = 14; g.beginPath();
  for (let z = 0; z <= COURSE_Z; z += 200) {
    const x = 1400 + Math.sin(z * 0.0002) * 500;
    if (z === 0) g.moveTo(texX(x), 0); else g.lineTo(texX(x), texY(z));
  }
  g.stroke();
  // the runway: grey strip, centreline dashes, threshold bars, "27"
  const rw = CONFIG.runway;
  g.fillStyle = '#3c4148';
  g.fillRect(texX(rw.x - rw.halfWidth), texY(rw.zStart), (rw.halfWidth * 2) * pxPerFt, (rw.zEnd - rw.zStart) * pzPerFt);
  g.fillStyle = '#f5f5f5';
  for (let z = rw.zStart + 200; z < rw.zEnd - 200; z += 400) {
    g.fillRect(texX(rw.x) - 4, texY(z), 8, 220 * pzPerFt);
  }
  for (let k = -1; k <= 1; k++) {
    g.fillRect(texX(rw.x + k * 90 - 30), texY(rw.zStart + 150), 60 * pxPerFt, 90 * pzPerFt);
    g.fillRect(texX(rw.x + k * 90 - 30), texY(rw.zEnd - 240), 60 * pxPerFt, 90 * pzPerFt);
  }
  // snow on the high peaks
  for (let i = 0; i < 200; i++) {
    const x = CONFIG.mountainBase + 400 + rand() * 2600;
    const z = rand() * COURSE_Z;
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fillRect(texX(x), texY(z), (30 + rand() * 80) * pxPerFt, (20 + rand() * 50) * pzPerFt);
  }
  return c;
}

// --- projection -------------------------------------------------------------
function project(p, x, alt, z) {
  const dz = z - p.z;
  if (dz < 40) return null;
  const s = FOCAL / dz;
  const sx = W / 2 + (x - p.x - p.heading * dz * 0.9) * s;
  const sy = horizonY(p) - (alt - p.alt) * s;
  return { x: sx, y: sy, s };
}

export function horizonY(p) {
  return H * 0.40 - p.pitch * 260 + (p.alt > 0 ? 0 : 0);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

// --- main draw --------------------------------------------------------------
export class Renderer {
  constructor() {
    this.terrain = null;
    this.seed = -1;
  }

  ensureTerrain(seed) {
    if (this.seed !== seed) { this.terrain = paintTerrain(seed); this.seed = seed; }
  }

  draw(g, game) {
    const p = game.plane;
    const hz = horizonY(p);
    this.drawSky(g, p, hz, game);
    this.drawTerrain(g, p, hz, game);
    this.drawClouds(g, p, game);
    this.drawBuildings(g, p, game);
    this.drawRings(g, p, game);
    this.drawRunwayLights(g, p, game);
    if (game.screen === 'playing' || game.screen === 'paused') this.drawPlane(g, p, game);
    this.drawHud(g, p, game);
    if (game.screen !== 'playing') this.drawCockpit(g, p, game);
    else this.drawCockpit(g, p, game);
    if (game.screen === 'title') this.drawTitle(g, game);
    if (game.screen === 'paused') this.drawPaused(g);
    if (game.screen === 'landed' || game.screen === 'crashed') this.drawEnd(g, game);
    if (game.screen === 'playing' && p.messageT > 0) this.drawBanner(g, p.message);
    if (game.screen === 'playing' && p.lastRingT > 0) this.drawBanner(g, p.lastRing, H * 0.30);
  }

  drawSky(g, p, hz, game) {
    const sky = g.createLinearGradient(0, 0, 0, hz + 40);
    const dawn = game.shot === 'start';
    sky.addColorStop(0, dawn ? '#2a4d8f' : '#2f6fc4');
    sky.addColorStop(0.55, dawn ? '#e8905a' : '#7db8e8');
    sky.addColorStop(1, dawn ? '#f6c98a' : '#cfe8f7');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, hz + 2);
    // sun
    const sunX = W * 0.78 - p.heading * 900;
    const sunY = hz - 150;
    const glow = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, 120);
    glow.addColorStop(0, 'rgba(255,240,190,0.95)');
    glow.addColorStop(0.25, 'rgba(255,214,120,0.55)');
    glow.addColorStop(1, 'rgba(255,214,120,0)');
    g.fillStyle = glow;
    g.fillRect(sunX - 130, sunY - 130, 260, 260);
    g.fillStyle = '#fff3c4';
    g.beginPath(); g.arc(sunX, sunY, 34, 0, 6.29); g.fill();
    // distant peaks silhouette on the horizon
    g.fillStyle = 'rgba(74,84,104,0.55)';
    g.beginPath();
    g.moveTo(0, hz);
    for (let x = 0; x <= W; x += 40) {
      const peak = Math.sin((x + p.heading * 4000) * 0.004) * 26 + Math.sin((x + p.heading * 4000) * 0.011) * 12;
      g.lineTo(x, hz - 30 - Math.max(0, peak));
    }
    g.lineTo(W, hz); g.closePath(); g.fill();
  }

  drawTerrain(g, p, hz, game) {
    const tex = this.terrain;
    const bottom = H - 150; // cockpit panel covers the rest
    for (let y = Math.floor(hz) + 1; y < bottom; y += 2) {
      const t = (y - hz) / (bottom - hz);
      const z = 160 + Math.pow(1 - t, 2.1) * 24000;
      const s = FOCAL / z;
      const pxPerFt = TEX_W / (WORLD_X1 - WORLD_X0);
      const srcW = (W / s) * pxPerFt;
      const srcY = texY(p.z + z);
      let sx = texX(p.x + p.heading * z * 0.9) - srcW / 2;
      let sw = srcW;
      let dx = 0;
      const scaleX = W / srcW; // screen px per texture px
      if (sx < 0) { // past the texture's west edge: open sea continues
        const cut = -sx * scaleX;
        g.fillStyle = '#1b6ea8';
        g.fillRect(0, y, cut, 2);
        dx = cut; sw = srcW + sx; sx = 0;
      }
      if (sx + sw > TEX_W) { // past the east edge: the peaks continue
        const over = (sx + sw - TEX_W) * scaleX;
        g.fillStyle = '#5d5348';
        g.fillRect(W - over, y, over, 2);
        sw = TEX_W - sx;
      }
      g.drawImage(tex, sx, srcY, sw, 2, dx, y, sw * scaleX, 2);
    }
  }

  drawClouds(g, p, game) {
    g.save();
    for (const c of game.world.clouds) {
      const pr = project(p, c.x, c.alt, c.z);
      if (!pr || pr.x < -400 || pr.x > W + 400 || pr.y < -80 || pr.y > H) continue;
      const r = c.s * pr.s;
      if (r < 6) continue;
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.ellipse(pr.x, pr.y, r, r * 0.36, 0, 0, 6.29);
      g.ellipse(pr.x - r * 0.5, pr.y + r * 0.08, r * 0.6, r * 0.28, 0, 0, 6.29);
      g.ellipse(pr.x + r * 0.55, pr.y + r * 0.06, r * 0.55, r * 0.26, 0, 0, 6.29);
      g.fill();
    }
    g.restore();
  }

  drawBuildings(g, p, game) {
    for (const b of game.world.buildings) {
      const dz = b.z - p.z;
      if (dz < 120 || dz > 9000) continue;
      const base = project(p, b.x, terrainHeight(b.x, b.z), b.z);
      if (!base || base.x < -300 || base.x > W + 300) continue;
      const s = base.s;
      const w = b.w * s, d = b.d * s, h = b.h * s;
      if (w < 2 || h < 2) continue;
      const topY = base.y - h;
      g.fillStyle = b.hue > 0.66 ? '#8d99ae' : b.hue > 0.33 ? '#a8b2c1' : '#7c8798';
      g.fillRect(base.x - w / 2, topY, w, h); // front face
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.fillRect(base.x - w / 2, topY, w, Math.max(2, h * 0.12)); // roof
      g.fillStyle = 'rgba(20,28,44,0.35)';
      g.fillRect(base.x + w / 2 - Math.max(2, w * 0.14), topY, Math.max(2, w * 0.14), h); // side shade
      // lit windows
      g.fillStyle = 'rgba(255,214,120,0.9)';
      const cols = Math.max(1, Math.floor(w / 14)), rows = Math.max(1, Math.floor(h / 16));
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
        if (((i * 7 + j * 13 + b.w) % 5) < 2) g.fillRect(base.x - w / 2 + 4 + i * 14, topY + 6 + j * 16, 5, 7);
      }
    }
  }

  drawRings(g, p, game) {
    const next = game.world.rings.find((r) => !r.passed && !r.missed);
    for (const r of game.world.rings) {
      const dz = r.z - p.z;
      if (dz < 60 || dz > 16000) continue;
      const pr = project(p, r.x, r.alt, r.z);
      if (!pr) continue;
      const rx = Math.min(CONFIG.ringRadius * pr.s, 300); // cap: a gate at arm's length stays in frame
      const ry = rx * 0.62;
      if (rx < 4) continue;
      const col = r.passed ? '#39d98a' : r.missed ? '#8a93a3' : (r === next ? '#ffb020' : '#37c8e8');
      g.save();
      g.globalAlpha = r.passed ? 0.35 : 0.95;
      g.strokeStyle = col;
      g.lineWidth = Math.max(2, rx * 0.10);
      g.shadowColor = col; g.shadowBlur = 18;
      g.beginPath(); g.ellipse(pr.x, pr.y, rx, ry, 0, 0, 6.29); g.stroke();
      g.shadowBlur = 0;
      g.lineWidth = Math.max(1, rx * 0.03);
      g.strokeStyle = 'rgba(255,255,255,0.85)';
      g.beginPath(); g.ellipse(pr.x, pr.y, rx * 0.82, ry * 0.82, 0, 0, 6.29); g.stroke();
      g.restore();
      if (r === next && dz > 600 && game.screen === 'playing') {
        g.fillStyle = '#fff';
        g.font = 'bold 15px system-ui, sans-serif';
        g.textAlign = 'center';
        g.fillText(`NEXT RING — ${Math.round(dz)} FT`, pr.x, pr.y - ry - 14);
      }
    }
  }

  drawRunwayLights(g, p, game) {
    const rw = CONFIG.runway;
    if (p.z > rw.zEnd) return;
    for (const dz of [rw.zStart + 100, rw.zStart + 1200, rw.zStart + 2400, rw.zEnd - 200]) {
      for (const side of [-1, 1]) {
        const pr = project(p, rw.x + side * (rw.halfWidth + 30), 6, dz);
        if (!pr || pr.x < 0 || pr.x > W) continue;
        g.fillStyle = '#7dffb0';
        g.shadowColor = '#7dffb0'; g.shadowBlur = 12;
        g.beginPath(); g.arc(pr.x, pr.y, Math.max(2, 5 * pr.s), 0, 6.29); g.fill();
        g.shadowBlur = 0;
      }
    }
  }

  drawPlane(g, p, game) {
    const cx = W / 2, cy = H * 0.60;
    const scale = 1 + p.speed / 900;
    g.save();
    g.translate(cx, cy + Math.sin(game.t * 2.2) * 2);
    g.rotate(p.bank * 0.55);
    g.scale(scale, scale);
    // engine glow
    const glow = g.createRadialGradient(0, 66, 2, 0, 66, 46);
    glow.addColorStop(0, 'rgba(120,200,255,0.9)');
    glow.addColorStop(1, 'rgba(120,200,255,0)');
    g.fillStyle = glow;
    g.beginPath(); g.ellipse(0, 66, 40, 30, 0, 0, 6.29); g.fill();
    // wings (seen from behind)
    g.fillStyle = '#dfe6ee';
    g.beginPath();
    g.moveTo(-14, 18); g.lineTo(-168, 52); g.lineTo(-172, 66); g.lineTo(-14, 44); g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(14, 18); g.lineTo(168, 52); g.lineTo(172, 66); g.lineTo(14, 44); g.closePath(); g.fill();
    g.fillStyle = '#b7c2d0';
    g.beginPath(); g.moveTo(-14, 30); g.lineTo(-120, 58); g.lineTo(-120, 66); g.lineTo(-14, 44); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(14, 30); g.lineTo(120, 58); g.lineTo(120, 66); g.lineTo(14, 44); g.closePath(); g.fill();
    // fuselage, tapering away
    const fus = g.createLinearGradient(0, -78, 0, 78);
    fus.addColorStop(0, '#f4f7fb'); fus.addColorStop(0.6, '#d7dee8'); fus.addColorStop(1, '#9fb0c4');
    g.fillStyle = fus;
    g.beginPath();
    g.moveTo(0, -84);
    g.bezierCurveTo(20, -60, 26, -10, 24, 52);
    g.bezierCurveTo(23, 72, 12, 80, 0, 80);
    g.bezierCurveTo(-12, 80, -23, 72, -24, 52);
    g.bezierCurveTo(-26, -10, -20, -60, 0, -84);
    g.fill();
    // tail fin
    g.fillStyle = '#e2574c';
    g.beginPath(); g.moveTo(0, -84); g.lineTo(0, -118); g.lineTo(10, -88); g.closePath(); g.fill();
    g.fillStyle = '#fff';
    g.beginPath(); g.moveTo(-16, -46); g.lineTo(-58, -30); g.lineTo(-56, -22); g.lineTo(-14, -34); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(16, -46); g.lineTo(58, -30); g.lineTo(56, -22); g.lineTo(14, -34); g.closePath(); g.fill();
    // cockpit windows, lit
    g.fillStyle = '#12324a';
    g.beginPath(); g.ellipse(0, -58, 13, 9, 0, 0, 6.29); g.fill();
    g.fillStyle = 'rgba(140,220,255,0.9)';
    g.beginPath(); g.ellipse(-5, -58, 5, 6, 0, 0, 6.29); g.ellipse(6, -58, 5, 6, 0, 0, 6.29); g.fill();
    // livery stripe + courier mark
    g.fillStyle = '#e2574c';
    g.fillRect(-24, 8, 48, 7);
    g.fillStyle = '#fff';
    g.font = 'bold 11px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('SKYLINE', 0, 46);
    // nav lights
    g.fillStyle = '#ff4d4d'; g.beginPath(); g.arc(-172, 59, 5, 0, 6.29); g.fill();
    g.fillStyle = '#39d98a'; g.beginPath(); g.arc(172, 59, 5, 0, 6.29); g.fill();
    g.restore();
    // flight-path marker
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 2;
    g.beginPath(); g.arc(cx, cy - 96, 10, 0, 6.29); g.stroke();
    g.beginPath(); g.moveTo(cx - 18, cy - 96); g.lineTo(cx - 10, cy - 96); g.moveTo(cx + 10, cy - 96); g.lineTo(cx + 18, cy - 96); g.stroke();
  }

  gauge(g, cx, cy, r, label, value, max, unit, color) {
    g.save();
    g.fillStyle = '#0d1522';
    g.beginPath(); g.arc(cx, cy, r, 0, 6.29); g.fill();
    g.strokeStyle = '#3a4a63'; g.lineWidth = 3; g.stroke();
    g.strokeStyle = color; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, r - 7, -Math.PI * 0.75, -Math.PI * 0.75 + (value / max) * Math.PI * 1.5); g.stroke();
    g.fillStyle = '#eaf2ff';
    g.font = `bold ${Math.round(r * 0.42)}px system-ui, sans-serif`; g.textAlign = 'center';
    g.fillText(String(Math.round(value)), cx, cy + r * 0.16);
    g.fillStyle = '#8fa8c8';
    g.font = `${Math.round(r * 0.24)}px system-ui, sans-serif`;
    g.fillText(label, cx, cy + r * 0.55);
    g.fillStyle = '#5f7a9e';
    g.font = `${Math.round(r * 0.20)}px system-ui, sans-serif`;
    g.fillText(unit, cx, cy - r * 0.52);
    g.restore();
  }

  drawCockpit(g, p, game) {
    const top = H - 150;
    const grad = g.createLinearGradient(0, top, 0, H);
    grad.addColorStop(0, '#1a2436'); grad.addColorStop(0.12, '#232f45'); grad.addColorStop(1, '#0d1320');
    g.fillStyle = grad;
    g.fillRect(0, top, W, 150);
    g.fillStyle = '#31435f'; g.fillRect(0, top, W, 3);
    // attitude ball (centre)
    const ax = W / 2, ay = top + 76;
    g.save();
    g.beginPath(); g.arc(ax, ay, 52, 0, 6.29); g.clip();
    g.fillStyle = '#2f6fc4'; g.fillRect(ax - 52, ay - 52, 104, 52 - p.pitch * 90);
    g.fillStyle = '#8a6a3f'; g.fillRect(ax - 52, ay - p.pitch * 90, 104, 52 + p.pitch * 90);
    g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ax - 52, ay - p.pitch * 90); g.lineTo(ax + 52, ay - p.pitch * 90); g.stroke();
    g.restore();
    g.strokeStyle = '#3a4a63'; g.lineWidth = 3;
    g.beginPath(); g.arc(ax, ay, 52, 0, 6.29); g.stroke();
    g.save(); g.translate(ax, ay); g.rotate(p.bank * 0.55);
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.moveTo(-34, 0); g.lineTo(-8, 0); g.lineTo(-8, 5); g.lineTo(-34, 5); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(8, 0); g.lineTo(34, 0); g.lineTo(34, 5); g.lineTo(8, 5); g.closePath(); g.fill();
    g.beginPath(); g.arc(0, 0, 4, 0, 6.29); g.fill();
    g.restore();
    g.fillStyle = '#8fa8c8'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('ATTITUDE', ax, top + 142);
    // gauges
    this.gauge(g, 150, top + 74, 52, 'AIRSPEED', p.speed, 240, 'KT', '#37c8e8');
    this.gauge(g, 300, top + 74, 52, 'ALTITUDE', p.alt, 1200, 'FT', '#39d98a');
    this.gauge(g, W - 300, top + 74, 52, 'FUEL', Math.max(0, p.fuel), 100, '%', p.fuel < 25 ? '#ff5a4d' : '#ffb020');
    // heading compass tape
    const hx = W - 150, hy = top + 74;
    g.fillStyle = '#0d1522';
    roundRect(g, hx - 90, hy - 52, 180, 104, 10); g.fill();
    g.strokeStyle = '#3a4a63'; g.lineWidth = 2; roundRect(g, hx - 90, hy - 52, 180, 104, 10); g.stroke();
    g.fillStyle = '#eaf2ff'; g.font = 'bold 26px system-ui, sans-serif'; g.textAlign = 'center';
    const hdg = ((Math.round(-p.heading * 57.2958) % 360) + 360) % 360;
    g.fillText(String(hdg).padStart(3, '0') + '°', hx, hy + 2);
    g.fillStyle = '#8fa8c8'; g.font = '11px system-ui, sans-serif';
    g.fillText('HEADING', hx, hy + 34);
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.moveTo(hx - 7, hy - 48); g.lineTo(hx + 7, hy - 48); g.lineTo(hx, hy - 38); g.closePath(); g.fill();
    // throttle lever
    const tx = 470;
    g.fillStyle = '#0d1522'; roundRect(g, tx - 14, top + 22, 28, 106, 8); g.fill();
    g.strokeStyle = '#3a4a63'; g.lineWidth = 2; roundRect(g, tx - 14, top + 22, 28, 106, 8); g.stroke();
    const ty = top + 118 - p.throttle * 84;
    g.fillStyle = '#ffb020'; roundRect(g, tx - 22, ty - 8, 44, 16, 6); g.fill();
    g.fillStyle = '#8fa8c8'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('THR', tx, top + 142);
    // warning lights — only while flying, and clear of the attitude ball
    const warn = game.screen === 'playing' && (p.fuel < 25 || p.speed < 70);
    g.fillStyle = warn ? '#ff5a4d' : '#24344c';
    g.beginPath(); g.arc(716, top + 40, 9, 0, 6.29); g.fill();
    g.fillStyle = '#8fa8c8'; g.font = '11px system-ui, sans-serif'; g.textAlign = 'left';
    g.fillText(warn ? 'LOW FUEL / SLOW' : 'SYSTEMS OK', 732, top + 44);
    g.fillStyle = '#8fa8c8';
    g.fillText('FLAPS UP • GEAR DOWN', 732, top + 68);
    g.fillText('SHIFT up • CTRL down • SPACE', 732, top + 92);
  }

  drawHud(g, p, game) {
    g.fillStyle = 'rgba(10,18,32,0.72)';
    roundRect(g, 16, 14, 560, 54, 10); g.fill();
    g.textAlign = 'left';
    g.fillStyle = '#8fa8c8'; g.font = 'bold 11px system-ui, sans-serif';
    g.fillText('ALTITUDE', 32, 32); g.fillText('SPEED', 172, 32); g.fillText('HEADING', 312, 32); g.fillText('SCORE', 452, 32);
    g.fillStyle = '#fff'; g.font = 'bold 24px system-ui, sans-serif';
    g.fillText(`${Math.max(0, Math.round(p.alt))} FT`, 32, 58);
    g.fillText(`${Math.round(p.speed)} KT`, 172, 58);
    const hdg = ((Math.round(-p.heading * 57.2958) % 360) + 360) % 360;
    g.fillText(String(hdg).padStart(3, '0') + '°', 312, 58);
    g.fillStyle = '#ffd23f';
    g.fillText(String(p.score), 452, 58);
    // right cluster: rings, time, fuel
    g.fillStyle = 'rgba(10,18,32,0.72)';
    roundRect(g, W - 296, 14, 280, 54, 10); g.fill();
    g.fillStyle = '#8fa8c8'; g.font = 'bold 11px system-ui, sans-serif';
    g.fillText('RINGS', W - 280, 32); g.fillText('TIME', W - 180, 32); g.fillText('FUEL', W - 96, 32);
    g.fillStyle = '#fff'; g.font = 'bold 24px system-ui, sans-serif';
    g.fillText(`${p.ringsHit}/8`, W - 280, 58);
    const mm = Math.floor(Math.max(0, p.time) / 60), ss = Math.floor(Math.max(0, p.time) % 60);
    g.fillStyle = p.time < 30 ? '#ff5a4d' : '#fff';
    g.fillText(`${mm}:${String(ss).padStart(2, '0')}`, W - 180, 58);
    g.fillStyle = p.fuel < 25 ? '#ff5a4d' : '#39d98a';
    g.fillText(`${Math.round(Math.max(0, p.fuel))}%`, W - 96, 58);
    // next-ring compass hint, below the HUD row so it never covers it
    const next = game.world.rings.find((r) => !r.passed && !r.missed);
    if (next && game.screen === 'playing') {
      const dx = next.x - p.x;
      g.fillStyle = 'rgba(10,18,32,0.72)';
      roundRect(g, W / 2 - 130, 78, 260, 30, 8); g.fill();
      g.fillStyle = '#ffb020'; g.font = 'bold 14px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillText(dx > 120 ? 'NEXT RING  ▶  RIGHT' : dx < -120 ? '◀  LEFT  NEXT RING' : 'NEXT RING  ▲  AHEAD', W / 2, 98);
    }
  }

  drawBanner(g, text, y) {
    const yy = y ?? H * 0.22;
    g.font = 'bold 34px system-ui, sans-serif';
    const w = g.measureText(text).width + 48;
    g.fillStyle = 'rgba(10,18,32,0.78)';
    roundRect(g, W / 2 - w / 2, yy - 30, w, 52, 12); g.fill();
    g.fillStyle = '#ffd23f'; g.textAlign = 'center';
    g.fillText(text, W / 2, yy + 6);
  }

  drawTitle(g, game) {
    g.fillStyle = 'rgba(8,14,28,0.45)';
    g.fillRect(0, 0, W, H - 150);
    g.textAlign = 'center';
    g.fillStyle = '#ffd23f'; g.font = 'bold 20px system-ui, sans-serif';
    g.fillText('M A K E . F U N   •   F L I G H T   G A M E', W / 2, 118);
    g.fillStyle = '#fff'; g.font = 'bold 74px system-ui, sans-serif';
    g.fillText('SKYLINE COURIER', W / 2, 196);
    g.fillStyle = '#cfe3ff'; g.font = '28px system-ui, sans-serif';
    g.fillText('Island Run — fly the rings, then bring her home', W / 2, 240);
    g.fillStyle = '#fff'; g.font = '18px system-ui, sans-serif';
    g.fillText('ARROWS / WASD fly  •  MOUSE steers  •  SHIFT throttle up  •  CTRL down  •  SPACE airbrake', W / 2, 300);
    g.fillText('8 glowing rings over the coast, the city and the peaks — then land on runway 27.', W / 2, 330);
    g.fillText('Watch your fuel. Mind the mountains. Grease the landing.', W / 2, 360);
    const pulse = 0.65 + 0.35 * Math.sin(game.t * 4);
    g.fillStyle = `rgba(255,210,63,${pulse})`;
    g.font = 'bold 26px system-ui, sans-serif';
    g.fillText('PRESS ENTER TO FLY', W / 2, 430);
    g.fillStyle = '#9fb4d0'; g.font = '15px system-ui, sans-serif';
    g.fillText('An original game — no real aircraft, airline or place is depicted.', W / 2, 470);
  }

  drawPaused(g) {
    g.fillStyle = 'rgba(8,14,28,0.6)';
    g.fillRect(0, 0, W, H - 150);
    g.fillStyle = '#fff'; g.font = 'bold 44px system-ui, sans-serif'; g.textAlign = 'center';
    g.fillText('PAUSED', W / 2, 300);
    g.font = '20px system-ui, sans-serif';
    g.fillText('Press P to keep flying', W / 2, 340);
  }

  drawEnd(g, game) {
    const p = game.plane;
    g.fillStyle = 'rgba(8,14,28,0.55)';
    g.fillRect(0, 0, W, H - 150);
    g.textAlign = 'center';
    if (game.screen === 'landed') {
      g.fillStyle = '#39d98a'; g.font = 'bold 64px system-ui, sans-serif';
      g.fillText('MISSION COMPLETE', W / 2, 180);
      g.fillStyle = '#fff'; g.font = '30px system-ui, sans-serif';
      g.fillText(`Rings ${p.ringsHit}/8  •  Landing +${p.landingQuality}  •  Score ${p.score}`, W / 2, 240);
      g.fillStyle = '#ffd23f'; g.font = 'bold 44px system-ui, sans-serif';
      g.fillText(`${game.rank.grade} — ${game.rank.name}`, W / 2, 310);
    } else {
      g.fillStyle = '#ff5a4d'; g.font = 'bold 64px system-ui, sans-serif';
      g.fillText('COURIER DOWN', W / 2, 180);
      g.fillStyle = '#fff'; g.font = '30px system-ui, sans-serif';
      g.fillText(p.crashReason, W / 2, 240);
      g.fillText(`Rings ${p.ringsHit}/8  •  Score ${p.score}`, W / 2, 290);
    }
    g.fillStyle = '#cfe3ff'; g.font = '20px system-ui, sans-serif';
    g.fillText('Press ENTER to fly again — R to restart the sortie', W / 2, 370);
  }
}
