// Keyboard + mouse input for Skyline Courier.
// Arrows / WASD fly the plane, Shift/Ctrl or W/S work the throttle,
// mouse steers toward the cursor, Space is the airbrake, P pauses.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouse = { x: 0.5, y: 0.5, down: false, active: false };
    this.pressed = new Set(); // edge-triggered keys, consumed by main.js
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (!e.repeat) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) / r.width;
      this.mouse.y = (e.clientY - r.top) / r.height;
      this.mouse.active = true;
    });
    canvas.addEventListener('mousedown', () => { this.mouse.down = true; this.mouse.active = true; });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  down(...names) { return names.some((n) => this.keys.has(n)); }
  tap(name) { const hit = this.pressed.has(name); if (hit) this.pressed.delete(name); return hit; }
  consume() { this.pressed.clear(); }

  // Steering: -1..1 roll from keys, blended with the mouse when it moves.
  rollTarget() {
    let roll = 0;
    if (this.down('arrowleft', 'a')) roll -= 1;
    if (this.down('arrowright', 'd')) roll += 1;
    if (this.mouse.active && !this.down('arrowleft', 'arrowright', 'a', 'd')) {
      roll = (this.mouse.x - 0.5) * 2;
    }
    return Math.max(-1, Math.min(1, roll));
  }

  pitchTarget() {
    let pitch = 0;
    if (this.down('arrowup', 'w')) pitch += 1;
    if (this.down('arrowdown', 's')) pitch -= 1;
    if (this.mouse.active && !this.down('arrowup', 'arrowdown', 'w', 's')) {
      pitch = (0.5 - this.mouse.y) * 2;
    }
    return Math.max(-1, Math.min(1, pitch));
  }

  throttleDelta() {
    let d = 0;
    if (this.down('shift')) d += 1;
    if (this.down('control')) d -= 1;
    return d;
  }
}
