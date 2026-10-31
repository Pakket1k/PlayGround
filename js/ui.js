/* ============================================================
   UI — HUD, menus, dialogue, skill tree, map, settings
   ============================================================ */
window.UI = (() => {
  const D = window.GAME_DATA;
  const A = window.ART;
  const W = window.WORLD;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const UI = {
    menuTab: 'heroes',
    menuHero: null,
    lastMapAt: 0,
    dlg: null
  };

  const SPEAKER_NAMES = {
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
    guard: ['СТРАЖНИК', 'GUARD'],
    narrator: ['РАССКАЗЧИК', 'NARRATOR'],
    dio: ['ДИО', 'DIO'],
    dioVampire: ['ДИО БРАНДО', 'DIO BRANDO'],
    wamuu: ['ВАМУУ', 'WAMUU'],
    esidisi: ['ЭЙСИДИСИ', 'ESIDISI']
  };

  /* ============================ DIALOGUE ============================ */
  function speakerId(sp) {
    if (!sp) return 'narrator';
    if (sp === 'hero') return G.state?.activeHero || 'jonathan';
    return sp;
  }

  function speakerName(sp) {
    if (sp === 'hero') {
      const id = G.state?.activeHero || 'jonathan';
      return G.tr('chars.' + id + '.short');
    }
    const nm = SPEAKER_NAMES[sp];
    if (nm) return nm[G.lang === 'en' ? 1 : 0];
    if (G.state && D.CHARACTERS[sp]) return G.tr('chars.' + sp + '.short');
    return sp;
  }

  UI.showDialogue = function (lines, onDone) {
    if (!lines || !lines.length) { if (onDone) setTimeout(onDone, 30); return; }
    if (UI.dlg && UI.dlg.timer) clearInterval(UI.dlg.timer);
    UI.dlg = { lines, idx: 0, onDone, char: 0, typing: false, timer: null, full: '' };
    G.runtime.dialogueOpen = true;
    G.setPaused(true);
    $('#dialogue').classList.remove('hidden');
    renderDialogueLine();
  };

  function renderDialogueLine() {
    const d = UI.dlg;
    if (!d) return;
    const line = d.lines[d.idx];
    if (!line) { finishDialogue(); return; }
    const id = speakerId(line.speaker);
    $('#dlg-name').textContent = speakerName(line.speaker);
    const cv = $('#dlg-portrait');
    if (cv) {
      const ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      try {
        const pc = A.portraitCanvas(id);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pc, 0, 0, cv.width, cv.height);
      } catch (e) { /* portrait unavailable */ }
    }
    const text = String(line.text || '');
    d.full = text;
    d.char = 0;
    d.typing = true;
    $('#dlg-text').textContent = '';
    clearInterval(d.timer);
    d.timer = setInterval(() => {
      if (!UI.dlg || UI.dlg !== d) return;
      d.char += 2;
      $('#dlg-text').textContent = text.slice(0, d.char);
      if (d.char >= text.length) {
        clearInterval(d.timer);
        d.timer = null;
        d.typing = false;
      }
    }, 22);
  }

  UI.advanceDialogue = function () {
    const d = UI.dlg;
    if (!d) return;
    if (d.typing) {
      clearInterval(d.timer);
      d.timer = null;
      d.typing = false;
      $('#dlg-text').textContent = d.full;
      return;
    }
    d.idx++;
    if (d.idx >= d.lines.length) finishDialogue();
    else renderDialogueLine();
  };

  function finishDialogue() {
    const d = UI.dlg;
    if (!d) return;
    clearInterval(d.timer);
    const cb = d.onDone;
    UI.dlg = null;
    $('#dialogue').classList.add('hidden');
    G.runtime.dialogueOpen = false;
    if (G.runtime.inGame && !G.runtime.menuOpen && !G.runtime.death && !G.runtime.ending) G.setPaused(false);
    if (cb) setTimeout(cb, 60);
  }

  /* ============================ HUD ============================ */
  function weatherLabel() {
    const region = G.state?.region || 'england';
    const w = G.runtime.weather || D.WEATHERS[region] || 'clear';
    const map = {
      rain: 'ui.weatherRain', clear: 'ui.weatherClear', heat: 'ui.weatherHeat',
      storm: 'ui.weatherStorm', petals: 'ui.weatherPetals', fireflies: 'ui.weatherFireflies'
    };
    return G.tr(map[w] || 'ui.weatherClear');
  }

  function phaseLabel(phase) {
    if (phase === 1) return G.tr('ui.phase') + ' I';
    if (phase === 2) return G.tr('ui.bossPhase2');
    return G.tr('ui.bossPhase3');
  }

  UI.updateHUD = function (force) {
    const r = G.runtime;
    if (!r.inGame || !r.player || !G.state) return;
    const now = performance.now();
    if (!force && now - (r.uiRefresh || 0) < 90) return;
    r.uiRefresh = now;
    const heroId = G.state.activeHero;
    const h = G.state.heroes[heroId];
    const st = G.heroStats(heroId, h);
    const p = r.player;

    const hpPct = Math.max(0, Math.min(100, (h.hp || 0) / st.maxHp * 100));
    const enPct = Math.max(0, Math.min(100, (p.energy || 0) / st.maxEnergy * 100));
    $('#hud-hp-fill').style.width = hpPct + '%';
    $('#hud-energy-fill').style.width = enPct + '%';
    $('#hud-hp-text').textContent = `${Math.ceil(Math.max(0, h.hp))} / ${st.maxHp}`;
    $('#hud-energy-text').textContent = `${Math.floor(p.energy)} / ${st.maxEnergy}`;
    $('#hud-hero-name').textContent = G.tr('chars.' + heroId + '.short');
    $('#hud-level').textContent = h.level;
    $('#hud-stance').textContent = heroId === 'jotaro' ? G.tr('ui.stanceStand') : G.tr('ui.stanceHamon');
    $('#hud-stance').style.color = heroId === 'jotaro' ? '#d8b4ff' : '';
    const portrait = $('#hud-portrait');
    if (portrait && portrait.dataset.hero !== heroId) {
      portrait.dataset.hero = heroId;
      portrait.src = A.portraitURL(heroId);
    }

    const region = G.state.region;
    $('#hud-region').textContent = G.tr('regions.' + region + '.name');
    $('#hud-clock').textContent = ENGINE.getClock ? ENGINE.getClock() : '--:--';
    $('#hud-weather').textContent = weatherLabel();

    // quest tracker
    const trk = (window.STORY && STORY.tracker) ? STORY.tracker() : null;
    if (trk) {
      $('#quest-chapter').textContent = trk.chapter || '';
      $('#quest-name').textContent = trk.name || '';
      $('#quest-objective').textContent = trk.obj || '';
      const prog = trk.progress ? `  ${trk.progress}` : '';
      if (prog) $('#quest-objective').textContent = trk.obj + prog;
    }
    const qt = (window.STORY && STORY.questTarget) ? STORY.questTarget() : null;
    const arrow = $('#quest-arrow');
    const distEl = $('#quest-distance');
    if (qt && qt.x != null && p) {
      const dx = qt.x - p.x, dy = qt.y - p.y;
      const deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (arrow) arrow.style.transform = `rotate(${deg}deg)`;
      const dist = Math.max(1, Math.round(Math.hypot(dx, dy) / 8));
      if (distEl) distEl.textContent = dist + ' ' + G.tr('ui.distanceUnit');
    } else {
      if (arrow) arrow.style.transform = 'rotate(0deg)';
      if (distEl) distEl.textContent = '—';
    }

    // boss bar
    if (r.bossActive && !r.bossActive.dead) {
      const b = r.bossActive;
      const bar = $('#boss-bar');
      bar.classList.remove('hidden');
      $('#boss-name').textContent = G.enemyName(b.type);
      $('#boss-phase').textContent = phaseLabel(b.phase || 1);
      $('#boss-fill').style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
    } else {
      $('#boss-bar').classList.add('hidden');
    }

    UI.refreshSkillButtons();

    if (force || now - UI.lastMapAt > 260) {
      UI.lastMapAt = now;
      const mm = $('#minimap');
      if (mm && ENGINE.drawMinimap) ENGINE.drawMinimap(mm);
    }
  };

  UI.refreshSkillLabels = function () {
    if (!G.state) return;
    const id = G.state.activeHero;
    const c = D.CHARACTERS[id];
    if (!c) return;
    const icons = {
      jonathan: ['☀', '✧', '✹'],
      joseph: ['✦', '✧', '✹'],
      jotaro: ['✦', '➤', '★']
    };
    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById('btn-skill-' + i);
      if (!btn) continue;
      const sk = c.skills[i];
      const icon = btn.querySelector('.act-icon');
      const label = btn.querySelector('.act-label');
      if (icon) icon.textContent = icons[id] ? icons[id][i] : '✦';
      if (label) {
        const short = G.tr('skills.' + id + '.s' + (i + 1) + '.short');
        label.textContent = short && short !== 'skills.' + id + '.s' + (i + 1) + '.short'
          ? short
          : (i === 2 ? 'УЛЬТ' : 'S' + (i + 1));
      }
    }
  };

  UI.refreshSkillButtons = function () {
    if (!G.state) return;
    const r = G.runtime;
    const id = G.state.activeHero;
    const c = D.CHARACTERS[id];
    if (!c) return;
    const energy = r.player ? r.player.energy : 0;
    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById('btn-skill-' + i);
      if (!btn) continue;
      const sk = c.skills[i];
      const cd = Math.max(0, r.cd?.[i] || 0);
      const total = (sk.cd || 1) * (r.player?.stats?.cdMult || 1);
      btn.classList.toggle('cooling', cd > 0.02);
      btn.classList.toggle('no-energy', energy < (sk.energy || 0));
      btn.style.setProperty('--cd', String(Math.max(0, Math.min(1, cd / total))));
      const txt = btn.querySelector('.cd-text');
      if (txt) txt.textContent = cd > 0.02 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '';
    }
    const dodge = $('#btn-dodge');
    if (dodge && r.player) {
      const cd = Math.max(0, r.player.dodgeCd || 0);
      dodge.classList.toggle('cooling', cd > 0.02);
      dodge.style.setProperty('--cd', String(Math.min(1, cd / 1)));
      const txt = dodge.querySelector('.cd-text');
      if (txt) txt.textContent = cd > 0.02 ? cd.toFixed(1) : '';
    }
  };

  UI.showBoss = function (e) {
    if (!e) return;
    $('#boss-bar').classList.remove('hidden');
    $('#boss-name').textContent = G.enemyName(e.type);
    $('#boss-phase').textContent = phaseLabel(e.phase || 1);
    $('#boss-fill').style.width = '100%';
  };

  UI.hideBoss = function () {
    $('#boss-bar').classList.add('hidden');
  };

  /* ============================ MENU ============================ */
  function xpText(h) {
    if (h.level >= D.MAX_LEVEL) return 'MAX';
    const need = D.XP_TABLE[h.level] || 1;
    return `${Math.floor(h.xp)} / ${need}`;
  }

  function heroCardHTML(id) {
    const h = G.state.heroes[id];
    const locked = !G.state.unlocked.includes(id);
    const active = G.state.activeHero === id;
    return `<button class="hero-menu-card ${active ? 'active' : ''} ${locked ? 'locked' : ''}" data-hero="${id}" ${locked ? 'disabled' : ''}>
      <img src="${A.portraitURL(id)}" alt="">
      <div>
        <div class="hm-name">${G.tr('chars.' + id + '.short')}</div>
        <div class="hm-sub">${G.tr('chars.' + id + '.title')}</div>
      </div>
      <div class="hm-lv">LV ${h.level}<small>${locked ? G.tr('ui.locked') : xpText(h) + ' XP'}</small></div>
    </button>`;
  }

  function treeHTML(sel, h) {
    let html = '';
    for (const n of D.TREE_NODES) {
      const unlocked = h.skillNodes.includes(n.id);
      const reqOk = !n.requires || h.skillNodes.includes(n.requires);
      const can = !unlocked && h.level >= n.level && reqOk && h.sp > 0;
      const cls = unlocked ? 'unlocked' : can ? 'available' : 'locked';
      html += `<button class="tree-node ${cls}" data-node="${n.id}">
        <span class="tn-cost">${unlocked ? '✓' : G.tr('ui.levelReq') + ' ' + n.level}</span>
        <div class="tn-icon">${n.icon}</div>
        <div class="tn-name">${G.tr('tree.' + n.id + '.name')}</div>
        <div class="tn-desc">${G.tr('tree.' + n.id + '.desc')}</div>
        ${!reqOk ? `<div class="tn-req">${G.tr('ui.needParent')}</div>` : ''}
      </button>`;
    }
    return `<div class="tree">${html}</div>`;
  }

  function heroesTab() {
    const unlocked = G.state.unlocked;
    let sel = UI.menuHero;
    if (!sel || !unlocked.includes(sel)) sel = G.state.activeHero;
    UI.menuHero = sel;
    const h = G.state.heroes[sel];
    const c = D.CHARACTERS[sel];
    const st = G.heroStats(sel, h);
    const active = sel === G.state.activeHero;
    const skillIcons = ['☀', '✧', '✹'];
    const skills = c.skills.map((sk, i) => `<div class="skill-row">
      <div class="sk-ico">${skillIcons[i]}</div>
      <div>
        <div class="sk-name">${G.skillName(sel, i)}</div>
        <div class="sk-desc">${G.skillDesc(sel, i)}</div>
      </div>
      <div class="sk-cost">${sk.energy} ${G.tr('ui.energyShort')}<br>${sk.cd}${G.tr('ui.secondsShort')}</div>
    </div>`).join('');

    return `<div class="menu-grid two">
      <div class="panel">
        <div class="panel-title">${G.tr('ui.allHeroes')}</div>
        ${unlocked.map(heroCardHTML).join('')}
        ${Object.keys(D.CHARACTERS).filter(id => !unlocked.includes(id)).map(heroCardHTML).join('')}
        <p class="empty-note" style="font-size:12px">${G.tr('ui.switchHint')}</p>
      </div>
      <div class="panel">
        <div class="panel-title">${G.tr('ui.heroDetails')}</div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px">
          <img src="${A.portraitURL(sel)}" alt="" style="width:64px;height:64px;image-rendering:pixelated;border:1px solid #3c3358">
          <div>
            <div style="font-size:24px;color:var(--white);line-height:1">${G.charName(sel)}</div>
            <div style="font-size:13px;color:var(--teal)">${G.tr('chars.' + sel + '.title')}</div>
            <div style="font-size:12px;color:var(--muted)">${G.tr('ui.level')} ${h.level} · ${G.tr('ui.sp')}: ${h.sp}</div>
          </div>
        </div>
        ${active ? `<div class="stance-tag" style="display:inline-block;margin-bottom:6px">${G.tr('ui.currentHero')}</div>`
          : `<button class="pixel-btn primary" data-switch="${sel}" style="min-height:38px;font-size:18px;margin-bottom:6px">${G.tr('ui.switchTo')} ${G.tr('chars.' + sel + '.short')}</button>`}
        <div class="stat-grid">
          <div class="stat-row"><span>${G.tr('ui.hp')}</span><b>${Math.ceil(h.hp)} / ${st.maxHp}</b></div>
          <div class="stat-row"><span>${G.tr('ui.attack')}</span><b>${st.atk}</b></div>
          <div class="stat-row"><span>${G.tr('ui.defense')}</span><b>${st.def}</b></div>
          <div class="stat-row"><span>${G.tr('ui.speed')}</span><b>${st.speed}</b></div>
          <div class="stat-row"><span>${G.tr('ui.crit')}</span><b>${Math.round(st.crit * 100)}%</b></div>
          <div class="stat-row"><span>${G.tr('ui.energy')}</span><b>${st.maxEnergy}</b></div>
        </div>
        <div class="panel-title" style="margin-top:8px">${G.tr('ui.passive')}</div>
        <div style="font-size:14px;color:#d7d0e6"><b style="color:var(--gold2)">${G.tr('chars.' + sel + '.passive')}</b> — ${G.tr('chars.' + sel + '.passiveDesc')}</div>
        <div class="panel-title" style="margin-top:8px">${G.tr('ui.skills')}</div>
        <div class="skill-list">${skills}</div>
      </div>
      <div class="panel" style="grid-column:1/-1">
        <div class="panel-title">${G.tr('ui.skillTree')} · ${G.tr('ui.spAvailable')}: ${h.sp}</div>
        ${treeHTML(sel, h)}
        <p class="empty-note" style="font-size:12px">${G.tr('ui.skillHint')}</p>
      </div>
    </div>`;
  }

  function itemsTab() {
    const entries = Object.entries(G.state.items).filter(([id, q]) => q > 0 && D.ITEMS[id]);
    const coins = `<div class="panel" style="margin-bottom:8px"><div class="stat-row"><span>${G.tr('ui.coins')}</span><b>${G.state.coins}</b></div></div>`;
    if (!entries.length) return coins + `<p class="empty-note">${G.tr('ui.noItems')}</p>`;
    return coins + `<div class="item-grid">${entries.map(([id, q]) => {
      const def = D.ITEMS[id];
      const cls = def.type === 'key' ? 'key' : def.type === 'quest' ? 'key' : '';
      return `<button class="item-card ${cls}" data-item="${id}">
        <div class="it-ico">${def.icon || '◆'}</div>
        <div style="flex:1;min-width:0">
          <div class="it-name">${G.itemName(id)}</div>
          <div class="it-desc">${G.itemDesc(id)}</div>
        </div>
        <div class="it-qty">×${q}</div>
      </button>`;
    }).join('')}</div>`;
  }

  function questsTab() {
    const main = G.mainStage();
    const q = G.questDef();
    const prog = (window.STORY && STORY.questProgress) ? STORY.questProgress() : '';
    const mainCard = `<div class="quest-card">
      <div class="qc-chapter">${G.chapterTitle(main.chapter)} · ${G.tr('ui.mainQuest')}</div>
      <h4>${q.name}</h4>
      <p>${q.obj}${prog ? ' · ' + prog : ''}</p>
      <div class="qc-state">${G.tr('ui.active')}</div>
    </div>`;
    const sides = Object.values(D.SIDE_QUESTS).map(def => {
      const s = G.state.side[def.id];
      if (!s || s.state === 'locked') return '';
      const sq = G.tr('quests.side.' + def.id);
      const count = s.count || 0;
      const need = def.need || 1;
      const progress = (def.type === 'collect' || def.type === 'kill') ? ` · ${count}/${need}` : '';
      const stateLabel = s.state === 'done' ? G.tr('ui.completed')
        : s.state === 'ready' ? G.tr('ui.ready')
          : s.state === 'available' ? G.tr('ui.available') : G.tr('ui.active');
      const reward = [];
      if (def.reward.coins) reward.push(def.reward.coins + ' ' + G.tr('ui.coins'));
      if (def.reward.sp) reward.push(def.reward.sp + ' ' + G.tr('ui.sp'));
      if (def.reward.items) for (const [id, n] of Object.entries(def.reward.items)) reward.push(G.itemName(id) + ' ×' + n);
      return `<div class="quest-card side ${s.state === 'done' ? 'done' : ''}">
        <div class="qc-chapter">${G.tr('ui.sideQuest')}</div>
        <h4>${sq.name}</h4>
        <p>${sq.desc}</p>
        <p>${sq.obj}${progress}</p>
        <div class="qc-reward">${G.tr('ui.reward')}: ${reward.join(', ')}</div>
        <div class="qc-state">${stateLabel}</div>
      </div>`;
    }).join('');
    return `<div class="panel" style="margin-bottom:8px"><div class="panel-title">${G.tr('ui.mainPath')}</div>${mainCard}</div>
      <div class="panel"><div class="panel-title">${G.tr('ui.sidePaths')}</div>${sides || `<p class="empty-note">${G.tr('ui.noSideQuests')}</p>`}</div>`;
  }

  function mapTab() {
    const stage = G.state.story.stage;
    const rows = Object.values(D.REGIONS).map(r => {
      const unlocked = stage >= (r.unlockStage || 0);
      const station = !!G.state.stations[r.id];
      const current = G.state.region === r.id;
      const canTravel = unlocked && station && !current;
      const label = current ? G.tr('ui.current') : !unlocked ? G.tr('ui.regionLocked') : !station ? G.tr('ui.travelLocked') : G.tr('ui.travel');
      return `<div class="region-row ${unlocked ? '' : 'locked'}">
        <span class="rr-dot"></span>
        <div>
          <div class="rr-name">${G.tr('regions.' + r.id + '.name')}</div>
          <div class="rr-sub">${G.tr('regions.' + r.id + '.sub')} · ${station ? G.tr('ui.stationName') : G.tr('ui.noStation')}</div>
        </div>
        <button class="pixel-btn small rr-travel" data-travel="${r.id}" ${canTravel ? '' : 'disabled'}>${label}</button>
      </div>`;
    }).join('');
    return `<div class="map-layout">
      <div class="panel">
        <div class="panel-title">${G.tr('ui.regionMap')} · ${G.tr('regions.' + G.state.region + '.name')}</div>
        <canvas id="big-map" width="420" height="420"></canvas>
      </div>
      <div class="panel">
        <div class="panel-title">${G.tr('ui.fastTravel')}</div>
        ${rows}
        <p class="empty-note" style="font-size:12px">${G.tr('ui.worldMapHint')}</p>
      </div>
    </div>`;
  }

  function settingsTab() {
    const s = G.settings;
    return `<div class="panel">
      <div class="settings-row"><div><div class="sr-label">${G.tr('ui.languageLabel')}</div><div class="sr-sub">${G.tr('ui.languageSub')}</div></div><button class="toggle-btn on" data-setting="lang">${G.lang.toUpperCase()}</button></div>
      <div class="settings-row"><div><div class="sr-label">${G.tr('ui.music')}</div></div><button class="toggle-btn ${s.music ? 'on' : ''}" data-setting="music">${s.music ? 'ON' : 'OFF'}</button></div>
      <div class="settings-row"><div><div class="sr-label">${G.tr('ui.sfx')}</div></div><button class="toggle-btn ${s.sfx ? 'on' : ''}" data-setting="sfx">${s.sfx ? 'ON' : 'OFF'}</button></div>
      <div class="settings-row"><div><div class="sr-label">${G.tr('ui.shake')}</div></div><button class="toggle-btn ${s.shake ? 'on' : ''}" data-setting="shake">${s.shake ? 'ON' : 'OFF'}</button></div>
      <div class="settings-row"><div><div class="sr-label">${G.tr('ui.save')}</div><div class="sr-sub">${G.tr('ui.settingsHint')}</div></div><button class="pixel-btn small" data-setting="save">${G.tr('ui.saveNow')}</button></div>
      <div class="setting-actions">
        <button class="pixel-btn danger" data-setting="reset">${G.tr('ui.resetSave')}</button>
        <button class="pixel-btn" data-setting="title">${G.tr('ui.backToTitle')}</button>
      </div>
      <p class="empty-note" style="font-size:12px">${G.tr('ui.fanDisclaimer')}</p>
    </div>`;
  }

  UI.refreshMenu = function () {
    if (!G.runtime.menuOpen) return;
    const content = $('#menu-content');
    if (!content) return;
    const tab = UI.menuTab || 'heroes';
    $$('#menu-tabs .menu-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'heroes') content.innerHTML = heroesTab();
    else if (tab === 'items') content.innerHTML = itemsTab();
    else if (tab === 'quests') content.innerHTML = questsTab();
    else if (tab === 'map') {
      content.innerHTML = mapTab();
      const cv = $('#big-map');
      if (cv && ENGINE.drawRegionMap) ENGINE.drawRegionMap(cv, G.state.region);
    } else if (tab === 'settings') content.innerHTML = settingsTab();
  };

  UI.openMenu = function (tab) {
    if (!G.runtime.inGame || G.runtime.dialogueOpen || G.runtime.death || G.runtime.ending) return;
    if (tab) UI.menuTab = tab;
    G.runtime.menuOpen = true;
    G.showScreen('menu');
    UI.refreshMenu();
    G.setPaused(true);
    if (window.SOUND) SOUND.sfx('menu');
  };

  UI.closeMenu = function (force) {
    if (!G.runtime.menuOpen && !force) return;
    G.runtime.menuOpen = false;
    $('#menu').classList.add('hidden');
    G.showScreen(null);
    if (!G.runtime.dialogueOpen && !G.runtime.death && !G.runtime.ending) G.setPaused(false);
  };

  UI.toggleMenu = function () {
    if (G.runtime.menuOpen) UI.closeMenu();
    else UI.openMenu();
  };

  UI.openSwitchHero = function () {
    if (!G.state) return;
    const unlocked = G.state.unlocked;
    if (unlocked.length <= 1) { G.toast(G.tr('ui.noUnlockedOthers'), 'bad'); return; }
    const body = `<div class="menu-grid">${unlocked.map(id => {
      const h = G.state.heroes[id];
      const active = id === G.state.activeHero;
      return `<button class="hero-menu-card ${active ? 'active' : ''}" data-switch-hero="${id}">
        <img src="${A.portraitURL(id)}" alt="">
        <div><div class="hm-name">${G.tr('chars.' + id + '.short')}</div><div class="hm-sub">${G.tr('chars.' + id + '.title')}</div></div>
        <div class="hm-lv">LV ${h.level}<small>${active ? G.tr('ui.currentHero') : G.tr('ui.tapToSelect')}</small></div>
      </button>`;
    }).join('')}</div><p style="font-size:12px;color:var(--muted)">${G.tr('ui.switchHint')}</p>`;
    G.showModal(G.tr('ui.switchHeroTitle'), body, [{ label: G.tr('ui.cancelSwitch'), cls: '', onClick: () => {} }]);
    $$('#modal-body [data-switch-hero]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.switchHero;
        if (id === G.state.activeHero) { G.toast(G.tr('ui.currentHero'), 'bad'); return; }
        if (G.switchHero(id)) {
          UI.menuHero = id;
          G.closeModal();
          UI.refreshMenu();
          UI.updateHUD(true);
        }
      });
    });
  };

  /* ============================ MENU EVENTS ============================ */
  function handleMenuClick(e) {
    const hero = e.target.closest('[data-hero]');
    if (hero && !hero.disabled) {
      UI.menuHero = hero.dataset.hero;
      UI.refreshMenu();
      if (window.SOUND) SOUND.sfx('ui');
      return;
    }
    const sw = e.target.closest('[data-switch]');
    if (sw) {
      const id = sw.dataset.switch;
      if (G.switchHero(id)) {
        UI.menuHero = id;
        UI.refreshMenu();
        UI.updateHUD(true);
      }
      return;
    }
    const node = e.target.closest('[data-node]');
    if (node) {
      const nodeId = node.dataset.node;
      const sel = UI.menuHero || G.state.activeHero;
      const h = G.state.heroes[sel];
      const def = D.TREE_NODES.find(n => n.id === nodeId);
      if (!def || !h) return;
      if (h.skillNodes.includes(nodeId)) { G.toast(G.tr('ui.unlockedNode'), 'bad'); return; }
      if (h.level < def.level) { G.toast(G.tr('ui.needLevel') + ' ' + def.level, 'bad'); return; }
      if (def.requires && !h.skillNodes.includes(def.requires)) { G.toast(G.tr('ui.needParent'), 'bad'); return; }
      if (h.sp <= 0) { G.toast(G.tr('ui.notEnoughSP'), 'bad'); return; }
      h.sp--;
      h.skillNodes.push(nodeId);
      if (sel === G.state.activeHero && window.ENGINE) ENGINE.syncPlayerToHero(true);
      G.refreshHUD();
      UI.refreshMenu();
      G.save(true);
      if (window.SOUND) SOUND.sfx('level');
      G.toast(G.tr('ui.nodeUnlocked'), 'quest');
      return;
    }
    const item = e.target.closest('[data-item]');
    if (item) {
      const id = item.dataset.item;
      const def = D.ITEMS[id];
      if (!def) return;
      if (def.type === 'heal' || def.type === 'energy' || def.type === 'buff') {
        G.useItem(id);
        UI.refreshMenu();
        UI.updateHUD(true);
      } else {
        G.toast(G.itemDesc(id), 'item');
      }
      return;
    }
    const travel = e.target.closest('[data-travel]');
    if (travel && !travel.disabled) {
      const rid = travel.dataset.travel;
      if (rid === G.state.region) return;
      const reg = D.REGIONS[rid];
      if (!reg || G.state.story.stage < (reg.unlockStage || 0)) { G.toast(G.tr('ui.regionLocked'), 'bad'); return; }
      if (!G.state.stations[rid]) { G.toast(G.tr('ui.travelLocked'), 'bad'); return; }
      const map = W.build(rid);
      const spawn = map.station ? { x: map.station.x, y: map.station.y + 28 } : map.spawnPoint;
      if (window.ENGINE) ENGINE.travelTo(rid, spawn);
      return;
    }
    const setting = e.target.closest('[data-setting]');
    if (setting) {
      const s = setting.dataset.setting;
      if (s === 'lang') {
        G.setLang(G.lang === 'ru' ? 'en' : 'ru');
        UI.refreshMenu();
      } else if (s === 'music') {
        G.settings.music = !G.settings.music;
        if (window.SOUND) SOUND.setMusic(G.settings.music);
        G.saveSettings();
        UI.refreshMenu();
      } else if (s === 'sfx') {
        G.settings.sfx = !G.settings.sfx;
        if (window.SOUND) SOUND.setSfx(G.settings.sfx);
        G.saveSettings();
        UI.refreshMenu();
      } else if (s === 'shake') {
        G.settings.shake = !G.settings.shake;
        G.saveSettings();
        UI.refreshMenu();
      } else if (s === 'save') {
        G.save(false);
        UI.refreshMenu();
      } else if (s === 'reset') {
        G.confirm(G.tr('ui.resetSave'), G.tr('ui.resetConfirm'), () => {
          try { localStorage.removeItem('jojo_phantom_paths_save_v1'); } catch (err) {}
          location.reload();
        }, G.tr('ui.confirmReset'), G.tr('ui.cancelReset'));
      } else if (s === 'title') {
        G.confirm(G.tr('ui.backToTitle'), G.tr('ui.settingsHint'), () => {
          UI.closeMenu(true);
          G.showTitle();
        }, G.tr('ui.yes'), G.tr('ui.cancel'));
      }
      if (window.SOUND) SOUND.sfx('ui');
    }
  }

  /* ============================ INIT ============================ */
  UI.init = function () {
    const tabs = $('#menu-tabs');
    if (tabs) {
      tabs.addEventListener('click', (e) => {
        const b = e.target.closest('.menu-tab');
        if (!b) return;
        UI.menuTab = b.dataset.tab;
        UI.refreshMenu();
        if (window.SOUND) SOUND.sfx('ui');
      });
    }
    const content = $('#menu-content');
    if (content) content.addEventListener('click', handleMenuClick);
    $('#btn-menu-close')?.addEventListener('click', () => UI.closeMenu());
    const dlg = $('#dialogue');
    if (dlg) dlg.addEventListener('pointerdown', (e) => { e.preventDefault(); UI.advanceDialogue(); });
    window.addEventListener('keydown', (e) => {
      if (!UI.dlg) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        UI.advanceDialogue();
      }
    });
    G.refreshHUD = (force) => UI.updateHUD(force);
    UI.refreshSkillLabels();
  };

  return UI;
})();
