// The island, the ring course and the flight model for Skyline Courier.
// Terrain: sea west of a wiggling coastline, green fields, a downtown strip,
// then peaks rising east. The runway sits flat at the far end of the course.
import { CONFIG, RINGS } from './config.js';
import { mulberry32 } from './random.js';

export function coastX(z) {
  return CONFIG.coastCentre + Math.sin(z * 0.00012) * 420 + Math.sin(z * 0.000031 + 2) * 260;
}

export function terrainHeight(x, z) {
  const coast = coastX(z);
  if (x < coast) return CONFIG.seaLevel; // open sea
  const t = (x - coast) / 900;
  if (t < 0.25) return 0; // beach and fields
  if (x < CONFIG.mountainBase) {
    // city strip: flat, with a downtown hump the plane must clear
    const d = Math.abs(x - CONFIG.cityCentre) / 700;
    return d < 1 ? 60 * (1 - d) + 30 * Math.sin(z * 0.002) : 0;
  }
  // peaks: smooth ridges that grow eastward
  const m = Math.min(1, (x - CONFIG.mountainBase) / 1600);
  const ridge = 0.6 + 0.4 * Math.sin(z * 0.00021 + x * 0.0004);
  return CONFIG.mountainPeak * m * m * ridge;
}

export function makeWorld(seed) {
  const rand = mulberry32(seed);
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({ x: (rand() - 0.5) * 9000, alt: 1400 + rand() * 1600, z: rand() * CONFIG.courseLength, s: 260 + rand() * 420 });
  }
  const buildings = [];
  for (let i = 0; i < 90; i++) {
    const z = 1500 + rand() * (CONFIG.courseLength - 3000);
    const x = CONFIG.cityCentre - 500 + rand() * 1000;
    buildings.push({ x, z, w: 60 + rand() * 130, d: 60 + rand() * 130, h: 40 + rand() * 190, hue: rand() });
  }
  const boats = [];
  for (let i = 0; i < 8; i++) {
    boats.push({ x: coastX(rand() * CONFIG.courseLength) - 300 - rand() * 900, z: rand() * CONFIG.courseLength, wake: rand() * 6.28 });
  }
  return { clouds, buildings, boats, rings: RINGS.map((r) => ({ ...r, passed: false, missed: false })) };
}

// One physics step. Returns an event string ('ring', 'landed', 'crashed', 'stalled', 'fuel') or null.
export function stepFlight(p, input, dt, world) {
  // Throttle: Shift up, Ctrl down, airbrake with Space.
  p.throttle = Math.max(0, Math.min(1, p.throttle + input.throttleDelta() * dt * 0.5));
  if (input.down(' ')) p.throttle = Math.max(0, p.throttle - dt * 1.2);
  const targetSpeed = CONFIG.minSpeed + p.throttle * (CONFIG.maxSpeed - CONFIG.minSpeed);
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.5);
  if (input.down(' ')) p.speed = Math.max(CONFIG.minSpeed * 0.6, p.speed - dt * 30);

  // Bank and turn; pitch trades speed for altitude.
  const rollIn = input.rollTarget();
  p.bank += (rollIn * CONFIG.maxBank - p.bank) * Math.min(1, dt * 4);
  p.heading += -p.bank * CONFIG.turnRate * dt * (p.speed / CONFIG.cruiseSpeed);
  const pitchIn = input.pitchTarget();
  p.pitch += (pitchIn * 0.35 - p.pitch) * Math.min(1, dt * 3);
  // Slight positive trim: at cruise speed the Courier holds altitude hands-off.
  const climb = (p.pitch * CONFIG.climbRate + 1.6) * (p.speed / CONFIG.cruiseSpeed);
  p.alt += climb * dt;
  p.alt -= (1 - Math.cos(p.bank)) * 6 * dt; // banked turns bleed lift
  if (p.speed < CONFIG.minSpeed + 8 && p.alt > 5) p.alt -= (CONFIG.minSpeed + 8 - p.speed) * 0.35 * dt;

  // Forward motion along the course.
  const ftPerSec = p.speed * 1.6878;
  p.z += Math.cos(p.heading) * ftPerSec * dt;
  p.x += -Math.sin(p.heading) * ftPerSec * dt;
  p.x = Math.max(-4200, Math.min(5200, p.x));

  // Fuel and clock.
  p.fuel -= (CONFIG.fuelBurn + p.throttle * CONFIG.fuelBurnThrottle) * dt * 0.14;
  p.time -= dt;

  // Rings: fly through the glowing gate.
  const ring = world.rings.find((r) => !r.passed && !r.missed);
  if (ring) {
    const dz = p.z - ring.z;
    if (dz > 90) {
      ring.missed = true;
      p.combo = 0;
      p.message = 'RING MISSED';
      p.messageT = 2;
    } else if (Math.abs(dz) < 70) {
      const dx = p.x - ring.x;
      const dy = p.alt - ring.alt;
      if (Math.hypot(dx, dy) < CONFIG.ringRadius) {
        ring.passed = true;
        p.combo += 1;
        const pts = CONFIG.ringScore + (p.combo - 1) * CONFIG.ringComboStep;
        p.score += pts;
        p.lastRing = `RING +${pts}`;
        p.lastRingT = 2;
        p.message = `RING ${p.ringsHit + 1} OF 8 — +${pts}`;
        p.messageT = 2;
        p.ringsHit += 1;
        return 'ring';
      }
    }
  }

  // Landing: on the runway, slow and gentle.
  const rw = CONFIG.runway;
  const onRunway = p.z > rw.zStart && p.z < rw.zEnd && Math.abs(p.x - rw.x) < rw.halfWidth + 60;
  if (onRunway && p.alt <= 2 && p.speed >= CONFIG.landingWindow.minSpeed && p.speed <= CONFIG.landingWindow.maxSpeed) {
    p.landed = true;
    const quality = Math.max(0, 300 - Math.abs(p.x) - Math.abs(p.speed - 90) * 2 - Math.abs(climb) * 8);
    p.score += Math.round(quality);
    p.landingQuality = Math.round(quality);
    return 'landed';
  }
  if (p.z > rw.zEnd + 400 && !p.landed) return 'crashed'; // overshot the field

  // Terrain and stall.
  const ground = terrainHeight(p.x, p.z);
  if (p.alt <= ground + 1 && p.z > 200) {
    p.crashReason = ground > 200 ? 'CLIPPED THE PEAKS' : (p.x < coastX(p.z) ? 'DITCHED IN THE SEA' : 'HIT THE GROUND');
    return 'crashed';
  }
  if (p.speed < CONFIG.minSpeed && p.alt > 40) {
    p.crashReason = 'STALLED — TOO SLOW';
    return 'crashed';
  }
  if (p.fuel <= 0) { p.fuel = 0; p.crashReason = 'OUT OF FUEL'; return 'crashed'; }
  if (p.time <= 0) { p.time = 0; p.crashReason = 'OUT OF TIME'; return 'crashed'; }
  return null;
}

export function freshPlane() {
  return {
    x: 0, z: 0, alt: 0, speed: 0, heading: 0, pitch: 0, bank: 0,
    throttle: 0, fuel: CONFIG.startFuel, time: CONFIG.timeLimit,
    score: 0, combo: 0, ringsHit: 0, landed: false, landingQuality: 0,
    crashReason: '', message: '', messageT: 0, lastRing: '', lastRingT: 0,
  };
}
