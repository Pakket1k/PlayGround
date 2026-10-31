/* ============================================================
   Core game shell — state, saves, screens, progression
   ============================================================ */
window.G = (() => {
  const D = window.GAME_DATA;
  const A = window.ART;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const SAVE_KEY = 'jojo_phantom_paths_save_v1';
  const LANG_KEY = 'jojo_phantom_paths_lang';
  const SETTINGS_KEY = 'jojo_phantom_paths_settings';

  const G = {
    state: null,
    lang: localStorage.getItem(LANG_KEY) || 'ru',
    settings: { music: true, sfx: true, shake: true },
    runtime: {
      world: null, player: null, enemies: [], projectiles: [], effects: [],
      npcs: [], particles: [], floaters: [], traps: [], camera: { x: 0, y: 0 },
      input: { x: 0, y: 0, keys: {}, attackHeld: false, target: null },
      paused: true, inGame: false, menuOpen: false, dialogueOpen: false,
      tick: 0, time: 0, lastTime: 0, titleTime: 0, screenShake: 0,
      autosave: 0, tutorialStep: 0, pendingBoss: null, bossActive: null,
      currentInteract: null, lastRegion: null, death: false, ending: false,
      cameraLock: null, weatherParticles: [], lightning: 0, regionBannerT: 0,
      pendingChapter: null, pendingDialogue: null, questTarget: null,
      cd: {}, lastSaveAt: 0, invuln: 0, heroSwitchCooldown: 0, mapCache: {},
      titleCanvas: null, titleCtx: null, titleW: 0, titleH: 0,
      charSelection: 'jonathan', pendingNew: false, uiRefresh: 0
    },
    tr, save, load, hasSave, newHero, createState, heroStats,
    showScreen, showTitle, showCharSelect, startNewGame, continueGame,
    enterGame, setLang, applyStaticI18n, toast, showModal, closeModal, confirm,
    fade, regionBanner, showTutorial, openTitleSettings, saveSettings,
    gainXP, addItem, removeItem, useItem, addCoins, unlockHero, checkUnlocks,
    updateTitle, tickTitle, initUI, refreshHUD, switchHero, respawn,
    itemName, itemDesc, charName, skillName, skillDesc, enemyName,
    chapterTitle, questDef, sideQuest, mainStage, currentRegionData,
    showEnding, setPaused, bind, showLevelUp
  };

  /* ---------------------------- localization ---------------------------- */
  function tr(path, vars) {
    const dict = window.I18N[G.lang] || window.I18N.ru;
    let v = path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), dict);
    if (v == null) {
      v = path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : undefined), window.I18N.ru);
    }
    if (v == null) return path;
    if (typeof v !== 'string') return v;
    if (vars) v = v.replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m);
    return v;
  }

  function setLang(lang) {
    G.lang = lang === 'en' ? 'en' : 'ru';
    localStorage.setItem(LANG_KEY, G.lang);
    document.documentElement.lang = G.lang;
    applyStaticI18n();
    const langBtn = $('#btn-title-lang');
    if (langBtn) langBtn.textContent = G.lang === 'ru' ? 'ЯЗЫК: RU' : 'LANGUAGE: EN';
    const charLang = $('#char-lang');
    if (charLang) charLang.textContent = G.lang.toUpperCase();
    const charScreen = document.getElementById('char-screen');
    if (charScreen && charScreen.classList.contains('active')) G.showCharSelect();
    if (G.state) {
      G.state.lang = G.lang;
      G.refreshHUD();
      if (G.runtime.menuOpen && window.UI) window.UI.refreshMenu();
      save(true);
    }
    if (window.SOUND) SOUND.sfx('ui');
  }

  function applyStaticI18n() {
    $$('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = tr(key);
      if (typeof text === 'string') el.textContent = text;
    });
  }

  /* ---------------------------- state ---------------------------- */
  function newHero(id) {
    const c = D.CHARACTERS[id];
    return {
      id, level: 1, xp: 0, sp: 1,
      hp: c.base.hp, skillNodes: [], unlocked: false,
      totalKills: 0, totalXp: 0
    };
  }

  function createState(chosen) {
    const heroes = {};
    for (const id of Object.keys(D.CHARACTERS)) heroes[id] = newHero(id);
    heroes[chosen].unlocked = true;
    const side = {};
    for (const id of Object.keys(D.SIDE_QUESTS)) side[id] = { state: 'locked', count: 0 };
    return {
      version: 1, lang: G.lang, chosenHero: chosen, activeHero: chosen,
      heroes, unlocked: [chosen], region: 'england',
      player: { x: 0, y: 0, facing: { x: 0, y: 1 } },
      story: { stage: 0, kills: {}, flags: {} },
      side, items: { smallHeal: 2, energyDrink: 1 }, coins: 30,
      chests: {}, stations: { england: false, italy: false, mexico: false, egypt: false },
      bosses: {}, pickups: {}, stats: { kills: 0, quests: 0, chests: 0, secrets: 0, playtime: 0, coins: 0 },
      timeOfDay: 0.34, day: 1, tutorialSeen: false, endingSeen: false, started: true,
      settings: { music: G.settings.music, sfx: G.settings.sfx, shake: G.settings.shake },
      flags: {}, created: Date.now()
    };
  }

  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
  }

  function save(silent) {
    if (!G.state || !G.state.started) return;
    try {
      if (G.runtime.player) {
        G.state.player.x = Math.round(G.runtime.player.x);
        G.state.player.y = Math.round(G.runtime.player.y);
        G.state.player.facing = { ...G.runtime.player.facing };
      }
      G.state.settings = { ...G.settings };
      G.state.lang = G.lang;
      G.state.timeOfDay = G.runtime.timeOfDay ?? G.state.timeOfDay;
      G.state.day = G.runtime.day ?? G.state.day;
      localStorage.setItem(SAVE_KEY, JSON.stringify(G.state));
      G.runtime.lastSaveAt = Date.now();
      if (!silent) toast(tr('ui.saved'), 'good');
    } catch (e) {
      if (!silent) toast(tr('ui.errorBody'), 'bad');
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (!s || !s.started) return false;
      G.state = s;
      G.state.settings = { ...G.settings, ...(s.settings || {}) };
      G.settings = { ...G.settings, ...G.state.settings };
      G.lang = s.lang || G.lang;
      localStorage.setItem(LANG_KEY, G.lang);
      document.documentElement.lang = G.lang;
      if (!G.state.items) G.state.items = {};
      if (!G.state.stats) G.state.stats = { kills: 0, quests: 0, chests: 0, secrets: 0, playtime: 0, coins: 0 };
      if (!G.state.flags) G.state.flags = {};
      return true;
    } catch { return false; }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings));
    if (G.state) G.state.settings = { ...G.settings };
  }

  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    G.settings = { music: s.music !== false, sfx: s.sfx !== false, shake: s.shake !== false };
  } catch {}

  /* ---------------------------- screens ---------------------------- */
  function showScreen(id) {
    ['title-screen', 'char-screen', 'menu', 'tutorial', 'ending'].forEach(s => {
      const el = document.getElementById(s);
      if (el) el.classList.toggle('active', s === id);
      if (el && s !== id) el.classList.add('hidden');
      if (el && s === id) el.classList.remove('hidden');
    });
    const world = $('#world-ui');
    if (world) world.classList.toggle('hidden', !G.runtime.inGame || !!id);
    if (!id) {
      ['title-screen', 'char-screen', 'menu', 'tutorial', 'ending'].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.remove('active');
      });
      if (world && G.runtime.inGame) world.classList.remove('hidden');
    }
  }

  function showTitle() {
    G.runtime.inGame = false;
    G.runtime.paused = true;
    $('#world-ui').classList.add('hidden');
    showScreen('title-screen');
    $('#btn-continue').disabled = !hasSave();
    applyStaticI18n();
    $('#btn-title-lang').textContent = G.lang === 'ru' ? 'ЯЗЫК: RU' : 'LANGUAGE: EN';
    if (window.SOUND) SOUND.stopMusic();
    if (G.runtime.titleCanvas) resizeTitleCanvas();
  }

  function showCharSelect() {
    G.runtime.pendingNew = true;
    G.showScreen('char-screen');
    renderCharCards();
    applyStaticI18n();
    $('#char-lang').textContent = G.lang.toUpperCase();
  }

  function renderCharCards() {
    const wrap = $('#char-cards');
    if (!wrap) return;
    const sel = G.runtime.charSelection || 'jonathan';
    wrap.innerHTML = '';
    for (const [id, c] of Object.entries(D.CHARACTERS)) {
      const card = document.createElement('div');
      card.className = 'char-card' + (sel === id ? ' selected' : '');
      card.dataset.char = id;
      const accent = id === 'jonathan' ? '#4a7fd4' : id === 'joseph' ? '#37c9b8' : '#a77bff';
      card.style.setProperty('--accent', accent);
      const stats = c.base;
      card.innerHTML = `
        <div class="card-bg"></div>
        <div class="card-part">${tr('ui.part' + c.part)}</div>
        <div class="card-art"><span class="card-kanji">${id === 'jonathan' ? '勇気' : id === 'joseph' ? '策略' : '無敵'}</span><img src="${A.portraitURL(id)}" alt=""></div>
        <div class="card-name">${tr('chars.' + id + '.name')}</div>
        <div class="card-title">${tr('chars.' + id + '.title')}</div>
        <div class="card-desc">${tr('chars.' + id + '.desc')}</div>
        <div class="card-stats">
          ${statPip('ui.hp', stats.hp, 150)}
          ${statPip('ui.attack', stats.atk, 16)}
          ${statPip('ui.defense', stats.def, 6)}
          ${statPip('ui.speed', stats.speed, 120)}
        </div>`;
      card.addEventListener('click', () => {
        G.runtime.charSelection = id;
        window.SOUND?.sfx('ui');
        renderCharCards();
      });
      wrap.appendChild(card);
    }
    const c = D.CHARACTERS[sel];
    $('#char-selected-info').innerHTML = `<b>${tr('chars.' + sel + '.name')}</b> · ${tr('chars.' + sel + '.passive')}<br><span style="font-size:14px">${tr('chars.' + sel + '.quote')}</span>`;
    $('#btn-start-game').disabled = false;
  }

  function statPip(labelKey, value, max) {
    const pct = Math.max(8, Math.min(100, value / max * 100));
    return `<div class="card-stat"><span>${tr(labelKey)}</span><div class="pip-track"><div class="pip-fill" style="width:${pct}%"></div></div></div>`;
  }

  /* ---------------------------- start / continue ---------------------------- */
  function startNewGame() {
    const chosen = G.runtime.charSelection || 'jonathan';
    G.state = createState(chosen);
    G.runtime.player = null;
    G.runtime.enemies = [];
    G.runtime.inGame = true;
    G.runtime.death = false;
    G.runtime.ending = false;
    G.settings = { ...G.state.settings };
    if (window.SOUND) {
      SOUND.setMusic(G.settings.music);
      SOUND.setSfx(G.settings.sfx);
    }
    G.enterGame(true);
    save(true);
  }

  function continueGame() {
    if (!load()) { toast(tr('ui.noSave'), 'bad'); return; }
    G.runtime.inGame = true;
    G.runtime.death = false;
    G.runtime.ending = false;
    G.settings = { ...G.state.settings };
    if (window.SOUND) {
      SOUND.setMusic(G.settings.music);
      SOUND.setSfx(G.settings.sfx);
    }
    G.enterGame(false);
  }

  function enterGame(isNew) {
    G.showScreen(null);
    $('#world-ui').classList.remove('hidden');
    if (window.ENGINE) {
      ENGINE.start(isNew);
    }
    if (isNew) {
      setTimeout(() => {
        if (window.STORY) STORY.showChapterIntro(1, () => {
          if (!G.state.tutorialSeen) G.showTutorial(true);
        });
      }, 450);
    } else {
      G.regionBanner(G.state.region);
      if (!G.state.tutorialSeen) setTimeout(() => G.showTutorial(true), 700);
    }
  }

  /* ---------------------------- hero / progression ---------------------------- */
  function heroStats(id, hero = null) {
    const c = D.CHARACTERS[id];
    const h = hero || G.state?.heroes?.[id] || newHero(id);
    const lv = h.level || 1;
    let maxHp = c.base.hp + c.growth.hp * (lv - 1);
    let atk = c.base.atk + c.growth.atk * (lv - 1);
    let def = c.base.def + c.growth.def * (lv - 1);
    let speed = c.base.speed + c.growth.speed * (lv - 1);
    let maxEnergy = c.base.energy + c.growth.energy * (lv - 1);
    let crit = c.base.crit;
    let critDmg = c.base.critDmg;
    let cdMult = 1, skill1Mult = 1, skill2Mult = 1, ultMult = 1;
    const nodes = h.skillNodes || [];
    for (const node of D.TREE_NODES) {
      if (!nodes.includes(node.id)) continue;
      const e = node.effect;
      if (e.maxHp) maxHp += e.maxHp;
      if (e.atk) atk += e.atk;
      if (e.def) def += e.def;
      if (e.speed) speed += e.speed;
      if (e.maxEnergy) maxEnergy += e.maxEnergy;
      if (e.crit) crit += e.crit;
      if (e.cd) cdMult *= e.cd;
      if (e.skill1) skill1Mult *= e.skill1;
      if (e.skill2) skill2Mult *= e.skill2;
      if (e.ultimate) ultMult *= e.ultimate;
    }
    // permanent charm
    if ((G.state?.items?.charm || 0) > 0) speed += 6;
    if (id === 'jotaro') { crit += 0.15; critDmg += 0.1; }
    if (id === 'joseph') cdMult *= 0.9;
    if (id === 'jonathan') { /* passive handled in damage */ }
    maxHp = Math.round(maxHp); atk = Math.round(atk * 10) / 10; def = Math.round(def * 10) / 10;
    speed = Math.round(speed * 10) / 10; maxEnergy = Math.round(maxEnergy);
    crit = Math.min(0.75, crit); critDmg = Math.round(critDmg * 100) / 100;
    return { maxHp, atk, def, speed, maxEnergy, crit, critDmg, cdMult, skill1Mult, skill2Mult, ultMult };
  }

  function gainXP(amount) {
    if (!G.state) return;
    const h = G.state.heroes[G.state.activeHero];
    if (!h) return;
    if (h.level >= D.MAX_LEVEL) { h.xp = 0; return; }
    h.xp += amount;
    h.totalXp = (h.totalXp || 0) + amount;
    let leveled = 0;
    while (h.level < D.MAX_LEVEL && h.xp >= D.XP_TABLE[h.level]) {
      h.xp -= D.XP_TABLE[h.level];
      h.level++;
      h.sp++;
      leveled++;
    }
    if (leveled > 0) {
      const st = heroStats(h.id, h);
      h.hp = st.maxHp;
      G.showLevelUp(h.id, h.level);
      if (window.SOUND) SOUND.sfx('level');
      G.save(true);
    }
  }

  function addItem(item, qty = 1) {
    if (!G.state) return;
    G.state.items[item] = (G.state.items[item] || 0) + qty;
    toast(`${tr('ui.gotItem')}: ${itemName(item)} ×${qty}`, 'item');
    if (window.SOUND) SOUND.sfx('pickup');
    if (window.UI) UI.refreshMenu();
    save(true);
  }

  function removeItem(item, qty = 1) {
    if (!G.state || !G.state.items[item]) return false;
    G.state.items[item] -= qty;
    if (G.state.items[item] <= 0) delete G.state.items[item];
    return true;
  }

  function useItem(item) {
    if (!G.state) return false;
    const def = D.ITEMS[item];
    if (!def) return false;
    const h = G.state.heroes[G.state.activeHero];
    const st = heroStats(h.id, h);
    if (def.type === 'heal') {
      if (h.hp >= st.maxHp) { toast(tr('ui.fullHp'), 'bad'); return false; }
      h.hp = Math.min(st.maxHp, h.hp + def.heal);
      removeItem(item);
      toast(`${itemName(item)}: +${def.heal} ${tr('ui.hp')}`, 'good');
      if (window.SOUND) SOUND.sfx('heal');
    } else if (def.type === 'energy') {
      G.runtime.player.energy = Math.min(st.maxEnergy, G.runtime.player.energy + def.energy);
      removeItem(item);
      toast(`${itemName(item)}: +${def.energy} ${tr('ui.energy')}`, 'good');
      if (window.SOUND) SOUND.sfx('heal');
    } else if (def.type === 'buff') {
      if (def.buff.speed) addBuff({ type: 'speed', mult: def.buff.speed, duration: def.buff.duration, nameKey: 'ui.buffSpeed' });
      removeItem(item);
      toast(`${itemName(item)}`, 'good');
      if (window.SOUND) SOUND.sfx('heal');
    } else if (def.type === 'permanent') {
      // charm stays in inventory as proof but effect applies permanently
      toast(tr('ui.itemUsed') + ': ' + itemName(item), 'good');
      if (window.SOUND) SOUND.sfx('level');
      G.save(true);
      return true;
    } else {
      toast(tr('ui.noNeed'), 'bad');
      return false;
    }
    G.refreshHUD();
    if (window.UI) UI.refreshMenu();
    save(true);
    return true;
  }

  function addCoins(n) {
    if (!G.state) return;
    G.state.coins += n;
    G.state.stats.coins += n;
    G.refreshHUD();
  }

  function unlockHero(id) {
    if (!G.state) return;
    if (!G.state.unlocked.includes(id)) {
      G.state.unlocked.push(id);
      G.state.heroes[id].unlocked = true;
      toast(`${tr('ui.heroUnlocked')}: ${charName(id)}`, 'quest');
      if (window.SOUND) SOUND.sfx('quest');
      save(true);
    }
  }

  function checkUnlocks() {
    if (!G.state) return;
    const stage = G.state.story.stage;
    if (stage >= 4) { unlockHero('jonathan'); unlockHero('joseph'); }
    if (stage >= 7) unlockHero('jotaro');
  }

  function switchHero(id) {
    if (!G.state || !G.state.unlocked.includes(id)) return false;
    if (id === G.state.activeHero) return false;
    const old = G.state.heroes[G.state.activeHero];
    const oldSt = heroStats(old.id, old);
    old.hp = Math.min(old.hp, oldSt.maxHp);
    G.state.activeHero = id;
    const h = G.state.heroes[id];
    const st = heroStats(id, h);
    h.hp = Math.min(st.maxHp, h.hp || st.maxHp);
    if (window.ENGINE) ENGINE.syncPlayerToHero(true);
    G.refreshHUD();
    toast(tr('ui.heroSwitched') + ': ' + charName(id), 'good');
    if (window.SOUND) SOUND.sfx('hamon');
    G.save(true);
    return true;
  }

  function respawn() {
    if (!G.state) return;
    const h = G.state.heroes[G.state.activeHero];
    const st = heroStats(h.id, h);
    h.hp = Math.round(st.maxHp * 0.6);
    G.runtime.death = false;
    $('#death-screen').classList.add('hidden');
    if (window.ENGINE) ENGINE.respawnPlayer();
    G.refreshHUD();
    save(true);
  }

  /* ---------------------------- UI helpers ---------------------------- */
  function toast(text, type = '') {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => el.remove(), 3000);
  }

  function showModal(title, body, actions = []) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = body;
    const acts = $('#modal-actions');
    acts.innerHTML = '';
    for (const a of actions) {
      const b = document.createElement('button');
      b.className = 'pixel-btn ' + (a.cls || '');
      b.textContent = a.label;
      b.addEventListener('click', () => {
        if (window.SOUND) SOUND.sfx('ui');
        G.closeModal();
        if (a.onClick) a.onClick();
      });
      acts.appendChild(b);
    }
    $('#modal').classList.remove('hidden');
    G.setPaused(true);
  }

  function closeModal() {
    $('#modal').classList.add('hidden');
    if (G.runtime.inGame && !G.runtime.menuOpen && !G.runtime.dialogueOpen && !G.runtime.death && !G.runtime.ending) G.setPaused(false);
  }

  function confirm(title, body, onYes, yesLabel, noLabel) {
    G.showModal(title, body, [
      { label: yesLabel || tr('ui.confirm'), cls: 'primary', onClick: onYes },
      { label: noLabel || tr('ui.cancel'), cls: '', onClick: () => {} }
    ]);
  }

  function fade(on, cb) {
    const f = $('#fade');
    f.classList.toggle('on', !!on);
    if (cb) setTimeout(cb, 380);
  }

  function regionBanner(regionId) {
    const b = $('#region-banner');
    const r = tr('regions.' + regionId);
    const ch = tr('regions.' + regionId + '.chapter');
    b.querySelector('.rb-chapter').textContent = ch;
    b.querySelector('.rb-name').textContent = r.name;
    b.querySelector('.rb-sub').textContent = r.sub;
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(G.runtime.regionBannerT);
    G.runtime.regionBannerT = setTimeout(() => b.classList.add('hidden'), 2600);
  }

  function showTutorial(fromGame) {
    const body = $('#tutorial-body');
    const rows = tr('tutorial.rows');
    body.innerHTML = rows.map(r => `<div class="tut-row"><div class="ti">${r.icon}</div><div class="tt">${r.text}</div></div>`).join('') +
      `<div class="tut-row"><div class="ti">⌨</div><div class="tt">${tr('ui.keyboardHint')}</div></div>`;
    G.runtime.tutorialFromGame = !!fromGame;
    G.showScreen('tutorial');
    G.setPaused(true);
  }

  function showLevelUp(id, level) {
    const b = $('#levelup-banner');
    b.querySelector('.lu-level span').textContent = level;
    b.querySelector('.lu-hero').textContent = charName(id).toUpperCase();
    b.classList.remove('hidden');
    b.style.animation = 'none';
    void b.offsetWidth;
    b.style.animation = '';
    clearTimeout(G.runtime.levelBannerT);
    G.runtime.levelBannerT = setTimeout(() => b.classList.add('hidden'), 2400);
  }

  function setPaused(p) {
    G.runtime.paused = !!p;
    if (window.SOUND) SOUND.setPaused(!!p);
  }

  /* ---------------------------- title / settings ---------------------------- */
  function resizeTitleCanvas() {
    const c = $('#title-canvas');
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const scale = Math.max(2, Math.min(3, Math.round(Math.min(rect.width, rect.height) / 260)));
    c.width = Math.max(220, Math.round(rect.width / scale));
    c.height = Math.max(320, Math.round(rect.height / scale));
    G.runtime.titleCanvas = c;
    G.runtime.titleCtx = c.getContext('2d');
    G.runtime.titleW = c.width;
    G.runtime.titleH = c.height;
  }

  function updateTitle(t) {
    const ctx = G.runtime.titleCtx;
    if (!ctx) return;
    window.WORLDART.drawTitle(ctx, G.runtime.titleW, G.runtime.titleH, t);
  }

  function tickTitle(t) {
    if ($('#title-screen').classList.contains('active')) updateTitle(t);
  }

  function openTitleSettings() {
    const s = G.settings;
    const body = `
      <div class="settings-row"><div><div class="sr-label">${tr('ui.languageLabel')}</div><div class="sr-sub">${tr('ui.languageSub')}</div></div><button class="toggle-btn" id="m-lang">${G.lang.toUpperCase()}</button></div>
      <div class="settings-row"><div class="sr-label">${tr('ui.music')}</div><button class="toggle-btn ${s.music ? 'on' : ''}" id="m-music">${s.music ? 'ON' : 'OFF'}</button></div>
      <div class="settings-row"><div class="sr-label">${tr('ui.sfx')}</div><button class="toggle-btn ${s.sfx ? 'on' : ''}" id="m-sfx">${s.sfx ? 'ON' : 'OFF'}</button></div>
      <div class="settings-row"><div class="sr-label">${tr('ui.shake')}</div><button class="toggle-btn ${s.shake ? 'on' : ''}" id="m-shake">${s.shake ? 'ON' : 'OFF'}</button></div>
      <p style="font-size:12px;color:var(--muted)">${tr('ui.settingsHint')}</p>`;
    G.showModal(tr('ui.settingsTitle'), body, [{ label: tr('ui.close'), cls: 'primary', onClick: () => {} }]);
    const lang = $('#m-lang'), mus = $('#m-music'), sfx = $('#m-sfx'), shake = $('#m-shake');
    lang?.addEventListener('click', () => { G.setLang(G.lang === 'ru' ? 'en' : 'ru'); G.closeModal(); openTitleSettings(); });
    mus?.addEventListener('click', () => { G.settings.music = !G.settings.music; SOUND.setMusic(G.settings.music); saveSettings(); G.closeModal(); openTitleSettings(); });
    sfx?.addEventListener('click', () => { G.settings.sfx = !G.settings.sfx; SOUND.setSfx(G.settings.sfx); saveSettings(); G.closeModal(); openTitleSettings(); });
    shake?.addEventListener('click', () => { G.settings.shake = !G.settings.shake; saveSettings(); G.closeModal(); openTitleSettings(); });
  }

  /* ---------------------------- names / defs ---------------------------- */
  function itemName(id) { return tr('items.' + id + '.name'); }
  function itemDesc(id) { return tr('items.' + id + '.desc'); }
  function charName(id) { return tr('chars.' + id + '.name'); }
  function skillName(id, idx) { return tr('skills.' + id + '.s' + (idx + 1) + '.name'); }
  function skillDesc(id, idx) { return tr('skills.' + id + '.s' + (idx + 1) + '.desc'); }
  function enemyName(id) { return tr('enemies.' + id); }
  function chapterTitle(ch) { return tr('quests.chapters.c' + ch); }
  function mainStage() { return D.MAIN_STAGES.find(s => s.stage === G.state.story.stage) || D.MAIN_STAGES[D.MAIN_STAGES.length - 1]; }
  function questDef() {
    const st = mainStage();
    return tr('quests.main.' + st.key);
  }
  function sideQuest(id) { return D.SIDE_QUESTS[id]; }
  function currentRegionData() { return D.REGIONS[G.state?.region || 'england']; }

  function showEnding() {
    if (!G.state) return;
    G.runtime.ending = true;
    G.setPaused(true);
    const s = G.state.stats;
    const h = G.state.heroes[G.state.activeHero];
    $('#ending-title').textContent = tr('ending.title');
    $('#ending-text').textContent = tr('ending.text');
    const time = Math.floor(s.playtime / 60);
    $('#ending-stats').innerHTML = `
      <div class="es-row"><span>${tr('ui.enemiesDefeated')}</span><b>${s.kills}</b></div>
      <div class="es-row"><span>${tr('ui.questsDone')}</span><b>${s.quests}</b></div>
      <div class="es-row"><span>${tr('ui.chestsOpened')}</span><b>${s.chests}</b></div>
      <div class="es-row"><span>${tr('ui.stationsFound')}</span><b>${Object.values(G.state.stations).filter(Boolean).length}/4</b></div>
      <div class="es-row"><span>${tr('ui.playTime')}</span><b>${time} мин</b></div>
      <div class="es-row"><span>${tr('ui.level')}</span><b>${h.level}</b></div>`;
    G.showScreen('ending');
    $('#world-ui').classList.add('hidden');
    if (window.SOUND) SOUND.sfx('victory');
  }

  /* ---------------------------- bindings ---------------------------- */
  function bind() {
    $('#btn-new')?.addEventListener('click', () => {
      if (window.SOUND) { SOUND.init(); SOUND.sfx('ui'); }
      if (hasSave()) {
        G.confirm(tr('ui.newGame'), tr('ui.newGameConfirm'), () => {
          G.runtime.charSelection = 'jonathan';
          G.showCharSelect();
        }, tr('ui.yes'), tr('ui.cancel'));
      } else {
        G.runtime.charSelection = 'jonathan';
        G.showCharSelect();
      }
    });
    $('#btn-continue')?.addEventListener('click', () => {
      if (window.SOUND) { SOUND.init(); SOUND.sfx('ui'); }
      G.continueGame();
    });
    $('#btn-title-lang')?.addEventListener('click', () => G.setLang(G.lang === 'ru' ? 'en' : 'ru'));
    $('#btn-title-settings')?.addEventListener('click', () => { if (window.SOUND) { SOUND.init(); SOUND.sfx('ui'); } G.openTitleSettings(); });
    $('#btn-title-how')?.addEventListener('click', () => { if (window.SOUND) { SOUND.init(); SOUND.sfx('ui'); } G.showTutorial(false); });
    $('#btn-char-back')?.addEventListener('click', () => { G.showTitle(); });
    $('#btn-start-game')?.addEventListener('click', () => {
      if (window.SOUND) { SOUND.init(); SOUND.sfx('level'); }
      G.startNewGame();
    });
    $('#btn-tutorial-close')?.addEventListener('click', () => {
      G.runtime.tutorialSeen = true;
      if (G.state) { G.state.tutorialSeen = true; save(true); }
      $('#tutorial').classList.add('hidden');
      if (G.runtime.tutorialFromGame && G.runtime.inGame) {
        G.showScreen(null);
        G.setPaused(false);
      } else {
        G.showTitle();
      }
    });
    $('#btn-respawn')?.addEventListener('click', () => G.respawn());
    $('#btn-ending-continue')?.addEventListener('click', () => {
      $('#ending').classList.add('hidden');
      G.runtime.ending = false;
      G.showScreen(null);
      G.setPaused(false);
      G.toast(tr('ending.freeRoam'), 'good');
    });
    window.addEventListener('resize', () => {
      resizeTitleCanvas();
      if (window.ENGINE) ENGINE.resize();
    });
    window.addEventListener('beforeunload', () => { if (G.state) save(true); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && G.state) save(true);
    });
  }

  // UI.init replaces this with the real HUD refresher. The stub keeps early
  // calls (title screen, first boot) safe before ui.js has initialised.
  function refreshHUD(force) {
    if (window.UI && UI.updateHUD) UI.updateHUD(force);
  }

  function initUI() {
    resizeTitleCanvas();
    bind();
    applyStaticI18n();
    $('#btn-continue').disabled = !hasSave();
    $('#btn-title-lang').textContent = G.lang === 'ru' ? 'ЯЗЫК: RU' : 'LANGUAGE: EN';
    G.showTitle();
    if (window.SOUND) {
      SOUND.setMusic(G.settings.music);
      SOUND.setSfx(G.settings.sfx);
    }
    // unlock audio on first interaction
    const unlock = () => {
      if (window.SOUND) SOUND.init();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  return G;
})();
