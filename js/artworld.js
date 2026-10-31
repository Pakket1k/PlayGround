/* ============================================================
   World art — tiles, props, buildings and the title scene
   ============================================================ */
window.WORLDART = (() => {
  const A = window.ART;
  const D = window.GAME_DATA;
  const { p, ellipse, glow, hash, hero, stand } = A;
  const TAU = Math.PI * 2;

  const TILE = {
    GRASS: 0, PATH: 1, WATER: 2, TREE: 3, STONE: 4, SAND: 5, ROCK: 6,
    FLOOR: 7, WALL: 8, ROOF: 9, FLOWERS: 10, BRIDGE: 11, VOID: 12,
    COBBLE: 13, DIRT: 14, SANDPATH: 15, CLIFF: 16, DEEPWATER: 17,
    SHALLOW: 18, MARBLE: 19
  };

  const PAL = {
    england: { grass: '#4c7a3e', grass2: '#3f6935', grass3: '#5d8f4a', path: '#a68b5c', path2: '#8f754a', water: '#2b5570', water2: '#3b6d8b', shore: '#6d8a66', stone: '#8b8878', stone2: '#6f6c5e', roof: '#4a3540', wall: '#a58f72' },
    italy: { grass: '#5d7f46', grass2: '#4d6c3a', grass3: '#6d9354', path: '#a69a78', path2: '#8d8162', water: '#2c6a86', water2: '#3d86a4', shore: '#a6a077', stone: '#a09a88', stone2: '#7f7969', roof: '#8f4a35', wall: '#c9b98e' },
    mexico: { grass: '#b57b42', grass2: '#a46c37', grass3: '#c78d52', path: '#c9a56a', path2: '#b08e56', water: '#2f6d78', water2: '#448b95', shore: '#c9b17a', stone: '#a47447', stone2: '#845a35', roof: '#8a4c2e', wall: '#c49a64' },
    egypt: { grass: '#c49a57', grass2: '#b58a4a', grass3: '#d4ab67', path: '#d8bd82', path2: '#c2a66d', water: '#2a6f86', water2: '#3b8ea8', shore: '#c9b17a', stone: '#b3a07a', stone2: '#8f7d5c', roof: '#a06a3c', wall: '#cbb58a' }
  };

  function drawTile(ctx, type, x, y, seed, region, tx, ty, tiles, w) {
    const P = PAL[region] || PAL.england;
    const r = (k) => hash(tx, ty, seed + k);
    const up = ty > 0 ? tiles[(ty - 1) * w + tx] : type;
    const dn = tiles[(ty + 1) * w + tx];
    const lf = tx > 0 ? tiles[ty * w + tx - 1] : type;
    const rt = tx < w - 1 ? tiles[ty * w + tx + 1] : type;

    switch (type) {
      case TILE.WATER:
      case TILE.DEEPWATER: {
        p(ctx, x, y, 16, 16, type === TILE.DEEPWATER ? '#1d3e55' : P.water);
        const r1 = r(1);
        p(ctx, x, y + Math.floor(r1 * 12) + 2, 16, 1, P.water2);
        p(ctx, x + Math.floor(r(2) * 10), y + 5 + Math.floor(r(3) * 8), 5, 1, '#4f8aa8');
        p(ctx, x + 2 + Math.floor(r(4) * 8), y + 11, 3, 1, '#5c9ab8');
        if (type === TILE.WATER) {
          if (up !== TILE.WATER && up !== TILE.DEEPWATER) p(ctx, x, y, 16, 1, '#7da0a0');
          if (dn !== TILE.WATER && dn !== TILE.DEEPWATER) p(ctx, x, y + 15, 16, 1, '#7da0a0');
        }
        break;
      }
      case TILE.SHALLOW: {
        p(ctx, x, y, 16, 16, '#4f97a8');
        p(ctx, x, y + 4, 16, 1, '#78b9c4');
        p(ctx, x + 5, y + 10, 8, 1, '#78b9c4');
        break;
      }
      case TILE.PATH:
      case TILE.SANDPATH: {
        const base = type === TILE.SANDPATH ? P.path : P.path;
        p(ctx, x, y, 16, 16, base);
        p(ctx, x, y, 16, 1, P.path2);
        p(ctx, x, y, 1, 16, P.path2);
        if (r(5) > 0.55) p(ctx, x + 3 + Math.floor(r(6) * 9), y + 3 + Math.floor(r(7) * 9), 2, 1, P.path2);
        if (r(8) > 0.75) p(ctx, x + 2 + Math.floor(r(9) * 11), y + 2 + Math.floor(r(10) * 11), 1, 1, '#d9c49a');
        if (type === TILE.SANDPATH) {
          p(ctx, x + 2, y + 8 + Math.floor(r(11) * 4), 4, 1, '#e6d1a3');
          p(ctx, x + 9, y + 4 + Math.floor(r(12) * 7), 5, 1, '#e6d1a3');
        }
        break;
      }
      case TILE.STONE:
      case TILE.COBBLE:
      case TILE.MARBLE: {
        const base = type === TILE.MARBLE ? '#d8cfb4' : type === TILE.COBBLE ? P.stone : P.stone;
        p(ctx, x, y, 16, 16, base);
        if (type === TILE.MARBLE) {
          p(ctx, x, y, 16, 1, '#e8e0c8'); p(ctx, x, y, 1, 16, '#c1b696');
          p(ctx, x + 4, y + 4, 1, 7, '#b8ad8e');
          p(ctx, x + 9, y + 2, 1, 5, '#b8ad8e');
        } else {
          p(ctx, x, y, 16, 1, P.stone2); p(ctx, x, y, 1, 16, P.stone2);
          p(ctx, x + 5, y, 1, 8, P.stone2);
          p(ctx, x, y + 8, 16, 1, P.stone2);
          p(ctx, x + 11, y + 8, 1, 8, P.stone2);
          p(ctx, x + 2, y + 3, 2, 1, '#b9b4a2');
          p(ctx, x + 8, y + 12, 2, 1, '#b9b4a2');
        }
        break;
      }
      case TILE.FLOOR: {
        p(ctx, x, y, 16, 16, '#8c633d');
        p(ctx, x, y, 16, 1, '#6e4b2d');
        p(ctx, x, y + 8, 16, 1, '#6e4b2d');
        p(ctx, x + 8, y, 1, 8, '#6e4b2d');
        p(ctx, x + 3, y + 8, 1, 8, '#6e4b2d');
        p(ctx, x + 2, y + 3, 5, 1, '#a77c50');
        break;
      }
      case TILE.WALL: {
        p(ctx, x, y, 16, 16, '#6d6658');
        p(ctx, x, y, 16, 1, '#8f887a');
        for (let row = 0; row < 4; row++) {
          p(ctx, x, y + row * 4, 16, 1, '#4f4a40');
          const off = row % 2 ? 4 : 0;
          p(ctx, x + off, y + row * 4, 1, 4, '#4f4a40');
          p(ctx, x + off + 8, y + row * 4, 1, 4, '#4f4a40');
        }
        break;
      }
      case TILE.ROOF: {
        p(ctx, x, y, 16, 16, P.roof);
        for (let row = 0; row < 4; row++) {
          p(ctx, x, y + row * 4, 16, 1, '#2f2029');
          p(ctx, x + (row % 2 ? 0 : 4), y + row * 4, 1, 4, '#2f2029');
        }
        break;
      }
      case TILE.SAND:
      case TILE.GRASS:
      case TILE.FLOWERS:
      case TILE.DIRT: {
        let base = P.grass, base2 = P.grass2, base3 = P.grass3;
        if (type === TILE.SAND) { base = P.grass; base2 = P.grass2; base3 = P.grass3; }
        if (type === TILE.DIRT) { base = '#8c6b42'; base2 = '#755733'; base3 = '#a07e50'; }
        p(ctx, x, y, 16, 16, base);
        const n = 3 + Math.floor(r(13) * 3);
        for (let i = 0; i < n; i++) {
          const bx = x + 1 + Math.floor(r(20 + i) * 14);
          const by = y + 1 + Math.floor(r(30 + i) * 14);
          p(ctx, bx, by, 1, 1 + (r(40 + i) > 0.7 ? 1 : 0), base2);
          if (r(50 + i) > 0.7) p(ctx, bx + 1, by, 1, 1, base3);
        }
        if (type === TILE.FLOWERS) {
          const cols = ['#e8d35a', '#e05a8a', '#f0f0e8', '#9a6de0'];
          for (let i = 0; i < 3; i++) {
            const fx = x + 2 + Math.floor(r(60 + i) * 12);
            const fy = y + 2 + Math.floor(r(70 + i) * 12);
            p(ctx, fx, fy, 1, 1, cols[Math.floor(r(80 + i) * cols.length)]);
          }
        }
        if (region === 'mexico' || region === 'egypt') {
          if (r(90) > 0.82) { p(ctx, x + 4, y + 7, 4, 1, base2); p(ctx, x + 6, y + 9, 4, 1, base2); }
        }
        break;
      }
      case TILE.CLIFF: {
        p(ctx, x, y, 16, 16, '#6b5136');
        p(ctx, x, y, 16, 4, '#8a6b46');
        p(ctx, x, y + 8, 16, 1, '#513b27');
        p(ctx, x + 5, y + 4, 1, 4, '#513b27');
        p(ctx, x + 10, y + 10, 1, 6, '#513b27');
        p(ctx, x + 2, y + 12, 6, 1, '#8a6b46');
        break;
      }
      case TILE.BRIDGE: {
        p(ctx, x, y, 16, 16, '#8a6338');
        p(ctx, x, y, 16, 2, '#a77c4a');
        for (let i = 0; i < 4; i++) p(ctx, x, y + 2 + i * 4, 16, 1, '#5e3f22');
        p(ctx, x + 3, y, 1, 16, '#6e4a28');
        p(ctx, x + 12, y, 1, 16, '#6e4a28');
        break;
      }
      case TILE.ROCK:
      case TILE.VOID: {
        p(ctx, x, y, 16, 16, type === TILE.VOID ? '#0a0810' : '#7a5a3b');
        if (type === TILE.ROCK) {
          p(ctx, x + 2, y + 3, 12, 10, '#8f6c48');
          p(ctx, x + 4, y + 5, 7, 4, '#a88158');
          p(ctx, x + 3, y + 12, 10, 2, '#513b27');
        }
        break;
      }
      default: {
        p(ctx, x, y, 16, 16, P.grass);
      }
    }
  }

  function renderGround(map, region) {
    const c = document.createElement('canvas');
    c.width = map.w * 16; c.height = map.h * 16;
    const ctx = c.getContext('2d');
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        const t = map.tiles[y * map.w + x];
        drawTile(ctx, t, x * 16, y * 16, map.seed, region, x, y, map.tiles, map.w);
      }
    }
    // soft ambient occlusion along solid edges
    ctx.globalAlpha = 0.18;
    for (let y = 0; y < map.h; y++) {
      for (let x = 0; x < map.w; x++) {
        if (!map.solid[y * map.w + x]) continue;
        p(ctx, x * 16, y * 16 + 14, 16, 2, '#000');
      }
    }
    ctx.globalAlpha = 1;
    return c;
  }

  /* ============================ PROPS ============================ */
  function drawObject(ctx, o, t, night) {
    const x = o.x, y = o.y;
    ctx.save();
    switch (o.kind) {
      case 'tree': {
        const sway = Math.sin(t * 1.2 + (o.seed || 0)) * 1.2;
        ellipse(ctx, x, y - 1, 10, 3, 'rgba(0,0,0,.3)');
        p(ctx, x - 2, y - 10, 4, 10, '#5b3d24');
        p(ctx, x - 1, y - 10, 1, 9, '#7a5530');
        const col = o.region === 'mexico' ? '#6d7a3a' : o.region === 'egypt' ? '#70803c' : o.region === 'italy' ? '#35603d' : '#2c5230';
        const col2 = o.region === 'mexico' ? '#87934b' : o.region === 'egypt' ? '#8b9a4d' : o.region === 'italy' ? '#427549' : '#3a663a';
        ellipse(ctx, x + sway, y - 20, 11, 9, col);
        ellipse(ctx, x - 6 + sway * 0.5, y - 17, 7, 6, col2);
        ellipse(ctx, x + 7 + sway * 0.5, y - 16, 7, 6, col);
        ellipse(ctx, x + sway, y - 25, 8, 6, col2);
        p(ctx, x - 3 + sway, y - 27, 3, 1, '#568a4b');
        break;
      }
      case 'pine': {
        ellipse(ctx, x, y - 1, 8, 2.5, 'rgba(0,0,0,.3)');
        p(ctx, x - 1, y - 9, 2, 9, '#4a3220');
        for (let i = 0; i < 3; i++) {
          const yy = y - 10 - i * 8;
          p(ctx, x - 9 + i * 2, yy - 6, 18 - i * 4, 2, '#2f5a3b');
          p(ctx, x - 6 + i * 2, yy - 8, 12 - i * 4, 2, '#376b45');
        }
        break;
      }
      case 'palm': {
        const sway = Math.sin(t * 1.6 + (o.seed || 0)) * 2;
        ellipse(ctx, x, y - 1, 8, 2.5, 'rgba(0,0,0,.3)');
        p(ctx, x - 2, y - 26, 4, 26, '#7a5a34');
        p(ctx, x, y - 26, 1, 26, '#9c7846');
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 0.3;
          const ex = x + sway + Math.cos(a) * 15;
          const ey = y - 27 + Math.sin(a) * 5;
          p(ctx, Math.min(x, ex) + 2, ey, Math.abs(ex - x) + 2, 1, '#3f7a3f');
          p(ctx, Math.min(x, ex) + 5, ey + 1, Math.abs(ex - x) - 2, 1, '#55934a');
        }
        p(ctx, x - 2 + sway, y - 30, 4, 3, '#6b4a28');
        break;
      }
      case 'cactus': {
        ellipse(ctx, x, y - 1, 6, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 3, y - 20, 6, 20, '#4f7a3a');
        p(ctx, x - 1, y - 20, 2, 20, '#6a9a4a');
        p(ctx, x - 8, y - 15, 5, 3, '#4f7a3a');
        p(ctx, x - 8, y - 19, 3, 5, '#4f7a3a');
        p(ctx, x + 3, y - 12, 5, 3, '#4f7a3a');
        p(ctx, x + 5, y - 17, 3, 6, '#4f7a3a');
        break;
      }
      case 'house': drawHouse(ctx, o, t, night); break;
      case 'mansion': drawMansion(ctx, o, t, night); break;
      case 'dioMansion': drawMansion(ctx, { ...o, gothic: true }, t, night); break;
      case 'gravestone': {
        ellipse(ctx, x, y - 1, 5, 1.5, 'rgba(0,0,0,.3)');
        p(ctx, x - 4, y - 11, 8, 11, '#7a7a72');
        p(ctx, x - 4, y - 11, 8, 1, '#9a9a90');
        p(ctx, x - 2, y - 14, 4, 3, '#7a7a72');
        p(ctx, x - 1, y - 13, 2, 1, '#5a5a52');
        if (o.cross) { p(ctx, x - 1, y - 17, 2, 6, '#8a8a80'); p(ctx, x - 3, y - 16, 6, 2, '#8a8a80'); }
        break;
      }
      case 'fence': {
        p(ctx, x - 8, y - 8, 16, 2, '#6b4a2c');
        p(ctx, x - 8, y - 4, 16, 2, '#6b4a2c');
        for (let i = -8; i <= 8; i += 5) p(ctx, x + i, y - 12, 2, 12, '#7d5a34');
        break;
      }
      case 'lamp': {
        ellipse(ctx, x, y - 1, 4, 1.5, 'rgba(0,0,0,.3)');
        p(ctx, x - 1, y - 20, 2, 20, '#3a3440');
        p(ctx, x - 4, y - 22, 8, 4, '#4a4350');
        p(ctx, x - 3, y - 26, 6, 5, night ? '#ffe7a0' : '#c9b97a');
        p(ctx, x - 2, y - 25, 4, 3, night ? '#fff4c9' : '#e0d49a');
        if (night) glow(ctx, x, y - 24, 26, 'rgba(255,220,120,.55)', 0.5);
        break;
      }
      case 'chest': {
        ellipse(ctx, x, y - 1, 7, 2, 'rgba(0,0,0,.35)');
        p(ctx, x - 7, y - 11, 14, 10, o.open ? '#3f2b18' : '#7a4f24');
        p(ctx, x - 7, y - 11, 14, 2, '#a06b32');
        p(ctx, x - 7, y - 6, 14, 1, '#e0b84f');
        p(ctx, x - 1, y - 8, 2, 4, '#f4d87a');
        if (o.open) { p(ctx, x - 7, y - 13, 14, 3, '#2a1b10'); p(ctx, x - 6, y - 12, 12, 1, '#5a3a1c'); }
        if (o.rare) { glow(ctx, x, y - 8, 20, 'rgba(244,197,66,.4)', 0.4); }
        break;
      }
      case 'station': {
        const pulse = 0.5 + Math.sin(t * 2.5) * 0.5;
        ellipse(ctx, x, y - 1, 12, 3, 'rgba(0,0,0,.35)');
        p(ctx, x - 9, y - 6, 18, 5, '#6b6658');
        p(ctx, x - 7, y - 8, 14, 2, '#8f8978');
        p(ctx, x - 4, y - 34, 8, 26, '#5a5368');
        p(ctx, x - 3, y - 34, 3, 26, '#78718a');
        p(ctx, x - 5, y - 36, 10, 3, '#8a8398');
        p(ctx, x - 2, y - 27, 4, 4, '#37c9b8');
        p(ctx, x - 1, y - 28, 2, 6, '#8bfff1');
        p(ctx, x - 5, y - 20, 10, 1, '#37c9b8');
        p(ctx, x - 5, y - 14, 10, 1, '#37c9b8');
        glow(ctx, x, y - 25, 24 + pulse * 8, 'rgba(55,201,184,.55)', 0.4 + pulse * 0.2);
        break;
      }
      case 'hamonSpot': {
        const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;
        ellipse(ctx, x, y - 1, 18, 4, 'rgba(0,0,0,.25)');
        p(ctx, x - 18, y - 6, 36, 5, '#8a7a55');
        p(ctx, x - 15, y - 8, 30, 3, '#b8a26a');
        p(ctx, x - 11, y - 7, 22, 2, '#6d5c3c');
        // runes
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * TAU + t * 0.4;
          p(ctx, x + Math.cos(a) * 11, y - 4 + Math.sin(a) * 2, 2, 1, '#ffe27a');
        }
        p(ctx, x - 1, y - 28, 2, 18, '#c9b06a');
        p(ctx, x - 4, y - 30, 8, 3, '#e7cf74');
        p(ctx, x - 2, y - 33, 4, 4, '#fff0a8');
        glow(ctx, x, y - 26, 26 + pulse * 10, 'rgba(255,214,80,.55)', 0.4 + pulse * 0.25);
        break;
      }
      case 'standMarker': {
        const pulse = 0.5 + Math.sin(t * 2.8) * 0.5;
        ellipse(ctx, x, y - 1, 13, 3, 'rgba(0,0,0,.35)');
        p(ctx, x - 8, y - 5, 16, 4, '#3d3450');
        p(ctx, x - 5, y - 38, 10, 33, '#2a2440');
        p(ctx, x - 4, y - 38, 3, 33, '#40375e');
        p(ctx, x - 2, y - 30, 4, 4, '#a77bff');
        p(ctx, x - 4, y - 28, 8, 1, '#d8c8ff');
        p(ctx, x - 4, y - 25, 8, 1, '#d8c8ff');
        p(ctx, x - 1, y - 27, 2, 6, '#d8c8ff');
        glow(ctx, x, y - 27, 22 + pulse * 8, 'rgba(167,123,255,.55)', 0.35 + pulse * 0.2);
        break;
      }
      case 'dummy': {
        ellipse(ctx, x, y - 1, 7, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 2, y - 6, 4, 6, '#6b4a28');
        p(ctx, x - 5, y - 20, 10, 14, '#a77c4a');
        p(ctx, x - 7, y - 18, 14, 3, '#8a6338');
        p(ctx, x - 4, y - 22, 8, 4, '#c9a06a');
        p(ctx, x - 1, y - 17, 2, 2, '#5e3f22');
        p(ctx, x - 1, y - 12, 2, 2, '#5e3f22');
        break;
      }
      case 'herb': {
        const pulse = 0.5 + Math.sin(t * 3 + (o.seed || 0)) * 0.5;
        p(ctx, x - 1, y - 7, 2, 7, '#4f8a5a');
        p(ctx, x - 4, y - 6, 3, 1, '#4f8a5a');
        p(ctx, x + 2, y - 5, 3, 1, '#4f8a5a');
        p(ctx, x - 2, y - 10, 4, 4, '#7ee8ff');
        p(ctx, x - 1, y - 11, 2, 2, '#d8ffff');
        glow(ctx, x, y - 9, 12 + pulse * 4, 'rgba(110,230,255,.55)', 0.5);
        break;
      }
      case 'scroll': {
        const pulse = 0.5 + Math.sin(t * 3 + (o.seed || 0)) * 0.5;
        p(ctx, x - 5, y - 5, 10, 5, '#e8d9a8');
        p(ctx, x - 5, y - 5, 2, 5, '#c9b06a');
        p(ctx, x + 3, y - 5, 2, 5, '#c9b06a');
        p(ctx, x - 2, y - 4, 4, 1, '#8a6a3a');
        glow(ctx, x, y - 4, 10 + pulse * 4, 'rgba(255,220,120,.45)', 0.4);
        break;
      }
      case 'gum': {
        const pulse = 0.5 + Math.sin(t * 3 + (o.seed || 0)) * 0.5;
        p(ctx, x - 4, y - 6, 8, 6, '#e06a9a');
        p(ctx, x - 4, y - 6, 8, 1, '#ffa8c8');
        p(ctx, x - 2, y - 4, 4, 2, '#fff0f6');
        glow(ctx, x, y - 4, 9 + pulse * 4, 'rgba(255,120,180,.4)', 0.35);
        break;
      }
      case 'ledger': {
        p(ctx, x - 5, y - 6, 10, 6, '#7a3a2a');
        p(ctx, x - 4, y - 6, 8, 1, '#c9a06a');
        p(ctx, x - 4, y - 4, 8, 1, '#e8d9a8');
        p(ctx, x - 4, y - 2, 8, 1, '#e8d9a8');
        glow(ctx, x, y - 3, 9, 'rgba(255,200,100,.3)', 0.3);
        break;
      }
      case 'crate': {
        ellipse(ctx, x, y - 1, 8, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 7, y - 13, 14, 13, '#8a6338');
        p(ctx, x - 7, y - 13, 14, 2, '#a77c4a');
        p(ctx, x - 7, y - 7, 14, 1, '#5e3f22');
        p(ctx, x - 2, y - 13, 1, 13, '#5e3f22');
        break;
      }
      case 'barrel': {
        ellipse(ctx, x, y - 1, 6, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 5, y - 13, 10, 13, '#6b4a28');
        p(ctx, x - 5, y - 13, 10, 2, '#8a6338');
        p(ctx, x - 5, y - 9, 10, 1, '#3d2a16');
        p(ctx, x - 5, y - 4, 10, 1, '#3d2a16');
        break;
      }
      case 'signpost': {
        p(ctx, x - 1, y - 18, 2, 18, '#5e3f22');
        p(ctx, x - 8, y - 18, 14, 5, '#a77c4a');
        p(ctx, x + 4, y - 18, 3, 5, '#a77c4a');
        p(ctx, x - 7, y - 12, 10, 4, '#8a6338');
        p(ctx, x - 6, y - 16, 8, 1, '#e0c890');
        p(ctx, x - 5, y - 10, 6, 1, '#e0c890');
        break;
      }
      case 'fountain': {
        ellipse(ctx, x, y - 1, 24, 7, 'rgba(0,0,0,.25)');
        p(ctx, x - 24, y - 10, 48, 8, '#9a9384');
        p(ctx, x - 24, y - 12, 48, 3, '#b8b0a0');
        p(ctx, x - 20, y - 10, 40, 5, '#3f7a8a');
        p(ctx, x - 2, y - 22, 4, 12, '#a8a090');
        p(ctx, x - 6, y - 26, 12, 4, '#b8b0a0');
        const pulse = Math.sin(t * 3) * 1;
        p(ctx, x - 2, y - 31 - pulse, 4, 6, '#8fd8e8');
        glow(ctx, x, y - 30, 14, 'rgba(120,220,255,.35)', 0.35);
        break;
      }
      case 'statue': {
        ellipse(ctx, x, y - 1, 8, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 8, y - 6, 16, 6, '#8f8878');
        p(ctx, x - 4, y - 22, 8, 16, '#a8a090');
        p(ctx, x - 5, y - 26, 10, 5, '#b8b0a0');
        p(ctx, x - 6, y - 20, 2, 9, '#8f8878');
        p(ctx, x + 4, y - 20, 2, 9, '#8f8878');
        p(ctx, x - 2, y - 25, 1, 1, '#5a5448');
        p(ctx, x + 1, y - 25, 1, 1, '#5a5448');
        break;
      }
      case 'portal': {
        const pulse = 0.5 + Math.sin(t * 2) * 0.5;
        ellipse(ctx, x, y - 1, 18, 4, 'rgba(0,0,0,.35)');
        p(ctx, x - 15, y - 30, 6, 30, '#6d6658');
        p(ctx, x + 9, y - 30, 6, 30, '#6d6658');
        p(ctx, x - 17, y - 32, 34, 5, '#8a8374');
        p(ctx, x - 10, y - 28, 20, 27, 'rgba(20,10,30,.7)');
        p(ctx, x - 9, y - 27, 18, 25, o.color || 'rgba(120,70,200,.35)');
        for (let i = 0; i < 4; i++) {
          const a = t * 1.5 + i * 1.6;
          p(ctx, x + Math.cos(a) * 7, y - 14 + Math.sin(a) * 10, 2, 2, '#c8b0ff');
        }
        glow(ctx, x, y - 15, 26 + pulse * 8, 'rgba(160,100,255,.4)', 0.4);
        break;
      }
      case 'banner': {
        p(ctx, x - 1, y - 32, 2, 32, '#5e4a32');
        const wave = Math.sin(t * 2 + (o.seed || 0)) * 2;
        p(ctx, x + 1, y - 30, 12 + wave, 10, o.color || '#8a2233');
        p(ctx, x + 2, y - 28, 8, 2, '#e0c890');
        break;
      }
      case 'campfire': {
        ellipse(ctx, x, y - 1, 7, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 6, y - 3, 12, 3, '#6b4a28');
        p(ctx, x - 3, y - 5, 6, 2, '#8a6338');
        const fl = Math.sin(t * 8) * 1;
        p(ctx, x - 2, y - 12 - fl, 4, 8, '#ff8a2a');
        p(ctx, x - 1, y - 15 - fl, 2, 7, '#ffd85a');
        glow(ctx, x, y - 10, 24, 'rgba(255,150,40,.45)', 0.5);
        break;
      }
      case 'well': {
        ellipse(ctx, x, y - 1, 10, 3, 'rgba(0,0,0,.3)');
        p(ctx, x - 10, y - 10, 20, 9, '#7a7364');
        p(ctx, x - 10, y - 12, 20, 3, '#9a9282');
        p(ctx, x - 7, y - 9, 14, 5, '#1b2a30');
        p(ctx, x - 9, y - 22, 2, 12, '#5e4a32');
        p(ctx, x + 7, y - 22, 2, 12, '#5e4a32');
        p(ctx, x - 10, y - 24, 20, 2, '#7a5a34');
        break;
      }
      case 'rock': {
        ellipse(ctx, x, y - 1, 9, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 9, y - 8, 18, 8, '#8a6b46');
        p(ctx, x - 7, y - 12, 12, 5, '#a88158');
        p(ctx, x - 4, y - 14, 7, 3, '#b89266');
        p(ctx, x + 4, y - 6, 5, 3, '#6b5136');
        break;
      }
      case 'bones': {
        p(ctx, x - 5, y - 2, 10, 1, '#d8d0b8');
        p(ctx, x - 3, y - 4, 2, 2, '#d8d0b8');
        p(ctx, x + 3, y - 4, 2, 2, '#d8d0b8');
        p(ctx, x - 1, y - 5, 2, 2, '#c9c0a8');
        break;
      }
      case 'market': {
        ellipse(ctx, x, y - 1, 18, 4, 'rgba(0,0,0,.3)');
        p(ctx, x - 17, y - 16, 4, 16, '#6b4a28');
        p(ctx, x + 13, y - 16, 4, 16, '#6b4a28');
        p(ctx, x - 19, y - 18, 38, 4, o.color || '#c94a48');
        for (let i = 0; i < 5; i++) p(ctx, x - 19 + i * 8, y - 14, 4, 3, i % 2 ? '#f0e0c0' : '#e0b84f');
        p(ctx, x - 15, y - 12, 30, 3, '#8a6338');
        p(ctx, x - 12, y - 9, 5, 4, '#e0b84f');
        p(ctx, x - 5, y - 9, 5, 4, '#c94a48');
        p(ctx, x + 2, y - 9, 5, 4, '#5a9a5a');
        break;
      }
      case 'tent': {
        ellipse(ctx, x, y - 1, 16, 4, 'rgba(0,0,0,.3)');
        p(ctx, x - 16, y - 4, 32, 4, '#6b4a28');
        for (let i = 0; i < 5; i++) {
          const ww = 30 - i * 6;
          p(ctx, x - ww / 2, y - 6 - i * 5, ww, 5, i % 2 ? '#b8905a' : '#a47c4a');
        }
        p(ctx, x - 4, y - 10, 8, 7, '#3d2a16');
        break;
      }
      case 'boat': {
        ellipse(ctx, x, y - 1, 20, 4, 'rgba(0,0,0,.25)');
        p(ctx, x - 20, y - 8, 40, 7, '#6b4a28');
        p(ctx, x - 16, y - 10, 32, 3, '#8a6338');
        p(ctx, x - 1, y - 26, 2, 18, '#5e4a32');
        p(ctx, x + 1, y - 24, 12, 8, '#e8d9b8');
        p(ctx, x + 1, y - 16, 9, 4, '#c9b88a');
        break;
      }
      case 'ruinColumn': {
        ellipse(ctx, x, y - 1, 6, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 6, y - 4, 12, 4, '#9a9384');
        p(ctx, x - 4, y - 26, 8, 22, '#b8b0a0');
        p(ctx, x - 3, y - 26, 2, 22, '#d0c8b8');
        p(ctx, x - 5, y - 29, 10, 3, '#9a9384');
        if (o.broken) { p(ctx, x - 4, y - 30, 5, 4, '#b8b0a0'); p(ctx, x + 1, y - 27, 4, 2, '#9a9384'); }
        break;
      }
      case 'ruinArch': {
        p(ctx, x - 18, y - 28, 6, 28, '#b8b0a0');
        p(ctx, x + 12, y - 28, 6, 28, '#b8b0a0');
        p(ctx, x - 20, y - 32, 40, 5, '#9a9384');
        p(ctx, x - 14, y - 30, 28, 3, '#d0c8b8');
        p(ctx, x - 16, y - 4, 10, 4, '#9a9384');
        p(ctx, x + 6, y - 4, 10, 4, '#9a9384');
        break;
      }
      case 'pyramid': {
        ellipse(ctx, x, y - 2, o.w * 0.52, 8, 'rgba(0,0,0,.3)');
        const hw = o.w / 2;
        for (let i = 0; i < 6; i++) {
          const ww = hw * 2 * (1 - i / 7);
          p(ctx, x - ww / 2, y - 10 - i * (o.h / 7), ww, o.h / 7 + 1, i % 2 ? '#c9a56a' : '#b58a4a');
          p(ctx, x - ww / 2, y - 10 - i * (o.h / 7), ww, 2, '#d8bd82');
        }
        p(ctx, x - 14, y - 24, 28, 22, '#8a6338');
        p(ctx, x - 10, y - 22, 20, 20, '#2a1c12');
        p(ctx, x - 2, y - 18, 4, 16, '#d8bd82');
        glow(ctx, x, y - 12, 30, 'rgba(255,180,70,.18)', 0.3);
        break;
      }
      case 'obelisk': {
        ellipse(ctx, x, y - 1, 8, 2, 'rgba(0,0,0,.3)');
        p(ctx, x - 8, y - 5, 16, 4, '#9a8a6a');
        p(ctx, x - 5, y - 34, 10, 30, '#c9b58a');
        p(ctx, x - 4, y - 34, 3, 30, '#e0d0a8');
        p(ctx, x - 2, y - 40, 4, 6, '#e0c060');
        p(ctx, x - 1, y - 30, 2, 2, '#8a6a3a');
        p(ctx, x - 1, y - 24, 2, 2, '#8a6a3a');
        p(ctx, x - 1, y - 18, 2, 2, '#8a6a3a');
        break;
      }
      case 'colosseum': {
        const w = o.w || 200, h = o.h || 80;
        ellipse(ctx, x, y - 2, w * 0.5, 8, 'rgba(0,0,0,.3)');
        for (let i = 0; i < 9; i++) {
          const cx = x - w / 2 + (i + 0.5) * (w / 9);
          p(ctx, cx - 5, y - h, 10, h, '#b0a690');
          p(ctx, cx - 4, y - h + 4, 8, h - 8, '#9a907a');
          p(ctx, cx - 4, y - h + 4, 2, h - 8, '#c8bea8');
          if (i % 2 === 0) p(ctx, cx - 6, y - h - 4, 12, 4, '#c8bea8');
        }
        p(ctx, x - w / 2 - 4, y - h - 2, w + 8, 6, '#c8bea8');
        p(ctx, x - w / 2 - 6, y - h + 18, w + 12, 4, '#9a907a');
        break;
      }
      case 'sphinx': {
        ellipse(ctx, x, y - 1, 22, 5, 'rgba(0,0,0,.3)');
        p(ctx, x - 20, y - 10, 40, 10, '#b89a6a');
        p(ctx, x - 16, y - 22, 20, 14, '#c9ab78');
        p(ctx, x - 12, y - 30, 14, 10, '#d8bd82');
        p(ctx, x - 10, y - 28, 3, 2, '#3a2a1a');
        p(ctx, x - 3, y - 28, 3, 2, '#3a2a1a');
        p(ctx, x + 4, y - 18, 12, 8, '#c9ab78');
        p(ctx, x + 14, y - 20, 4, 4, '#d8bd82');
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  function drawHouse(ctx, o, t, night) {
    const w = o.w || 64, h = o.h || 48, x = o.x, y = o.y;
    const style = o.style || 'england';
    const wall = style === 'italy' ? '#c9b98e' : style === 'egypt' ? '#cbb58a' : style === 'mexico' ? '#c49a64' : '#a58f72';
    const wall2 = style === 'italy' ? '#a89a72' : style === 'egypt' ? '#a89468' : style === 'mexico' ? '#a47a48' : '#877258';
    const roof = style === 'italy' ? '#8f4a35' : style === 'egypt' ? '#a06a3c' : style === 'mexico' ? '#8a4c2e' : '#4a3540';
    const roof2 = style === 'italy' ? '#b25e42' : style === 'egypt' ? '#c08648' : style === 'mexico' ? '#a85e36' : '#654450';
    ellipse(ctx, x, y - 1, w * 0.48, 5, 'rgba(0,0,0,.3)');
    const bodyH = h * 0.48;
    p(ctx, x - w / 2, y - bodyH, w, bodyH, wall);
    p(ctx, x - w / 2, y - bodyH, w, 2, '#d8c8a8');
    p(ctx, x - w / 2, y - 3, w, 3, wall2);
    // roof
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - w / 2 - 5, y - bodyH + 1);
    ctx.lineTo(x - w * 0.28, y - h);
    ctx.lineTo(x + w * 0.28, y - h);
    ctx.lineTo(x + w / 2 + 5, y - bodyH + 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = roof2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.28, y - h + 2);
    ctx.lineTo(x + w * 0.28, y - h + 2);
    ctx.lineTo(x + w / 2 + 2, y - bodyH + 3);
    ctx.lineTo(x - w / 2 - 2, y - bodyH + 3);
    ctx.closePath();
    ctx.fill();
    p(ctx, x - w / 2 - 5, y - bodyH + 1, w + 10, 2, '#2a2028');
    // chimney
    p(ctx, x + w * 0.22, y - h - 7, 7, 12, wall2);
    p(ctx, x + w * 0.22, y - h - 8, 9, 2, '#5a4a44');
    if (night) p(ctx, x + w * 0.22, y - h - 10, 5, 3, 'rgba(220,220,230,.2)');
    // door
    const dw = Math.max(8, w * 0.17);
    p(ctx, x - dw / 2, y - bodyH * 0.7, dw, bodyH * 0.7, '#4a3020');
    p(ctx, x - dw / 2 + 1, y - bodyH * 0.7 + 2, dw - 2, bodyH * 0.7 - 2, '#6b4a2c');
    p(ctx, x + dw / 2 - 3, y - bodyH * 0.38, 2, 2, '#e0b84f');
    // windows
    const wy = y - bodyH * 0.78;
    for (const side of [-1, 1]) {
      const wx = x + side * w * 0.27;
      p(ctx, wx - 5, wy, 10, 9, '#3a2a1e');
      p(ctx, wx - 4, wy + 1, 8, 7, night ? '#ffd77a' : '#6d8a9a');
      p(ctx, wx, wy + 1, 1, 7, '#3a2a1e');
      p(ctx, wx - 4, wy + 4, 8, 1, '#3a2a1e');
      if (night) glow(ctx, wx, wy + 4, 15, 'rgba(255,200,90,.45)', 0.35);
    }
    if (style === 'italy') {
      p(ctx, x - w * 0.4, y - bodyH * 0.55, 6, 2, '#3f6a3a');
      p(ctx, x + w * 0.36, y - bodyH * 0.5, 5, 2, '#3f6a3a');
    }
    if (style === 'egypt') {
      p(ctx, x - w / 2, y - bodyH - 1, w, 2, '#8a6a3a');
    }
  }

  function drawMansion(ctx, o, t, night) {
    const w = o.w || 260, h = o.h || 170, x = o.x, y = o.y;
    const gothic = !!o.gothic;
    const wall = gothic ? '#4a3a4a' : '#9a8a72';
    const wall2 = gothic ? '#332a3a' : '#7a6a58';
    const roof = gothic ? '#241a2e' : '#4a3540';
    const roof2 = gothic ? '#3a2848' : '#654450';
    ellipse(ctx, x, y - 2, w * 0.52, 10, 'rgba(0,0,0,.4)');
    // main block
    p(ctx, x - w * 0.42, y - h * 0.56, w * 0.84, h * 0.56, wall);
    p(ctx, x - w * 0.42, y - h * 0.56, w * 0.84, 3, '#c8b898');
    p(ctx, x - w * 0.42, y - 4, w * 0.84, 4, wall2);
    // central tower
    p(ctx, x - w * 0.13, y - h * 0.84, w * 0.26, h * 0.84, wall);
    p(ctx, x - w * 0.13, y - h * 0.84, w * 0.26, 3, '#d8c8a8');
    // roofs
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.48, y - h * 0.54);
    ctx.lineTo(x - w * 0.28, y - h * 0.66);
    ctx.lineTo(x + w * 0.28, y - h * 0.66);
    ctx.lineTo(x + w * 0.48, y - h * 0.54);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = roof2;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.15, y - h * 0.84);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w * 0.15, y - h * 0.84);
    ctx.closePath(); ctx.fill();
    // spires
    for (const side of [-1, 1]) {
      const sx = x + side * w * 0.36;
      p(ctx, sx - 6, y - h * 0.72, 12, h * 0.16, wall2);
      ctx.fillStyle = roof2;
      ctx.beginPath();
      ctx.moveTo(sx - 9, y - h * 0.72);
      ctx.lineTo(sx, y - h * 0.94);
      ctx.lineTo(sx + 9, y - h * 0.72);
      ctx.closePath(); ctx.fill();
      if (gothic) { p(ctx, sx - 1, y - h * 0.97, 2, 7, '#8a6a9a'); }
    }
    // windows
    for (let i = 0; i < 5; i++) {
      const wx = x - w * 0.33 + i * w * 0.165;
      if (i === 2) continue;
      const wy = y - h * 0.44;
      p(ctx, wx - 7, wy, 14, 20, gothic ? '#1a1024' : '#3a2a1e');
      p(ctx, wx - 6, wy + 2, 12, 16, night ? (gothic ? '#8a3a6a' : '#ffd77a') : (gothic ? '#5a2a5a' : '#6d8a9a'));
      p(ctx, wx, wy + 2, 1, 16, '#2a1e14');
      p(ctx, wx - 6, wy + 8, 12, 1, '#2a1e14');
      if (night) glow(ctx, wx, wy + 10, 18, gothic ? 'rgba(200,80,220,.4)' : 'rgba(255,200,90,.45)', 0.4);
    }
    // central window + door
    p(ctx, x - 8, y - h * 0.74, 16, 22, gothic ? '#1a1024' : '#3a2a1e');
    p(ctx, x - 6, y - h * 0.72, 12, 18, night ? (gothic ? '#b04a8a' : '#ffe19a') : (gothic ? '#6a2a6a' : '#7a9aaa'));
    p(ctx, x - 13, y - h * 0.26, 26, h * 0.26, gothic ? '#1a1024' : '#4a3020');
    p(ctx, x - 11, y - h * 0.24, 22, h * 0.24, gothic ? '#3a2048' : '#6b4a2c');
    p(ctx, x - 1, y - h * 0.24, 2, h * 0.24, gothic ? '#8a5a9a' : '#4a3020');
    // columns
    for (const side of [-1, 1]) {
      const cx = x + side * w * 0.18;
      p(ctx, cx - 4, y - h * 0.28, 8, h * 0.24, '#c8b898');
      p(ctx, cx - 6, y - h * 0.3, 12, 4, '#d8c8a8');
      p(ctx, cx - 6, y - h * 0.08, 12, 4, '#b8a888');
    }
    // steps
    p(ctx, x - w * 0.12, y - 4, w * 0.24, 4, '#b8a888');
    p(ctx, x - w * 0.15, y - 1, w * 0.3, 2, '#9a8a72');
    // sign
    if (!gothic) {
      p(ctx, x - 26, y - h * 0.62, 52, 7, '#3a2a1e');
      p(ctx, x - 24, y - h * 0.62 + 2, 48, 2, '#e0c890');
    } else {
      p(ctx, x - 2, y - h * 0.97, 4, 10, '#d8b04a');
      p(ctx, x - 4, y - h * 0.97 + 8, 8, 2, '#d8b04a');
    }
  }

  /* ============================ TITLE SCENE ============================ */
  function drawTitle(ctx, w, h, t) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#08081c');
    sky.addColorStop(0.38, '#2b1738');
    sky.addColorStop(0.62, '#6b2d43');
    sky.addColorStop(0.8, '#b4583a');
    sky.addColorStop(1, '#1a0f18');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    // stars
    for (let i = 0; i < 70; i++) {
      const sx = hash(i, 1, 7) * w;
      const sy = hash(i, 2, 9) * h * 0.55;
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(t * (0.7 + hash(i, 3) * 1.4) + i));
      ctx.globalAlpha = tw * (0.4 + hash(i, 4) * 0.6);
      p(ctx, sx, sy, hash(i, 5) > 0.85 ? 2 : 1, 1, '#f8eecb');
    }
    ctx.globalAlpha = 1;

    // moon
    const mx = w * 0.72, my = h * 0.24, mr = Math.max(10, Math.min(w, h) * 0.085);
    glow(ctx, mx, my, mr * 2.4, 'rgba(255,210,120,.25)', 0.7);
    ellipse(ctx, mx, my, mr, mr, '#f4e3b0');
    ellipse(ctx, mx - mr * 0.2, my - mr * 0.1, mr * 0.7, mr * 0.7, '#f8eecb');
    p(ctx, mx - mr * 0.45, my + mr * 0.1, mr * 0.28, mr * 0.22, '#d8c48e');
    p(ctx, mx + mr * 0.15, my - mr * 0.4, mr * 0.2, mr * 0.16, '#d8c48e');
    p(ctx, mx + mr * 0.25, my + mr * 0.35, mr * 0.18, mr * 0.12, '#d8c48e');

    // clouds
    for (let i = 0; i < 6; i++) {
      const cx = ((hash(i, 8, 3) * w + t * (3 + i)) % (w + 120)) - 60;
      const cy = h * (0.12 + hash(i, 9) * 0.32);
      const cw = 40 + hash(i, 10) * 60;
      ctx.globalAlpha = 0.1 + hash(i, 11) * 0.12;
      ellipse(ctx, cx, cy, cw, 5, '#e0c8d8');
      ellipse(ctx, cx + cw * 0.4, cy - 3, cw * 0.5, 4, '#e0c8d8');
    }
    ctx.globalAlpha = 1;

    // distant hills
    ctx.fillStyle = '#241427';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    for (let x = 0; x <= w; x += 8) {
      const yy = h * 0.62 + Math.sin(x * 0.03 + 2) * 6 + Math.sin(x * 0.011) * 10;
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = '#1b0f1f';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.7);
    for (let x = 0; x <= w; x += 6) {
      const yy = h * 0.7 + Math.sin(x * 0.05 + 1) * 4;
      ctx.lineTo(x, yy);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();

    // mansion silhouette
    const bx = w * 0.5, by = h * 0.68, bw = Math.min(w * 0.36, 150), bh = Math.min(h * 0.3, 74);
    ctx.fillStyle = '#120a16';
    p(ctx, bx - bw * 0.4, by - bh * 0.7, bw * 0.8, bh * 0.7, '#120a16');
    p(ctx, bx - bw * 0.1, by - bh, bw * 0.2, bh, '#120a16');
    ctx.fillStyle = '#120a16';
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.5, by - bh * 0.68);
    ctx.lineTo(bx, by - bh * 1.04);
    ctx.lineTo(bx + bw * 0.5, by - bh * 0.68);
    ctx.closePath(); ctx.fill();
    for (const side of [-1, 1]) {
      const sx = bx + side * bw * 0.34;
      p(ctx, sx - 3, by - bh * 0.8, 6, bh * 0.16, '#120a16');
      ctx.beginPath();
      ctx.moveTo(sx - 5, by - bh * 0.8);
      ctx.lineTo(sx, by - bh * 1.05);
      ctx.lineTo(sx + 5, by - bh * 0.8);
      ctx.closePath(); ctx.fill();
    }
    // windows
    for (let i = 0; i < 4; i++) {
      const wx = bx - bw * 0.3 + i * bw * 0.2;
      p(ctx, wx, by - bh * 0.46, 3, 5, i % 2 ? '#8a3a5a' : '#e0a84a');
    }
    p(ctx, bx - 2, by - bh * 0.36, 4, bh * 0.36, '#e0a84a');
    glow(ctx, bx, by - bh * 0.3, 30, 'rgba(255,170,60,.18)', 0.35);

    // winding path
    ctx.fillStyle = '#2a1a20';
    ctx.beginPath();
    ctx.moveTo(w * 0.47, h * 0.7);
    ctx.quadraticCurveTo(w * 0.55, h * 0.82, w * 0.5, h);
    ctx.lineTo(w * 0.58, h);
    ctx.quadraticCurveTo(w * 0.62, h * 0.84, w * 0.52, h * 0.7);
    ctx.closePath(); ctx.fill();

    // foreground dunes
    ctx.fillStyle = '#0e0810';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.82);
    ctx.quadraticCurveTo(w * 0.25, h * 0.74, w * 0.5, h * 0.82);
    ctx.quadraticCurveTo(w * 0.78, h * 0.9, w, h * 0.8);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();

    // heroes
    const sc = Math.max(1.2, Math.min(2.2, h / 150));
    const positions = [
      { id: 'jonathan', x: w * 0.18, y: h * 0.97, facing: { x: 0.3, y: -0.4 } },
      { id: 'joseph', x: w * 0.5, y: h * 1.01, facing: { x: -0.2, y: -0.4 } },
      { id: 'jotaro', x: w * 0.82, y: h * 0.97, facing: { x: -0.3, y: -0.4 } }
    ];
    for (const hp of positions) {
      ctx.save();
      ctx.translate(hp.x, hp.y);
      ctx.scale(sc, sc);
      if (hp.id === 'jotaro') {
        stand(ctx, -12, 0, { x: -1, y: -0.4 }, t, { alpha: 0.35, scale: 1.1 });
      }
      hero(ctx, hp.id, 0, 0, hp.facing, t + (hp.id === 'joseph' ? 1 : 0), {
        pose: true,
        hamon: hp.id !== 'jotaro',
        moving: false
      });
      ctx.restore();
      if (hp.id === 'jonathan') glow(ctx, hp.x, hp.y - 24 * sc, 20 * sc, 'rgba(255,210,80,.25)', 0.5);
      if (hp.id === 'jotaro') glow(ctx, hp.x - 12, hp.y - 20 * sc, 24 * sc, 'rgba(160,100,255,.22)', 0.5);
    }

    // menacing glyphs
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#e0489a';
    ctx.font = `bold ${Math.max(14, h * 0.06)}px monospace`;
    for (let i = 0; i < 3; i++) {
      ctx.fillText('ゴ', w * 0.04, h * (0.3 + i * 0.09));
      ctx.fillText('ゴ', w * 0.9, h * (0.26 + i * 0.1));
    }
    ctx.restore();

    // vignette edges
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.1, w * 0.5, h * 0.45, h * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(3,2,8,.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
  }

  return { TILE, PAL, drawTile, renderGround, drawObject, drawTitle };
})();
