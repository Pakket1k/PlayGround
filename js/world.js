/* ============================================================
   World builder — four interconnected regions
   ============================================================ */
window.WORLD = (() => {
  const D = window.GAME_DATA;
  const T = window.WORLDART.TILE;
  const TS = 16;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeMap(id, w, h, base, seed) {
    const tiles = new Uint8Array(w * h).fill(base);
    const solid = new Uint8Array(w * h);
    const m = {
      id, w, h, tiles, solid, seed,
      objects: [], npcs: [], spawns: [], portals: [], pickups: [],
      triggers: [], landmarks: {}, spawnPoint: { x: w / 2 * TS, y: h / 2 * TS },
      arena: null, station: null, ground: null
    };
    return m;
  }

  function idx(m, x, y) { return y * m.w + x; }
  function inMap(m, x, y) { return x >= 0 && y >= 0 && x < m.w && y < m.h; }
  function getTile(m, x, y) { return inMap(m, x, y) ? m.tiles[idx(m, x, y)] : T.VOID; }
  function setTile(m, x, y, t, isSolid) {
    if (!inMap(m, x, y)) return;
    m.tiles[idx(m, x, y)] = t;
    m.solid[idx(m, x, y)] = isSolid != null ? (isSolid ? 1 : 0) : ([T.TREE, T.ROCK, T.WALL, T.ROOF, T.VOID, T.CLIFF, T.DEEPWATER].includes(t) ? 1 : 0);
  }
  function fill(m, x, y, w, h, t, solidFlag) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setTile(m, xx, yy, t, solidFlag);
  }
  function path(m, x1, y1, x2, y2, width, t) {
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2);
    for (let i = 0; i <= steps; i++) {
      const a = i / steps;
      const cx = Math.round(x1 + (x2 - x1) * a);
      const cy = Math.round(y1 + (y2 - y1) * a);
      for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy++) {
        for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox++) {
          if (Math.abs(ox) + Math.abs(oy) <= Math.floor(width / 2) + 1) setTile(m, cx + ox, cy + oy, t, false);
        }
      }
    }
  }
  function addTree(m, tx, ty, region, kind = 'tree') {
    if (!inMap(m, tx, ty)) return;
    if ([T.PATH, T.WATER, T.DEEPWATER, T.STONE, T.COBBLE, T.BRIDGE, T.FLOOR].includes(getTile(m, tx, ty))) return;
    setTile(m, tx, ty, T.TREE, true);
    m.objects.push({ kind, x: tx * TS + 8, y: ty * TS + 16, region, seed: Math.random() * 6, sortY: ty * TS + 16 });
  }
  function addProp(m, kind, tx, ty, extra = {}) {
    const o = {
      kind, x: tx * TS + 8, y: ty * TS + 16, sortY: ty * TS + 16,
      cw: extra.cw ?? 0, ch: extra.ch ?? 0, solid: extra.solid ?? false, ...extra
    };
    m.objects.push(o);
    return o;
  }
  function addBuilding(m, kind, tx, ty, tw, th, style, extra = {}) {
    fill(m, tx, ty, tw, th, T.FLOOR, true);
    const o = {
      kind, x: (tx + tw / 2) * TS, y: (ty + th) * TS, w: tw * TS, h: th * TS,
      sortY: (ty + th) * TS, style, solid: true,
      cw: tw * TS - 8, ch: th * TS, ...extra
    };
    m.objects.push(o);
    return o;
  }
  function addChest(m, id, tx, ty, loot, extra = {}) {
    const o = addProp(m, 'chest', tx, ty, { chestId: id, loot, cw: 14, ch: 10, solid: true, ...extra });
    return o;
  }
  function addStation(m, tx, ty, regionId) {
    const o = addProp(m, 'station', tx, ty, { stationId: 'station_' + regionId, cw: 18, ch: 10, solid: true });
    m.station = { x: tx * TS + 8, y: ty * TS + 8, object: o };
    return o;
  }
  function addPortal(m, tx, ty, to, labelKey, unlockStage, spawn, color) {
    const o = addProp(m, 'portal', tx, ty, { portalId: 'portal_' + m.id + '_' + to, to, labelKey, unlockStage, spawn, color, cw: 20, ch: 8, solid: false });
    m.portals.push(o);
    return o;
  }
  function addNpc(m, id, tx, ty, opts = {}) {
    const n = { id, x: tx * TS + 8, y: ty * TS + 16, sortY: ty * TS + 16, wander: 12, ...opts };
    m.npcs.push(n);
    return n;
  }
  function addSpawn(m, type, tx, ty, opts = {}) {
    m.spawns.push({ type, x: tx * TS + 8, y: ty * TS + 16, radius: opts.radius ?? 42, respawn: opts.respawn ?? 26, ...opts });
  }
  function addPickup(m, id, item, tx, ty, questId, labelKey) {
    m.pickups.push({ id, item, x: tx * TS + 8, y: ty * TS + 12, questId, labelKey, sortY: ty * TS + 12, collected: false });
  }
  function scatterTrees(m, rng, count, region, avoid = []) {
    let tries = 0;
    while (count > 0 && tries < count * 20) {
      tries++;
      const tx = 2 + Math.floor(rng() * (m.w - 4));
      const ty = 2 + Math.floor(rng() * (m.h - 4));
      if (m.solid[idx(m, tx, ty)]) continue;
      if (avoid.some(a => tx >= a[0] && tx < a[0] + a[2] && ty >= a[1] && ty < a[1] + a[3])) continue;
      if (getTile(m, tx, ty) !== T.GRASS && getTile(m, tx, ty) !== T.SAND) continue;
      if (Math.abs(tx - 30) < 4 && Math.abs(ty - 26) < 4) continue;
      addTree(m, tx, ty, region, rng() > 0.82 ? 'pine' : 'tree');
      count--;
    }
  }

  /* ============================ ENGLAND ============================ */
  function buildEngland() {
    const m = makeMap('england', 70, 52, T.GRASS, 1888);
    const rng = mulberry32(1888);
    // borders
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (x < 2 || x >= m.w - 2 || y < 2 || y >= m.h - 2) setTile(m, x, y, T.TREE, true);
    }
    // river
    for (let y = 2; y < 50; y++) {
      for (let x = 56; x <= 60; x++) setTile(m, x, y, T.WATER, true);
      setTile(m, 55, y, T.SHALLOW, false);
      setTile(m, 61, y, T.SHALLOW, false);
    }
    for (let x = 54; x <= 62; x++) { setTile(m, x, 29, T.BRIDGE, false); setTile(m, x, 30, T.BRIDGE, false); setTile(m, x, 31, T.BRIDGE, false); }
    // paths
    path(m, 20, 48, 20, 22, 3, T.PATH);
    path(m, 20, 31, 40, 31, 2, T.PATH);
    path(m, 20, 37, 12, 37, 2, T.PATH);
    path(m, 20, 25, 34, 25, 2, T.PATH);
    path(m, 40, 31, 46, 31, 2, T.PATH);
    path(m, 48, 31, 55, 30, 2, T.PATH);
    path(m, 34, 25, 34, 20, 2, T.PATH);
    path(m, 40, 31, 40, 38, 2, T.PATH);
    // mansion courtyard
    fill(m, 12, 15, 17, 8, T.STONE, false);
    fill(m, 12, 15, 17, 1, T.WALL, true);
    fill(m, 12, 22, 17, 1, T.WALL, true);
    fill(m, 12, 15, 1, 8, T.WALL, true);
    fill(m, 28, 15, 1, 8, T.WALL, true);
    setTile(m, 19, 22, T.STONE, false); setTile(m, 20, 22, T.STONE, false); setTile(m, 21, 22, T.STONE, false);
    // graveyard
    fill(m, 6, 31, 11, 11, T.DIRT, false);
    // village plaza
    fill(m, 35, 27, 12, 11, T.PATH, false);
    // garden
    fill(m, 31, 16, 8, 7, T.FLOWERS, false);
    fill(m, 32, 17, 6, 5, T.STONE, false);
    // buildings
    addBuilding(m, 'mansion', 10, 4, 20, 11, 'england');
    addBuilding(m, 'house', 36, 26, 5, 4, 'england');
    addBuilding(m, 'house', 43, 26, 5, 4, 'england');
    addBuilding(m, 'house', 36, 35, 5, 4, 'england');
    addBuilding(m, 'house', 44, 35, 5, 4, 'england');
    // station + spawn
    addStation(m, 20, 44, 'england');
    m.spawnPoint = { x: 20 * TS + 8, y: 46 * TS + 8 };
    // arena
    m.arena = {
      x: 13 * TS, y: 15 * TS, w: 15 * TS, h: 8 * TS,
      trigger: { x: 20 * TS + 8, y: 21 * TS, r: 28 },
      boss: 'dioVampire', bossX: 20 * TS + 8, bossY: 18 * TS + 8, stage: 3
    };
    m.landmarks.mansion = { x: 20 * TS, y: 19 * TS };
    m.landmarks.graveyard = { x: 11 * TS, y: 36 * TS };
    m.landmarks.village = { x: 41 * TS, y: 31 * TS };
    m.landmarks.garden = { x: 34 * TS, y: 19 * TS };
    m.landmarks.speedwagon = { x: 24 * TS, y: 24 * TS };
    m.landmarks.erina = { x: 41 * TS, y: 31 * TS };
    m.landmarks.hamon = { x: 34 * TS, y: 18 * TS };
    // props
    addProp(m, 'hamonSpot', 34, 18, { id: 'hamon_england', interact: true, cw: 28, ch: 12, solid: false });
    addProp(m, 'well', 41, 33, { cw: 14, ch: 10, solid: true });
    addProp(m, 'market', 46, 29, { cw: 30, ch: 12, solid: true, color: '#c94a48' });
    addProp(m, 'signpost', 22, 44, {});
    addProp(m, 'signpost', 39, 29, {});
    addProp(m, 'lamp', 18, 40, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 18, 30, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 22, 24, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 30, 31, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 38, 30, { cw: 6, ch: 6, solid: true });
    addProp(m, 'statue', 34, 22, { cw: 14, ch: 8, solid: true });
    addProp(m, 'boat', 62, 30, { cw: 30, ch: 10, solid: true });
    addProp(m, 'banner', 14, 21, { color: '#8a2233' });
    addProp(m, 'banner', 26, 21, { color: '#8a2233' });
    // gravestones
    for (let i = 0; i < 14; i++) {
      const gx = 7 + Math.floor(rng() * 9), gy = 32 + Math.floor(rng() * 9);
      if (getTile(m, gx, gy) === T.DIRT) addProp(m, 'gravestone', gx, gy, { cw: 8, ch: 5, solid: true, cross: rng() > 0.65 });
    }
    addProp(m, 'fence', 6, 41, { cw: 16, ch: 6, solid: true });
    addProp(m, 'fence', 7, 41, { cw: 16, ch: 6, solid: true });
    addProp(m, 'bones', 10, 40, {});
    // chests
    addChest(m, 'eng_graveyard', 8, 39, { coins: 45, item: 'ledger', quest: 'ledger' });
    addChest(m, 'eng_village', 45, 27, { coins: 35, item: 'smallHeal' });
    addChest(m, 'eng_garden', 31, 20, { coins: 40, item: 'herb', quest: 'herbs' });
    addChest(m, 'eng_river', 64, 36, { coins: 90, item: 'bigHeal', rare: true });
    addChest(m, 'eng_mansion', 13, 20, { coins: 60, item: 'energyDrink' });
    // pickups
    addPickup(m, 'herb_1', 'herb', 32, 19, 'herbs', 'ui.herbName');
    addPickup(m, 'herb_2', 'herb', 12, 28, 'herbs', 'ui.herbName');
    addPickup(m, 'herb_3', 'herb', 49, 42, 'herbs', 'ui.herbName');
    // npcs
    addNpc(m, 'speedwagon', 24, 24, { wander: 10 });
    addNpc(m, 'erina', 41, 31, { wander: 8 });
    addNpc(m, 'kid', 44, 33, { wander: 14 });
    addNpc(m, 'merchant', 46, 31, { wander: 6 });
    // enemies
    addSpawn(m, 'zombie', 8, 34); addSpawn(m, 'zombie', 11, 38); addSpawn(m, 'zombie', 14, 34);
    addSpawn(m, 'zombie', 9, 40); addSpawn(m, 'zombie', 13, 41); addSpawn(m, 'zombie', 6, 37);
    addSpawn(m, 'vampireThrall', 14, 23, { respawn: 40 });
    addSpawn(m, 'vampireThrall', 34, 28, { respawn: 40 });
    addSpawn(m, 'vampireThrall', 30, 20, { respawn: 40 });
    // portal
    addPortal(m, 65, 30, 'italy', 'regions.italy.name', 4, { x: 30 * TS, y: 39 * TS }, 'rgba(80,180,220,.35)');
    // trees
    scatterTrees(m, rng, 120, 'england', [[10, 4, 20, 18], [6, 31, 11, 11], [35, 26, 13, 13], [31, 16, 8, 7]]);
    // flowers near garden
    for (let i = 0; i < 20; i++) {
      const fx = 30 + Math.floor(rng() * 10), fy = 15 + Math.floor(rng() * 9);
      if (getTile(m, fx, fy) === T.GRASS) setTile(m, fx, fy, T.FLOWERS, false);
    }
    return m;
  }

  /* ============================ ITALY ============================ */
  function buildItaly() {
    const m = makeMap('italy', 60, 46, T.DEEPWATER, 1938);
    const rng = mulberry32(1938);
    // island
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const nx = (x - 30) / 24, ny = (y - 24) / 19;
      const d = nx * nx + ny * ny;
      const noise = (rng() - 0.5) * 0.16;
      if (d < 0.9 + noise) {
        const edge = d > 0.72;
        setTile(m, x, y, edge ? T.SHALLOW : T.GRASS, false);
      }
    }
    // stone plateau north
    fill(m, 20, 7, 20, 9, T.GRASS, false);
    fill(m, 20, 14, 20, 7, T.STONE, false);
    // paths
    path(m, 30, 40, 30, 15, 3, T.STONE);
    path(m, 30, 30, 44, 30, 2, T.STONE);
    path(m, 30, 30, 18, 30, 2, T.STONE);
    path(m, 30, 30, 30, 22, 2, T.STONE);
    path(m, 30, 38, 50, 30, 2, T.STONE);
    // colosseum
    addBuilding(m, 'colosseum', 22, 5, 16, 8, 'italy');
    fill(m, 22, 14, 16, 7, T.STONE, false);
    m.arena = {
      x: 22 * TS, y: 14 * TS, w: 16 * TS, h: 7 * TS,
      trigger: { x: 30 * TS + 8, y: 20 * TS, r: 30 },
      boss: 'wamuu', bossX: 30 * TS + 8, bossY: 17 * TS + 8, stage: 7
    };
    m.landmarks.colosseum = { x: 30 * TS, y: 17 * TS };
    m.landmarks.caesar = { x: 30 * TS, y: 29 * TS };
    m.landmarks.hamon = { x: 18 * TS, y: 32 * TS };
    // station
    addStation(m, 30, 38, 'italy');
    m.spawnPoint = { x: 30 * TS + 8, y: 40 * TS };
    // villa + props
    addBuilding(m, 'house', 42, 23, 5, 4, 'italy');
    addProp(m, 'ruinArch', 20, 14, { cw: 30, ch: 10, solid: true });
    addProp(m, 'ruinArch', 40, 14, { cw: 30, ch: 10, solid: true });
    addProp(m, 'ruinColumn', 18, 18, { cw: 10, ch: 6, solid: true, broken: true });
    addProp(m, 'ruinColumn', 21, 19, { cw: 10, ch: 6, solid: true });
    addProp(m, 'ruinColumn', 39, 19, { cw: 10, ch: 6, solid: true, broken: true });
    addProp(m, 'ruinColumn', 42, 18, { cw: 10, ch: 6, solid: true });
    addProp(m, 'ruinColumn', 16, 25, { cw: 10, ch: 6, solid: true });
    addProp(m, 'ruinColumn', 45, 25, { cw: 10, ch: 6, solid: true });
    addProp(m, 'statue', 26, 33, { cw: 14, ch: 8, solid: true });
    addProp(m, 'statue', 34, 33, { cw: 14, ch: 8, solid: true });
    addProp(m, 'fountain', 34, 28, { cw: 34, ch: 12, solid: true });
    addProp(m, 'hamonSpot', 18, 32, { id: 'hamon_italy_1', interact: true, cw: 28, ch: 12 });
    addProp(m, 'hamonSpot', 42, 32, { id: 'hamon_italy_2', interact: true, cw: 28, ch: 12 });
    addProp(m, 'dummy', 22, 33, { cw: 10, ch: 6, solid: true });
    addProp(m, 'dummy', 24, 33, { cw: 10, ch: 6, solid: true });
    addProp(m, 'dummy', 26, 33, { cw: 10, ch: 6, solid: true });
    addProp(m, 'dummy', 38, 33, { cw: 10, ch: 6, solid: true });
    addProp(m, 'lamp', 28, 36, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 32, 36, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 28, 26, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 32, 26, { cw: 6, ch: 6, solid: true });
    addProp(m, 'banner', 24, 14, { color: '#b8403e' });
    addProp(m, 'banner', 36, 14, { color: '#b8403e' });
    addProp(m, 'boat', 30, 42, { cw: 30, ch: 10, solid: true });
    // chests
    addChest(m, 'ita_ruins', 20, 16, { coins: 70, item: 'scroll', quest: 'scrolls' });
    addChest(m, 'ita_villa', 46, 25, { coins: 55, item: 'energyDrink' });
    addChest(m, 'ita_shore', 12, 36, { coins: 65, item: 'bigHeal' });
    addChest(m, 'ita_arena', 36, 18, { coins: 85, item: 'scroll', quest: 'scrolls', rare: true });
    addChest(m, 'ita_west', 15, 28, { coins: 50, item: 'smallHeal' });
    // pickups
    addPickup(m, 'scroll_1', 'scroll', 23, 20, 'scrolls', 'ui.scrollName');
    addPickup(m, 'scroll_2', 'scroll', 37, 24, 'scrolls', 'ui.scrollName');
    // npcs
    addNpc(m, 'caesar', 30, 29, { wander: 8 });
    addNpc(m, 'guard', 33, 36, { wander: 5 });
    // enemies
    addSpawn(m, 'stoneCultist', 20, 16); addSpawn(m, 'stoneCultist', 24, 19);
    addSpawn(m, 'stoneCultist', 36, 16); addSpawn(m, 'stoneCultist', 40, 19);
    addSpawn(m, 'stoneCultist', 22, 24); addSpawn(m, 'stoneCultist', 38, 26);
    addSpawn(m, 'stoneCultist', 34, 31); addSpawn(m, 'stoneCultist', 18, 27);
    // portals
    addPortal(m, 30, 43, 'england', 'regions.england.name', 0, { x: 20 * TS, y: 46 * TS }, 'rgba(120,200,255,.35)');
    addPortal(m, 50, 30, 'mexico', 'regions.mexico.name', 7, { x: 30 * TS, y: 39 * TS }, 'rgba(255,180,80,.35)');
    // trees
    scatterTrees(m, rng, 55, 'italy', [[20, 5, 20, 16], [42, 23, 5, 4], [16, 30, 4, 4]]);
    for (let i = 0; i < 18; i++) {
      const tx = 12 + Math.floor(rng() * 36), ty = 22 + Math.floor(rng() * 16);
      if (getTile(m, tx, ty) === T.GRASS) addTree(m, tx, ty, 'italy', 'pine');
    }
    return m;
  }

  /* ============================ MEXICO ============================ */
  function buildMexico() {
    const m = makeMap('mexico', 60, 46, T.SAND, 1938);
    const rng = mulberry32(7712);
    // cliff borders
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (x < 2 || x >= m.w - 2 || y < 2 || y >= m.h - 2) setTile(m, x, y, T.CLIFF, true);
    }
    // paths
    path(m, 30, 41, 28, 22, 3, T.SANDPATH);
    path(m, 28, 30, 46, 30, 2, T.SANDPATH);
    path(m, 28, 30, 16, 34, 2, T.SANDPATH);
    path(m, 46, 30, 54, 28, 2, T.SANDPATH);
    path(m, 28, 22, 28, 14, 2, T.SANDPATH);
    // pyramid + arena
    addBuilding(m, 'pyramid', 19, 3, 18, 9, 'mexico', { w: 18 * TS, h: 9 * TS });
    fill(m, 20, 13, 16, 7, T.STONE, false);
    m.arena = {
      x: 20 * TS, y: 13 * TS, w: 16 * TS, h: 7 * TS,
      trigger: { x: 28 * TS + 8, y: 19 * TS, r: 30 },
      boss: 'esidisi', bossX: 28 * TS + 8, bossY: 16 * TS + 8, stage: 10
    };
    m.landmarks.pyramid = { x: 28 * TS, y: 17 * TS };
    m.landmarks.elder = { x: 28 * TS, y: 24 * TS };
    m.landmarks.ruins = { x: 28 * TS, y: 23 * TS };
    m.landmarks.oasis = { x: 46 * TS, y: 30 * TS };
    // oasis pond
    for (let y = 26; y <= 34; y++) for (let x = 41; x <= 51; x++) {
      const nx = (x - 46) / 5.5, ny = (y - 30) / 3.6;
      if (nx * nx + ny * ny < 1) setTile(m, x, y, T.SHALLOW, false);
      else if (nx * nx + ny * ny < 1.5) setTile(m, x, y, T.GRASS, false);
    }
    for (let y = 28; y <= 32; y++) for (let x = 44; x <= 48; x++) setTile(m, x, y, T.WATER, true);
    // station
    addStation(m, 30, 38, 'mexico');
    m.spawnPoint = { x: 30 * TS + 8, y: 40 * TS };
    // props
    addProp(m, 'ruinColumn', 20, 14, { cw: 10, ch: 6, solid: true, broken: true });
    addProp(m, 'ruinColumn', 36, 14, { cw: 10, ch: 6, solid: true });
    addProp(m, 'ruinColumn', 18, 22, { cw: 10, ch: 6, solid: true });
    addProp(m, 'ruinColumn', 38, 22, { cw: 10, ch: 6, solid: true });
    addProp(m, 'sphinx', 22, 27, { cw: 36, ch: 14, solid: true });
    addProp(m, 'obelisk', 34, 27, { cw: 12, ch: 8, solid: true });
    addProp(m, 'campfire', 30, 31, { cw: 12, ch: 8, solid: false });
    addProp(m, 'tent', 34, 32, { cw: 24, ch: 12, solid: true });
    addProp(m, 'bones', 24, 36, {});
    addProp(m, 'bones', 35, 35, {});
    addProp(m, 'rock', 16, 18, { cw: 14, ch: 8, solid: true });
    addProp(m, 'rock', 42, 18, { cw: 14, ch: 8, solid: true });
    addProp(m, 'lamp', 29, 34, { cw: 6, ch: 6, solid: true });
    addProp(m, 'boat', 56, 28, { cw: 30, ch: 10, solid: true });
    addProp(m, 'signpost', 27, 35, {});
    // palms around oasis
    for (const [tx, ty] of [[42, 27], [50, 27], [42, 33], [50, 33], [46, 25], [46, 35], [39, 30]]) {
      addProp(m, 'palm', tx, ty, { cw: 8, ch: 6, solid: true });
    }
    // chests
    addChest(m, 'mex_pyramid', 22, 18, { coins: 90, item: 'bigHeal' });
    addChest(m, 'mex_oasis', 45, 32, { coins: 80, item: 'energyDrink' });
    addChest(m, 'mex_canyon', 18, 34, { coins: 70, item: 'smallHeal' });
    addChest(m, 'mex_secret', 52, 38, { coins: 150, item: 'charm', rare: true });
    // npcs
    addNpc(m, 'elder', 28, 24, { wander: 5 });
    // enemies
    addSpawn(m, 'desertRaider', 18, 20); addSpawn(m, 'desertRaider', 38, 20);
    addSpawn(m, 'desertRaider', 22, 30); addSpawn(m, 'desertRaider', 40, 34);
    addSpawn(m, 'desertRaider', 34, 40); addSpawn(m, 'desertRaider', 50, 34);
    addSpawn(m, 'scorpion', 24, 25); addSpawn(m, 'scorpion', 36, 30);
    addSpawn(m, 'scorpion', 44, 24); addSpawn(m, 'scorpion', 30, 34);
    // portal
    addPortal(m, 28, 43, 'italy', 'regions.italy.name', 0, { x: 30 * TS, y: 40 * TS }, 'rgba(120,200,255,.35)');
    addPortal(m, 56, 28, 'egypt', 'regions.egypt.name', 10, { x: 40 * TS, y: 50 * TS }, 'rgba(255,180,80,.35)');
    // trees/cacti
    scatterTrees(m, rng, 45, 'mexico', [[19, 3, 18, 16], [41, 26, 11, 9], [22, 27, 12, 6]]);
    for (let i = 0; i < 25; i++) {
      const tx = 4 + Math.floor(rng() * 52), ty = 4 + Math.floor(rng() * 38);
      if (getTile(m, tx, ty) === T.SAND) addProp(m, 'cactus', tx, ty, { cw: 8, ch: 6, solid: true });
    }
    return m;
  }

  /* ============================ EGYPT ============================ */
  function buildEgypt() {
    const m = makeMap('egypt', 80, 60, T.SAND, 1989);
    const rng = mulberry32(1989);
    // borders / sea
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      if (x < 2 || x >= m.w - 2 || y < 2 || y >= m.h - 2) setTile(m, x, y, T.CLIFF, true);
    }
    for (let y = 2; y < 58; y++) for (let x = 70; x < 78; x++) setTile(m, x, y, T.WATER, true);
    for (let y = 2; y < 58; y++) { setTile(m, 69, y, T.SHALLOW, false); setTile(m, 78, y, T.SHALLOW, false); }
    for (let x = 68; x <= 73; x++) { setTile(m, x, 31, T.BRIDGE, false); setTile(m, x, 32, T.BRIDGE, false); }
    // Cairo blocks
    fill(m, 28, 22, 38, 28, T.COBBLE, false);
    // streets
    fill(m, 34, 22, 3, 28, T.STONE, false);
    fill(m, 47, 22, 3, 28, T.STONE, false);
    fill(m, 58, 22, 2, 28, T.STONE, false);
    fill(m, 28, 30, 38, 3, T.STONE, false);
    fill(m, 28, 41, 38, 3, T.STONE, false);
    // buildings Cairo
    const cairoHouses = [
      [29, 23, 4, 5], [36, 23, 5, 5], [42, 23, 4, 5], [49, 23, 4, 5], [54, 23, 3, 5],
      [29, 34, 4, 5], [36, 34, 5, 5], [42, 34, 4, 5], [49, 34, 4, 5], [54, 34, 3, 5],
      [29, 45, 4, 3], [36, 45, 5, 3], [42, 45, 4, 3], [49, 45, 4, 3], [54, 45, 3, 3]
    ];
    for (const [bx, by, bw, bh] of cairoHouses) addBuilding(m, 'house', bx, by, bw, bh, 'egypt');
    // market plaza
    fill(m, 43, 28, 8, 6, T.STONE, false);
    // Dio mansion
    addBuilding(m, 'dioMansion', 8, 3, 16, 10, 'egypt', { gothic: true });
    fill(m, 10, 14, 12, 8, T.STONE, false);
    fill(m, 10, 14, 12, 1, T.WALL, true);
    fill(m, 10, 21, 12, 1, T.WALL, true);
    fill(m, 10, 14, 1, 8, T.WALL, true);
    fill(m, 21, 14, 1, 8, T.WALL, true);
    setTile(m, 15, 21, T.STONE, false); setTile(m, 16, 21, T.STONE, false); setTile(m, 17, 21, T.STONE, false);
    m.arena = {
      x: 11 * TS, y: 14 * TS, w: 10 * TS, h: 8 * TS,
      trigger: { x: 16 * TS + 8, y: 20 * TS, r: 30 },
      boss: 'dio', bossX: 16 * TS + 8, bossY: 17 * TS + 8, stage: 13
    };
    m.landmarks.mansion = { x: 16 * TS, y: 17 * TS };
    m.landmarks.cairo = { x: 46 * TS, y: 33 * TS };
    m.landmarks.avdol = { x: 46 * TS, y: 32 * TS };
    m.landmarks.iggy = { x: 57 * TS, y: 43 * TS };
    // paths
    path(m, 40, 50, 40, 44, 3, T.SANDPATH);
    path(m, 40, 44, 44, 34, 2, T.SANDPATH);
    path(m, 28, 30, 16, 22, 2, T.SANDPATH);
    path(m, 16, 22, 16, 14, 2, T.SANDPATH);
    path(m, 60, 32, 68, 32, 2, T.SANDPATH);
    path(m, 28, 32, 8, 32, 2, T.SANDPATH);
    path(m, 8, 32, 8, 24, 2, T.SANDPATH);
    // station
    addStation(m, 40, 48, 'egypt');
    m.spawnPoint = { x: 40 * TS + 8, y: 50 * TS };
    // props
    addProp(m, 'fountain', 44, 31, { cw: 34, ch: 12, solid: true });
    addProp(m, 'market', 48, 29, { cw: 30, ch: 12, solid: true, color: '#c94a48' });
    addProp(m, 'market', 50, 38, { cw: 30, ch: 12, solid: true, color: '#3f7a9a' });
    addProp(m, 'palm', 38, 27, { cw: 8, ch: 6, solid: true });
    addProp(m, 'palm', 54, 31, { cw: 8, ch: 6, solid: true });
    addProp(m, 'palm', 39, 39, { cw: 8, ch: 6, solid: true });
    addProp(m, 'palm', 56, 27, { cw: 8, ch: 6, solid: true });
    addProp(m, 'lamp', 36, 33, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 48, 33, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 40, 42, { cw: 6, ch: 6, solid: true });
    addProp(m, 'lamp', 52, 42, { cw: 6, ch: 6, solid: true });
    addProp(m, 'signpost', 41, 44, {});
    addProp(m, 'statue', 32, 32, { cw: 14, ch: 8, solid: true });
    addProp(m, 'obelisk', 58, 44, { cw: 12, ch: 8, solid: true });
    addProp(m, 'standMarker', 40, 44, { id: 'stand_egypt', interact: true, cw: 18, ch: 10, solid: false });
    addProp(m, 'sphinx', 20, 34, { cw: 36, ch: 14, solid: true });
    addProp(m, 'ruinColumn', 24, 26, { cw: 10, ch: 6, solid: true, broken: true });
    addProp(m, 'ruinColumn', 24, 30, { cw: 10, ch: 6, solid: true });
    addProp(m, 'campfire', 22, 38, { cw: 12, ch: 8 });
    addProp(m, 'tent', 20, 40, { cw: 24, ch: 12, solid: true });
    addProp(m, 'banner', 12, 20, { color: '#5a2a6a' });
    addProp(m, 'banner', 20, 20, { color: '#5a2a6a' });
    addProp(m, 'boat', 66, 32, { cw: 30, ch: 10, solid: true });
    // chests
    addChest(m, 'egy_cairo1', 31, 29, { coins: 100, item: 'bigHeal' });
    addChest(m, 'egy_cairo2', 57, 33, { coins: 110, item: 'energyDrink' });
    addChest(m, 'egy_mansion', 12, 19, { coins: 200, item: 'bigHeal', rare: true });
    addChest(m, 'egy_desert', 8, 36, { coins: 120, item: 'smallHeal' });
    addChest(m, 'egy_dock', 65, 39, { coins: 130, item: 'coffee' });
    // pickups
    addPickup(m, 'gum_1', 'gum', 34, 36, 'gum', 'ui.gumName');
    addPickup(m, 'gum_2', 'gum', 56, 44, 'gum', 'ui.gumName');
    // npcs
    addNpc(m, 'avdol', 46, 32, { wander: 6 });
    addNpc(m, 'polnareff', 54, 36, { wander: 10 });
    addNpc(m, 'kakyoin', 38, 40, { wander: 9 });
    addNpc(m, 'iggy', 57, 43, { wander: 14 });
    addNpc(m, 'merchant', 50, 31, { wander: 5 });
    // enemies
    for (const [tx, ty] of [[30, 26], [38, 26], [45, 26], [52, 26], [56, 30], [32, 38], [38, 38], [45, 38], [52, 40], [58, 38]]) {
      addSpawn(m, 'standAssassin', tx, ty);
    }
    addSpawn(m, 'standAssassin', 24, 32, { respawn: 45 });
    // portal
    addPortal(m, 3, 32, 'mexico', 'regions.mexico.name', 0, { x: 30 * TS, y: 40 * TS }, 'rgba(255,180,80,.35)');
    // trees
    scatterTrees(m, rng, 30, 'egypt', [[28, 22, 38, 28], [8, 3, 16, 18], [43, 28, 8, 6]]);
    for (let i = 0; i < 20; i++) {
      const tx = 4 + Math.floor(rng() * 24), ty = 4 + Math.floor(rng() * 50);
      if (getTile(m, tx, ty) === T.SAND) addProp(m, 'cactus', tx, ty, { cw: 8, ch: 6, solid: true });
    }
    // desert rocks
    for (let i = 0; i < 12; i++) {
      const tx = 4 + Math.floor(rng() * 22), ty = 24 + Math.floor(rng() * 30);
      if (getTile(m, tx, ty) === T.SAND) addProp(m, 'rock', tx, ty, { cw: 14, ch: 8, solid: true });
    }
    return m;
  }

  const builders = { england: buildEngland, italy: buildItaly, mexico: buildMexico, egypt: buildEgypt };
  const cache = {};

  function build(region) {
    if (!cache[region]) {
      const m = builders[region]();
      m.ground = window.WORLDART.renderGround(m, region);
      cache[region] = m;
    }
    return cache[region];
  }

  function isSolid(m, px, py) {
    const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    if (m.solid[ty * m.w + tx]) return true;
    for (const o of m.objects) {
      if (!o.solid) continue;
      const hw = (o.cw || 0) / 2, hh = (o.ch || 0);
      if (px > o.x - hw && px < o.x + hw && py > o.y - hh && py < o.y + 2) return true;
    }
    return false;
  }

  function isTileSolid(m, tx, ty) {
    if (tx < 0 || ty < 0 || tx >= m.w || ty >= m.h) return true;
    return !!m.solid[ty * m.w + tx];
  }

  function getLandmark(m, name) { return m.landmarks[name] || null; }

  return { TS, build, isSolid, isTileSolid, getTile, getLandmark, T };
})();
