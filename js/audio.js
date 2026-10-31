/* ============================================================
   Procedural chiptune audio — music + SFX, no audio files
   ============================================================ */
window.SOUND = (() => {
  let ctx = null, master, musicGain, sfxGain, noiseBuf;
  let musicOn = true, sfxOn = true;
  let timer = null, nextTime = 0, step = 0, currentRegion = 'england', playing = false;
  let paused = false;

  const THEMES = {
    england: { bpm: 96, root: 220, scale: [0, 2, 3, 5, 7, 8, 10], bass: [0, 0, -3, -5], lead: [7, 10, 12, 10, 7, 5, 3, 5] },
    italy: { bpm: 112, root: 246.94, scale: [0, 2, 3, 5, 7, 8, 11], bass: [0, -2, 3, 5], lead: [7, 8, 12, 15, 12, 8, 7, 5] },
    mexico: { bpm: 104, root: 196, scale: [0, 1, 3, 5, 7, 8, 10], bass: [0, 1, 0, -2], lead: [7, 10, 13, 12, 10, 7, 5, 3] },
    egypt: { bpm: 120, root: 261.63, scale: [0, 1, 4, 5, 7, 8, 11], bass: [0, 4, 0, -1], lead: [7, 8, 11, 12, 11, 8, 7, 4] }
  };

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.22; musicGain.connect(master);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.45; sfxGain.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    } catch (e) { ctx = null; }
  }

  function noteFreq(root, semis) { return root * Math.pow(2, semis / 12); }

  function tone(freq, time, dur, type, vol, dest, slide = 0) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), time);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), time + dur);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), time + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g); g.connect(dest || musicGain);
    o.start(time); o.stop(time + dur + 0.02);
  }

  function noise(time, dur, vol, dest, filterFreq = 1800) {
    if (!ctx || !noiseBuf) return;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = filterFreq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxGain);
    src.start(time); src.stop(time + dur + 0.02);
  }

  function schedule() {
    if (!ctx || !playing || paused) return;
    const th = THEMES[currentRegion] || THEMES.england;
    const stepDur = 60 / th.bpm / 2;
    while (nextTime < ctx.currentTime + 0.25) {
      const s = step % 16;
      const root = th.root;
      // bass
      if (s % 4 === 0) {
        const b = th.bass[Math.floor(s / 4) % th.bass.length];
        tone(noteFreq(root / 2, b), nextTime, stepDur * 2.8, 'triangle', 0.20, musicGain);
      }
      // arpeggio
      if (s % 2 === 0) {
        const n = th.scale[(s / 2) % th.scale.length];
        tone(noteFreq(root, n + 12), nextTime, stepDur * 1.1, 'square', 0.055, musicGain);
      }
      // lead
      const lead = th.lead[s % th.lead.length];
      if (s % 8 === 0 || (s === 6 && currentRegion === 'egypt') || (s === 10 && currentRegion === 'italy')) {
        tone(noteFreq(root, lead + 12), nextTime, stepDur * 2.2, 'square', 0.075, musicGain, -8);
      }
      // percussion
      if (s === 0 || s === 8) noise(nextTime, 0.06, 0.10, musicGain, 120);
      if (s === 4 || s === 12) noise(nextTime, 0.04, 0.05, musicGain, 3200);
      if (s === 14 && (step % 32 === 14)) noise(nextTime, 0.09, 0.06, musicGain, 2400);
      nextTime += stepDur;
      step++;
    }
  }

  function startMusic(region) {
    init();
    if (!ctx) return;
    if (region) currentRegion = region;
    if (playing) return;
    playing = true; paused = false; step = 0; nextTime = ctx.currentTime + 0.08;
    timer = setInterval(schedule, 90);
  }

  function stopMusic() {
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
  }

  function setRegion(region) {
    if (currentRegion === region) return;
    currentRegion = region;
    step = 0;
    if (ctx) nextTime = ctx.currentTime + 0.05;
  }

  function setPaused(p) {
    paused = p;
    if (ctx && playing) {
      if (p) musicGain.gain.setTargetAtTime(0.06, ctx.currentTime, 0.1);
      else musicGain.gain.setTargetAtTime(0.22, ctx.currentTime, 0.2);
    }
  }

  function setMusic(on) {
    musicOn = on;
    if (musicGain) musicGain.gain.value = on ? 0.22 : 0;
  }
  function setSfx(on) {
    sfxOn = on;
    if (sfxGain) sfxGain.gain.value = on ? 0.45 : 0;
  }

  function sfx(name) {
    if (!ctx || !sfxOn) return;
    const t = ctx.currentTime;
    switch (name) {
      case 'ui': tone(660, t, 0.05, 'square', 0.08, sfxGain); break;
      case 'hit': noise(t, 0.07, 0.24, sfxGain, 900); tone(160, t, 0.08, 'square', 0.12, sfxGain, -60); break;
      case 'crit': noise(t, 0.1, 0.28, sfxGain, 1200); tone(300, t, 0.14, 'sawtooth', 0.14, sfxGain, -160); break;
      case 'hamon': tone(330, t, 0.3, 'sine', 0.18, sfxGain, 440); tone(494, t + 0.04, 0.24, 'triangle', 0.12, sfxGain, 220); break;
      case 'stand': tone(110, t, 0.32, 'sawtooth', 0.15, sfxGain, 220); noise(t, 0.2, 0.12, sfxGain, 600); break;
      case 'dodge': noise(t, 0.12, 0.12, sfxGain, 2600); tone(500, t, 0.08, 'sine', 0.07, sfxGain, 250); break;
      case 'coin': tone(880, t, 0.06, 'square', 0.10, sfxGain); tone(1320, t + 0.06, 0.12, 'square', 0.09, sfxGain); break;
      case 'chest': tone(392, t, 0.1, 'triangle', 0.12, sfxGain); tone(523, t + 0.09, 0.1, 'triangle', 0.12, sfxGain); tone(659, t + 0.18, 0.18, 'triangle', 0.12, sfxGain); break;
      case 'quest': tone(523, t, 0.1, 'square', 0.1, sfxGain); tone(659, t + 0.1, 0.1, 'square', 0.1, sfxGain); tone(784, t + 0.2, 0.2, 'square', 0.1, sfxGain); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.1, 0.2, 'square', 0.11, sfxGain)); break;
      case 'heal': tone(440, t, 0.2, 'sine', 0.12, sfxGain, 220); tone(660, t + 0.12, 0.3, 'sine', 0.1, sfxGain, 110); break;
      case 'pickup': tone(740, t, 0.06, 'triangle', 0.1, sfxGain); tone(988, t + 0.06, 0.1, 'triangle', 0.09, sfxGain); break;
      case 'alert': tone(880, t, 0.08, 'square', 0.1, sfxGain); tone(660, t + 0.08, 0.1, 'square', 0.1, sfxGain); break;
      case 'boss': tone(73, t, 0.6, 'sawtooth', 0.2, sfxGain, 30); noise(t, 0.5, 0.18, sfxGain, 300); break;
      case 'victory': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.12, 0.35, 'square', 0.12, sfxGain)); break;
      case 'death': [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.18, 0.4, 'sawtooth', 0.11, sfxGain)); break;
      case 'portal': tone(220, t, 0.4, 'sine', 0.12, sfxGain, 660); noise(t, 0.35, 0.08, sfxGain, 1800); break;
      case 'menu': tone(392, t, 0.06, 'square', 0.07, sfxGain); break;
      default: tone(440, t, 0.05, 'square', 0.06, sfxGain);
    }
  }

  return {
    init, startMusic, stopMusic, setRegion, setPaused, setMusic, setSfx, sfx,
    get musicOn() { return musicOn; },
    get sfxOn() { return sfxOn; }
  };
})();
