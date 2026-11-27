// Skyline Courier — tuning constants, the ring course and ranks.
// One clear job: every number the flight model and the missions use.
export const CONFIG = {
  // World: x = east in feet (0 = course centreline), z = north in feet.
  courseLength: 26000, // feet from takeoff to the runway threshold
  runway: { x: 0, zStart: 24500, zEnd: 27500, halfWidth: 150 },
  // Flight model
  minSpeed: 55, // knots: below this the Courier stalls
  maxSpeed: 240,
  cruiseSpeed: 150,
  climbRate: 30, // ft/s at full pitch up and cruise speed
  sinkRate: 26,
  turnRate: 0.45, // rad/s at full bank
  maxBank: 0.9, // radians of visual bank
  accel: 26, // knots/s of throttle authority
  drag: 6,
  fuelBurn: 0.55, // % per second at cruise throttle
  fuelBurnThrottle: 0.9, // extra % per second at full throttle
  startFuel: 100,
  startAlt: 0,
  timeLimit: 240, // seconds
  // Rings: eight gates along the course; x weaves, altitude climbs.
  ringRadius: 130, // feet: passing window
  ringScore: 100,
  ringComboStep: 25,
  landingWindow: { minSpeed: 65, maxSpeed: 125, maxSink: 12, maxOffset: 120 },
  // Terrain
  seaLevel: 0,
  mountainBase: 2600, // x beyond this rises into the peaks
  mountainPeak: 950, // feet
  coastCentre: -1500, // x of the coastline, wiggles with z
  cityCentre: 900, // x of the downtown strip
};

export const RINGS = [
  { x: -350, alt: 320, z: 2800 },
  { x: 420, alt: 480, z: 5600 },
  { x: -620, alt: 620, z: 8400 },
  { x: 250, alt: 780, z: 11200 },
  { x: -480, alt: 650, z: 14000 },
  { x: 680, alt: 880, z: 16800 },
  { x: -220, alt: 720, z: 19600 },
  { x: 60, alt: 420, z: 22400 },
];

export const RANKS = [
  { min: 1400, name: 'ACE OF THE ISLES', grade: 'S' },
  { min: 1050, name: 'SKY CAPTAIN', grade: 'A' },
  { min: 750, name: 'COURIER FIRST CLASS', grade: 'B' },
  { min: 450, name: 'ROOKIE WINGS', grade: 'C' },
  { min: 0, name: 'GROUNDED', grade: 'D' },
];

export function rankFor(score) {
  for (const r of RANKS) if (score >= r.min) return r;
  return RANKS[RANKS.length - 1];
}
