// Synthesized sound for Skyline Courier: engine hum, ring chime, wind,
// touchdown thud. No audio files — everything is WebAudio oscillators.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.windGain = null;
    this.muted = false;
  }

  ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      // engine: two detuned saws through a lowpass
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = 55 * 1.5;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineOsc.connect(filt); osc2.connect(filt);
      filt.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start(); osc2.start();
      this.osc2 = osc2;
      // wind: looped noise
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf; src.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.6;
      this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0;
      src.connect(bp); bp.connect(this.windGain); this.windGain.connect(this.ctx.destination);
      src.start();
    } catch (e) { this.ctx = null; }
  }

  update(speed, throttle, flying) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const f = 42 + throttle * 55 + speed * 0.12;
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.1);
    this.osc2.frequency.setTargetAtTime(f * 1.5, t, 0.1);
    this.engineGain.gain.setTargetAtTime(flying ? 0.045 + throttle * 0.05 : 0, t, 0.2);
    this.windGain.gain.setTargetAtTime(flying ? Math.min(0.09, speed * 0.0004) : 0, t, 0.2);
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.15, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }

  ring() { this.blip(880, 0.5, 'sine', 0.2); setTimeout(() => this.blip(1318, 0.6, 'sine', 0.18), 90); }
  thud() { this.blip(70, 0.35, 'triangle', 0.3); }
  alarm() { this.blip(440, 0.2, 'square', 0.08); }
}
