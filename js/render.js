/* ============================================================
   Renderer — world, entities, effects, weather, lighting, minimap
   ============================================================ */
(function () {
  const A = window.ART;
  const WA = window.WORLDART;
  const W = window.WORLD;
  const D = window.GAME_DATA;
  const TS = 16;
  const TAU = Math.PI * 2;

  const NPC_NAMES = {
    speedwagon: ['СПИДВАГОН', 'SPEEDWAGON'],
    erina: ['ЭРИНА', 'ERINA'],
    caesar: ['ЦЕЗАРЬ', 'CAESAR'],
    elder: ['СТАРЕЙШИНА', 'ELDER'],
    avdol: ['АВДОЛ', 'AVDOL'],
    polnareff: ['ПОЛНАРЕФФ', 'POLNAREFF'],
    kakyoin: ['КАКЁИН', 'KAKYOIN'],
    iggy: ['ИГГИ', 'IGGY'],
    merchant: ['ТОРГОВЕЦ', 'MERCHANT'],
    kid: ['МАЛЬЧИК', 'KID'],
    guard: ['СТРАЖНИК', 'GUARD']
  };

  const REGION_AMBIENT = {
    italy: ['rgba(255,190,220,.55)', 'rgba(210,255,190,.45)'],
    mexico: ['rgba(255,210,130,.4)', 'rgba(240,180,100,.3)'],
    egypt: ['rgba(255,220,150,.35)', 'rgba(240,190,110,.28)'],
    england: ['rgba(190,220,255,.35)', 'rgba(200,210,230,.3)']
  };

  function nightAmount(tod) {
    if (tod >= 0.7) return Math.min(1, (tod - 0.7) / 0.16);
    if (tod < 0.1) return 1 - tod / 0.1;
    return 0;
  }

  function isNight(tod) { return nightAmount(tod) > 0.55; }

  function screenPos(r) {
    return {
      x: r.player.x - r.camera.x,
      y: r.player.y - r.camera.y
    };
  }

  function tileColor(type, region) {
    const P = WA.PAL[region] || WA.PAL.england;
    switch (type) {
      case WA.TILE.GRASS: return P.grass;
      case WA.TILE.PATH:
      case WA.TILE.SANDPATH: return P.path;
      case WA.TILE.WATER:
      case WA.TILE.DEEPWATER: return P.water;
      case WA.TILE.SHALLOW: return '#4f97a8';
      case WA.TILE.TREE: return P.grass2;
      case WA.TILE.ROCK:
      case WA.TILE.CLIFF: return P.stone2;
      case WA.TILE.STONE:
      case WA.TILE.FLOOR: return P.stone;
      case WA.TILE.SAND: return P.grass;
      case WA.TILE.WALL:
      case WA.TILE.ROOF: return P.wall;
      case WA.TILE.FLOWERS: return '#8fae63';
      case WA.TILE.BRIDGE: return '#8a6a3e';
      case WA.TILE.COBBLE: return '#7b7568';
      case WA.TILE.DIRT: return '#7a5a3b';
      case WA.TILE.MARBLE: return '#c9c3b2';
      default: return P.grass;
    }
  }

  function drawSlash(ctx, e) {
    const k = 1 - Math.max(0, e.life) / (e.maxLife || 0.16);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - k) * 0.95;
    ctx.strokeStyle = e.color || '#fff';
    ctx.lineWidth = e.range > 23 ? 3 : 2;
    ctx.beginPath();
    ctx.arc(e.x, e.y, (e.range || 20) * (0.55 + k * 0.45), (e.angle || 0) - 0.95, (e.angle || 0) + 0.95);
    ctx.stroke();
    ctx.globalAlpha *= 0.45;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(e.x, e.y, (e.range || 20) * (0.3 + k * 0.6), (e.angle || 0) - 0.75, (e.angle || 0) + 0.75);
    ctx.stroke();
    ctx.restore();
  }

  function drawEffects(ctx, r, t) {
    for (const e of r.effects) {
      const life = Math.max(0, e.life);
      const max = e.maxLife || 0.4;
      const k = 1 - life / max;
      if (e.type === 'slash') {
        drawSlash(ctx, e);
      } else if (e.type === 'ring') {
        const rad = (e.r0 || 4) + ((e.r1 || 30) - (e.r0 || 4)) * k;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k) * 0.9;
        ctx.strokeStyle = e.color || '#ffd15a';
        ctx.lineWidth = e.width || 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad, 0, TAU);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === 'nova') {
        const rad = (e.r0 || 8) + ((e.r1 || 60) - (e.r0 || 8)) * Math.min(1, k * 1.15);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k) * 0.85;
        ctx.strokeStyle = e.color || '#ffd15a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha *= 0.4;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad * 0.7, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = Math.max(0, 1 - k) * 0.35;
        ctx.fillStyle = e.color || '#ffd15a';
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad, 0, TAU);
        ctx.fill();
        ctx.restore();
      } else if (e.type === 'telegraph') {
        ctx.save();
        const pulse = 0.55 + Math.sin(t * 16) * 0.2;
        ctx.globalAlpha = 0.18 + (1 - k) * 0.18;
        ctx.fillStyle = e.color || '#ff3b3b';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r || 60, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = e.color || '#ff3b3b';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, (e.r || 60) * (0.92 + pulse * 0.08), 0, TAU);
        ctx.stroke();
        ctx.restore();
      } else if (e.type === 'heal') {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k) * 0.8;
        ctx.strokeStyle = '#ffe08a';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(e.x, e.y + 4, 6 + i * 8 + k * 14, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      } else if (e.type === 'dash') {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - k) * 0.8;
        ctx.strokeStyle = e.color || '#9fe8ff';
        ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x2, e.y2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawTraps(ctx, r, t) {
    for (const tr of r.traps) {
      const k = Math.max(0, tr.life / tr.maxLife);
      const pulse = 0.5 + Math.sin(t * 5) * 0.5;
      ctx.save();
      ctx.globalAlpha = 0.35 + pulse * 0.25;
      ctx.strokeStyle = '#ffd15a';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, tr.radius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.18 + pulse * 0.16;
      ctx.fillStyle = '#ffd15a';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, tr.radius, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + t * 0.6;
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#ffeaa0';
        ctx.fillRect(tr.x + Math.cos(a) * tr.radius * 0.72, tr.y + Math.sin(a) * tr.radius * 0.36, 2, 1);
      }
      ctx.restore();
    }
  }

  function drawProjectiles(ctx, r, t) {
    for (const pr of r.projectiles) {
      if (pr.delay > 0) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const col = pr.color || '#fff';
      A.glow(ctx, pr.x, pr.y, (pr.size || 3) * 4.5, col, 0.55);
      ctx.fillStyle = col;
      if (pr.type === 'clacker') {
        ctx.fillRect(Math.round(pr.x) - 3, Math.round(pr.y) - 2, 6, 4);
        ctx.fillStyle = '#fff7d0';
        ctx.fillRect(Math.round(pr.x) - 1, Math.round(pr.y) - 1, 2, 2);
      } else if (pr.type === 'bullet') {
        ctx.fillRect(Math.round(pr.x) - 2, Math.round(pr.y) - 1, 4, 2);
      } else {
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, pr.size || 3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawParticles(ctx, r) {
    for (const p of r.particles) {
      const a = Math.max(0, p.life / (p.maxLife || 0.3));
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size || 1, p.size || 1);
    }
    ctx.globalAlpha = 1;
  }

  function drawFloaters(ctx, r) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of r.floaters) {
      const a = Math.max(0, Math.min(1, f.life / (f.maxLife || 0.9) * 1.5));
      ctx.globalAlpha = a;
      ctx.font = `bold ${f.size || 9}px Handjet, monospace`;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color || '#fff';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  function drawEnemyAuras(ctx, r, t) {
    const p = r.player;
    for (const e of r.enemies) {
      if (e.dead) continue;
      const dist = Math.hypot(e.x - p.x, e.y - p.y);
      if (dist > 270) continue;
      const active = e.state === 'alert' || e.state === 'chase' || e.state === 'windup';
      const radius = e.def.aggro || 100;
      ctx.save();
      ctx.globalAlpha = active ? 0.32 : 0.12;
      ctx.strokeStyle = active ? '#ff5a5a' : '#ffb0a0';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
      if (e.state === 'alert') {
        const bob = Math.sin(t * 14) * 1.5;
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = '#ff4d4d';
        ctx.font = 'bold 12px Handjet, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('!', e.x, e.y - 43 + bob);
        ctx.restore();
      }
    }
  }

  function drawHealthBar(ctx, e) {
    if (e.dead) return;
    if (!e.boss && e.state === 'idle' && e.hurtT <= 0) return;
    const w = e.boss ? 34 : 22;
    const h = 3;
    const x = e.x - w / 2;
    const y = e.y - (e.boss ? 50 : 40);
    const pct = Math.max(0, Math.min(1, e.hp / e.maxHp));
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.72)';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = e.boss ? '#ff4b6e' : '#ff6a5a';
    ctx.fillRect(x, y, w * pct, h);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(x, y, w * pct, 1);
    ctx.restore();
  }

  function drawPortalLabel(ctx, o, t) {
    const label = o.labelKey ? G.tr(o.labelKey) : G.tr('ui.portalName');
    const locked = G.state.story.stage < (o.unlockStage || 0);
    const y = o.y - 52 + Math.sin(t * 2) * 1.5;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 9px Handjet, monospace';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(label, o.x, y);
    ctx.fillStyle = locked ? '#8a8098' : '#a8f2ff';
    ctx.fillText(label, o.x, y);
    if (locked) {
      ctx.font = 'bold 8px Handjet, monospace';
      ctx.fillStyle = '#e08a8a';
      ctx.fillText('🔒', o.x, y - 10);
    }
    ctx.restore();
  }

  function drawPickup(ctx, pk, t, night) {
    const kind = D.ITEMS[pk.item] ? pk.item : 'herb';
    const bob = Math.sin(t * 3 + pk.x * 0.1) * 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    A.glow(ctx, pk.x, pk.y - 4 + bob, 14, 'rgba(120,255,225,.55)', 0.45);
    ctx.restore();
    if (['herb', 'scroll', 'gum', 'ledger'].includes(kind)) {
      WA.drawObject(ctx, { kind, x: pk.x, y: pk.y + bob, seed: pk.x }, t, night);
    } else {
      ctx.save();
      ctx.fillStyle = '#7effea';
      ctx.fillRect(pk.x - 2, pk.y - 8 + bob, 4, 4);
      ctx.restore();
    }
  }

  function drawQuestMarker(ctx, qt, t) {
    if (!qt || qt.x == null) return;
    const bob = Math.sin(t * 3.2) * 3;
    const y = (qt.y || 0) - 48 + bob;
    ctx.save();
    ctx.translate(qt.x, y);
    ctx.globalCompositeOperation = 'lighter';
    A.glow(ctx, 0, 0, 15, 'rgba(255,210,80,.6)', 0.55);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#ffe27a';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#fff6c8';
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }

  function drawBossBarrier(ctx, r, t) {
    const a = r.cameraLock;
    if (!a) return;
    const pulse = 0.45 + Math.sin(t * 3.5) * 0.2;
    ctx.save();
    ctx.strokeStyle = `rgba(255,70,110,${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 6]);
    ctx.strokeRect(a.x, a.y, a.w, a.h);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,190,80,.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(a.x + 4, a.y + 4, a.w - 8, a.h - 8);
    // corner marks
    const m = 14;
    ctx.strokeStyle = '#ffd15a';
    ctx.lineWidth = 2;
    for (const [cx, cy, sx, sy] of [
      [a.x, a.y, 1, 1], [a.x + a.w, a.y, -1, 1],
      [a.x, a.y + a.h, 1, -1], [a.x + a.w, a.y + a.h, -1, -1]
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx + sx * m, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * m);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffd15a';
    ctx.font = 'bold 8px Handjet, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(G.tr('ui.arenaLocked'), a.x + a.w / 2, a.y + 12);
    ctx.restore();
  }

  function drawWorld(ctx, r, t, night) {
    const vx = r.camera.x - 48, vy = r.camera.y - 48;
    const vw = ctx.canvas.width + 96, vh = ctx.canvas.height + 96;

    ctx.drawImage(r.world.ground, 0, 0);
    drawTraps(ctx, r, t);

    const list = [];
    for (const o of r.world.objects) {
      if (o.x < vx || o.x > vx + vw || o.y < vy - 60 || o.y > vy + vh + 60) continue;
      list.push({ y: o.sortY != null ? o.sortY : o.y, type: 'obj', o });
    }
    for (const n of r.npcs) {
      if (n.x < vx || n.x > vx + vw || n.y < vy || n.y > vy + vh) continue;
      list.push({ y: n.y, type: 'npc', n });
    }
    for (const pk of r.world.pickups) {
      if (pk.collected || G.state.pickups[pk.id]) continue;
      if (pk.x < vx || pk.x > vx + vw || pk.y < vy || pk.y > vy + vh) continue;
      const sq = G.state.side[pk.questId];
      if (sq && sq.state !== 'active' && sq.state !== 'ready') continue;
      list.push({ y: pk.y, type: 'pickup', pk });
    }
    for (const e of r.enemies) {
      if (e.x < vx || e.x > vx + vw || e.y < vy || e.y > vy + vh) continue;
      list.push({ y: e.y, type: 'enemy', e });
    }
    const p = r.player;
    list.push({ y: p.y, type: 'player' });

    list.sort((a, b) => a.y - b.y);

    drawEnemyAuras(ctx, r, t);

    for (const item of list) {
      if (item.type === 'obj') {
        const o = item.o;
        if (o.kind === 'chest') {
          WA.drawObject(ctx, { ...o, open: !!G.state.chests[o.chestId] }, t, night);
        } else {
          WA.drawObject(ctx, o, t, night);
        }
        if (o.kind === 'portal') drawPortalLabel(ctx, o, t);
      } else if (item.type === 'npc') {
        const n = item.n;
        A.npc(ctx, n.id, n.x, n.y, n.facing, t, { moving: n.moving });
        const d = Math.hypot(n.x - p.x, n.y - p.y);
        if (d < 68) {
          const nm = NPC_NAMES[n.id];
          if (nm) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = 'bold 8px Handjet, monospace';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = 'rgba(0,0,0,.8)';
            const label = nm[G.lang === 'en' ? 1 : 0];
            ctx.strokeText(label, n.x, n.y - 38);
            ctx.fillStyle = '#bff7ee';
            ctx.fillText(label, n.x, n.y - 38);
            ctx.restore();
          }
        }
      } else if (item.type === 'pickup') {
        drawPickup(ctx, item.pk, t, night);
      } else if (item.type === 'enemy') {
        const e = item.e;
        A.enemy(ctx, e.type, e.x, e.y, e.facing, e.animT, {
          moving: e.moving,
          alert: e.state === 'alert',
          hurt: e.hurtT > 0,
          attacking: e.state === 'windup' || !!e.pending,
          seed: e.homeX || 0,
          scale: e.boss ? 1 : 1
        });
        drawHealthBar(ctx, e);
      } else if (item.type === 'player') {
        const heroId = G.state.activeHero;
        const moving = p.moving;
        const opts = {
          moving,
          pose: true,
          attackT: p.attackT > 0 ? p.attackT : null,
          castT: p.castT > 0 ? p.castT : null,
          hurt: p.hurtT > 0,
          hamon: heroId !== 'jotaro',
          stand: heroId === 'jotaro' ? {
            alpha: p.standT > 0 ? 0.68 : 0.3,
            scale: 1.02,
            punch: p.flurry ? 1 : 0
          } : null
        };
        if (p.invuln > 0) {
          ctx.save();
          ctx.globalAlpha = 0.25 + Math.sin(t * 18) * 0.1;
          ctx.strokeStyle = heroId === 'jotaro' ? '#c9b4ff' : '#ffe08a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y - 12, 14, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
        A.hero(ctx, heroId, p.x, p.y, p.facing, t, opts);
        if (heroId === 'jotaro' && p.standT > 0.35) {
          ctx.save();
          ctx.globalAlpha = 0.28;
          A.stand(ctx, p.x + p.facing.x * 12, p.y + 2, p.facing, t, { behind: false, scale: 1.05 });
          ctx.restore();
        }
      }
    }

    drawEffects(ctx, r, t);
    drawProjectiles(ctx, r, t);
    drawParticles(ctx, r);
    drawFloaters(ctx, r);
    drawBossBarrier(ctx, r, t);

    if (window.STORY && STORY.questTarget) {
      const qt = STORY.questTarget();
      if (qt && qt.x != null) drawQuestMarker(ctx, qt, t);
    }
  }

  function drawScreenWeather(ctx, c, r, t) {
    const region = G.state.region;
    const night = isNight(r.timeOfDay);
    const p = screenPos(r);

    // rain
    if (r.rain && r.rain.length) {
      ctx.save();
      ctx.strokeStyle = 'rgba(170,205,235,.5)';
      ctx.lineWidth = 1;
      for (const d of r.rain) {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - d.len * 0.25, d.y + d.len);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ambient motes
    if (r.ambient && r.ambient.length) {
      const cols = REGION_AMBIENT[region] || REGION_AMBIENT.england;
      ctx.save();
      for (let i = 0; i < r.ambient.length; i++) {
        const a = r.ambient[i];
        ctx.globalAlpha = Math.max(0, Math.min(0.6, a.life / 5)) * 0.7;
        ctx.fillStyle = cols[i % cols.length];
        const s = i % 5 === 0 ? 2 : 1;
        ctx.fillRect(a.x, a.y, s, s);
      }
      ctx.restore();
    }

    // heat haze
    if ((region === 'mexico' || region === 'egypt') && !night) {
      ctx.save();
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#ffcf7a';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalAlpha = 0.07;
      ctx.strokeStyle = '#ffe6b0';
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const yy = c.height * (0.62 + i * 0.09) + Math.sin(t * 1.4 + i) * 3;
        ctx.beginPath();
        for (let x = 0; x <= c.width; x += 14) {
          const y = yy + Math.sin(x * 0.045 + t * 2 + i) * 2.2;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // day/night tint
    const na = nightAmount(r.timeOfDay);
    if (na > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(8,12,38,${0.52 * na})`;
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
    } else if (r.timeOfDay > 0.55 && r.timeOfDay < 0.72) {
      const k = 1 - Math.abs(r.timeOfDay - 0.63) / 0.09;
      ctx.save();
      ctx.globalAlpha = Math.max(0, k) * 0.18;
      ctx.fillStyle = '#ff8a4a';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
    } else if (r.timeOfDay < 0.16) {
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#7ab0ff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
    }

    // light around the player at night
    if (na > 0.2) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y - 10, 4, p.x, p.y - 10, 88);
      g.addColorStop(0, `rgba(255,220,150,${0.2 * na})`);
      g.addColorStop(0.45, `rgba(255,200,110,${0.07 * na})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - 96, p.y - 106, 192, 192);
      ctx.restore();
    }

    // time stop
    if (r.timeStop > 0) {
      const k = Math.min(1, r.timeStop / 0.4);
      ctx.save();
      ctx.globalAlpha = 0.2 * k;
      ctx.fillStyle = '#7d5cc8';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.globalAlpha = 0.55 * k;
      ctx.strokeStyle = '#d8c8ff';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(c.width / 2, c.height / 2, 30 + i * 26 + Math.sin(t * 4 + i) * 3, 0, TAU);
        ctx.stroke();
      }
      ctx.font = 'bold 12px Handjet, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e4ff';
      ctx.fillText('Z A   W A R U D O', c.width / 2, c.height * 0.22);
      ctx.restore();
    }

    // lightning
    if (r.lightning > 0) {
      ctx.save();
      ctx.globalAlpha = r.lightning * 0.28;
      ctx.fillStyle = '#dce8ff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.restore();
    }
  }

  ENGINE.render = function () {
    const c = document.getElementById('game');
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const r = G.runtime;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!r.world || !r.player) {
      ctx.fillStyle = '#0b0a12';
      ctx.fillRect(0, 0, c.width, c.height);
      return;
    }
    const t = r.time || 0;
    const night = isNight(r.timeOfDay);
    let sx = 0, sy = 0;
    if (G.settings.shake && r.screenShake > 0.2) {
      sx = (Math.random() * 2 - 1) * r.screenShake;
      sy = (Math.random() * 2 - 1) * r.screenShake;
    }
    ctx.fillStyle = '#0b0a12';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(-Math.round(r.camera.x) + sx, -Math.round(r.camera.y) + sy);
    drawWorld(ctx, r, t, night);
    ctx.restore();
    drawScreenWeather(ctx, c, r, t);
  };

  ENGINE.drawMinimap = function (cv) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const r = G.runtime;
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(0, 0, w, h);
    if (!r.world) return;
    const map = r.world;
    const sc = Math.min(w / map.w, h / map.h);
    const ox = (w - map.w * sc) / 2;
    const oy = (h - map.h * sc) / 2;
    const region = G.state.region;
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const type = map.tiles[y * map.w + x];
        ctx.fillStyle = tileColor(type, region);
        ctx.fillRect(ox + x * sc, oy + y * sc, Math.ceil(sc), Math.ceil(sc));
      }
    }
    // station
    if (map.station) {
      const sx = ox + map.station.x / TS * sc;
      const sy = oy + map.station.y / TS * sc;
      ctx.fillStyle = '#37c9b8';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    }
    // npcs
    for (const n of map.npcs) {
      ctx.fillStyle = 'rgba(150,255,235,.8)';
      ctx.fillRect(ox + n.x / TS * sc - 1, oy + n.y / TS * sc - 1, 2, 2);
    }
    // enemies
    for (const e of r.enemies) {
      if (e.dead) continue;
      ctx.fillStyle = e.boss ? '#d07aff' : '#ff5a5a';
      const s = e.boss ? 3 : 2;
      ctx.fillRect(ox + e.x / TS * sc - s / 2, oy + e.y / TS * sc - s / 2, s, s);
    }
    // quest marker
    if (window.STORY && STORY.questTarget) {
      const qt = STORY.questTarget();
      if (qt && qt.x != null) {
        const qx = ox + qt.x / TS * sc;
        const qy = oy + qt.y / TS * sc;
        ctx.fillStyle = '#ffe27a';
        ctx.beginPath();
        ctx.moveTo(qx, qy - 4);
        ctx.lineTo(qx + 4, qy);
        ctx.lineTo(qx, qy + 4);
        ctx.lineTo(qx - 4, qy);
        ctx.closePath();
        ctx.fill();
      }
    }
    // player
    if (r.player) {
      const px = ox + r.player.x / TS * sc;
      const py = oy + r.player.y / TS * sc;
      const a = Math.atan2(r.player.facing.y, r.player.facing.x);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(-3, -3);
      ctx.lineTo(-3, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(244,197,66,.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, map.w * sc - 1, map.h * sc - 1);
  };

  // used by the menu map as well
  ENGINE.drawRegionMap = function (cv, regionId) {
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const map = W.build(regionId);
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(0, 0, w, h);
    const sc = Math.min(w / map.w, h / map.h);
    const ox = (w - map.w * sc) / 2;
    const oy = (h - map.h * sc) / 2;
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const type = map.tiles[y * map.w + x];
        ctx.fillStyle = tileColor(type, regionId);
        ctx.fillRect(ox + x * sc, oy + y * sc, Math.ceil(sc), Math.ceil(sc));
      }
    }
    // landmarks
    for (const [name, lm] of Object.entries(map.landmarks || {})) {
      const mx = ox + lm.x / TS * sc;
      const my = oy + lm.y / TS * sc;
      ctx.fillStyle = 'rgba(255,226,122,.9)';
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }
    if (map.station) {
      const sx = ox + map.station.x / TS * sc;
      const sy = oy + map.station.y / TS * sc;
      ctx.fillStyle = G.state.stations[regionId] ? '#37c9b8' : '#6a6078';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, TAU);
      ctx.fill();
    }
    for (const n of map.npcs) {
      ctx.fillStyle = 'rgba(150,255,235,.85)';
      ctx.fillRect(ox + n.x / TS * sc - 1.5, oy + n.y / TS * sc - 1.5, 3, 3);
    }
    if (regionId === G.state.region && G.runtime.player) {
      const px = ox + G.runtime.player.x / TS * sc;
      const py = oy + G.runtime.player.y / TS * sc;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#f4c542';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(244,197,66,.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, map.w * sc - 1, map.h * sc - 1);
  };
})();
