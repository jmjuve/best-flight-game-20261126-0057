// Game loop, screens and scoring for Skyline Courier.
// Screens: title -> playing -> paused | landed | crashed.
// ?shot=start|play|ring|end stages a state for screenshots; ?seed=N fixes the island.
import { CONFIG, rankFor } from './config.js';
import { Input } from './input.js';
import { makeWorld, stepFlight, freshPlane } from './world.js';
import { Renderer } from './render.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';
import { hashSeed } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const seed = hashSeed(params.get('seed') || 'skyline-1');
const shot = params.get('shot') || '';

export const game = {
  screen: 'title',
  plane: freshPlane(),
  world: makeWorld(seed),
  renderer: new Renderer(),
  audio: new AudioEngine(),
  input: new Input(canvas),
  t: 0,
  rank: null,
  seed,
  shot,
};

game.renderer.ensureTerrain(seed);

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = 1280 * dpr;
  canvas.height = 720 * dpr;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function setScreen(s) {
  game.screen = s;
  statusEl.textContent = {
    title: 'Skyline Courier, title screen. Press Enter to fly.',
    playing: 'Flying the Island Run.',
    paused: 'Paused.',
    landed: 'Mission complete. You landed on runway 27.',
    crashed: 'Courier down. ' + game.plane.crashReason,
  }[s] || '';
}

function startFlight() {
  game.plane = freshPlane();
  game.world = makeWorld(seed);
  game.rank = null;
  game.audio.ensure();
  setScreen('playing');
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.t += dt;
  const p = game.plane;
  const input = game.input;

  if (input.tap('enter')) {
    if (game.screen === 'title' || game.screen === 'landed' || game.screen === 'crashed') startFlight();
  }
  if (input.tap('r') && (game.screen === 'landed' || game.screen === 'crashed')) startFlight();
  if (input.tap('p') && (game.screen === 'playing' || game.screen === 'paused')) {
    setScreen(game.screen === 'playing' ? 'paused' : 'playing');
  }
  if (input.tap('m')) game.audio.muted = !game.audio.muted;

  if (game.screen === 'playing') {
    // Takeoff roll: the Courier lifts off the runway on her own once throttled.
    if (p.z < 600 && p.alt < 80) {
      p.throttle = Math.max(p.throttle, 0.85);
      p.speed += dt * 40;
      if (p.speed > 80) p.alt += (p.speed - 80) * 0.9 * dt;
      p.z += p.speed * 1.6878 * dt;
      p.fuel -= dt * 0.1;
      p.time -= dt;
    } else {
      const ev = stepFlight(p, input, dt, game.world);
      if (ev === 'ring') game.audio.ring();
      if (ev === 'landed') {
        game.audio.thud();
        p.score += Math.max(0, Math.round(p.time)) * 2; // time bonus
        game.rank = rankFor(p.score);
        setScreen('landed');
      }
      if (ev === 'crashed') {
        game.audio.thud();
        game.audio.alarm();
        game.rank = rankFor(p.score);
        setScreen('crashed');
      }
    }
    if (p.messageT > 0) p.messageT -= dt;
    if (p.lastRingT > 0) p.lastRingT -= dt;
    game.audio.update(p.speed, p.throttle, true);
  } else {
    game.audio.update(0, 0, false);
  }

  game.renderer.draw(ctx, game);
  requestAnimationFrame(frame);
}

// Staged screenshots for the dossier: the shot sets the state, then plays.
if (shot) applyShot(game, shot, setScreen);
requestAnimationFrame(frame);

// Debug hook for the playtest: state, clicks and keys the harness drives.
window.__skyline = {
  state() {
    const p = game.plane;
    return {
      screen: game.screen, score: p.score, ringsHit: p.ringsHit,
      alt: Math.round(p.alt), speed: Math.round(p.speed),
      heading: Math.round(-p.heading * 57.2958), fuel: Math.round(p.fuel),
      x: Math.round(p.x), z: Math.round(p.z), time: Math.round(p.time),
      throttle: +p.throttle.toFixed(2), landed: p.landed,
      rank: game.rank ? game.rank.grade : null,
      crashReason: p.crashReason,
    };
  },
  start: startFlight,
};
