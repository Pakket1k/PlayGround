/* ============================================================
   Pixel art renderer — heroes, Stands, enemies, portraits
   Everything is drawn procedurally. No external image assets.
   ============================================================ */
window.ART = (() => {
  const D = window.GAME_DATA;
  const TAU = Math.PI * 2;

  const p = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  function ellipse(ctx, cx, cy, rx, ry, color) {
    ctx.fillStyle = color;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      ctx.fillRect(Math.round(cx - w), Math.round(cy + y), Math.max(1, w * 2 + 1), 1);
    }
  }

  function glow(ctx, x, y, r, color, alpha = 0.5) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function hash(x, y, s = 1) {
    let h = Math.imul(x + 0x9e3779b9, 374761393) ^ Math.imul(y + 0x85ebca6b, 668265263) ^ Math.imul(s, 2246822519);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  const FACING = (facing) => {
    const dx = facing?.x || 0, dy = facing?.y ?? 1;
    return {
      mirror: dx < -0.25,
      back: dy < -0.52,
      side: Math.abs(dx) > Math.abs(dy) * 0.72,
      dx, dy
    };
  };

  /* ============================ HEROES ============================ */
  function hero(ctx, id, x, y, facing, t, opts = {}) {
    const c = D.CHARACTERS[id] || D.CHARACTERS.jonathan;
    const pal = c.palette;
    const f = FACING(facing);
    const moving = !!opts.moving;
    const walk = moving ? Math.sin(t * 11.5) : 0;
    const bob = moving ? Math.abs(Math.sin(t * 11.5)) : Math.sin(t * 2.1) * 0.45;
    const attacking = opts.attackT != null;
    const attack = attacking ? Math.max(0, Math.min(1, opts.attackT)) : 0;
    const pose = !moving && !attacking && opts.pose !== false && (t % 7.2) < 1.25;
    const cast = opts.castT != null;

    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (f.mirror) ctx.scale(-1, 1);

    ellipse(ctx, 0, -0.5, 7, 2.3, 'rgba(0,0,0,.34)');

    if (opts.hamon) {
      glow(ctx, 0, -13, 18, 'rgba(255,213,80,.5)', 0.75);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const a = t * 2.1 + i * 1.7;
        const px = Math.cos(a) * (8 + (i % 2) * 3);
        const py = -14 + Math.sin(a * 1.3) * 9;
        p(ctx, px, py, 1, 1, i % 2 ? '#ffe98a' : '#ffc93c');
      }
      ctx.restore();
    }

    if (opts.stand && opts.stand.behind !== false) {
      stand(ctx, 0, 1, facing, t, { ...opts.stand, behind: true });
    }

    const by = -bob;
    const legA = Math.round(walk * 2);
    const legB = -legA;

    // Coat tails / shadow
    if (id === 'jotaro') {
      p(ctx, -6, -12 + by, 3, 9, pal.coat2);
      p(ctx, 3, -12 + by, 3, 9, pal.coat2);
    } else if (id === 'jonathan') {
      p(ctx, -6, -11 + by, 3, 6, pal.coat2);
      p(ctx, 3, -11 + by, 3, 6, pal.coat2);
    }

    // Legs
    p(ctx, -4, -8 + by + Math.max(0, legA), 3, 6, pal.pants);
    p(ctx, 1, -8 + by + Math.max(0, legB), 3, 6, pal.pants);
    p(ctx, -4, -3 + by + Math.max(0, legA), 3, 2, pal.boots);
    p(ctx, 1, -3 + by + Math.max(0, legB), 3, 2, pal.boots);
    p(ctx, -4, -9 + by, 3, 2, pal.coat2);
    p(ctx, 1, -9 + by, 3, 2, pal.coat2);

    // Torso
    p(ctx, -5, -18 + by, 10, 10, pal.coat);
    p(ctx, -5, -18 + by, 10, 2, pal.coat2);
    p(ctx, 3, -17 + by, 2, 8, pal.coat2);
    p(ctx, -5, -10 + by, 10, 2, pal.boots);
    p(ctx, -1, -10 + by, 2, 2, pal.accent);

    // Chest details
    if (id === 'jonathan') {
      p(ctx, -1, -17 + by, 2, 2, pal.accent);
      p(ctx, -1, -14 + by, 2, 2, pal.accent);
      p(ctx, -4, -18 + by, 8, 1, pal.accent);
      p(ctx, -3, -20 + by, 6, 3, pal.scarf);
      p(ctx, -1, -21 + by, 2, 2, pal.scarf);
      p(ctx, -2, -19 + by, 4, 1, '#f3e3d0');
    } else if (id === 'joseph') {
      p(ctx, -4, -18 + by, 8, 2, pal.scarf);
      p(ctx, 3, -18 + by, 6, 2, pal.scarf);
      p(ctx, 7, -17 + by, 4, 1, pal.scarf);
      p(ctx, 9, -16 + by, 3, 1, pal.scarf);
      p(ctx, -2, -16 + by, 4, 1, pal.accent);
      p(ctx, -4, -11 + by, 8, 1, pal.accent);
    } else {
      p(ctx, -5, -17 + by, 10, 1, pal.accent);
      p(ctx, -4, -16 + by, 1, 1, pal.accent);
      p(ctx, -2, -15 + by, 1, 1, pal.accent);
      p(ctx, 0, -16 + by, 1, 1, pal.accent);
      p(ctx, 2, -15 + by, 1, 1, pal.accent);
      p(ctx, 4, -16 + by, 1, 1, pal.accent);
      p(ctx, -5, -19 + by, 10, 1, pal.scarf);
    }

    // Arms
    const armL = Math.round(walk * 1.5);
    const armR = -armL;
    if (!cast) {
      p(ctx, -7, -17 + by + armL, 2, 6, pal.coat);
      p(ctx, -7, -11 + by + armL, 2, 2, id === 'joseph' ? pal.accent : pal.skin);
      if (attacking && attack > 0.12 && attack < 0.88) {
        p(ctx, 5, -15 + by, 7, 3, pal.coat);
        p(ctx, 11, -16 + by, 3, 4, id === 'joseph' ? pal.accent : pal.skin);
        p(ctx, 13, -15 + by, 1, 2, pal.skin2);
      } else if (pose) {
        if (id === 'jotaro') {
          p(ctx, 5, -24 + by, 2, 6, pal.coat);
          p(ctx, 6, -27 + by, 2, 3, pal.skin);
          p(ctx, 8, -27 + by, 4, 1, pal.skin);
        } else if (id === 'joseph') {
          p(ctx, 5, -23 + by, 2, 7, pal.coat);
          p(ctx, 5, -26 + by, 2, 3, pal.accent);
          p(ctx, 6, -27 + by, 3, 1, pal.accent);
        } else {
          p(ctx, 3, -18 + by, 4, 2, pal.coat);
          p(ctx, 5, -20 + by, 3, 3, pal.skin);
          p(ctx, 7, -21 + by, 1, 2, pal.accent);
        }
      } else {
        p(ctx, 5, -17 + by + armR, 2, 6, pal.coat);
        p(ctx, 5, -11 + by + armR, 2, 2, id === 'joseph' ? pal.accent : pal.skin);
      }
    } else {
      p(ctx, -8, -25 + by, 2, 8, pal.coat);
      p(ctx, 6, -25 + by, 2, 8, pal.coat);
      p(ctx, -8, -27 + by, 2, 2, pal.skin);
      p(ctx, 6, -27 + by, 2, 2, pal.skin);
    }

    // Head + hair
    p(ctx, -2, -20 + by, 4, 2, pal.skin2);
    p(ctx, -4, -28 + by, 8, 8, pal.skin);
    p(ctx, -4, -28 + by, 8, 2, pal.skin2);
    if (f.back) {
      p(ctx, -5, -29 + by, 10, 8, pal.hair);
      p(ctx, -5, -22 + by, 2, 3, pal.hair);
      p(ctx, 3, -22 + by, 2, 3, pal.hair);
      if (id === 'jotaro') {
        p(ctx, -6, -29 + by, 12, 3, '#10121c');
        p(ctx, -4, -22 + by, 8, 2, '#10121c');
      }
    } else {
      if (id === 'jotaro') {
        p(ctx, -5, -29 + by, 10, 4, '#11131e');
        p(ctx, -6, -26 + by, 12, 2, '#11131e');
        p(ctx, -2, -29 + by, 4, 2, pal.accent);
        p(ctx, -5, -22 + by, 2, 4, '#1a1d2c');
        p(ctx, 3, -22 + by, 2, 4, '#1a1d2c');
        p(ctx, -6, -25 + by, 1, 2, '#11131e');
        p(ctx, 5, -25 + by, 1, 2, '#11131e');
        if (f.side) {
          p(ctx, f.mirror ? -3 : 2, -24 + by, 1, 1, '#7fe6f2');
        } else {
          p(ctx, -2, -24 + by, 1, 1, '#7fe6f2');
          p(ctx, 2, -24 + by, 1, 1, '#7fe6f2');
        }
      } else if (id === 'joseph') {
        p(ctx, -5, -30 + by, 10, 4, pal.hair);
        p(ctx, -5, -27 + by, 2, 4, pal.hair);
        p(ctx, 3, -27 + by, 2, 3, pal.hair);
        p(ctx, -4, -30 + by, 3, 2, pal.hair2);
        p(ctx, 2, -31 + by, 3, 2, pal.hair2);
        p(ctx, -1, -25 + by, 1, 1, '#2a160b');
        p(ctx, 2, -25 + by, 1, 1, '#2a160b');
        p(ctx, 0, -23 + by, 2, 1, '#9e6b4a');
      } else {
        p(ctx, -5, -29 + by, 10, 4, pal.hair);
        p(ctx, -5, -26 + by, 2, 5, pal.hair);
        p(ctx, 3, -26 + by, 2, 3, pal.hair);
        p(ctx, -4, -30 + by, 4, 1, pal.hair2);
        p(ctx, 0, -25 + by, 1, 1, '#203050');
        p(ctx, 2, -25 + by, 1, 1, '#203050');
        p(ctx, 0, -23 + by, 2, 1, '#b77758');
      }
    }

    if (opts.hurt) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.globalCompositeOperation = 'lighter';
      ellipse(ctx, 0, -13, 9, 15, 'rgba(255,90,90,.8)');
      ctx.restore();
    }

    ctx.restore();
  }

  /* ============================ STAND ============================ */
  function stand(ctx, x, y, facing, t, opts = {}) {
    const f = FACING(facing);
    const alpha = opts.alpha ?? 0.62;
    const scale = opts.scale ?? 1;
    const punch = opts.punch || 0;
    const back = opts.behind;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (f.mirror) ctx.scale(-1, 1);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    if (back) ctx.globalAlpha = alpha * 0.72;

    ellipse(ctx, 0, -1, 10, 2.6, 'rgba(0,0,0,.3)');

    const main = '#8d6ad8', main2 = '#5a3c9a', dark = '#38216b', light = '#d8c8ff', gold = '#e7c45b';
    const bob = Math.sin(t * 3.4) * 0.7;

    // legs
    p(ctx, -6, -9 + bob, 4, 9, main2);
    p(ctx, 2, -9 + bob, 4, 9, main2);
    p(ctx, -7, -2 + bob, 5, 2, dark);
    p(ctx, 2, -2 + bob, 5, 2, dark);
    // torso
    p(ctx, -8, -21 + bob, 16, 13, main);
    p(ctx, -8, -21 + bob, 16, 2, light);
    p(ctx, 4, -20 + bob, 4, 11, main2);
    p(ctx, -8, -11 + bob, 16, 2, dark);
    // shoulders
    p(ctx, -11, -22 + bob, 4, 5, main);
    p(ctx, 7, -22 + bob, 4, 5, main);
    p(ctx, -10, -23 + bob, 3, 2, light);
    p(ctx, 7, -23 + bob, 3, 2, light);
    // head
    p(ctx, -4, -30 + bob, 8, 8, main);
    p(ctx, -4, -30 + bob, 8, 2, light);
    p(ctx, -5, -27 + bob, 1, 4, main2);
    p(ctx, 4, -27 + bob, 1, 4, main2);
    p(ctx, -3, -26 + bob, 1, 1, '#fff');
    p(ctx, 2, -26 + bob, 1, 1, '#fff');
    p(ctx, -2, -24 + bob, 4, 1, dark);
    // headband
    p(ctx, -5, -31 + bob, 10, 2, gold);
    p(ctx, 3, -32 + bob, 3, 1, gold);
    // star emblem
    p(ctx, -1, -19 + bob, 3, 3, gold);
    p(ctx, 0, -20 + bob, 1, 5, gold);
    p(ctx, -2, -18 + bob, 5, 1, gold);
    // arms / fists
    if (punch > 0) {
      const ext = 8 + punch * 10;
      p(ctx, 8, -19 + bob, ext, 4, main);
      p(ctx, 8 + ext, -21 + bob, 5, 7, main);
      p(ctx, 9 + ext, -22 + bob, 3, 2, light);
      p(ctx, -10, -17 + bob, 3, 6, main2);
      p(ctx, -11, -11 + bob, 4, 4, main);
      // motion lines
      ctx.save();
      ctx.globalAlpha = alpha * 0.5;
      for (let i = 0; i < 3; i++) p(ctx, 12 + i * 5, -20 + i * 3 + bob, 7, 1, light);
      ctx.restore();
    } else {
      p(ctx, -11, -19 + bob, 3, 8, main2);
      p(ctx, 8, -19 + bob, 3, 8, main2);
      p(ctx, -12, -12 + bob, 5, 5, main);
      p(ctx, 8, -12 + bob, 5, 5, main);
      p(ctx, -11, -11 + bob, 3, 2, light);
      p(ctx, 9, -11 + bob, 3, 2, light);
    }
    // aura
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = t * 2 + i * 1.2;
      p(ctx, Math.cos(a) * 13, -16 + Math.sin(a * 1.4) * 12 + bob, 1, 1, i % 2 ? '#c6a6ff' : '#7fe8ff');
    }
    ctx.restore();
    ctx.restore();
  }

  /* ============================ ENEMIES ============================ */
  function enemy(ctx, type, x, y, facing, t, opts = {}) {
    const def = D.ENEMIES[type] || D.ENEMIES.zombie;
    const f = FACING(facing);
    const s = (def.scale || 1) * (opts.scale || 1);
    const walk = opts.moving ? Math.sin(t * 9) : 0;
    const bob = Math.sin(t * 2.7 + (opts.seed || 0)) * 0.6;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (f.mirror) ctx.scale(-1, 1);
    ctx.scale(s, s);
    ellipse(ctx, 0, 0, 8, 2.5, 'rgba(0,0,0,.35)');

    if (opts.alert) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      p(ctx, -1, -38, 3, 7, '#ff4d4d');
      p(ctx, -1, -30, 3, 3, '#ff4d4d');
      ctx.restore();
    }
    if (opts.hurt) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = 'lighter';
      ellipse(ctx, 0, -13, 10, 15, 'rgba(255,100,100,.8)');
      ctx.restore();
    }

    const k = def.kind;
    if (k === 'scorpion') {
      drawScorpion(ctx, t, walk, opts);
    } else if (k === 'dioVampire') {
      drawDioVampire(ctx, t, walk, bob, opts);
    } else if (k === 'wamuu') {
      drawWamuu(ctx, t, walk, bob, opts);
    } else if (k === 'esidisi') {
      drawEsidisi(ctx, t, walk, bob, opts);
    } else if (k === 'dio') {
      drawDio(ctx, t, walk, bob, opts);
    } else if (k === 'assassin') {
      drawAssassin(ctx, t, walk, bob, opts);
    } else if (k === 'cultist') {
      drawCultist(ctx, t, walk, bob, opts);
    } else if (k === 'raider') {
      drawRaider(ctx, t, walk, bob, opts);
    } else if (k === 'vampire') {
      drawVampire(ctx, t, walk, bob, opts);
    } else {
      drawZombie(ctx, t, walk, bob, opts);
    }
    ctx.restore();
  }

  function drawZombie(ctx, t, walk, bob, o) {
    const skin = '#6f8d52', skin2 = '#4e6b39', cloth = '#6b5a45', cloth2 = '#4b3f30', eye = '#ff4040';
    p(ctx, -4, -8 + bob + Math.max(0, walk * 2), 3, 7, cloth2);
    p(ctx, 1, -8 + bob + Math.max(0, -walk * 2), 3, 7, cloth2);
    p(ctx, -4, -2 + bob, 3, 2, '#332a20');
    p(ctx, 1, -2 + bob, 3, 2, '#332a20');
    p(ctx, -6, -17 + bob, 12, 10, cloth);
    p(ctx, -6, -17 + bob, 12, 2, cloth2);
    p(ctx, -3, -15 + bob, 2, 2, '#2a241c');
    p(ctx, 1, -13 + bob, 2, 2, '#2a241c');
    p(ctx, -2, -18 + bob, 4, 2, skin2);
    p(ctx, -5, -27 + bob, 10, 9, skin);
    p(ctx, -5, -27 + bob, 10, 2, skin2);
    p(ctx, -4, -23 + bob, 2, 2, eye);
    p(ctx, 2, -23 + bob, 2, 2, eye);
    p(ctx, -2, -20 + bob, 4, 1, '#2b1b18');
    p(ctx, -1, -19 + bob, 2, 1, '#e8e2c8');
    // arms reaching
    p(ctx, 5, -16 + bob, 7, 3, skin);
    p(ctx, 11, -17 + bob, 3, 4, skin);
    p(ctx, -8, -16 + bob, 3, 6, skin2);
    p(ctx, -9, -10 + bob, 3, 3, skin);
    if (o.attacking) { p(ctx, 11, -22 + bob, 2, 5, skin); }
  }

  function drawVampire(ctx, t, walk, bob, o) {
    const skin = '#d7c9c2', skin2 = '#a79895', coat = '#3a2238', coat2 = '#241326', eye = '#ff5050';
    p(ctx, -4, -8 + bob + Math.max(0, walk * 2), 3, 7, '#1a1622');
    p(ctx, 1, -8 + bob + Math.max(0, -walk * 2), 3, 7, '#1a1622');
    p(ctx, -4, -2 + bob, 3, 2, '#0e0c14');
    p(ctx, 1, -2 + bob, 3, 2, '#0e0c14');
    p(ctx, -6, -18 + bob, 12, 11, coat);
    p(ctx, -6, -18 + bob, 12, 2, coat2);
    p(ctx, 4, -17 + bob, 2, 9, coat2);
    p(ctx, -1, -16 + bob, 2, 4, '#9a1d32');
    p(ctx, -5, -20 + bob, 10, 2, '#9a1d32');
    p(ctx, -4, -28 + bob, 8, 9, skin);
    p(ctx, -4, -28 + bob, 8, 2, skin2);
    p(ctx, -5, -29 + bob, 10, 3, '#1e1724');
    p(ctx, -3, -24 + bob, 1, 1, eye);
    p(ctx, 2, -24 + bob, 1, 1, eye);
    p(ctx, -2, -21 + bob, 4, 1, '#5e2229');
    p(ctx, -1, -20 + bob, 1, 1, '#fff');
    p(ctx, 1, -20 + bob, 1, 1, '#fff');
    p(ctx, -7, -17 + bob, 2, 7, coat);
    p(ctx, 5, -17 + bob, 2, 7, coat);
    p(ctx, -7, -11 + bob, 2, 3, skin2);
    p(ctx, 5, -11 + bob, 2, 3, skin2);
    p(ctx, -3, -11 + bob, 2, 8, coat2);
    p(ctx, 1, -11 + bob, 2, 8, coat2);
    if (o.attacking) {
      p(ctx, 7, -18 + bob, 5, 2, coat);
      p(ctx, 11, -19 + bob, 3, 4, skin);
      p(ctx, 13, -17 + bob, 2, 1, '#fff');
    }
  }

  function drawCultist(ctx, t, walk, bob, o) {
    const robe = '#4b4268', robe2 = '#322b4a', mask = '#a9a28d', mask2 = '#736c5c', eye = '#d9b3ff';
    p(ctx, -6, -19 + bob, 12, 19, robe);
    p(ctx, -7, -15 + bob, 14, 15, robe);
    p(ctx, -7, -15 + bob, 14, 2, robe2);
    p(ctx, -3, -30 + bob, 6, 11, robe2);
    p(ctx, -4, -31 + bob, 8, 9, mask);
    p(ctx, -4, -31 + bob, 8, 2, mask2);
    p(ctx, -3, -27 + bob, 2, 2, '#1b1222');
    p(ctx, 1, -27 + bob, 2, 2, eye);
    p(ctx, -1, -23 + bob, 2, 1, '#2b2338');
    p(ctx, 7, -22 + bob, 2, 18, '#5c4327');
    p(ctx, 7, -24 + bob, 3, 3, '#b58a3a');
    if (o.attacking) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glow(ctx, 9, -23 + bob, 8, 'rgba(210,160,255,.8)', 0.8);
      ctx.restore();
    }
  }

  function drawRaider(ctx, t, walk, bob, o) {
    const robe = '#a47c4b', robe2 = '#75552f', skin = '#b47c50', turban = '#e0d1ac';
    p(ctx, -4, -8 + bob + Math.max(0, walk * 2), 3, 7, robe2);
    p(ctx, 1, -8 + bob + Math.max(0, -walk * 2), 3, 7, robe2);
    p(ctx, -4, -2 + bob, 3, 2, '#3a2818');
    p(ctx, 1, -2 + bob, 3, 2, '#3a2818');
    p(ctx, -6, -18 + bob, 12, 11, robe);
    p(ctx, -6, -18 + bob, 12, 2, robe2);
    p(ctx, -4, -19 + bob, 8, 2, '#6b4a28');
    p(ctx, -4, -27 + bob, 8, 8, skin);
    p(ctx, -5, -29 + bob, 10, 4, turban);
    p(ctx, -5, -26 + bob, 2, 2, turban);
    p(ctx, -3, -24 + bob, 1, 1, '#1b120c');
    p(ctx, 2, -24 + bob, 1, 1, '#1b120c');
    p(ctx, -2, -22 + bob, 4, 1, '#5b3520');
    p(ctx, -7, -17 + bob, 2, 7, robe);
    p(ctx, -7, -11 + bob, 2, 2, skin);
    p(ctx, 5, -17 + bob, 2, 7, robe);
    p(ctx, 6, -13 + bob, 2, 2, skin);
    // scimitar
    p(ctx, 7, -20 + bob, 1, 9, '#d9d4c2');
    p(ctx, 8, -22 + bob, 1, 4, '#f0ead8');
    p(ctx, 6, -12 + bob, 4, 1, '#8a6a2c');
    if (o.attacking) { p(ctx, 8, -25 + bob, 2, 6, '#f0ead8'); }
  }

  function drawAssassin(ctx, t, walk, bob, o) {
    const suit = '#26233b', suit2 = '#151327', glowc = '#8a5cff', skin = '#c9a58a';
    p(ctx, -4, -9 + bob + Math.max(0, walk * 2), 3, 8, suit2);
    p(ctx, 1, -9 + bob + Math.max(0, -walk * 2), 3, 8, suit2);
    p(ctx, -4, -2 + bob, 3, 2, '#0d0b14');
    p(ctx, 1, -2 + bob, 3, 2, '#0d0b14');
    p(ctx, -6, -19 + bob, 12, 11, suit);
    p(ctx, -6, -19 + bob, 12, 2, glowc);
    p(ctx, -1, -17 + bob, 2, 8, glowc);
    p(ctx, -4, -28 + bob, 8, 8, skin);
    p(ctx, -5, -29 + bob, 10, 4, suit2);
    p(ctx, -3, -24 + bob, 1, 1, glowc);
    p(ctx, 2, -24 + bob, 1, 1, glowc);
    p(ctx, -2, -22 + bob, 4, 1, '#4a2b39');
    p(ctx, -7, -18 + bob, 2, 8, suit);
    p(ctx, 5, -18 + bob, 2, 8, suit);
    p(ctx, 6, -11 + bob, 3, 2, skin);
    p(ctx, 8, -14 + bob, 1, 5, '#d8d4e8');
    if (o.attacking) { p(ctx, 7, -20 + bob, 2, 8, '#d8d4e8'); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const a = t * 2.5 + i * 2;
      p(ctx, Math.cos(a) * 10, -14 + Math.sin(a) * 12 + bob, 1, 1, glowc);
    }
    ctx.restore();
  }

  function drawScorpion(ctx, t, walk, o) {
    const body = '#8c4a2a', body2 = '#5e2e18', claw = '#b96a35', eye = '#ffcf4a';
    for (let i = 0; i < 4; i++) {
      const off = Math.sin(t * 8 + i) * 1.2;
      p(ctx, -9 + i * 5, -4 + off, 2, 3, body2);
      p(ctx, -11 + i * 5, -1, 2, 1, body2);
    }
    p(ctx, -6, -10, 12, 7, body);
    p(ctx, -4, -12, 8, 3, body2);
    p(ctx, -2, -13, 4, 2, '#c87a42');
    p(ctx, -3, -9, 1, 1, eye);
    p(ctx, 2, -9, 1, 1, eye);
    // pincers
    p(ctx, -10, -9, 4, 2, claw);
    p(ctx, -12, -11, 3, 2, claw);
    p(ctx, 6, -9, 4, 2, claw);
    p(ctx, 9, -11, 3, 2, claw);
    // tail
    p(ctx, 3, -12, 2, 5, body2);
    p(ctx, 4, -16, 2, 5, body);
    p(ctx, 3, -20, 3, 4, body2);
    p(ctx, 2, -22, 4, 2, claw);
    p(ctx, 3, -23, 2, 1, '#e8c060');
  }

  function drawDioVampire(ctx, t, walk, bob, o) {
    const skin = '#e4d7cf', hair = '#e7c76a', coat = '#5b2630', coat2 = '#37151e', gold = '#e7b94a';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -15, 24, 'rgba(220,30,50,.5)', 0.6); ctx.restore();
    p(ctx, -5, -10 + bob + Math.max(0, walk * 2), 4, 9, '#1b1524');
    p(ctx, 1, -10 + bob + Math.max(0, -walk * 2), 4, 9, '#1b1524');
    p(ctx, -6, -2 + bob, 5, 2, '#0d0a12');
    p(ctx, 1, -2 + bob, 5, 2, '#0d0a12');
    p(ctx, -8, -23 + bob, 16, 14, coat);
    p(ctx, -8, -23 + bob, 16, 2, gold);
    p(ctx, -2, -21 + bob, 4, 10, coat2);
    p(ctx, -8, -13 + bob, 16, 3, coat2);
    p(ctx, -7, -26 + bob, 14, 3, '#7a2b38');
    p(ctx, -5, -35 + bob, 10, 10, skin);
    p(ctx, -6, -37 + bob, 12, 4, hair);
    p(ctx, -7, -33 + bob, 2, 7, hair);
    p(ctx, 5, -33 + bob, 2, 7, hair);
    p(ctx, -6, -38 + bob, 3, 2, hair);
    p(ctx, -1, -38 + bob, 4, 2, hair);
    p(ctx, -4, -31 + bob, 2, 1, '#ff3b3b');
    p(ctx, 2, -31 + bob, 2, 1, '#ff3b3b');
    p(ctx, -2, -27 + bob, 4, 1, '#6e1d25');
    p(ctx, -2, -26 + bob, 1, 1, '#fff');
    p(ctx, 1, -26 + bob, 1, 1, '#fff');
    p(ctx, -10, -22 + bob, 3, 10, coat);
    p(ctx, 7, -22 + bob, 3, 10, coat);
    p(ctx, -10, -12 + bob, 3, 3, skin);
    p(ctx, 7, -12 + bob, 3, 3, skin);
    p(ctx, -11, -14 + bob, 1, 2, '#fff');
    p(ctx, 10, -14 + bob, 1, 2, '#fff');
    // cape
    p(ctx, -11, -24 + bob, 3, 16, coat2);
    p(ctx, 8, -24 + bob, 3, 16, coat2);
    if (o.attacking) {
      p(ctx, 9, -24 + bob, 6, 3, coat);
      p(ctx, 14, -26 + bob, 3, 6, skin);
      p(ctx, 16, -24 + bob, 2, 1, '#ff4b4b');
    }
  }

  function drawWamuu(ctx, t, walk, bob, o) {
    const skin = '#8d5a48', skin2 = '#663d31', white = '#e8e3d6', gold = '#d8ad4b';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a = t * 1.8 + i * 1.6;
      p(ctx, Math.cos(a) * 18, -18 + Math.sin(a) * 14 + bob, 1, 1, '#bfeaff');
    }
    ctx.restore();
    p(ctx, -6, -12 + bob + Math.max(0, walk * 2), 5, 11, skin2);
    p(ctx, 1, -12 + bob + Math.max(0, -walk * 2), 5, 11, skin2);
    p(ctx, -7, -2 + bob, 6, 2, '#3a2a22');
    p(ctx, 1, -2 + bob, 6, 2, '#3a2a22');
    p(ctx, -10, -27 + bob, 20, 16, skin);
    p(ctx, -10, -27 + bob, 20, 2, skin2);
    p(ctx, -3, -25 + bob, 6, 2, gold);
    p(ctx, -3, -18 + bob, 6, 2, gold);
    p(ctx, -11, -26 + bob, 5, 6, skin);
    p(ctx, 6, -26 + bob, 5, 6, skin);
    p(ctx, -12, -20 + bob, 4, 10, skin2);
    p(ctx, 8, -20 + bob, 4, 10, skin2);
    p(ctx, -12, -11 + bob, 4, 4, skin);
    p(ctx, 8, -11 + bob, 4, 4, skin);
    // head
    p(ctx, -6, -39 + bob, 12, 11, skin);
    p(ctx, -6, -39 + bob, 12, 2, skin2);
    p(ctx, -8, -42 + bob, 16, 4, white);
    p(ctx, -8, -38 + bob, 3, 8, white);
    p(ctx, 5, -38 + bob, 3, 8, white);
    p(ctx, -4, -43 + bob, 4, 4, gold);
    p(ctx, 1, -43 + bob, 4, 4, gold);
    p(ctx, -7, -45 + bob, 3, 4, white);
    p(ctx, 4, -45 + bob, 3, 4, white);
    p(ctx, -4, -35 + bob, 2, 1, '#e8d77a');
    p(ctx, 2, -35 + bob, 2, 1, '#e8d77a');
    p(ctx, -2, -31 + bob, 4, 1, '#4b2420');
    // wind aura
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#c9f2ff';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc(0, -20 + bob, 16 + i * 6, t * 1.2 + i, t * 1.2 + i + 2.2);
      ctx.stroke();
    }
    ctx.restore();
    if (o.attacking) {
      p(ctx, 10, -30 + bob, 8, 3, skin);
      p(ctx, 17, -32 + bob, 4, 6, skin2);
    }
  }

  function drawEsidisi(ctx, t, walk, bob, o) {
    const skin = '#a94e3b', skin2 = '#7b3124', vein = '#d8794e', pants = '#3c2a2e';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -18, 22, 'rgba(255,90,20,.4)', 0.5); ctx.restore();
    p(ctx, -6, -11 + bob + Math.max(0, walk * 2), 5, 10, pants);
    p(ctx, 1, -11 + bob + Math.max(0, -walk * 2), 5, 10, pants);
    p(ctx, -6, -2 + bob, 5, 2, '#241a1c');
    p(ctx, 1, -2 + bob, 5, 2, '#241a1c');
    p(ctx, -9, -26 + bob, 18, 16, skin);
    p(ctx, -9, -26 + bob, 18, 2, skin2);
    // veins
    p(ctx, -5, -24 + bob, 1, 5, vein);
    p(ctx, -2, -22 + bob, 1, 7, vein);
    p(ctx, 3, -24 + bob, 1, 6, vein);
    p(ctx, 6, -20 + bob, 1, 5, vein);
    p(ctx, -10, -25 + bob, 4, 7, skin);
    p(ctx, 6, -25 + bob, 4, 7, skin);
    p(ctx, -12, -18 + bob, 3, 9, skin2);
    p(ctx, 9, -18 + bob, 3, 9, skin2);
    p(ctx, -12, -10 + bob, 4, 4, skin);
    p(ctx, 9, -10 + bob, 4, 4, skin);
    // head
    p(ctx, -5, -37 + bob, 10, 11, skin);
    p(ctx, -5, -37 + bob, 10, 2, skin2);
    p(ctx, -4, -39 + bob, 8, 3, '#2a1b1c');
    p(ctx, -5, -35 + bob, 1, 4, vein);
    p(ctx, 4, -35 + bob, 1, 4, vein);
    p(ctx, -3, -32 + bob, 2, 1, '#ffd85e');
    p(ctx, 2, -32 + bob, 2, 1, '#ffd85e');
    p(ctx, -2, -28 + bob, 4, 1, '#5e1f1f');
    // fire wisps
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const a = t * 3 + i * 1.4;
      p(ctx, Math.cos(a) * 12, -24 + Math.sin(a * 1.7) * 12 + bob, 1, 2, i % 2 ? '#ffb347' : '#ff5a2a');
    }
    ctx.restore();
    if (o.attacking) {
      p(ctx, 11, -28 + bob, 7, 3, skin);
      p(ctx, 17, -30 + bob, 4, 6, skin2);
    }
  }

  function drawDio(ctx, t, walk, bob, o) {
    const skin = '#e9d8c8', hair = '#e8c85c', coat = '#d4a72e', coat2 = '#8c6414', pants = '#2a2038', gold = '#f5e07a';
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; glow(ctx, 0, -18, 26, 'rgba(180,70,255,.45)', 0.55); ctx.restore();
    p(ctx, -5, -11 + bob + Math.max(0, walk * 2), 4, 10, pants);
    p(ctx, 1, -11 + bob + Math.max(0, -walk * 2), 4, 10, pants);
    p(ctx, -6, -2 + bob, 5, 2, '#15101c');
    p(ctx, 1, -2 + bob, 5, 2, '#15101c');
    // cape
    p(ctx, -11, -25 + bob, 3, 18, '#6a3c8c');
    p(ctx, 8, -25 + bob, 3, 18, '#6a3c8c');
    p(ctx, -8, -26 + bob, 16, 16, coat);
    p(ctx, -8, -26 + bob, 16, 2, gold);
    p(ctx, -3, -24 + bob, 6, 10, coat2);
    p(ctx, -8, -13 + bob, 16, 2, gold);
    p(ctx, -7, -28 + bob, 14, 3, coat2);
    // heart motif
    p(ctx, -2, -22 + bob, 1, 1, '#8c2f4a');
    p(ctx, 2, -22 + bob, 1, 1, '#8c2f4a');
    p(ctx, -1, -21 + bob, 3, 1, '#8c2f4a');
    p(ctx, 0, -20 + bob, 1, 1, '#8c2f4a');
    p(ctx, -5, -38 + bob, 10, 10, skin);
    p(ctx, -6, -40 + bob, 12, 4, hair);
    p(ctx, -7, -36 + bob, 2, 7, hair);
    p(ctx, 5, -36 + bob, 2, 7, hair);
    p(ctx, -6, -41 + bob, 4, 2, hair);
    p(ctx, 1, -41 + bob, 4, 2, hair);
    p(ctx, -4, -34 + bob, 2, 1, '#ff3b5e');
    p(ctx, 2, -34 + bob, 2, 1, '#ff3b5e');
    p(ctx, -2, -30 + bob, 4, 1, '#7b2438');
    p(ctx, -2, -29 + bob, 1, 1, '#fff');
    p(ctx, 1, -29 + bob, 1, 1, '#fff');
    p(ctx, -10, -25 + bob, 3, 11, coat);
    p(ctx, 7, -25 + bob, 3, 11, coat);
    p(ctx, -10, -14 + bob, 3, 3, skin);
    p(ctx, 7, -14 + bob, 3, 3, skin);
    // time stop rings
    ctx.save(); ctx.globalAlpha = 0.25; ctx.strokeStyle = '#c89aff';
    ctx.beginPath(); ctx.arc(0, -20 + bob, 22 + Math.sin(t * 2) * 3, 0, TAU); ctx.stroke(); ctx.restore();
    if (o.attacking) {
      p(ctx, 9, -27 + bob, 7, 3, coat);
      p(ctx, 15, -29 + bob, 4, 6, skin);
      p(ctx, 18, -27 + bob, 2, 1, '#ff4b6e');
    }
  }

  /* ============================ NPCS ============================ */
  function npc(ctx, id, x, y, facing, t, opts = {}) {
    const cfg = PORTRAIT_CONFIG[id] || PORTRAIT_CONFIG.narrator;
    const f = FACING(facing);
    const walk = opts.moving ? Math.sin(t * 9) : 0;
    const bob = opts.moving ? Math.abs(Math.sin(t * 9)) * 0.8 : Math.sin(t * 2 + x * 0.1) * 0.4;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    if (f.mirror) ctx.scale(-1, 1);
    ellipse(ctx, 0, -0.5, 6.5, 2, 'rgba(0,0,0,.34)');

    if (id === 'iggy') {
      // small white dog with brown patches
      const body = cfg.skin, patch = cfg.hair2;
      p(ctx, -7, -11 + bob, 12, 6, body);
      p(ctx, -9, -14 + bob, 6, 6, body);
      p(ctx, -9, -16 + bob, 2, 4, patch);
      p(ctx, -6, -16 + bob, 2, 4, patch);
      p(ctx, 3, -12 + bob, 4, 3, body);
      p(ctx, 4, -10 + bob, 3, 2, cfg.outfit2);
      p(ctx, -6, -6 + bob, 2, 6, body);
      p(ctx, -2, -6 + bob, 2, 6, body);
      p(ctx, 3, -6 + bob, 2, 6, body);
      p(ctx, -10, -9 + bob, 2, 3, body);
      p(ctx, -11, -10 + bob, 2, 2, cfg.outfit2);
      p(ctx, -7, -15 + bob, 2, 1, '#1a1210');
      p(ctx, -3, -15 + bob, 2, 1, '#1a1210');
      p(ctx, -6, -12 + bob, 3, 2, '#a04a4a');
      p(ctx, 1, -13 + bob, 3, 3, patch);
      p(ctx, -1, -7 + bob, 6, 1, 'rgba(255,255,255,.3)');
      ctx.restore();
      return;
    }

    const small = id === 'kid';
    if (small) {
      ctx.translate(0, 4);
      ctx.scale(0.82, 0.82);
    }
    const legA = Math.round(walk * 1.5);
    // legs
    p(ctx, -4, -7 + bob + Math.max(0, legA), 3, 7, cfg.outfit2);
    p(ctx, 1, -7 + bob + Math.max(0, -legA), 3, 7, cfg.outfit2);
    p(ctx, -4, -1 + bob, 3, 2, '#2a2020');
    p(ctx, 1, -1 + bob, 3, 2, '#2a2020');
    // torso
    p(ctx, -5, -19 + bob, 10, 12, cfg.outfit);
    p(ctx, -5, -19 + bob, 10, 2, cfg.outfit2);
    p(ctx, -1, -18 + bob, 2, 9, cfg.accent);
    p(ctx, -5, -10 + bob, 10, 2, cfg.outfit2);
    // arms
    p(ctx, -7, -18 + bob + legA, 2, 7, cfg.outfit);
    p(ctx, 5, -18 + bob - legA, 2, 7, cfg.outfit);
    p(ctx, -7, -11 + bob + legA, 2, 2, cfg.skin);
    p(ctx, 5, -11 + bob - legA, 2, 2, cfg.skin);
    // neck + head
    p(ctx, -2, -21 + bob, 4, 3, cfg.skin2);
    p(ctx, -4, -30 + bob, 8, 9, cfg.skin);
    p(ctx, -4, -30 + bob, 8, 2, cfg.skin2);
    p(ctx, -4, -22 + bob, 8, 1, cfg.skin2);

    // hair / headwear per character
    if (id === 'speedwagon') {
      p(ctx, -5, -33 + bob, 10, 3, '#3b2a20');
      p(ctx, -6, -31 + bob, 12, 2, '#4b3527');
      p(ctx, -5, -28 + bob, 2, 5, cfg.hair);
      p(ctx, 3, -28 + bob, 2, 4, cfg.hair);
      p(ctx, -4, -23 + bob, 8, 1, cfg.hair2);
      p(ctx, -3, -20 + bob, 6, 2, cfg.accent);
    } else if (id === 'erina') {
      p(ctx, -5, -32 + bob, 10, 5, cfg.hair);
      p(ctx, -6, -28 + bob, 3, 11, cfg.hair);
      p(ctx, 3, -28 + bob, 3, 8, cfg.hair);
      p(ctx, -3, -33 + bob, 6, 2, cfg.hair2);
      p(ctx, -4, -20 + bob, 8, 3, cfg.accent);
    } else if (id === 'caesar') {
      p(ctx, -5, -32 + bob, 10, 4, cfg.hair);
      p(ctx, -6, -29 + bob, 3, 5, cfg.hair);
      p(ctx, 3, -29 + bob, 3, 4, cfg.hair);
      p(ctx, -4, -27 + bob, 8, 1, '#c94a48');
      p(ctx, -4, -25 + bob, 8, 1, cfg.hair2);
    } else if (id === 'elder') {
      p(ctx, -5, -32 + bob, 10, 3, '#ddd5c4');
      p(ctx, -6, -29 + bob, 3, 9, '#ddd5c4');
      p(ctx, 3, -29 + bob, 3, 7, '#ddd5c4');
      p(ctx, -4, -24 + bob, 8, 4, '#ddd5c4');
      p(ctx, -3, -21 + bob, 6, 1, cfg.skin2);
      p(ctx, -1, -20 + bob, 2, 2, cfg.accent);
    } else if (id === 'avdol') {
      p(ctx, -5, -32 + bob, 10, 4, cfg.hair);
      p(ctx, -6, -28 + bob, 3, 6, cfg.hair);
      p(ctx, 3, -28 + bob, 3, 5, cfg.hair);
      p(ctx, -6, -20 + bob, 12, 3, cfg.outfit);
      p(ctx, -2, -20 + bob, 4, 1, cfg.accent);
      p(ctx, -5, -23 + bob, 10, 1, cfg.accent);
    } else if (id === 'polnareff') {
      p(ctx, -5, -35 + bob, 10, 4, cfg.hair);
      p(ctx, -7, -32 + bob, 4, 8, cfg.hair);
      p(ctx, 3, -32 + bob, 4, 7, cfg.hair);
      p(ctx, -4, -31 + bob, 8, 2, cfg.hair2);
      p(ctx, -4, -20 + bob, 8, 2, cfg.outfit);
      p(ctx, -4, -19 + bob, 8, 1, cfg.accent);
    } else if (id === 'kakyoin') {
      p(ctx, -5, -32 + bob, 10, 5, cfg.hair);
      p(ctx, -6, -28 + bob, 3, 8, cfg.hair);
      p(ctx, 3, -28 + bob, 3, 6, cfg.hair);
      p(ctx, -4, -31 + bob, 8, 1, cfg.hair2);
      p(ctx, -5, -19 + bob, 10, 1, cfg.accent);
      p(ctx, -6, -15 + bob, 1, 3, cfg.accent);
      p(ctx, 5, -15 + bob, 1, 3, cfg.accent);
    } else if (id === 'merchant') {
      p(ctx, -6, -33 + bob, 12, 4, '#e0c87a');
      p(ctx, -6, -30 + bob, 12, 2, '#b08a4a');
      p(ctx, -5, -28 + bob, 2, 4, cfg.hair);
      p(ctx, 3, -28 + bob, 2, 3, cfg.hair);
      p(ctx, -4, -23 + bob, 8, 2, cfg.hair);
      p(ctx, -5, -19 + bob, 10, 2, cfg.outfit2);
    } else if (id === 'guard') {
      p(ctx, -6, -33 + bob, 12, 4, cfg.accent);
      p(ctx, -6, -29 + bob, 12, 3, '#8a94a0');
      p(ctx, -1, -35 + bob, 2, 3, cfg.accent);
      p(ctx, -5, -19 + bob, 10, 2, '#5a6470');
    } else if (id === 'kid') {
      p(ctx, -5, -31 + bob, 10, 5, cfg.hair);
      p(ctx, -5, -27 + bob, 2, 5, cfg.hair);
      p(ctx, 3, -27 + bob, 2, 4, cfg.hair);
      p(ctx, -4, -23 + bob, 8, 1, cfg.hair2);
    } else {
      p(ctx, -5, -31 + bob, 10, 4, cfg.hair);
      p(ctx, -5, -28 + bob, 2, 4, cfg.hair);
      p(ctx, 3, -28 + bob, 2, 3, cfg.hair);
    }
    // face
    p(ctx, -2, -26 + bob, 1, 1, '#2a1c18');
    p(ctx, 2, -26 + bob, 1, 1, '#2a1c18');
    p(ctx, -1, -24 + bob, 3, 1, cfg.skin2);
    // rim light
    p(ctx, -5, -29 + bob, 1, 9, 'rgba(255,255,255,.14)');
    ctx.restore();
  }

  /* ============================ PORTRAITS ============================ */
  const PORTRAIT_CONFIG = {
    jonathan: { skin: '#f0c295', skin2: '#c98d63', hair: '#1b2438', hair2: '#2b3a5c', outfit: '#2b4a8b', outfit2: '#1a2e58', accent: '#e7cf74', eye: '#334b78', style: 'jonathan' },
    joseph: { skin: '#e9b98a', skin2: '#bd8558', hair: '#6b3f22', hair2: '#8a552d', outfit: '#2f7f6f', outfit2: '#1b5a4e', accent: '#d9a23c', eye: '#3b6b5a', style: 'joseph' },
    jotaro: { skin: '#e8bb90', skin2: '#bd8c60', hair: '#151726', hair2: '#282c42', outfit: '#2a2450', outfit2: '#181532', accent: '#e0b84f', eye: '#3a7f9a', style: 'jotaro' },
    speedwagon: { skin: '#e7b88b', skin2: '#b9875d', hair: '#d7b35a', hair2: '#a88438', outfit: '#5a3a2c', outfit2: '#3b241c', accent: '#b8403e', eye: '#3a5a7a', style: 'speedwagon' },
    erina: { skin: '#f2c7a4', skin2: '#c99878', hair: '#7a4a2a', hair2: '#a2693d', outfit: '#4b6a9a', outfit2: '#304b73', accent: '#e5d6b8', eye: '#4d7b68', style: 'erina' },
    caesar: { skin: '#edc39a', skin2: '#c48e63', hair: '#e0c76c', hair2: '#b49a3f', outfit: '#3f7f6e', outfit2: '#285a4d', accent: '#c94a48', eye: '#4f8a75', style: 'caesar' },
    elder: { skin: '#b98256', skin2: '#8d5c36', hair: '#ddd5c4', hair2: '#a99e8a', outfit: '#8a6538', outfit2: '#5f4323', accent: '#d9b05a', eye: '#4a2f1c', style: 'elder' },
    avdol: { skin: '#8a5a3d', skin2: '#643d27', hair: '#1c1612', hair2: '#3a2b21', outfit: '#a8352f', outfit2: '#75201c', accent: '#e0b84f', eye: '#d6a34a', style: 'avdol' },
    polnareff: { skin: '#e5b58b', skin2: '#b9845c', hair: '#d8d4d0', hair2: '#a9a29c', outfit: '#5a3b78', outfit2: '#3d2457', accent: '#d6b04f', eye: '#4a6a8a', style: 'polnareff' },
    kakyoin: { skin: '#efc7a0', skin2: '#c8946a', hair: '#a8433a', hair2: '#d46a54', outfit: '#3f6a4d', outfit2: '#2a4a36', accent: '#e0c05a', eye: '#5a7a5a', style: 'kakyoin' },
    iggy: { skin: '#e8e2d4', skin2: '#c5bda9', hair: '#4a3a2a', hair2: '#2e241a', outfit: '#5a4a3a', outfit2: '#3d3128', accent: '#d9b05a', eye: '#3a2a1a', style: 'iggy' },
    dio: { skin: '#e6d6c8', skin2: '#b9a698', hair: '#e8c85c', hair2: '#b89a38', outfit: '#d4a72e', outfit2: '#8c6414', accent: '#8c2f4a', eye: '#d43a52', style: 'dio' },
    dioVampire: { skin: '#e4d7cf', skin2: '#b8a89e', hair: '#e7c76a', hair2: '#b89a38', outfit: '#5b2630', outfit2: '#37151e', accent: '#e7b94a', eye: '#ff3b3b', style: 'dioVampire' },
    wamuu: { skin: '#8d5a48', skin2: '#663d31', hair: '#e8e3d6', hair2: '#bdb5a2', outfit: '#d8ad4b', outfit2: '#9a7726', accent: '#e8d77a', eye: '#e8d77a', style: 'wamuu' },
    esidisi: { skin: '#a94e3b', skin2: '#7b3124', hair: '#2a1b1c', hair2: '#4a2a26', outfit: '#3c2a2e', outfit2: '#241a1c', accent: '#ff8a3d', eye: '#ffd85e', style: 'esidisi' },
    kid: { skin: '#e8b98c', skin2: '#bc8558', hair: '#5a3a22', hair2: '#7a5330', outfit: '#7a5a3a', outfit2: '#553c26', accent: '#d9c07a', eye: '#4a6a8a', style: 'kid' },
    merchant: { skin: '#b98256', skin2: '#8d5c36', hair: '#3a2a1c', hair2: '#5a4028', outfit: '#b08a4a', outfit2: '#7d5f2e', accent: '#e0c87a', eye: '#3a2a1a', style: 'merchant' },
    guard: { skin: '#d9a878', skin2: '#a87a50', hair: '#5a4a32', hair2: '#7d6848', outfit: '#5a6470', outfit2: '#3c444d', accent: '#c9c2b2', eye: '#3a4a5a', style: 'guard' },
    narrator: { skin: '#c9b8a0', skin2: '#9a8a72', hair: '#3a3028', hair2: '#5a4a3a', outfit: '#3a3048', outfit2: '#241e30', accent: '#d9b05a', eye: '#7a6a5a', style: 'narrator' }
  };

  function portraitCanvas(id) {
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const ctx = c.getContext('2d');
    const cfg = PORTRAIT_CONFIG[id] || PORTRAIT_CONFIG.jonathan;
    const pal = D.CHARACTERS[id]?.palette;
    if (pal) Object.assign(cfg, { skin: pal.skin, skin2: pal.skin2, hair: pal.hair, hair2: pal.hair2, outfit: pal.coat, outfit2: pal.coat2, accent: pal.accent, eye: '#2a3c66' });
    drawPortrait(ctx, cfg, id);
    return c;
  }

  function drawPortrait(ctx, cfg, id) {
    ctx.save();
    ctx.scale(2, 2);
    // background
    const bg = ctx.createLinearGradient(0, 0, 64, 64);
    bg.addColorStop(0, '#2a1f42');
    bg.addColorStop(0.6, '#171226');
    bg.addColorStop(1, '#0b0912');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 64, 64);
    ctx.globalAlpha = 0.14;
    for (let i = -64; i < 64; i += 8) { p(ctx, i, 0, 3, 64, cfg.accent); }
    ctx.globalAlpha = 1;
    // menacing glyphs
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = cfg.accent;
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ゴ', 48, 15);
    ctx.fillText('ゴ', 8, 54);
    ctx.restore();
    // shoulders
    p(ctx, 9, 48, 46, 16, cfg.outfit2);
    p(ctx, 12, 47, 40, 13, cfg.outfit);
    p(ctx, 28, 45, 8, 9, cfg.skin2);
    // neck
    p(ctx, 27, 40, 10, 9, cfg.skin2);
    // head
    p(ctx, 20, 16, 24, 27, cfg.skin);
    p(ctx, 20, 16, 24, 3, cfg.skin2);
    p(ctx, 18, 21, 2, 14, cfg.skin2);
    p(ctx, 44, 21, 2, 14, cfg.skin2);
    // hair
    p(ctx, 17, 13, 30, 10, cfg.hair);
    p(ctx, 17, 20, 5, 17, cfg.hair);
    p(ctx, 42, 20, 5, 12, cfg.hair);
    p(ctx, 22, 12, 8, 3, cfg.hair2);
    p(ctx, 36, 11, 8, 4, cfg.hair2);
    // eyes / brows
    p(ctx, 25, 28, 5, 2, '#f2eadc');
    p(ctx, 35, 28, 5, 2, '#f2eadc');
    p(ctx, 27, 29, 2, 2, cfg.eye);
    p(ctx, 36, 29, 2, 2, cfg.eye);
    p(ctx, 24, 26, 7, 1, cfg.hair2);
    p(ctx, 34, 26, 7, 1, cfg.hair2);
    // nose + mouth
    p(ctx, 31, 33, 2, 4, cfg.skin2);
    p(ctx, 27, 39, 10, 1, '#6a3a3a');
    p(ctx, 28, 38, 8, 1, cfg.skin2);
    // cheek shading
    p(ctx, 22, 35, 3, 1, cfg.skin2);
    p(ctx, 40, 35, 2, 1, cfg.skin2);

    const st = cfg.style;
    if (st === 'jotaro') {
      p(ctx, 16, 9, 32, 8, '#11131e');
      p(ctx, 14, 17, 36, 3, '#11131e');
      p(ctx, 15, 20, 4, 13, '#11131e');
      p(ctx, 45, 20, 4, 10, '#11131e');
      p(ctx, 29, 11, 6, 3, cfg.accent);
      p(ctx, 19, 20, 3, 8, '#1c2030');
      p(ctx, 42, 20, 3, 8, '#1c2030');
      p(ctx, 22, 45, 20, 1, cfg.accent);
      p(ctx, 24, 46, 1, 1, cfg.accent); p(ctx, 28, 46, 1, 1, cfg.accent); p(ctx, 32, 46, 1, 1, cfg.accent); p(ctx, 36, 46, 1, 1, cfg.accent); p(ctx, 40, 46, 1, 1, cfg.accent);
      p(ctx, 23, 24, 2, 2, '#ff6a6a');
    } else if (st === 'jonathan') {
      p(ctx, 17, 12, 6, 5, cfg.hair2);
      p(ctx, 26, 10, 10, 3, cfg.hair2);
      p(ctx, 17, 23, 3, 9, cfg.hair);
      p(ctx, 44, 23, 3, 6, cfg.hair);
      // cravat
      p(ctx, 26, 45, 12, 6, '#8e2233');
      p(ctx, 29, 45, 6, 3, '#c9455a');
      p(ctx, 30, 42, 4, 4, '#f3e3d0');
    } else if (st === 'joseph') {
      p(ctx, 16, 12, 8, 6, cfg.hair2);
      p(ctx, 23, 9, 12, 5, cfg.hair);
      p(ctx, 36, 12, 10, 5, cfg.hair2);
      p(ctx, 17, 20, 4, 10, cfg.hair);
      p(ctx, 44, 20, 3, 8, cfg.hair);
      p(ctx, 18, 43, 28, 5, '#b83b2f');
      p(ctx, 44, 45, 12, 3, '#b83b2f');
      p(ctx, 20, 46, 8, 1, '#e07a6a');
    } else if (st === 'speedwagon') {
      p(ctx, 15, 9, 34, 4, '#3b2a20');
      p(ctx, 19, 6, 26, 5, '#4b3527');
      p(ctx, 15, 13, 36, 2, '#2a1c15');
      p(ctx, 17, 15, 4, 6, '#3b2a20');
      p(ctx, 27, 39, 12, 2, '#d7b35a');
      p(ctx, 24, 42, 18, 3, cfg.accent);
      p(ctx, 22, 42, 4, 1, cfg.accent);
      p(ctx, 40, 42, 4, 1, cfg.accent);
      p(ctx, 22, 34, 3, 1, cfg.hair2);
    } else if (st === 'erina') {
      p(ctx, 17, 12, 30, 7, cfg.hair);
      p(ctx, 15, 17, 6, 16, cfg.hair);
      p(ctx, 43, 17, 6, 12, cfg.hair);
      p(ctx, 18, 10, 12, 4, cfg.hair2);
      p(ctx, 36, 10, 12, 4, cfg.hair2);
      p(ctx, 22, 42, 20, 6, '#e5d6b8');
      p(ctx, 28, 46, 8, 2, cfg.accent);
    } else if (st === 'caesar') {
      p(ctx, 17, 11, 30, 7, cfg.hair);
      p(ctx, 16, 17, 5, 14, cfg.hair);
      p(ctx, 43, 17, 5, 10, cfg.hair);
      p(ctx, 19, 19, 26, 3, '#c94a48');
      p(ctx, 21, 44, 22, 4, '#c94a48');
      p(ctx, 42, 16, 4, 7, cfg.hair2);
    } else if (st === 'elder') {
      p(ctx, 15, 10, 34, 8, '#ddd5c4');
      p(ctx, 17, 16, 30, 4, cfg.accent);
      p(ctx, 18, 19, 5, 18, '#ddd5c4');
      p(ctx, 41, 19, 5, 14, '#ddd5c4');
      p(ctx, 24, 40, 16, 5, '#ddd5c4');
      p(ctx, 22, 36, 4, 2, cfg.skin2);
      p(ctx, 38, 36, 4, 2, cfg.skin2);
    } else if (st === 'avdol') {
      p(ctx, 16, 12, 32, 9, cfg.hair);
      p(ctx, 17, 20, 4, 9, cfg.hair);
      p(ctx, 43, 20, 4, 8, cfg.hair);
      p(ctx, 19, 42, 26, 7, cfg.outfit);
      p(ctx, 27, 44, 10, 2, cfg.accent);
      p(ctx, 20, 47, 4, 2, cfg.accent);
      p(ctx, 40, 47, 4, 2, cfg.accent);
      p(ctx, 23, 35, 2, 2, cfg.accent);
      p(ctx, 39, 35, 2, 2, cfg.accent);
    } else if (st === 'polnareff') {
      p(ctx, 16, 8, 12, 14, cfg.hair);
      p(ctx, 24, 4, 16, 18, cfg.hair);
      p(ctx, 37, 8, 12, 13, cfg.hair);
      p(ctx, 18, 20, 3, 10, cfg.hair);
      p(ctx, 44, 20, 3, 8, cfg.hair);
      p(ctx, 19, 9, 8, 3, cfg.hair2);
      p(ctx, 22, 44, 20, 4, cfg.outfit);
      p(ctx, 24, 44, 16, 1, cfg.accent);
    } else if (st === 'kakyoin') {
      p(ctx, 16, 11, 32, 8, cfg.hair);
      p(ctx, 15, 18, 5, 16, cfg.hair);
      p(ctx, 44, 18, 5, 10, cfg.hair);
      p(ctx, 19, 12, 8, 4, cfg.hair2);
      p(ctx, 35, 10, 8, 4, cfg.hair2);
      p(ctx, 22, 42, 20, 5, cfg.outfit);
      p(ctx, 27, 42, 10, 1, cfg.accent);
      p(ctx, 20, 34, 1, 3, cfg.accent);
      p(ctx, 44, 34, 1, 3, cfg.accent);
    } else if (st === 'iggy') {
      // dog portrait
      p(ctx, 14, 14, 36, 30, cfg.skin);
      p(ctx, 13, 12, 10, 15, cfg.hair);
      p(ctx, 41, 12, 10, 15, cfg.hair);
      p(ctx, 20, 22, 8, 6, cfg.skin2);
      p(ctx, 36, 22, 8, 6, cfg.skin2);
      p(ctx, 22, 30, 4, 3, '#1a1210');
      p(ctx, 38, 30, 4, 3, '#1a1210');
      p(ctx, 28, 35, 8, 4, '#1a1210');
      p(ctx, 30, 36, 4, 2, '#a04a4a');
      p(ctx, 15, 40, 34, 6, cfg.outfit);
      p(ctx, 26, 45, 12, 2, cfg.accent);
    } else if (st === 'dio' || st === 'dioVampire') {
      p(ctx, 15, 10, 34, 8, cfg.hair);
      p(ctx, 14, 17, 6, 18, cfg.hair);
      p(ctx, 44, 17, 6, 14, cfg.hair);
      p(ctx, 19, 9, 8, 4, cfg.hair2);
      p(ctx, 37, 9, 8, 4, cfg.hair2);
      p(ctx, 25, 28, 5, 2, cfg.eye);
      p(ctx, 35, 28, 5, 2, cfg.eye);
      p(ctx, 27, 29, 2, 2, '#fff');
      p(ctx, 36, 29, 2, 2, '#fff');
      p(ctx, 29, 38, 8, 2, '#7b2438');
      p(ctx, 30, 40, 1, 2, '#fff'); p(ctx, 34, 40, 1, 2, '#fff');
      p(ctx, 20, 43, 24, 5, cfg.outfit);
      p(ctx, 27, 44, 10, 3, cfg.accent);
      if (st === 'dioVampire') { p(ctx, 20, 45, 24, 1, '#9a1d32'); p(ctx, 30, 42, 4, 1, '#9a1d32'); }
    } else if (st === 'wamuu') {
      p(ctx, 14, 8, 36, 5, cfg.hair);
      p(ctx, 13, 12, 5, 13, cfg.hair);
      p(ctx, 46, 12, 5, 10, cfg.hair);
      p(ctx, 22, 6, 6, 5, cfg.outfit);
      p(ctx, 36, 6, 6, 5, cfg.outfit);
      p(ctx, 19, 18, 3, 5, cfg.outfit);
      p(ctx, 42, 18, 3, 4, cfg.outfit);
      p(ctx, 21, 44, 22, 5, cfg.outfit2);
      p(ctx, 26, 45, 12, 2, cfg.outfit);
    } else if (st === 'esidisi') {
      p(ctx, 18, 13, 28, 5, cfg.hair);
      p(ctx, 21, 19, 3, 14, cfg.accent);
      p(ctx, 40, 19, 3, 12, cfg.accent);
      p(ctx, 23, 36, 4, 2, cfg.skin2);
      p(ctx, 37, 36, 4, 2, cfg.skin2);
      p(ctx, 22, 43, 20, 5, cfg.outfit);
      p(ctx, 27, 44, 10, 2, cfg.accent);
    } else if (st === 'kid') {
      p(ctx, 18, 14, 28, 8, cfg.hair);
      p(ctx, 18, 20, 4, 8, cfg.hair);
      p(ctx, 20, 42, 24, 6, cfg.outfit);
      p(ctx, 22, 44, 20, 1, cfg.accent);
    } else if (st === 'merchant') {
      p(ctx, 15, 10, 34, 7, '#e0c87a');
      p(ctx, 17, 17, 30, 3, '#b08a4a');
      p(ctx, 20, 38, 8, 2, cfg.hair);
      p(ctx, 36, 38, 8, 2, cfg.hair);
      p(ctx, 21, 42, 22, 5, cfg.outfit);
    } else if (st === 'guard') {
      p(ctx, 15, 9, 34, 11, cfg.accent);
      p(ctx, 17, 12, 30, 6, '#8a94a0');
      p(ctx, 17, 20, 4, 8, cfg.hair);
      p(ctx, 43, 20, 4, 8, cfg.hair);
      p(ctx, 22, 42, 20, 6, cfg.outfit);
    } else {
      p(ctx, 18, 14, 28, 6, cfg.hair);
      p(ctx, 20, 42, 24, 6, cfg.outfit);
    }
    // rim light
    p(ctx, 17, 20, 1, 16, 'rgba(255,255,255,.18)');
    p(ctx, 46, 22, 1, 12, 'rgba(0,0,0,.25)');
    ctx.restore();
  }

  const portraitCache = new Map();
  function portraitURL(id) {
    if (!portraitCache.has(id)) portraitCache.set(id, portraitCanvas(id).toDataURL());
    return portraitCache.get(id);
  }
  function portraitCanvasCached(id) {
    if (!portraitCache.has('canvas:' + id)) portraitCache.set('canvas:' + id, portraitCanvas(id));
    return portraitCache.get('canvas:' + id);
  }

  return {
    p, ellipse, glow, hash, FACING, hero, stand, enemy, npc, portraitURL, portraitCanvas: portraitCanvasCached,
    drawPortrait, PORTRAIT_CONFIG
  };
})();
