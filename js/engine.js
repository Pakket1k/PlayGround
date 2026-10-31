/* ============================================================
   Gameplay engine — world, movement, combat, AI, interactions
   ============================================================ */
window.ENGINE = (() => {
  const D = window.GAME_DATA;
  const A = window.ART;
  const W = window.WORLD;
  const TS = 16;
  const E = {};
  const $ = (s) => document.querySelector(s);
  const canvas = document.getElementById('game');

  let bound = false;

  /* ============================ START ============================ */
  E.start = function (isNew) {
    const st = G.state;
    const map = W.build(st.region);
    const r = G.runtime;
    r.world = map;
    r.inGame = true;
    r.paused = false;
    r.death = false;
    r.ending = false;
    r.enemies = [];
    r.projectiles = [];
    r.effects = [];
    r.particles = [];
    r.floaters = [];
    r.traps = [];
    r.npcs = [];
    r.bossActive = null;
    r.cameraLock = null;
    r.timeStop = 0;
    r.buffs = [];
    r.energy = {};
    r.cd = { 0: 0, 1: 0, 2: 0 };
    r.timeOfDay = st.timeOfDay ?? 0.34;
    r.day = st.day || 1;
    r.weatherParticles = [];
    r.autoAttack = false;
    r.target = null;

    let px = st.player?.x, py = st.player?.y;
    if (isNew || !px || !py || px < 0 || py < 0) {
      px = map.spawnPoint.x; py = map.spawnPoint.y;
    }
    r.player = {
      x: px, y: py, facing: st.player?.facing || { x: 0, y: 1 },
      radius: 6, moving: false, animT: 0,
      attackT: 0, attackCd: 0, combo: 0, comboTimer: 0,
      dodgeT: 0, dodgeCd: 0, dodgeDir: { x: 0, y: 1 }, invuln: 0,
      castT: 0, standT: 0, hurtT: 0, energy: 0, stats: null,
      flurry: null, timeStopFx: 0
    };
    E.syncPlayerToHero(false);
    r.player.energy = r.player.stats.maxEnergy;

    spawnNpcs(map);
    spawnEnemies(map);
    r.camera.x = r.player.x - canvas.width / 2;
    r.camera.y = r.player.y - canvas.height / 2;
    clampCamera(true);
    E.resize();

    if (!bound) bindInput();
    G.showScreen(null);
    $('#world-ui').classList.remove('hidden');
    G.refreshHUD();
    if (window.UI) {
      UI.refreshSkillLabels();
      UI.updateHUD(true);
      UI.hideBoss();
    }
    if (window.SOUND) {
      SOUND.init();
      SOUND.startMusic(st.region);
      SOUND.setRegion(st.region);
    }
    if (window.STORY) STORY.onEnterRegion(st.region, isNew);
    G.setPaused(false);
    if (!isNew) G.regionBanner(st.region);
    E.resize();
  };

  function spawnNpcs(map) {
    const r = G.runtime;
    r.npcs = map.npcs.map(n => ({
      ...n, homeX: n.x, homeY: n.y, tx: n.x, ty: n.y,
      animT: Math.random() * 10, moving: false, facing: { x: 0, y: 1 }
    }));
  }

  function spawnEnemies(map) {
    const r = G.runtime;
    r.enemies = [];
    for (const s of map.spawns) {
      if (s.boss) continue;
      r.enemies.push(createEnemy(s.type, s.x, s.y, s));
    }
  }

  function createEnemy(type, x, y, opts = {}) {
    const def = D.ENEMIES[type];
    const hpMul = opts.hpMul || 1;
    return {
      type, def, x, y, homeX: x, homeY: y,
      hp: def.hp * hpMul, maxHp: def.hp * hpMul,
      state: 'idle', alertT: 0, attackCd: Math.random() * 0.6,
      windup: 0, stun: 0, hurtT: 0, dead: false, deadT: 0,
      respawn: opts.respawn ?? 26, patrolR: opts.radius ?? 42,
      tx: x, ty: y, wanderT: Math.random() * 3, facing: { x: 0, y: 1 },
      animT: Math.random() * 10, moving: false, boss: !!def.boss,
      phase: 1, abilityCd: 3 + Math.random() * 2, pending: null,
      charge: null, summonCd: 0, isSummon: !!opts.isSummon, radius: def.radius || 7,
      slowT: 0, burnT: 0, hitFlash: 0
    };
  }

  E.syncPlayerToHero = function (keepPos) {
    const st = G.state;
    const h = st.heroes[st.activeHero];
    const stats = G.heroStats(st.activeHero, h);
    const r = G.runtime;
    if (!r.player) return;
    r.player.stats = stats;
    if (h.hp == null) h.hp = stats.maxHp;
    if (h.hp <= 0) h.hp = stats.maxHp;
    h.hp = Math.min(h.hp, stats.maxHp);
    if (!keepPos) {
      // position kept by caller
    }
    if (r.player.energy > stats.maxEnergy) r.player.energy = stats.maxEnergy;
    G.refreshHUD();
    if (window.UI) {
      UI.refreshSkillLabels();
      UI.refreshSkillButtons();
    }
  };

  /* ============================ INPUT ============================ */
  function bindInput() {
    bound = true;
    const r = G.runtime;

    // Keyboard
    const syncKeyboardVector = () => {
      if (r.input.joyActive) return;
      const k = r.input.keys;
      let x = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0);
      let y = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
      const len = Math.hypot(x, y);
      r.input.x = len ? x / len : 0;
      r.input.y = len ? y / len : 0;
    };
    window.addEventListener('keydown', (e) => {
      if (!r.inGame || r.dialogueOpen) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
      r.input.keys[k] = true;
      syncKeyboardVector();
      if (k === 'j') { r.input.attackHeld = true; E.attack(); }
      if (k === 'k') E.castSkill(0);
      if (k === 'l') E.castSkill(1);
      if (k === ';' || k === 'u') E.castSkill(2);
      if (k === ' ') E.dodge();
      if (k === 'e') E.interact();
      if (k === 'tab' || k === 'escape') { if (window.UI) UI.toggleMenu(); }
      if (k === 'm') { if (window.UI) UI.openMenu('map'); }
      if (k === 'c') { if (window.UI) UI.openSwitchHero(); }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      r.input.keys[k] = false;
      syncKeyboardVector();
      if (k === 'j') r.input.attackHeld = false;
    });
    window.addEventListener('blur', () => {
      r.input.keys = {};
      r.input.attackHeld = false;
      r.input.x = 0; r.input.y = 0;
      r.autoAttack = false;
    });

    // Joystick
    const zone = $('#joy-zone'), knob = $('#joy-knob');
    let joyId = null;
    const joyStart = (e) => {
      if (r.dialogueOpen || r.paused) return;
      joyId = e.pointerId;
      r.input.joyActive = true;
      zone.setPointerCapture?.(e.pointerId);
      moveJoy(e);
      e.preventDefault();
    };
    const moveJoy = (e) => {
      if (joyId !== e.pointerId) return;
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const max = rect.width * 0.36;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = dx / len * max; dy = dy / len * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      r.input.x = dx / max; r.input.y = dy / max;
      r.autoAttack = false;
    };
    const joyEnd = (e) => {
      if (joyId !== e.pointerId) return;
      joyId = null;
      r.input.joyActive = false;
      knob.style.transform = 'translate(0,0)';
      r.input.x = 0; r.input.y = 0;
    };
    zone.addEventListener('pointerdown', joyStart);
    zone.addEventListener('pointermove', moveJoy);
    zone.addEventListener('pointerup', joyEnd);
    zone.addEventListener('pointercancel', joyEnd);

    // Action buttons
    const attack = $('#btn-attack');
    attack.addEventListener('pointerdown', (e) => {
      e.preventDefault(); r.input.attackHeld = true; E.attack();
    });
    const releaseAttack = () => { r.input.attackHeld = false; };
    attack.addEventListener('pointerup', releaseAttack);
    attack.addEventListener('pointercancel', releaseAttack);
    attack.addEventListener('pointerleave', releaseAttack);
    $('#btn-skill-0').addEventListener('pointerdown', (e) => { e.preventDefault(); E.castSkill(0); });
    $('#btn-skill-1').addEventListener('pointerdown', (e) => { e.preventDefault(); E.castSkill(1); });
    $('#btn-skill-2').addEventListener('pointerdown', (e) => { e.preventDefault(); E.castSkill(2); });
    $('#btn-dodge').addEventListener('pointerdown', (e) => { e.preventDefault(); E.dodge(); });
    $('#btn-interact').addEventListener('pointerdown', (e) => { e.preventDefault(); E.interact(); });
    $('#btn-menu').addEventListener('click', () => { if (window.UI) UI.toggleMenu(); });
    $('#hud-portrait-btn').addEventListener('click', () => { if (window.UI) UI.openMenu('heroes'); });

    // Canvas tap targeting / hold to auto-attack
    const canvas = $('#game');
    let tapId = null;
    const tapStart = (e) => {
      if (!r.inGame || r.paused || r.dialogueOpen) return;
      tapId = e.pointerId;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (canvas.width / rect.width) + r.camera.x;
      const y = (e.clientY - rect.top) * (canvas.height / rect.height) + r.camera.y;
      let best = null, bd = 1e9;
      for (const en of r.enemies) {
        if (en.dead) continue;
        const d = Math.hypot(en.x - x, en.y - y);
        if (d < 26 && d < bd) { bd = d; best = en; }
      }
      if (best) {
        r.target = best;
        r.autoAttack = true;
        G.toast(G.tr('ui.targetLocked') + ': ' + G.enemyName(best.type), '');
      }
    };
    const tapEnd = (e) => {
      if (tapId !== e.pointerId) return;
      tapId = null;
      r.autoAttack = false;
      r.target = null;
    };
    canvas.addEventListener('pointerdown', tapStart);
    canvas.addEventListener('pointerup', tapEnd);
    canvas.addEventListener('pointercancel', tapEnd);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // prevent scroll
    document.addEventListener('touchmove', (e) => { if (r.inGame && !r.menuOpen && !r.dialogueOpen) e.preventDefault(); }, { passive: false });
  }

  /* ============================ UPDATE ============================ */
  E.update = function (dt) {
    const r = G.runtime;
    if (!r.inGame || r.paused || r.death || r.ending) return;
    r.tick += dt;
    r.time += dt;
    G.state.stats.playtime += dt;
    r.autosave += dt;
    if (r.autosave > 20) { r.autosave = 0; G.save(true); }
    r.timeOfDay += dt / 180;
    if (r.timeOfDay >= 1) { r.timeOfDay -= 1; r.day++; }
    G.state.timeOfDay = r.timeOfDay; G.state.day = r.day;

    if (r.timeStop > 0) r.timeStop = Math.max(0, r.timeStop - dt);
    updateWeather(dt);
    updatePlayer(dt);
    updateNpcs(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateTraps(dt);
    updateEffects(dt);
    updateParticles(dt);
    updateFloaters(dt);
    updateInteractionPrompt();
    updateCamera(dt);
    if (window.STORY) STORY.update(dt);
    if (window.UI) UI.updateHUD(false);
  };

  function updatePlayer(dt) {
    const r = G.runtime, p = r.player, st = p.stats;
    if (!p || !st) return;
    const h = G.state.heroes[G.state.activeHero];
    const inp = r.input;
    p.attackCd = Math.max(0, p.attackCd - dt);
    p.dodgeCd = Math.max(0, p.dodgeCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.attackT = Math.max(0, p.attackT - dt);
    p.castT = Math.max(0, p.castT - dt);
    p.standT = Math.max(0, p.standT - dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    p.comboTimer = Math.max(0, p.comboTimer - dt);
    if (p.comboTimer <= 0) p.combo = 0;
    for (let i = 0; i < 3; i++) r.cd[i] = Math.max(0, r.cd[i] - dt);
    p.energy = Math.min(st.maxEnergy, p.energy + dt * (9 + st.maxEnergy * 0.015));
    // buffs
    for (const b of r.buffs) b.duration -= dt;
    r.buffs = r.buffs.filter(b => b.duration > 0);
    // passive regen
    if (G.state.activeHero === 'jonathan' && !r.enemies.some(e => !e.dead && e.state !== 'idle' && Math.hypot(e.x - p.x, e.y - p.y) < 140)) {
      h.hp = Math.min(st.maxHp, h.hp + dt * 1.4);
    }
    // flurry
    if (p.flurry) {
      p.flurry.t -= dt;
      p.standT = Math.max(p.standT, 0.12);
      if (p.flurry.t <= 0) {
        p.flurry.t += p.flurry.interval;
        const dir = p.flurry.dir;
        hitEnemiesInCone(p.x, p.y, dir, p.flurry.range, 1.2, p.flurry.power, { stand: true, small: true });
        addEffect({ type: 'slash', x: p.x + dir.x * 14, y: p.y - 12 + dir.y * 8, angle: Math.atan2(dir.y, dir.x), life: 0.1, color: '#c9b4ff', range: 24 });
        p.flurry.left--;
        if (p.flurry.left <= 0) p.flurry = null;
      }
    }
    // movement
    let mx = inp.x, my = inp.y;
    let len = Math.hypot(mx, my);
    if (p.dodgeT > 0) {
      p.dodgeT -= dt;
      moveEntity(p, p.dodgeDir.x * st.speed * 4.2 * dt, p.dodgeDir.y * st.speed * 4.2 * dt, p.radius);
      p.moving = true;
      p.animT += dt * 2;
      if (Math.random() < 0.5) addParticle(p.x, p.y - 8, (Math.random() - 0.5) * 20, -10, 0.25, '#c9e8ff', 1);
      return;
    }
    if (r.autoAttack && r.target && !r.target.dead && len < 0.1) {
      const dx = r.target.x - p.x, dy = r.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 30) { mx = dx / dist; my = dy / dist; len = 1; }
    }
    if (len > 0.08) {
      const nx = mx / len, ny = my / len;
      const speed = st.speed * (hasBuff('speed') ? buffMult('speed') : 1);
      moveEntity(p, nx * speed * dt, ny * speed * dt, p.radius);
      p.facing.x += (nx - p.facing.x) * Math.min(1, dt * 14);
      p.facing.y += (ny - p.facing.y) * Math.min(1, dt * 14);
      const fl = Math.hypot(p.facing.x, p.facing.y) || 1;
      p.facing.x /= fl; p.facing.y /= fl;
      p.moving = true;
      p.animT += dt * (1 + speed / 90);
      if (Math.random() < 0.12) addParticle(p.x, p.y - 1, (Math.random() - 0.5) * 8, -6, 0.25, 'rgba(200,190,160,.45)', 1);
    } else {
      p.moving = false;
      p.animT += dt * 0.5;
    }
    if (r.autoAttack && r.target && !r.target.dead) {
      const dx = r.target.x - p.x, dy = r.target.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 120) {
        p.facing.x = dx / (dist || 1); p.facing.y = dy / (dist || 1);
        if (dist <= 34) E.attack();
      }
    }
    if (r.input.attackHeld && p.attackCd <= 0) E.attack();
    // arena clamp
    if (r.cameraLock) clampToArena(p);
  }

  function hasBuff(type) { return G.runtime.buffs.some(b => b.type === type); }
  function buffMult(type) { return G.runtime.buffs.filter(b => b.type === type).reduce((m, b) => m * b.mult, 1); }

  function updateNpcs(dt) {
    const r = G.runtime;
    for (const n of r.npcs) {
      n.animT += dt;
      n.wanderT -= dt;
      if (n.wanderT <= 0) {
        n.wanderT = 2 + Math.random() * 3;
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * (n.wander || 10) * TS;
        n.tx = n.homeX + Math.cos(a) * d;
        n.ty = n.homeY + Math.sin(a) * d * 0.6;
      }
      const dx = n.tx - n.x, dy = n.ty - n.y, dist = Math.hypot(dx, dy);
      if (dist > 2) {
        n.moving = true;
        const sp = 18;
        moveEntity(n, dx / dist * sp * dt, dy / dist * sp * dt, 6);
        n.facing.x = dx / dist; n.facing.y = dy / dist;
        n.sortY = n.y;
      } else n.moving = false;
    }
  }

  function updateEnemies(dt) {
    const r = G.runtime, p = r.player;
    for (const e of r.enemies) {
      if (e.dead) {
        e.deadT += dt;
        if (!e.boss && e.deadT > e.respawn) {
          e.dead = false; e.deadT = 0; e.hp = e.maxHp;
          e.x = e.homeX; e.y = e.homeY; e.state = 'idle'; e.alertT = 0;
        }
        continue;
      }
      e.animT += dt;
      e.hurtT = Math.max(0, e.hurtT - dt);
      e.slowT = Math.max(0, e.slowT - dt);
      e.burnT = Math.max(0, e.burnT - dt);
      if (e.burnT > 0 && Math.random() < dt * 5) addParticle(e.x, e.y - 8, (Math.random() - 0.5) * 10, -20, 0.4, '#ff9a3a', 1);
      if (r.timeStop > 0 && !e.boss) continue;
      if (e.stun > 0) { e.stun -= dt; e.state = 'stunned'; continue; }
      if (e.pending) {
        e.pending.t -= dt;
        if (e.pending.t <= 0) { resolveBossPending(e); }
        continue;
      }
      if (e.charge) { updateBossCharge(e, dt); continue; }
      const dx = p.x - e.x, dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      e.attackCd = Math.max(0, e.attackCd - dt);
      e.abilityCd = Math.max(0, e.abilityCd - dt);
      if (e.boss) { updateBoss(e, dt, dist); continue; }

      if (e.state === 'idle') {
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 1.5 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2;
          const d = Math.random() * e.patrolR;
          e.tx = e.homeX + Math.cos(a) * d;
          e.ty = e.homeY + Math.sin(a) * d * 0.7;
        }
        const tx = e.tx - e.x, ty = e.ty - e.y, td = Math.hypot(tx, ty);
        if (td > 3) {
          moveEntity(e, tx / td * e.def.speed * 0.28 * dt, ty / td * e.def.speed * 0.28 * dt, e.radius);
          e.facing.x = tx / td; e.facing.y = ty / td; e.moving = true;
        } else e.moving = false;
        if (dist < e.def.aggro) {
          e.state = 'alert'; e.alertT = 0.45;
          if (window.SOUND) SOUND.sfx('alert');
        }
      } else if (e.state === 'alert') {
        e.alertT -= dt;
        e.facing.x = dx / (dist || 1); e.facing.y = dy / (dist || 1);
        if (e.alertT <= 0) e.state = 'chase';
      } else if (e.state === 'chase') {
        e.facing.x = dx / (dist || 1); e.facing.y = dy / (dist || 1);
        if (dist > e.def.aggro * 2.1) {
          e.state = 'idle'; e.tx = e.homeX; e.ty = e.homeY;
        } else if (dist <= e.def.range && e.attackCd <= 0) {
          e.state = 'windup'; e.windup = e.def.windup;
        } else if (dist > e.def.range) {
          const sp = e.def.speed * (e.slowT > 0 ? 0.45 : 1);
          moveEntity(e, dx / dist * sp * dt, dy / dist * sp * dt, e.radius);
          e.moving = true;
          if (Math.random() < 0.06) addParticle(e.x, e.y - 1, 0, -3, 0.3, 'rgba(0,0,0,.2)', 1);
        }
      } else if (e.state === 'windup') {
        e.windup -= dt;
        e.facing.x = dx / (dist || 1); e.facing.y = dy / (dist || 1);
        if (e.windup <= 0) {
          if (e.def.ranged) {
            spawnEnemyProjectile(e, p, 1);
          } else if (dist <= e.def.range + 12) {
            damagePlayer(e.def.atk, e);
          }
          addEffect({ type: 'slash', x: e.x + e.facing.x * 12, y: e.y - 10 + e.facing.y * 6, angle: Math.atan2(e.facing.y, e.facing.x), life: 0.16, color: '#ff8a8a', range: 18 });
          e.attackCd = e.def.attackCd;
          e.state = 'chase';
        }
      } else if (e.state === 'stunned') {
        if (e.stun <= 0) e.state = 'chase';
      }
      if (e.slowT > 0) e.animT += dt * 0.3;
      e.sortY = e.y;
    }
    r.enemies = r.enemies.filter(e => !e.removed);
  }

  function updateBoss(e, dt, dist) {
    const r = G.runtime, p = r.player;
    e.facing.x = (p.x - e.x) / (dist || 1);
    e.facing.y = (p.y - e.y) / (dist || 1);
    const frac = e.hp / e.maxHp;
    const newPhase = frac < 0.3 ? 3 : frac < 0.6 ? 2 : 1;
    if (newPhase !== e.phase) {
      e.phase = newPhase;
      addEffect({ type: 'ring', x: e.x, y: e.y - 14, r0: 8, r1: 60, life: 0.6, maxLife: 0.6, color: e.phase === 3 ? '#ff4b4b' : '#ffb04b', width: 3 });
      if (window.SOUND) SOUND.sfx('boss');
      r.screenShake = Math.max(r.screenShake, 5);
    }
    if (dist > 42) {
      const sp = e.def.speed * (e.phase === 3 ? 1.3 : e.phase === 2 ? 1.15 : 1);
      moveEntity(e, e.facing.x * sp * dt, e.facing.y * sp * dt, e.radius);
      e.moving = true;
    } else e.moving = false;
    if (e.attackCd <= 0 && dist < 58) {
      e.pending = { type: 'melee', t: 0.32, dist: 62 };
      e.attackCd = e.def.attackCd * 0.9;
    }
    if (e.abilityCd <= 0) {
      const abil = e.def.abilities[Math.floor(Math.random() * e.def.abilities.length)];
      bossAbility(e, abil);
      e.abilityCd = (4.6 - e.phase * 0.5) + Math.random() * 1.8;
    }
    if (r.cameraLock) clampToArena(e);
    e.sortY = e.y;
  }

  function bossAbility(e, name) {
    const r = G.runtime, p = r.player;
    if (name === 'slam') {
      e.pending = { type: 'slam', t: 0.85, x: p.x, y: p.y, radius: 62 };
      addEffect({ type: 'telegraph', x: p.x, y: p.y, r: 62, life: 0.85, maxLife: 0.85, color: '#ff3b3b' });
      if (window.SOUND) SOUND.sfx('alert');
    } else if (name === 'fan') {
      for (let i = -2; i <= 2; i++) {
        const a = Math.atan2(p.y - e.y, p.x - e.x) + i * 0.18;
        spawnProjectile({
          x: e.x, y: e.y - 14, vx: Math.cos(a) * 130, vy: Math.sin(a) * 130,
          life: 2.2, damage: e.def.atk * 0.8, owner: 'enemy', color: e.type === 'esidisi' ? '#ff7a2a' : e.type === 'dio' ? '#c48aff' : '#ff5a7a', size: 3
        });
      }
      if (window.SOUND) SOUND.sfx('stand');
    } else if (name === 'charge') {
      e.pending = { type: 'chargePrep', t: 0.45 };
      addEffect({ type: 'ring', x: e.x, y: e.y - 14, r0: 4, r1: 34, life: 0.45, maxLife: 0.45, color: '#ffd15a', width: 2 });
    } else if (name === 'summon') {
      const alive = r.enemies.filter(en => !en.dead && en.isSummon).length;
      if (alive < 3) {
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          const en = createEnemy('minion', e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 20, { isSummon: true });
          en.state = 'chase'; en.isSummon = true;
          r.enemies.push(en);
          addEffect({ type: 'ring', x: en.x, y: en.y - 10, r0: 2, r1: 18, life: 0.5, maxLife: 0.5, color: '#c48aff', width: 2 });
        }
        if (window.SOUND) SOUND.sfx('stand');
      }
    } else if (name === 'timeStop') {
      r.timeStop = 1.2;
      e.pending = { type: 'timeStop', t: 0.7 };
      addEffect({ type: 'timeStop', life: 1.3, maxLife: 1.3 });
      if (window.SOUND) SOUND.sfx('stand');
    }
  }

  function resolveBossPending(e) {
    const p = G.runtime.player;
    const pd = e.pending;
    e.pending = null;
    if (pd.type === 'melee') {
      if (Math.hypot(p.x - e.x, p.y - e.y) < pd.dist) damagePlayer(e.def.atk, e);
      addEffect({ type: 'slash', x: e.x + e.facing.x * 20, y: e.y - 14, angle: Math.atan2(e.facing.y, e.facing.x), life: 0.2, color: '#ff5a5a', range: 30 });
    } else if (pd.type === 'slam') {
      addEffect({ type: 'ring', x: pd.x, y: pd.y, r0: 8, r1: pd.radius, life: 0.5, maxLife: 0.5, color: '#ff5a3a', width: 4 });
      addParticles(pd.x, pd.y, 14, '#ff7a3a');
      if (Math.hypot(p.x - pd.x, p.y - pd.y) < pd.radius) damagePlayer(e.def.atk * 1.5, e);
      if (window.SOUND) SOUND.sfx('hit');
      G.runtime.screenShake = Math.max(G.runtime.screenShake, 7);
    } else if (pd.type === 'chargePrep') {
      e.charge = { t: 0.38, dir: { x: e.facing.x, y: e.facing.y }, hit: false };
    } else if (pd.type === 'timeStop') {
      // after the stop, DIO strikes from behind
      const p2 = G.runtime.player;
      e.x = p2.x + 26; e.y = p2.y;
      addEffect({ type: 'ring', x: e.x, y: e.y - 14, r0: 2, r1: 40, life: 0.4, maxLife: 0.4, color: '#d0a0ff', width: 3 });
      damagePlayer(e.def.atk * 1.2, e);
    }
  }

  function updateBossCharge(e, dt) {
    const c = e.charge;
    c.t -= dt;
    const p = G.runtime.player;
    moveEntity(e, c.dir.x * 280 * dt, c.dir.y * 280 * dt, e.radius);
    if (!c.hit && Math.hypot(p.x - e.x, p.y - e.y) < 26) { c.hit = true; damagePlayer(e.def.atk * 1.3, e); }
    if (Math.random() < 0.6) addParticle(e.x, e.y - 6, (Math.random() - 0.5) * 20, -8, 0.3, '#ffcf7a', 1);
    if (c.t <= 0) e.charge = null;
  }

  /* ============================ PLAYER ACTIONS ============================ */
  E.attack = function () {
    const r = G.runtime, p = r.player;
    if (!p || r.paused || r.death || p.attackCd > 0) return;
    p.attackCd = 0.34;
    p.attackT = 0.26;
    p.combo = (p.comboTimer > 0 ? p.combo % 3 : 0) + 1;
    p.comboTimer = 0.95;
    const power = p.combo === 3 ? 1.38 : p.combo === 2 ? 1.08 : 1;
    const dir = aimDir();
    p.facing = { ...dir };
    const hit = hitEnemiesInCone(p.x, p.y - 6, dir, 34, 1.15, power, {});
    addEffect({ type: 'slash', x: p.x + dir.x * 16, y: p.y - 13 + dir.y * 8, angle: Math.atan2(dir.y, dir.x), life: 0.16, maxLife: 0.16, color: p.combo === 3 ? '#ffe08a' : '#f0e6c8', range: p.combo === 3 ? 26 : 21 });
    if (p.combo === 3) { G.runtime.screenShake = Math.max(r.screenShake, 2); }
    if (G.state.activeHero === 'jotaro') {
      p.standT = 0.35;
      if (window.SOUND) SOUND.sfx('stand');
    } else if (window.SOUND) SOUND.sfx('hit');
    if (hit) {
      if (window.SOUND) SOUND.sfx('hit');
      if (p.combo === 3) G.runtime.screenShake = Math.max(r.screenShake, 3);
    }
  };

  E.castSkill = function (idx) {
    const r = G.runtime, p = r.player;
    if (!p || r.paused || r.death) return;
    const h = G.state.heroes[G.state.activeHero];
    const c = D.CHARACTERS[h.id];
    const sk = c.skills[idx];
    if (!sk) return;
    if (r.cd[idx] > 0) { G.toast(G.tr('ui.cooldown'), 'bad'); return; }
    if (p.energy < sk.energy) { G.toast(G.tr('ui.lowEnergy'), 'bad'); return; }
    const st = p.stats;
    const dir = aimDir();
    p.facing = { ...dir };
    p.energy -= sk.energy;
    r.cd[idx] = sk.cd * st.cdMult;
    p.castT = 0.35;
    p.attackT = 0.2;
    const mult = idx === 0 ? st.skill1Mult : idx === 1 ? st.skill2Mult : st.ultMult;
    const type = sk.type;
    if (type === 'dashAoe') {
      dashPlayer(dir, sk.dash);
      const hit = damageArea(p.x, p.y, sk.radius, sk.power * mult, { stun: sk.stun, knockback: 80, color: '#ffd15a' });
      addEffect({ type: 'nova', x: p.x, y: p.y - 8, r0: 8, r1: sk.radius, life: 0.45, maxLife: 0.45, color: '#ffd15a' });
      p.invuln = Math.max(p.invuln, 0.25);
      if (window.SOUND) SOUND.sfx('hamon');
    } else if (type === 'healBuff') {
      const heal = Math.round(st.maxHp * sk.heal * (1 + (mult - 1) * 0.5));
      h.hp = Math.min(st.maxHp, h.hp + heal);
      addBuff({ type: 'dmg', mult: sk.buff.dmg, duration: sk.buff.duration, nameKey: 'ui.buffHamon' });
      addEffect({ type: 'heal', x: p.x, y: p.y - 12, life: 0.8, maxLife: 0.8 });
      addParticles(p.x, p.y - 14, 12, '#ffe08a');
      G.toast(`+${heal} ${G.tr('ui.hp')}`, 'good');
      if (window.SOUND) SOUND.sfx('heal');
    } else if (type === 'nova') {
      damageArea(p.x, p.y, sk.radius, sk.power * mult, { knockback: sk.knockback, color: '#ffd15a' });
      addEffect({ type: 'nova', x: p.x, y: p.y - 8, r0: 10, r1: sk.radius, life: 0.6, maxLife: 0.6, color: '#ffdf7a' });
      addParticles(p.x, p.y - 14, 24, '#ffe08a');
      p.invuln = Math.max(p.invuln, 0.4);
      G.runtime.screenShake = Math.max(r.screenShake, 7);
      if (window.SOUND) SOUND.sfx('hamon');
    } else if (type === 'boomerang') {
      spawnProjectile({
        x: p.x, y: p.y - 12, vx: dir.x * sk.speed, vy: dir.y * sk.speed,
        life: 1.4, damage: st.atk * sk.power * mult, owner: 'player', color: '#ffe08a',
        size: 4, boomerang: true, range: sk.range, origin: { x: p.x, y: p.y - 12 }, hitSet: new Set(), returning: false, type: 'clacker'
      });
      p.standT = 0.2;
      if (window.SOUND) SOUND.sfx('hamon');
    } else if (type === 'trap') {
      r.traps.push({ x: p.x, y: p.y - 2, radius: sk.radius, life: sk.duration, maxLife: sk.duration, power: st.atk * sk.power * mult, armed: true, pulse: 0 });
      if (window.SOUND) SOUND.sfx('ui');
    } else if (type === 'coneShots') {
      for (let i = 0; i < sk.shots; i++) {
        const a = Math.atan2(dir.y, dir.x) + (i - (sk.shots - 1) / 2) * (sk.spread / sk.shots);
        spawnProjectile({
          x: p.x, y: p.y - 12, vx: Math.cos(a) * 360, vy: Math.sin(a) * 360,
          life: 0.7, damage: st.atk * sk.power * mult, owner: 'player', color: '#ffd85a', size: 2,
          delay: i * 0.035, type: 'bullet'
        });
      }
      p.standT = 0.3;
      if (window.SOUND) SOUND.sfx('stand');
    } else if (type === 'flurry') {
      p.flurry = { left: sk.hits, t: 0.04, interval: 0.075, power: st.atk * sk.power * mult, range: sk.range, dir };
      p.standT = 0.9;
      if (window.SOUND) SOUND.sfx('stand');
    } else if (type === 'dashStrike') {
      const startX = p.x, startY = p.y;
      dashPlayer(dir, sk.dash, true);
      const hits = damageLine(startX, startY, p.x, p.y, sk.radius, sk.power * mult, { knockback: 40 });
      addEffect({ type: 'dash', x: startX, y: startY - 10, x2: p.x, y2: p.y - 10, life: 0.3, maxLife: 0.3, color: '#c9b4ff' });
      p.invuln = Math.max(p.invuln, 0.35);
      p.standT = 0.5;
      G.runtime.screenShake = Math.max(r.screenShake, 4);
      if (window.SOUND) SOUND.sfx('stand');
    } else if (type === 'timeStopNova') {
      r.timeStop = sk.stop;
      addEffect({ type: 'timeStop', life: sk.stop, maxLife: sk.stop });
      damageArea(p.x, p.y, sk.radius, sk.power * mult, { knockback: 120, color: '#c9a6ff' });
      addEffect({ type: 'nova', x: p.x, y: p.y - 8, r0: 8, r1: sk.radius, life: 0.6, maxLife: 0.6, color: '#c9a6ff' });
      p.standT = 1.2;
      p.invuln = Math.max(p.invuln, 0.6);
      G.runtime.screenShake = Math.max(r.screenShake, 9);
      G.toast(G.tr('ui.oraCry'), 'good');
      if (window.SOUND) SOUND.sfx('stand');
    }
    if (window.UI) UI.refreshSkillButtons();
  };

  E.dodge = function () {
    const r = G.runtime, p = r.player;
    if (!p || r.paused || r.death || p.dodgeCd > 0) return;
    let dir = { x: r.input.x, y: r.input.y };
    if (Math.hypot(dir.x, dir.y) < 0.2) dir = aimDir();
    const l = Math.hypot(dir.x, dir.y) || 1;
    p.dodgeDir = { x: dir.x / l, y: dir.y / l };
    p.dodgeT = 0.16;
    p.invuln = Math.max(p.invuln, G.state.activeHero === 'joseph' ? 0.42 : 0.3);
    p.dodgeCd = 1.0;
    addEffect({ type: 'dash', x: p.x, y: p.y - 8, x2: p.x + p.dodgeDir.x * 42, y2: p.y - 8 + p.dodgeDir.y * 30, life: 0.2, maxLife: 0.2, color: '#9fe8ff' });
    if (window.SOUND) SOUND.sfx('dodge');
  };

  function aimDir() {
    const r = G.runtime, p = r.player;
    let target = r.target && !r.target.dead ? r.target : null;
    if (!target) {
      let bd = 130;
      for (const e of r.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < bd) { bd = d; target = e; }
      }
    }
    if (target) {
      const dx = target.x - p.x, dy = target.y - p.y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }
    const l = Math.hypot(p.facing.x, p.facing.y) || 1;
    return { x: p.facing.x / l, y: p.facing.y / l };
  }

  function dashPlayer(dir, dist, stopOnHit) {
    const p = G.runtime.player;
    const steps = Math.ceil(dist / 4);
    for (let i = 0; i < steps; i++) {
      const nx = p.x + dir.x * (dist / steps), ny = p.y + dir.y * (dist / steps);
      if (canStand(nx, ny, p.radius)) { p.x = nx; p.y = ny; }
      else break;
    }
    addParticles(p.x, p.y - 8, 8, '#ffe08a');
  }

  /* ============================ DAMAGE ============================ */
  function hitEnemiesInCone(x, y, dir, range, arc, power, opts = {}) {
    const r = G.runtime, p = r.player, st = p.stats;
    let any = false;
    for (const e of r.enemies) {
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - (y + 6);
      const d = Math.hypot(dx, dy);
      if (d > range + e.radius) continue;
      const dot = (dx * dir.x + dy * dir.y) / (d || 1);
      if (dot < Math.cos(arc)) continue;
      const crit = Math.random() < st.crit;
      let dmg = st.atk * power * (hasBuff('dmg') ? buffMult('dmg') : 1) * (1 + (p.stats.skill1Mult - 1) * 0);
      if (crit) dmg *= st.critDmg;
      dmg *= 1 - (e.def.def || 0) / ((e.def.def || 0) + 55);
      damageEnemy(e, Math.max(1, Math.round(dmg)), { crit, x: e.x, y: e.y - 12, stand: opts.stand });
      any = true;
    }
    return any;
  }

  function damageArea(x, y, radius, power, opts = {}) {
    const r = G.runtime, p = r.player, st = p.stats;
    let any = false;
    for (const e of r.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d > radius + e.radius) continue;
      const crit = Math.random() < st.crit;
      let dmg = st.atk * power * (hasBuff('dmg') ? buffMult('dmg') : 1);
      if (crit) dmg *= st.critDmg;
      dmg *= 1 - (e.def.def || 0) / ((e.def.def || 0) + 55);
      damageEnemy(e, Math.max(1, Math.round(dmg)), { crit, x: e.x, y: e.y - 12, color: opts.color });
      if (opts.stun) e.stun = Math.max(e.stun, opts.stun);
      if (opts.knockback) {
        const a = Math.atan2(e.y - y, e.x - x);
        const kb = opts.knockback;
        for (let i = 0; i < 6; i++) {
          const nx = e.x + Math.cos(a) * kb * 0.016, ny = e.y + Math.sin(a) * kb * 0.016;
          if (canStand(nx, ny, e.radius)) { e.x = nx; e.y = ny; } else break;
        }
      }
      any = true;
    }
    return any;
  }

  function damageLine(x1, y1, x2, y2, radius, power, opts = {}) {
    const r = G.runtime, st = r.player.stats;
    let any = false;
    for (const e of r.enemies) {
      if (e.dead) continue;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy) || 1;
      const t = Math.max(0, Math.min(1, ((e.x - x1) * dx + (e.y - y1) * dy) / (len * len)));
      const px = x1 + dx * t, py = y1 + dy * t;
      if (Math.hypot(e.x - px, e.y - py) > radius + e.radius) continue;
      const crit = Math.random() < st.crit;
      let dmg = st.atk * power * (hasBuff('dmg') ? buffMult('dmg') : 1);
      if (crit) dmg *= st.critDmg;
      dmg *= 1 - (e.def.def || 0) / ((e.def.def || 0) + 55);
      damageEnemy(e, Math.max(1, Math.round(dmg)), { crit, x: e.x, y: e.y - 12 });
      any = true;
    }
    return any;
  }

  function damageEnemy(e, dmg, opts = {}) {
    if (e.dead) return;
    e.hp -= dmg;
    e.hurtT = 0.14;
    e.hitFlash = 0.1;
    e.state = e.boss ? e.state : 'chase';
    addFloater(e.x + (Math.random() - 0.5) * 8, e.y - 22, String(dmg), opts.crit ? '#ffe35a' : '#fff0e0', opts.crit ? 11 : 9, opts.crit);
    addParticles(e.x, e.y - 10, opts.crit ? 8 : 4, opts.crit ? '#ffe35a' : '#ffb0a0');
    if (opts.crit && window.SOUND) SOUND.sfx('crit');
    if (e.hp <= 0) {
      e.hp = 0; e.dead = true; e.deadT = 0; e.state = 'dead';
      G.state.stats.kills++;
      G.state.heroes[G.state.activeHero].totalKills = (G.state.heroes[G.state.activeHero].totalKills || 0) + 1;
      const xp = Math.round(e.def.xp * (e.boss ? 1 : 1));
      G.gainXP(xp);
      const coins = Math.round(e.def.coins * (0.7 + Math.random() * 0.6));
      G.addCoins(coins);
      addFloater(e.x, e.y - 34, `+${coins}`, '#ffe08a', 8);
      addParticles(e.x, e.y - 12, e.boss ? 30 : 10, e.boss ? '#ffcf6a' : '#d8c8b0');
      if (e.boss) {
        G.runtime.screenShake = 12;
        G.runtime.bossActive = null;
        G.runtime.cameraLock = null;
        if (window.UI) UI.hideBoss();
        if (window.STORY) STORY.bossDefeated(e.type);
        if (window.SOUND) SOUND.sfx('victory');
      } else {
        if (window.SOUND) SOUND.sfx('hit');
        if (window.STORY) STORY.enemyKilled(e.type);
        // loot
        if (Math.random() < 0.22) {
          const loot = Math.random() < 0.55 ? 'smallHeal' : Math.random() < 0.6 ? 'energyDrink' : 'bigHeal';
          G.state.items[loot] = (G.state.items[loot] || 0) + 1;
          addFloater(e.x, e.y - 44, '+' + G.itemName(loot), '#9fe8ff', 8);
        }
      }
      if (window.UI) UI.updateHUD(true);
      G.save(true);
    }
  }

  function damagePlayer(raw, source) {
    const r = G.runtime, p = r.player;
    if (!p || p.invuln > 0 || r.death) return;
    const st = p.stats;
    let dmg = raw * (1 - st.def / (st.def + 60));
    if (G.state.activeHero === 'jonathan') dmg *= 0.9;
    dmg = Math.max(1, Math.round(dmg));
    const h = G.state.heroes[G.state.activeHero];
    h.hp = Math.max(0, h.hp - dmg);
    p.invuln = 0.55;
    p.hurtT = 0.35;
    addFloater(p.x, p.y - 30, '-' + dmg, '#ff6a6a', 10);
    addParticles(p.x, p.y - 12, 8, '#ff6a6a');
    G.runtime.screenShake = Math.max(r.screenShake, 5);
    if (window.SOUND) SOUND.sfx('hit');
    G.refreshHUD();
    if (h.hp <= 0) die();
  }

  function die() {
    const r = G.runtime;
    if (r.death) return;
    r.death = true;
    r.paused = true;
    $('#death-screen').classList.remove('hidden');
    $('#death-text').textContent = G.tr('ui.died') + ' ' + G.tr('ui.respawned') + '.';
    if (window.SOUND) { SOUND.sfx('death'); SOUND.setPaused(true); }
    G.save(true);
  }

  E.respawnPlayer = function () {
    const r = G.runtime, map = r.world;
    const station = map.station && G.state.stations[G.state.region] ? map.station : map.spawnPoint;
    r.player.x = station.x; r.player.y = station.y;
    r.player.invuln = 2;
    r.player.energy = r.player.stats.maxEnergy;
    r.projectiles = []; r.effects = []; r.particles = [];
    for (const e of r.enemies) {
      if (e.boss) { e.removed = true; continue; }
      e.state = 'idle'; e.alertT = 0; e.x = e.homeX; e.y = e.homeY;
    }
    r.enemies = r.enemies.filter(e => !e.removed);
    r.bossActive = null; r.cameraLock = null;
    if (window.UI) UI.hideBoss();
    if (window.STORY) STORY.onPlayerRespawn();
    G.fade(false);
    G.setPaused(false);
    G.regionBanner(G.state.region);
    G.toast(G.tr('ui.respawned'), 'good');
    G.save(true);
  };

  /* ============================ PROJECTILES / TRAPS ============================ */
  function spawnProjectile(o) {
    G.runtime.projectiles.push({
      x: o.x, y: o.y, vx: o.vx, vy: o.vy, life: o.life || 1, maxLife: o.life || 1,
      damage: o.damage, owner: o.owner, color: o.color || '#fff', size: o.size || 3,
      pierce: o.pierce || false, hitSet: o.hitSet || new Set(), boomerang: !!o.boomerang,
      origin: o.origin || null, range: o.range || 200, returning: false,
      delay: o.delay || 0, type: o.type || 'orb', angle: Math.atan2(o.vy || 0, o.vx || 0)
    });
  }

  function spawnEnemyProjectile(e, p, mul = 1) {
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    spawnProjectile({
      x: e.x, y: e.y - 14, vx: Math.cos(a) * (e.def.projSpeed || 130), vy: Math.sin(a) * (e.def.projSpeed || 130),
      life: 2.4, damage: e.def.atk * 0.85 * mul, owner: 'enemy',
      color: e.type === 'standAssassin' ? '#c48aff' : e.type === 'stoneCultist' ? '#d8a8ff' : '#ff7a5a', size: 3
    });
    if (window.SOUND) SOUND.sfx('stand');
  }

  function updateProjectiles(dt) {
    const r = G.runtime, p = r.player;
    for (const pr of r.projectiles) {
      if (pr.delay > 0) { pr.delay -= dt; continue; }
      pr.life -= dt;
      pr.x += pr.vx * dt; pr.y += pr.vy * dt;
      if (pr.boomerang) {
        if (!pr.returning) {
          if (Math.hypot(pr.x - pr.origin.x, pr.y - pr.origin.y) > pr.range) {
            pr.returning = true; pr.hitSet.clear();
          }
        } else {
          const dx = p.x - pr.x, dy = (p.y - 12) - pr.y, d = Math.hypot(dx, dy) || 1;
          pr.vx = dx / d * 300; pr.vy = dy / d * 300;
          if (d < 14) { pr.life = 0; }
        }
      }
      if (pr.owner === 'player') {
        for (const e of r.enemies) {
          if (e.dead || pr.hitSet.has(e)) continue;
          if (Math.hypot(e.x - pr.x, e.y - 10 - pr.y) < 13 + e.radius) {
            pr.hitSet.add(e);
            const st = p.stats;
            let dmg = pr.damage;
            if (Math.random() < st.crit) dmg *= st.critDmg;
            dmg *= 1 - (e.def.def || 0) / ((e.def.def || 0) + 55);
            damageEnemy(e, Math.max(1, Math.round(dmg)), { crit: false, x: e.x, y: e.y - 12 });
            addParticles(pr.x, pr.y, 4, pr.color);
            if (!pr.pierce && !pr.boomerang) { pr.life = 0; break; }
          }
        }
      } else {
        if (p.invuln <= 0 && Math.hypot(p.x - pr.x, p.y - 10 - pr.y) < 12) {
          damagePlayer(pr.damage, pr);
          pr.life = 0;
        }
      }
      if (pr.life <= 0) continue;
      if (W.isSolid(r.world, pr.x, pr.y)) pr.life = 0;
      if (Math.random() < 0.35) addParticle(pr.x, pr.y, 0, 0, 0.18, pr.color, 1);
    }
    r.projectiles = r.projectiles.filter(pr => pr.life > 0);
  }

  function updateTraps(dt) {
    const r = G.runtime;
    for (const tr of r.traps) {
      tr.life -= dt;
      tr.pulse += dt;
      if (!tr.armed) continue;
      for (const e of r.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - tr.x, e.y - tr.y) < tr.radius) {
          damageArea(tr.x, tr.y, tr.radius, tr.power / r.player.stats.atk, { knockback: 40, color: '#ffd15a' });
          addEffect({ type: 'nova', x: tr.x, y: tr.y, r0: 6, r1: tr.radius, life: 0.5, maxLife: 0.5, color: '#ffd15a' });
          addParticles(tr.x, tr.y, 16, '#ffe08a');
          tr.armed = false; tr.life = 0;
          if (window.SOUND) SOUND.sfx('hamon');
          break;
        }
      }
    }
    r.traps = r.traps.filter(t => t.life > 0);
  }

  /* ============================ EFFECTS ============================ */
  function addEffect(o) {
    o.maxLife = o.maxLife || o.life || 0.3;
    G.runtime.effects.push(o);
  }
  function updateEffects(dt) {
    const r = G.runtime;
    for (const e of r.effects) e.life -= dt;
    r.effects = r.effects.filter(e => e.life > 0);
    r.screenShake = Math.max(0, r.screenShake - dt * 26);
    if (r.timeStop > 0 && Math.random() < dt * 20) {
      addParticle(r.player.x + (Math.random() - 0.5) * 80, r.player.y - 20 + (Math.random() - 0.5) * 50, 0, 0, 0.3, '#d8c8ff', 1);
    }
  }
  function addParticle(x, y, vx, vy, life, color, size = 1) {
    G.runtime.particles.push({ x, y, vx, vy, life, maxLife: life, color, size, gravity: 0 });
  }
  function addParticles(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 70;
      G.runtime.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, life: 0.3 + Math.random() * 0.4, maxLife: 0.7, color, size: Math.random() > 0.7 ? 2 : 1, gravity: 90 });
    }
  }
  function updateParticles(dt) {
    const r = G.runtime;
    for (const p of r.particles) {
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += (p.gravity || 0) * dt;
    }
    r.particles = r.particles.filter(p => p.life > 0);
  }
  function addFloater(x, y, text, color, size = 9, crit = false) {
    G.runtime.floaters.push({ x, y, text, color, size, life: 0.9, maxLife: 0.9, vy: -28, crit });
  }
  function updateFloaters(dt) {
    const r = G.runtime;
    for (const f of r.floaters) { f.life -= dt; f.y += f.vy * dt; f.vy *= 0.97; }
    r.floaters = r.floaters.filter(f => f.life > 0);
  }

  function addBuff(b) {
    const r = G.runtime;
    const ex = r.buffs.find(x => x.type === b.type && x.nameKey === b.nameKey);
    if (ex) { ex.duration = Math.max(ex.duration, b.duration); ex.mult = Math.max(ex.mult, b.mult); }
    else r.buffs.push({ ...b });
  }

  /* ============================ COLLISION / CAMERA ============================ */
  function canStand(x, y, radius = 6) {
    const map = G.runtime.world;
    if (!map) return false;
    for (const [ox, oy] of [[-radius, -2], [radius, -2], [-radius, 2], [radius, 2], [0, 0], [0, -4]]) {
      if (W.isSolid(map, x + ox, y + oy)) return false;
    }
    return true;
  }

  function moveEntity(e, dx, dy, radius = 6) {
    if (canStand(e.x + dx, e.y, radius)) e.x += dx;
    if (canStand(e.x, e.y + dy, radius)) e.y += dy;
  }

  function clampToArena(e) {
    const a = G.runtime.cameraLock;
    if (!a) return;
    const pad = 12;
    e.x = Math.max(a.x + pad, Math.min(a.x + a.w - pad, e.x));
    e.y = Math.max(a.y + pad, Math.min(a.y + a.h - pad, e.y));
  }

  function updateCamera(dt) {
    const r = G.runtime, p = r.player;
    if (!p) return;
    let tx, ty;
    if (r.cameraLock) {
      tx = r.cameraLock.x + r.cameraLock.w / 2 - canvas.width / 2;
      ty = r.cameraLock.y + r.cameraLock.h / 2 - canvas.height / 2;
    } else {
      tx = p.x - canvas.width / 2 + p.facing.x * 10;
      ty = p.y - canvas.height / 2 + p.facing.y * 8;
    }
    const map = r.world;
    const maxX = map.w * TS - canvas.width, maxY = map.h * TS - canvas.height;
    tx = Math.max(0, Math.min(maxX, tx));
    ty = Math.max(0, Math.min(maxY, ty));
    const k = Math.min(1, dt * 7);
    r.camera.x += (tx - r.camera.x) * k;
    r.camera.y += (ty - r.camera.y) * k;
  }
  function clampCamera(snap) {
    const r = G.runtime, map = r.world;
    if (!map) return;
    const maxX = map.w * TS - canvas.width, maxY = map.h * TS - canvas.height;
    r.camera.x = Math.max(0, Math.min(maxX, r.camera.x));
    r.camera.y = Math.max(0, Math.min(maxY, r.camera.y));
    if (snap) { /* already set */ }
  }

  /* ============================ INTERACTIONS ============================ */
  function updateInteractionPrompt() {
    const r = G.runtime;
    let best = null, bd = 1e9;
    const p = r.player;
    const consider = (obj, type, label, dist) => {
      if (dist < bd && dist < 38) { bd = dist; best = { obj, type, label }; }
    };
    for (const n of r.npcs) consider(n, 'npc', 'ui.talk', Math.hypot(n.x - p.x, n.y - p.y));
    for (const o of r.world.objects) {
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (o.kind === 'chest') {
        const open = !!G.state.chests[o.chestId];
        consider(o, 'chest', open ? 'ui.chestEmpty' : 'ui.openChest', d);
      } else if (o.kind === 'station') {
        consider(o, 'station', G.state.stations[G.state.region] ? 'ui.stationHeal' : 'ui.activateStation', d);
      } else if (o.kind === 'hamonSpot') {
        consider(o, 'hamon', 'ui.train', d);
      } else if (o.kind === 'standMarker') {
        consider(o, 'stand', 'ui.activate', d);
      } else if (o.kind === 'portal') {
        consider(o, 'portal', 'ui.travelPrompt', d);
      }
    }
    for (const pk of r.world.pickups) {
      if (pk.collected || G.state.pickups[pk.id]) continue;
      const sq = G.state.side[pk.questId];
      if (!sq || sq.state !== 'active') continue;
      consider(pk, 'pickup', 'ui.pickup', Math.hypot(pk.x - p.x, pk.y - p.y));
    }
    r.currentInteract = best;
    const prompt = $('#interact-prompt');
    if (best) {
      prompt.classList.remove('hidden');
      $('#interact-text').textContent = G.tr(best.label);
    } else {
      prompt.classList.add('hidden');
    }
  }

  E.interact = function () {
    const r = G.runtime;
    if (!r.currentInteract || r.paused || r.dialogueOpen) return;
    const { obj, type } = r.currentInteract;
    if (type === 'npc') {
      if (window.STORY) STORY.talkTo(obj.id);
    } else if (type === 'chest') {
      openChest(obj);
    } else if (type === 'station') {
      useStation(obj);
    } else if (type === 'hamon') {
      if (window.STORY) STORY.useHamonSpot(obj.id);
    } else if (type === 'stand') {
      if (window.STORY) STORY.useStandMarker(obj.id);
    } else if (type === 'portal') {
      if (window.STORY) STORY.usePortal(obj);
    } else if (type === 'pickup') {
      collectPickup(obj);
    }
  };

  function openChest(o) {
    const id = o.chestId;
    if (G.state.chests[id]) { G.toast(G.tr('ui.chestEmpty'), 'bad'); return; }
    G.state.chests[id] = true;
    G.state.stats.chests++;
    const loot = o.loot || {};
    const coins = loot.coins || 0;
    if (coins) G.addCoins(coins);
    if (loot.item) {
      G.state.items[loot.item] = (G.state.items[loot.item] || 0) + 1;
      G.toast(`${G.tr('ui.gotItem')}: ${G.itemName(loot.item)}`, 'item');
      if (window.STORY) STORY.onCollectItem(loot.item, loot.quest);
    }
    if (o.rare) { G.state.stats.secrets++; G.toast(G.tr('ui.secretFound'), 'quest'); }
    G.toast(`${G.tr('ui.chestOpened')} · +${coins} ${G.tr('ui.coins')}`, 'good');
    addEffect({ type: 'ring', x: o.x, y: o.y - 6, r0: 4, r1: 22, life: 0.4, maxLife: 0.4, color: '#ffd15a', width: 2 });
    addParticles(o.x, o.y - 8, 10, '#ffd15a');
    if (window.SOUND) SOUND.sfx('chest');
    G.refreshHUD();
    if (window.UI) UI.refreshMenu();
    G.save(true);
  }

  function useStation(o) {
    const rid = G.state.region;
    if (!G.state.stations[rid]) {
      G.state.stations[rid] = true;
      G.toast(G.tr('ui.stationUnlocked'), 'quest');
      if (window.SOUND) SOUND.sfx('quest');
      if (window.STORY) STORY.onStationActivated(rid);
    } else {
      const h = G.state.heroes[G.state.activeHero];
      const st = G.heroStats(h.id, h);
      h.hp = st.maxHp;
      G.runtime.player.energy = st.maxEnergy;
      G.toast(G.tr('ui.stationHeal'), 'good');
      if (window.SOUND) SOUND.sfx('heal');
    }
    addEffect({ type: 'ring', x: o.x, y: o.y - 14, r0: 4, r1: 38, life: 0.6, maxLife: 0.6, color: '#37c9b8', width: 2 });
    addParticles(o.x, o.y - 18, 14, '#7effea');
    G.refreshHUD();
    if (window.UI) UI.refreshMenu();
    G.save(true);
  }

  function collectPickup(pk) {
    pk.collected = true;
    G.state.pickups[pk.id] = true;
    G.state.items[pk.item] = (G.state.items[pk.item] || 0) + 1;
    G.toast(`${G.tr('ui.gotItem')}: ${G.itemName(pk.item)}`, 'item');
    addParticles(pk.x, pk.y, 10, '#7effea');
    if (window.SOUND) SOUND.sfx('pickup');
    if (window.STORY) STORY.onCollectItem(pk.item, pk.questId);
    G.refreshHUD();
    if (window.UI) UI.refreshMenu();
    G.save(true);
  }

  E.travelTo = function (region, spawn) {
    if (!G.state) return;
    const unlock = D.REGIONS[region]?.unlockStage ?? 0;
    if (G.state.story.stage < unlock) { G.toast(G.tr('ui.regionLocked'), 'bad'); return; }
    if (window.UI) UI.closeMenu(true);
    G.fade(true, () => {
      G.state.region = region;
      const map = W.build(region);
      G.runtime.world = map;
      G.runtime.enemies = [];
      G.runtime.projectiles = [];
      G.runtime.effects = [];
      G.runtime.particles = [];
      G.runtime.floaters = [];
      G.runtime.traps = [];
      G.runtime.bossActive = null;
      G.runtime.cameraLock = null;
      G.runtime.target = null;
      G.runtime.autoAttack = false;
      G.runtime.player.x = spawn?.x ?? map.spawnPoint.x;
      G.runtime.player.y = spawn?.y ?? map.spawnPoint.y;
      G.runtime.player.invuln = 1.2;
      spawnNpcs(map);
      spawnEnemies(map);
      G.runtime.camera.x = G.runtime.player.x - canvas.width / 2;
      G.runtime.camera.y = G.runtime.player.y - canvas.height / 2;
      clampCamera(true);
      if (window.SOUND) { SOUND.setRegion(region); SOUND.sfx('portal'); }
      G.regionBanner(region);
      if (window.STORY) STORY.onEnterRegion(region, false);
      G.refreshHUD();
      if (window.UI) { UI.refreshSkillLabels(); UI.updateHUD(true); UI.hideBoss(); }
      G.save(true);
      setTimeout(() => G.fade(false), 250);
    });
  };

  E.spawnBoss = function (type) {
    const r = G.runtime, map = r.world;
    if (r.bossActive) return;
    const arena = map.arena;
    if (!arena) return;
    const e = createEnemy(type, arena.bossX, arena.bossY, {});
    e.boss = true; e.state = 'chase'; e.phase = 1;
    e.abilityCd = 2.5;
    r.enemies.push(e);
    r.bossActive = e;
    r.cameraLock = arena;
    if (window.UI) UI.showBoss(e);
    G.toast(G.tr('ui.bossAppeared') + ': ' + G.enemyName(type), 'bad');
    addEffect({ type: 'ring', x: e.x, y: e.y - 20, r0: 6, r1: 70, life: 0.8, maxLife: 0.8, color: '#ff4b4b', width: 4 });
    r.screenShake = 10;
    if (window.SOUND) SOUND.sfx('boss');
    G.save(true);
  };

  E.releaseBoss = function () {
    G.runtime.cameraLock = null;
    G.runtime.bossActive = null;
    if (window.UI) UI.hideBoss();
  };

  E.activateBoss = function (type) { E.spawnBoss(type); };

  /* ============================ WEATHER ============================ */
  function updateWeather(dt) {
    const r = G.runtime;
    const region = G.state.region;
    const weather = D.WEATHERS[region];
    r.weather = weather;
    r.lightning = Math.max(0, r.lightning - dt * 3);
    if (region === 'england') {
      r.rain = r.rain || [];
      if (r.rain.length < 70) {
        for (let i = 0; i < 3; i++) r.rain.push({ x: Math.random() * canvas.width, y: -10, v: 160 + Math.random() * 120, len: 4 + Math.random() * 5 });
      }
      for (const d of r.rain) { d.y += d.v * dt; d.x += d.v * 0.25 * dt; if (d.y > canvas.height) { d.y = -10; d.x = Math.random() * canvas.width; } }
      if (Math.random() < dt * 0.06) { r.lightning = 1; if (window.SOUND && G.settings.sfx) SOUND.sfx('boss'); }
    } else {
      r.rain = [];
      r.ambient = r.ambient || [];
      const max = region === 'italy' ? 24 : region === 'egypt' ? 30 : 18;
      if (r.ambient.length < max) r.ambient.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 8, life: 4 + Math.random() * 6, maxLife: 10 });
      for (const a of r.ambient) {
        a.x += a.vx * dt; a.y += a.vy * dt; a.life -= dt;
        if (a.life <= 0) { a.x = Math.random() * canvas.width; a.y = Math.random() * canvas.height; a.life = 4 + Math.random() * 6; }
      }
      r.ambient = r.ambient.filter(a => a.life > 0);
    }
  }

  E.getWeather = function () {
    return D.WEATHERS[G.state.region] || 'clear';
  };

  E.getTimeLabel = function () {
    const t = G.runtime.timeOfDay ?? 0.34;
    if (t < 0.18) return 'ui.timeMorning';
    if (t < 0.55) return 'ui.timeDay';
    if (t < 0.7) return 'ui.timeEvening';
    return 'ui.timeNight';
  };

  E.getClock = function () {
    const t = G.runtime.timeOfDay ?? 0.34;
    const hour = (6 + t * 24) % 24;
    const hh = Math.floor(hour);
    const mm = Math.floor((hour - hh) * 60);
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  };

  /* ============================ PUBLIC HELPERS ============================ */
  E.getPlayer = () => G.runtime.player;
  E.getWorld = () => G.runtime.world;
  E.canStand = canStand;
  E.moveEntity = moveEntity;
  E.addParticles = addParticles;
  E.addEffect = addEffect;
  E.damageEnemy = damageEnemy;
  E.spawnBoss = E.spawnBoss;
  E.clampCamera = clampCamera;
  E.screenToWorld = (sx, sy) => {
    const c = $('#game');
    const rect = c.getBoundingClientRect();
    return {
      x: (sx - rect.left) * (c.width / rect.width) + G.runtime.camera.x,
      y: (sy - rect.top) * (c.height / rect.height) + G.runtime.camera.y
    };
  };
  E.resize = function () {
    const c = $('#game');
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const scale = Math.max(2, Math.min(4, Math.round(Math.min(rect.width, rect.height) / 220)));
    const nw = Math.max(180, Math.round(rect.width / scale));
    const nh = Math.max(260, Math.round(rect.height / scale));
    if (c.width !== nw || c.height !== nh) {
      c.width = nw; c.height = nh;
    }
    if (G.runtime.world && G.runtime.player) {
      G.runtime.camera.x = Math.max(0, Math.min(G.runtime.world.w * TS - nw, G.runtime.player.x - nw / 2));
      G.runtime.camera.y = Math.max(0, Math.min(G.runtime.world.h * TS - nh, G.runtime.player.y - nh / 2));
    }
  };

  return E;
})();
