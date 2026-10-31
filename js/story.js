/* ============================================================
   Story — main quest, side quests, bosses, dialogue triggers
   ============================================================ */
window.STORY = (() => {
  const D = window.GAME_DATA;
  const $ = (s) => document.querySelector(s);

  const BOSS_INTRO = {
    dioVampire: 'dio_intro',
    wamuu: 'wamuu_intro',
    esidisi: 'esidisi_intro',
    dio: 'dio_final_intro'
  };
  const BOSS_DEFEAT = {
    dioVampire: 'dio_defeat',
    wamuu: 'wamuu_defeat',
    esidisi: 'esidisi_defeat',
    dio: 'dio_final_defeat'
  };
  const MAIN_TALK = {
    0: 'speedwagon_intro',
    2: 'erina_intro',
    5: 'caesar_intro',
    9: 'elder_intro',
    11: 'avdol_intro'
  };
  const SIDE_OFFER = {
    ledger: 'speedwagon_ledger_offer',
    herbs: 'erina_herbs_offer',
    scrolls: 'caesar_trial_offer',
    revenge: 'polnareff_intro',
    gum: 'iggy_offer'
  };
  const SIDE_DONE = {
    ledger: 'speedwagon_ledger_done',
    herbs: 'erina_herbs_done',
    scrolls: 'caesar_trial_done',
    revenge: 'polnareff_done',
    gum: 'iggy_done'
  };
  const AMBIENT = {
    speedwagon: 'speedwagon_after',
    erina: 'erina_after',
    caesar: 'caesar_after',
    elder: 'elder_after',
    avdol: 'avdol_after',
    kakyoin: 'kakyoin_ambient',
    kid: 'kid',
    merchant: 'merchant',
    guard: 'guard'
  };

  const S = {};

  function stageDef() { return G.mainStage(); }
  function story() { return G.state.story; }
  function flags() { return G.state.story.flags || (G.state.story.flags = {}); }

  function lines(key) {
    if (!key) return null;
    const v = G.tr('dialogue.' + key);
    return Array.isArray(v) ? v : null;
  }

  function say(key, cb) {
    const l = lines(key);
    if (l && window.UI) UI.showDialogue(l, cb);
    else if (cb) cb();
  }

  function saveRefresh() {
    G.save(true);
    G.refreshHUD();
    if (window.UI) UI.refreshMenu();
  }

  function setStage(n) {
    const old = G.state.story.stage;
    G.state.story.stage = n;
    const def = G.mainStage();
    if (def.kind === 'kill' && old !== n) {
      G.state.story.kills[def.target] = 0;
    }
    G.checkUnlocks();
    saveRefresh();
    const q = G.questDef();
    G.toast(G.tr('ui.questUpdated') + ': ' + q.name, 'quest');
    if (window.SOUND) SOUND.sfx('quest');
  }

  function advanceTo(n) {
    if (!G.state) return;
    setStage(n);
  }

  function markSideAvailable(id) {
    const def = D.SIDE_QUESTS[id];
    const s = G.state.side[id];
    if (!def || !s) return;
    if (s.state === 'locked' && G.state.story.stage >= def.unlockStage) {
      s.state = 'available';
      G.save(true);
    }
  }

  function inventoryCount(item) {
    return (G.state.items && G.state.items[item]) || 0;
  }

  /* ============================ SIDE QUESTS ============================ */
  function sideByNpc(npcId) {
    return Object.values(D.SIDE_QUESTS).find(q => q.npc === npcId) || null;
  }

  function sideByItem(item, questId) {
    if (questId && D.SIDE_QUESTS[questId]) return D.SIDE_QUESTS[questId];
    return Object.values(D.SIDE_QUESTS).find(q => q.item === item) || null;
  }

  function sideReady(def) {
    const s = G.state.side[def.id];
    return s && s.state === 'active' && (s.count || 0) >= (def.need || 1);
  }

  function completeSide(def) {
    const s = G.state.side[def.id];
    if (!s || s.state === 'done') return;
    s.state = 'done';
    s.count = def.need || 1;
    if (def.type === 'collect' && def.item) {
      const have = inventoryCount(def.item);
      G.removeItem(def.item, Math.min(have, def.need || 1));
    }
    const r = def.reward || {};
    if (r.coins) G.addCoins(r.coins);
    if (r.sp) {
      const h = G.state.heroes[G.state.activeHero];
      h.sp += r.sp;
    }
    if (r.items) {
      for (const [id, n] of Object.entries(r.items)) {
        G.state.items[id] = (G.state.items[id] || 0) + n;
        G.toast(`${G.tr('ui.gotItem')}: ${G.itemName(id)} ×${n}`, 'item');
      }
    }
    G.state.stats.quests++;
    saveRefresh();
    say(SIDE_DONE[def.id], () => {
      G.toast(G.tr('ui.questComplete') + ': ' + G.tr('quests.side.' + def.id + '.name'), 'good');
      if (window.SOUND) SOUND.sfx('victory');
    });
  }

  function offerSide(def) {
    const s = G.state.side[def.id];
    if (!s) return;
    if (G.state.story.stage < def.unlockStage) { ambient(def.npc); return; }
    s.state = 'available';
    say(SIDE_OFFER[def.id], () => {
      s.state = 'active';
      s.count = Math.min(def.need || 1, def.type === 'collect' ? inventoryCount(def.item) : 0);
      if ((s.count || 0) >= (def.need || 1)) s.state = 'ready';
      G.toast(G.tr('ui.newQuest') + ': ' + G.tr('quests.side.' + def.id + '.name'), 'quest');
      if (window.SOUND) SOUND.sfx('quest');
      saveRefresh();
    });
  }

  function sideTalk(npcId) {
    const def = sideByNpc(npcId);
    if (!def) { ambient(npcId); return; }
    const s = G.state.side[def.id];
    if (!s) { ambient(npcId); return; }
    if (s.state === 'done') { ambient(npcId); return; }
    if (s.state === 'ready') { completeSide(def); return; }
    if (s.state === 'active') {
      if ((s.count || 0) >= (def.need || 1)) { s.state = 'ready'; completeSide(def); return; }
      say(SIDE_OFFER[def.id]);
      return;
    }
    if (s.state === 'available' || s.state === 'locked') {
      offerSide(def);
      return;
    }
    ambient(npcId);
  }

  function ambient(npcId) {
    let key = AMBIENT[npcId];
    if (!key) {
      if (npcId === 'polnareff') key = 'polnareff_intro';
      else if (npcId === 'iggy') key = 'iggy_offer';
      else key = 'narrator';
    }
    say(key);
  }

  /* ============================ MAIN TALK ============================ */
  S.talkTo = function (npcId) {
    if (!G.state || !G.runtime.inGame) return;
    const def = stageDef();
    if (def.kind === 'talk' && def.target === npcId) {
      const key = MAIN_TALK[def.stage];
      say(key, () => {
        if (def.stage === 0) {
          advanceTo(1);
          markSideAvailable('ledger');
        } else if (def.stage === 2) {
          advanceTo(3);
          markSideAvailable('herbs');
        } else if (def.stage === 5) {
          advanceTo(6);
          markSideAvailable('scrolls');
        } else if (def.stage === 9) {
          advanceTo(10);
        } else if (def.stage === 11) {
          advanceTo(12);
          markSideAvailable('revenge');
          markSideAvailable('gum');
        }
        sideTalk(npcId);
      });
      return;
    }
    sideTalk(npcId);
  };

  /* ============================ WORLD INTERACTIONS ============================ */
  S.useHamonSpot = function (id) {
    if (!G.state) return;
    const def = stageDef();
    if (def.kind === 'interact' && def.stage === 4 && id === 'hamon_england') {
      say('hamon_awaken', () => {
        G.state.flags.hamon = true;
        advanceTo(5);
        G.unlockHero('joseph');
        G.toast(G.tr('ui.regionUnlocked') + ': ' + G.tr('regions.italy.name'), 'quest');
        if (window.SOUND) SOUND.sfx('hamon');
      });
      return;
    }
    const h = G.state.heroes[G.state.activeHero];
    const st = G.heroStats(h.id, h);
    h.hp = Math.min(st.maxHp, h.hp + Math.round(st.maxHp * 0.22));
    G.runtime.player.energy = st.maxEnergy;
    G.gainXP(10);
    G.toast(G.tr('ui.hamonTrain'), 'good');
    G.runtime.player.invuln = Math.max(G.runtime.player.invuln, 0.5);
    if (window.SOUND) SOUND.sfx('hamon');
    G.refreshHUD();
    G.save(true);
  };

  S.useStandMarker = function (id) {
    if (!G.state) return;
    G.state.flags.stand = true;
    G.state.flags.standMarker = id;
    const h = G.state.heroes[G.state.activeHero];
    const st = G.heroStats(h.id, h);
    G.runtime.player.energy = st.maxEnergy;
    h.hp = Math.min(st.maxHp, h.hp + Math.round(st.maxHp * 0.2));
    G.gainXP(12);
    G.toast(G.tr('ui.standAwaken'), 'quest');
    if (window.SOUND) SOUND.sfx('stand');
    G.refreshHUD();
    G.save(true);
  };

  S.usePortal = function (obj) {
    if (!obj || !G.state) return;
    if (G.state.story.stage < (obj.unlockStage || 0)) {
      G.toast(G.tr('ui.regionLocked'), 'bad');
      if (window.SOUND) SOUND.sfx('ui');
      return;
    }
    if (window.ENGINE) ENGINE.travelTo(obj.to, obj.spawn);
  };

  S.onStationActivated = function (region) {
    if (!G.state) return;
    G.state.flags['station_' + region] = true;
    G.save(true);
  };

  S.onCollectItem = function (item, questId) {
    if (!G.state) return;
    const def = sideByItem(item, questId);
    if (!def) return;
    const s = G.state.side[def.id];
    if (!s) return;
    if (s.state === 'locked' && G.state.story.stage >= def.unlockStage) {
      s.state = 'active';
      s.count = 0;
      G.toast(G.tr('ui.newQuest') + ': ' + G.tr('quests.side.' + def.id + '.name'), 'quest');
    }
    if (s.state === 'active' || s.state === 'ready') {
      if (s.state === 'active') {
        s.count = (s.count || 0) + 1;
        if (s.count >= (def.need || 1)) s.state = 'ready';
      }
      G.toast(G.tr('ui.questItemFound'), 'item');
      saveRefresh();
    }
  };

  S.enemyKilled = function (type) {
    if (!G.state) return;
    const def = stageDef();
    if (def.kind === 'kill' && def.target === type) {
      const kills = G.state.story.kills;
      kills[type] = (kills[type] || 0) + 1;
      if (kills[type] >= (def.need || 1)) {
        advanceTo(def.stage + 1);
      } else {
        G.refreshHUD();
        G.save(true);
      }
    }
    // revenge side quest
    const sq = G.state.side.revenge;
    if (sq && sq.state === 'active' && type === 'standAssassin') {
      sq.count = (sq.count || 0) + 1;
      if (sq.count >= D.SIDE_QUESTS.revenge.need) {
        sq.state = 'ready';
        G.toast(G.tr('ui.ready') + ': ' + G.tr('quests.side.revenge.name'), 'quest');
      }
      G.refreshHUD();
      G.save(true);
    }
  };

  S.bossDefeated = function (type) {
    if (!G.state) return;
    G.state.bosses[type] = true;
    const def = stageDef();
    const key = BOSS_DEFEAT[type];
    const after = () => {
      if (def.kind === 'boss' && def.target === type) {
        if (def.stage === 3) {
          advanceTo(4);
          G.toast(G.tr('ui.regionUnlocked') + ': ' + G.tr('regions.italy.name'), 'quest');
        } else if (def.stage === 7) {
          advanceTo(8);
          G.toast(G.tr('ui.regionUnlocked') + ': ' + G.tr('regions.mexico.name'), 'quest');
        } else if (def.stage === 10) {
          advanceTo(11);
          G.toast(G.tr('ui.regionUnlocked') + ': ' + G.tr('regions.egypt.name'), 'quest');
        } else if (def.stage === 13) {
          advanceTo(14);
          G.state.endingSeen = true;
          G.save(true);
          say('ending', () => {
            if (window.G && G.showEnding) G.showEnding();
          });
        }
        delete flags()['bossIntro_' + def.stage];
      }
    };
    G.toast(G.tr('ui.bossDefeated') + ': ' + G.enemyName(type), 'good');
    if (key) say(key, after);
    else after();
  };

  S.onPlayerRespawn = function () {
    if (!G.state) return;
    const def = stageDef();
    if (def.kind === 'boss') {
      delete flags()['bossIntro_' + def.stage];
      G.save(true);
    }
  };

  /* ============================ CHAPTERS / REGIONS ============================ */
  S.showChapterIntro = function (ch, cb) {
    const text = G.tr('ui.introChapter' + ch);
    if (!window.UI) { if (cb) cb(); return; }
    UI.showDialogue([
      { speaker: 'narrator', text: G.chapterTitle(ch) },
      { speaker: 'narrator', text }
    ], cb);
  };

  S.onEnterRegion = function (region, isNew) {
    if (!G.state) return;
    G.state.region = region;
    const f = flags();
    if (!isNew) {
      if (region === 'italy' && !f.chIntro2) {
        f.chIntro2 = true;
        S.showChapterIntro(2);
      } else if (region === 'egypt' && !f.chIntro3) {
        f.chIntro3 = true;
        S.showChapterIntro(3);
      }
    }
    G.save(true);
    if (window.UI) UI.updateHUD(true);
  };

  /* ============================ UPDATE / TRIGGERS ============================ */
  S.update = function (dt) {
    const r = G.runtime;
    if (!G.state || !r.inGame || r.paused || r.death || r.ending || r.dialogueOpen) return;
    const def = stageDef();
    const p = r.player;
    if (!p || !r.world) return;

    // reach objective
    if (def.kind === 'reach' && def.region === G.state.region) {
      const lm = r.world.landmarks && r.world.landmarks[def.target];
      if (lm && Math.hypot(p.x - lm.x, p.y - lm.y) < 62) {
        advanceTo(def.stage + 1);
        G.toast(G.tr('ui.objectiveComplete'), 'quest');
        return;
      }
    }

    // boss arena trigger
    if (def.kind === 'boss' && !r.bossActive) {
      const arena = r.world.arena;
      if (arena && arena.stage === def.stage && arena.boss === def.target) {
        const trig = arena.trigger;
        if (trig && !flags()['bossIntro_' + def.stage] &&
          Math.hypot(p.x - trig.x, p.y - trig.y) < (trig.r || 30)) {
          startBoss(def);
        }
      }
    }
  };

  function startBoss(def) {
    const key = BOSS_INTRO[def.target];
    flags()['bossIntro_' + def.stage] = true;
    G.save(true);
    const spawn = () => {
      if (!G.runtime.bossActive && G.runtime.inGame && !G.runtime.death) {
        ENGINE.spawnBoss(def.target);
        G.toast(G.tr('ui.bossWarning'), 'bad');
      }
    };
    if (key) say(key, spawn);
    else spawn();
  }

  /* ============================ TRACKER / TARGETS ============================ */
  function sideTracker(def) {
    const s = G.state.side[def.id];
    const sq = G.tr('quests.side.' + def.id);
    const count = s.count || 0;
    const need = def.need || 1;
    const progress = (def.type === 'collect' || def.type === 'kill') ? `${Math.min(count, need)}/${need}` : '';
    return {
      chapter: G.tr('quests.chapters.free'),
      name: sq.name,
      obj: sq.obj,
      progress,
      side: def.id
    };
  }

  S.activeSideQuest = function () {
    for (const def of Object.values(D.SIDE_QUESTS)) {
      const s = G.state.side[def.id];
      if (s && (s.state === 'active' || s.state === 'ready')) return def.id;
    }
    return null;
  };

  S.questProgress = function () {
    const def = stageDef();
    if (def.kind === 'kill') {
      return `${Math.min(G.state.story.kills[def.target] || 0, def.need || 1)}/${def.need || 1}`;
    }
    return '';
  };

  S.tracker = function () {
    if (!G.state) return null;
    const def = stageDef();
    if (def.kind === 'free') {
      const sideId = S.activeSideQuest();
      if (sideId) return sideTracker(D.SIDE_QUESTS[sideId]);
    }
    const q = G.questDef();
    return {
      chapter: G.chapterTitle(def.chapter),
      name: q.name,
      obj: q.obj,
      progress: S.questProgress()
    };
  };

  function findNpc(id) {
    const r = G.runtime;
    return (r.npcs || []).find(n => n.id === id) || null;
  }

  function findObject(id) {
    const r = G.runtime;
    return (r.world?.objects || []).find(o => o.id === id || o.chestId === id) || null;
  }

  function nearestEnemy(type) {
    const r = G.runtime, p = r.player;
    let best = null, bd = 1e9;
    for (const e of r.enemies || []) {
      if (e.dead || e.type !== type) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function sideTarget(def) {
    const r = G.runtime, p = r.player;
    const s = G.state.side[def.id];
    if (!s) return null;
    const npc = findNpc(def.npc);
    if (s.state === 'ready') return npc ? { x: npc.x, y: npc.y, label: G.tr('ui.sideQuest') } : null;
    if (def.type === 'kill') {
      const e = nearestEnemy(def.target);
      if (e) return { x: e.x, y: e.y, label: G.enemyName(def.target) };
      return npc ? { x: npc.x, y: npc.y, label: G.tr('ui.sideQuest') } : null;
    }
    if (def.type === 'collect') {
      let best = null, bd = 1e9;
      for (const pk of r.world.pickups || []) {
        if (pk.questId !== def.id || pk.collected || G.state.pickups[pk.id]) continue;
        const d = Math.hypot(pk.x - p.x, pk.y - p.y);
        if (d < bd) { bd = d; best = pk; }
      }
      if (best) return { x: best.x, y: best.y, label: G.itemName(def.item) };
      return npc ? { x: npc.x, y: npc.y, label: G.tr('ui.sideQuest') } : null;
    }
    return npc ? { x: npc.x, y: npc.y, label: G.tr('ui.sideQuest') } : null;
  }

  S.questTarget = function () {
    if (!G.state || !G.runtime.world) return null;
    const def = stageDef();
    if (def.kind === 'free') {
      const sideId = S.activeSideQuest();
      return sideId ? sideTarget(D.SIDE_QUESTS[sideId]) : null;
    }
    const r = G.runtime;
    if (def.kind === 'talk') {
      const npc = findNpc(def.target);
      if (npc) return { x: npc.x, y: npc.y, label: G.tr('ui.talk') };
      const lm = r.world.landmarks && r.world.landmarks[def.target];
      return lm ? { x: lm.x, y: lm.y, label: G.tr('ui.talk') } : null;
    }
    if (def.kind === 'kill') {
      const e = nearestEnemy(def.target);
      if (e) return { x: e.x, y: e.y, label: G.enemyName(def.target) };
      const lm = r.world.landmarks && r.world.landmarks[def.target];
      return lm ? { x: lm.x, y: lm.y, label: G.enemyName(def.target) } : null;
    }
    if (def.kind === 'boss') {
      const arena = r.world.arena;
      if (arena && arena.trigger) return { x: arena.trigger.x, y: arena.trigger.y, label: G.enemyName(def.target) };
      return null;
    }
    if (def.kind === 'interact') {
      const o = findObject(def.target);
      if (o) return { x: o.x, y: o.y, label: G.tr('ui.train') };
      const lm = r.world.landmarks && r.world.landmarks[def.target];
      return lm ? { x: lm.x, y: lm.y, label: G.tr('ui.train') } : null;
    }
    if (def.kind === 'reach') {
      const lm = r.world.landmarks && r.world.landmarks[def.target];
      return lm ? { x: lm.x, y: lm.y, label: G.tr('ui.objectiveMarker') } : null;
    }
    return null;
  };

  return S;
})();
