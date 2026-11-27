# ✈️ Skyline Courier — Island Run

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/jmjuve/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/jmjuve/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

An original flight game for the [make.fun best-flight-game-20261126-0057 bounty](https://make.fun/bounty/best-flight-game-20261126-0057).

**You fly the Courier on the Island Run.** Take off from the coast, thread eight glowing rings over the sea, the city and the peaks, watch your fuel — then bring her home and grease the landing on runway 27.

## The sortie

- **Takeoff** — throttle up with Shift and the Courier lifts off the runway on her own. Hold ArrowUp to climb, ArrowDown to descend.
- **Rings** — eight glowing gates along the course, each worth 100 points, with a combo bonus that grows every gate you thread in a row (+25 per streak). Miss one and the streak resets.
- **The island** — open sea west of a wiggling coastline, green fields, a downtown strip with lit windows, and peaks rising east that you must clear. A river winds down to the sea.
- **Landing** — after the last ring, runway 27 waits with green edge lights. Touch down slow (65–125 kt) and gentle, on the centreline, for up to +300 landing points and a time bonus.
- **Fuel and time** — 4:00 on the clock and a tank that drains faster at full throttle. Run dry, stall, clip a peak or ditch in the sea and the sortie is over.

## Controls

| Input | Action |
| --- | --- |
| Arrow keys / WASD | Fly: pitch and bank |
| Mouse | Steer toward the cursor |
| Shift / Ctrl | Throttle up / down |
| Space | Airbrake |
| P | Pause |
| M | Mute |
| Enter / R | Fly again after landing or crashing |

## The cockpit

A chase view over recognisable terrain, the Courier in frame, and a lit instrument panel: airspeed and altitude dials, an attitude ball, a heading compass, fuel gauge and throttle lever — plus a HUD with altitude, speed, heading, score, rings, time and fuel, and a compass hint pointing at the next ring.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

Open http://localhost:8080 in a desktop browser. No build step, no network requests, no libraries — plain static files under `game/`. `?seed=N` fixes the island; `?shot=start|play|ring|end` stages a screenshot state.

## Files

- `game/index.html` — the page, canvas and status line
- `game/src/config.js` — tuning, the ring course, ranks
- `game/src/random.js` — seeded RNG for the island
- `game/src/input.js` — keyboard + mouse
- `game/src/world.js` — terrain, the ring course, the flight model
- `game/src/render.js` — sky, island, runway, rings, plane, cockpit, HUD
- `game/src/audio.js` — synthesized engine hum, chimes, wind (WebAudio)
- `game/src/main.js` — loop, screens, scoring
- `game/src/shots.js` — staged screenshot states
- `main.ts` — the make.fun entry program (Node 22), hands in `game/` + `screenshots/` + `dossier.json`
- `vendor/makefun-game.ts` — the kit's library, unchanged

An original game — no real aircraft, airline or place is depicted.
