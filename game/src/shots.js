// Staged states for screenshots: ?shot= builds one frozen moment of the
// game, then lets it play live from there, so every screenshot is a real
// render of the game's own code, never a mock.
export function applyShot(game, shot, setScreen) {
  const p = game.plane;
  if (shot === 'start') {
    // Dawn on the runway: the Courier at the threshold, engines idling.
    p.z = 0; p.alt = 0; p.speed = 0; p.throttle = 0.4;
    setScreen('title');
  } else if (shot === 'play') {
    // Mid-course: lined up on ring 3 over the city and the coast, HUD lit.
    p.z = 7800; p.x = -600; p.alt = 620; p.speed = 168; p.throttle = 0.72;
    p.heading = 0.06; p.pitch = 0.02; p.bank = 0.12;
    p.score = 225; p.ringsHit = 2; p.combo = 2;
    game.world.rings[0].passed = true;
    game.world.rings[1].passed = true;
    setScreen('playing');
  } else if (shot === 'ring') {
    // Threading ring 5: closing on the gate, the chime still ringing.
    p.z = 13600; p.x = -480; p.alt = 650; p.speed = 176; p.throttle = 0.78;
    p.heading = -0.04; p.pitch = 0.01; p.bank = -0.18;
    p.score = 475; p.ringsHit = 4; p.combo = 4;
    for (let i = 0; i < 4; i++) game.world.rings[i].passed = true;
    p.lastRing = 'RING +175';
    p.lastRingT = 60; // frozen banner for the shot
    setScreen('playing');
  } else if (shot === 'end') {
    // On the runway after a greased landing: mission complete, rank shown.
    p.z = 25800; p.x = 12; p.alt = 0; p.speed = 0; p.throttle = 0;
    p.score = 1480; p.ringsHit = 8; p.combo = 8; p.landed = true;
    p.landingQuality = 272; p.fuel = 34; p.time = 96;
    for (const r of game.world.rings) r.passed = true;
    game.rank = { min: 1400, name: 'ACE OF THE ISLES', grade: 'S' };
    setScreen('landed');
  }
}
