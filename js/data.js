/* ============================================================
   Game data — heroes, skills, enemies, items, quests
   ============================================================ */
window.GAME_DATA = (() => {
  const CHARACTERS = {
    jonathan: {
      id: 'jonathan',
      part: 1,
      palette: { hair: '#1b2438', hair2: '#2b3a5c', skin: '#f0c295', skin2: '#c98d63', coat: '#2b4a8b', coat2: '#1a2e58', pants: '#d7d0b8', boots: '#39291e', accent: '#e7cf74', scarf: '#8e2233' },
      base: { hp: 130, atk: 12, def: 4, speed: 88, energy: 100, crit: 0.05, critDmg: 1.5 },
      growth: { hp: 21, atk: 2.5, def: 0.72, speed: 1.15, energy: 4 },
      passive: 'jonathan',
      skills: [
        { id: 's1', type: 'dashAoe', power: 2.2, radius: 54, dash: 76, stun: 1.0, cd: 6, energy: 20, fx: 'hamon' },
        { id: 's2', type: 'healBuff', heal: 0.3, buff: { dmg: 1.25, duration: 6 }, cd: 15, energy: 30, fx: 'hamon' },
        { id: 's3', type: 'nova', power: 4.5, radius: 122, knockback: 150, cd: 24, energy: 60, fx: 'hamonNova' }
      ]
    },
    joseph: {
      id: 'joseph',
      part: 2,
      palette: { hair: '#6b3f22', hair2: '#8a552d', skin: '#e9b98a', skin2: '#bd8558', coat: '#2f7f6f', coat2: '#1b5a4e', pants: '#c8ac72', boots: '#3c2b1e', accent: '#d9a23c', scarf: '#b83b2f' },
      base: { hp: 100, atk: 10, def: 2, speed: 106, energy: 120, crit: 0.10, critDmg: 1.5 },
      growth: { hp: 17, atk: 2.3, def: 0.55, speed: 1.55, energy: 5 },
      passive: 'joseph',
      skills: [
        { id: 's1', type: 'boomerang', power: 1.9, range: 250, speed: 330, cd: 5, energy: 16, fx: 'clacker' },
        { id: 's2', type: 'trap', power: 2.7, radius: 72, duration: 10, cd: 12, energy: 25, fx: 'hamon' },
        { id: 's3', type: 'coneShots', shots: 10, power: 0.62, range: 240, spread: 0.55, cd: 22, energy: 55, fx: 'bullet' }
      ]
    },
    jotaro: {
      id: 'jotaro',
      part: 3,
      palette: { hair: '#151726', hair2: '#282c42', skin: '#e8bb90', skin2: '#bd8c60', coat: '#2a2450', coat2: '#181532', pants: '#23233d', boots: '#14131f', accent: '#e0b84f', scarf: '#4fc3d9' },
      base: { hp: 112, atk: 14, def: 3, speed: 98, energy: 110, crit: 0.15, critDmg: 1.6 },
      growth: { hp: 19, atk: 2.9, def: 0.62, speed: 1.3, energy: 4.5 },
      passive: 'jotaro',
      skills: [
        { id: 's1', type: 'flurry', hits: 8, power: 0.56, range: 50, radius: 34, cd: 7, energy: 20, fx: 'stand' },
        { id: 's2', type: 'dashStrike', power: 2.3, dash: 136, radius: 36, cd: 8, energy: 20, fx: 'standDash' },
        { id: 's3', type: 'timeStopNova', power: 5.2, radius: 118, stop: 1.3, cd: 28, energy: 65, fx: 'starNova' }
      ]
    }
  };

  const TREE_NODES = [
    { id: 'vitality', icon: '♥', col: 0, row: 0, level: 1, requires: null, effect: { maxHp: 25 } },
    { id: 'might', icon: '⚔', col: 0, row: 1, level: 3, requires: 'vitality', effect: { atk: 3 } },
    { id: 'flow', icon: '≈', col: 0, row: 2, level: 5, requires: 'might', effect: { cd: 0.88 } },
    { id: 'skill1', icon: '✦', col: 1, row: 0, level: 1, requires: null, effect: { skill1: 1.2 } },
    { id: 'skill2', icon: '✧', col: 1, row: 1, level: 3, requires: 'skill1', effect: { skill2: 1.2 } },
    { id: 'focus', icon: '◎', col: 1, row: 2, level: 5, requires: 'skill2', effect: { crit: 0.08 } },
    { id: 'agility', icon: '➤', col: 2, row: 0, level: 1, requires: null, effect: { speed: 8 } },
    { id: 'spirit', icon: '☼', col: 2, row: 1, level: 3, requires: 'agility', effect: { maxEnergy: 20 } },
    { id: 'ultimate', icon: '★', col: 2, row: 2, level: 5, requires: 'spirit', effect: { ultimate: 1.3 } }
  ];

  const ITEMS = {
    smallHeal: { id: 'smallHeal', icon: '✚', type: 'heal', heal: 40, price: 30 },
    bigHeal: { id: 'bigHeal', icon: '✚', type: 'heal', heal: 100, price: 70 },
    energyDrink: { id: 'energyDrink', icon: '⚡', type: 'energy', energy: 50, price: 40 },
    coffee: { id: 'coffee', icon: '☕', type: 'buff', buff: { speed: 1.2, duration: 30 }, price: 55 },
    charm: { id: 'charm', icon: '◈', type: 'permanent', speed: 6, price: 0 },
    herb: { id: 'herb', icon: '❀', type: 'quest', price: 0 },
    ledger: { id: 'ledger', icon: '▤', type: 'quest', price: 0 },
    scroll: { id: 'scroll', icon: '❧', type: 'quest', price: 0 },
    gum: { id: 'gum', icon: '●', type: 'quest', price: 0 },
    mask: { id: 'mask', icon: '☠', type: 'key', price: 0 },
    ajaStone: { id: 'ajaStone', icon: '◆', type: 'key', price: 0 },
    arrow: { id: 'arrow', icon: '➶', type: 'key', price: 0 }
  };

  const ENEMIES = {
    zombie: { id: 'zombie', hp: 44, atk: 7, def: 0, speed: 33, aggro: 96, range: 23, attackCd: 1.15, windup: 0.36, xp: 17, coins: 5, radius: 7, scale: 1, kind: 'zombie' },
    vampireThrall: { id: 'vampireThrall', hp: 76, atk: 11, def: 1, speed: 45, aggro: 116, range: 25, attackCd: 1.0, windup: 0.32, xp: 28, coins: 10, radius: 7, scale: 1.04, kind: 'vampire' },
    stoneCultist: { id: 'stoneCultist', hp: 98, atk: 13, def: 2, speed: 40, aggro: 122, range: 27, attackCd: 1.3, windup: 0.4, xp: 38, coins: 13, radius: 7, scale: 1.02, kind: 'cultist', ranged: true, projSpeed: 130 },
    desertRaider: { id: 'desertRaider', hp: 88, atk: 15, def: 1, speed: 58, aggro: 136, range: 27, attackCd: 1.05, windup: 0.3, xp: 43, coins: 16, radius: 7, scale: 1.02, kind: 'raider' },
    scorpion: { id: 'scorpion', hp: 58, atk: 17, def: 0, speed: 64, aggro: 88, range: 21, attackCd: 0.95, windup: 0.28, xp: 31, coins: 9, radius: 8, scale: 1, kind: 'scorpion' },
    standAssassin: { id: 'standAssassin', hp: 122, atk: 18, def: 3, speed: 56, aggro: 148, range: 32, attackCd: 1.15, windup: 0.34, xp: 56, coins: 22, radius: 7, scale: 1.06, kind: 'assassin', ranged: true, projSpeed: 155 },
    minion: { id: 'minion', hp: 55, atk: 10, def: 1, speed: 48, aggro: 160, range: 24, attackCd: 1.1, windup: 0.3, xp: 14, coins: 4, radius: 7, scale: 1, kind: 'vampire' },
    dioVampire: { id: 'dioVampire', hp: 620, atk: 17, def: 3, speed: 56, aggro: 300, range: 36, attackCd: 1.25, windup: 0.4, xp: 280, coins: 180, radius: 10, scale: 1.32, kind: 'dioVampire', boss: true, abilities: ['slam', 'fan', 'charge'] },
    wamuu: { id: 'wamuu', hp: 940, atk: 22, def: 4, speed: 68, aggro: 320, range: 40, attackCd: 1.15, windup: 0.38, xp: 460, coins: 300, radius: 11, scale: 1.42, kind: 'wamuu', boss: true, abilities: ['charge', 'fan', 'slam'] },
    esidisi: { id: 'esidisi', hp: 1180, atk: 25, def: 5, speed: 62, aggro: 320, range: 40, attackCd: 1.2, windup: 0.4, xp: 600, coins: 380, radius: 11, scale: 1.46, kind: 'esidisi', boss: true, abilities: ['slam', 'fan', 'summon'] },
    dio: { id: 'dio', hp: 1950, atk: 31, def: 6, speed: 78, aggro: 380, range: 42, attackCd: 1.0, windup: 0.34, xp: 1300, coins: 900, radius: 12, scale: 1.5, kind: 'dio', boss: true, abilities: ['charge', 'fan', 'slam', 'summon', 'timeStop'] }
  };

  const REGIONS = {
    england: { id: 'england', chapter: 1, unlockStage: 0, station: { x: 20, y: 44 }, spawn: { x: 20, y: 44 }, portal: null },
    italy: { id: 'italy', chapter: 2, unlockStage: 4, station: { x: 28, y: 40 }, spawn: { x: 28, y: 40 } },
    mexico: { id: 'mexico', chapter: 2, unlockStage: 7, station: { x: 28, y: 40 }, spawn: { x: 28, y: 40 } },
    egypt: { id: 'egypt', chapter: 3, unlockStage: 10, station: { x: 38, y: 48 }, spawn: { x: 38, y: 48 } }
  };

  // Main story stages. kind: talk | kill | boss | interact | reach
  const MAIN_STAGES = [
    { stage: 0, key: 'arrival', chapter: 1, region: 'england', kind: 'talk', target: 'speedwagon' },
    { stage: 1, key: 'shadows', chapter: 1, region: 'england', kind: 'kill', target: 'zombie', need: 3 },
    { stage: 2, key: 'bloodstone', chapter: 1, region: 'england', kind: 'talk', target: 'erina' },
    { stage: 3, key: 'curse', chapter: 1, region: 'england', kind: 'boss', target: 'dioVampire' },
    { stage: 4, key: 'hamon', chapter: 1, region: 'england', kind: 'interact', target: 'hamon_england' },
    { stage: 5, key: 'italyArrival', chapter: 2, region: 'italy', kind: 'talk', target: 'caesar' },
    { stage: 6, key: 'training', chapter: 2, region: 'italy', kind: 'kill', target: 'stoneCultist', need: 5 },
    { stage: 7, key: 'wamuu', chapter: 2, region: 'italy', kind: 'boss', target: 'wamuu' },
    { stage: 8, key: 'mexicoArrival', chapter: 2, region: 'mexico', kind: 'reach', target: 'ruins' },
    { stage: 9, key: 'elder', chapter: 2, region: 'mexico', kind: 'talk', target: 'elder' },
    { stage: 10, key: 'esidisi', chapter: 2, region: 'mexico', kind: 'boss', target: 'esidisi' },
    { stage: 11, key: 'egyptArrival', chapter: 3, region: 'egypt', kind: 'talk', target: 'avdol' },
    { stage: 12, key: 'assassins', chapter: 3, region: 'egypt', kind: 'kill', target: 'standAssassin', need: 8 },
    { stage: 13, key: 'dioFinal', chapter: 3, region: 'egypt', kind: 'boss', target: 'dio' },
    { stage: 14, key: 'free', chapter: 3, region: 'egypt', kind: 'free' }
  ];

  const CHAPTERS = {
    1: { titleKey: 'quests.chapters.c1', introKey: 'ui.introChapter1', startStage: 0, endStage: 4 },
    2: { titleKey: 'quests.chapters.c2', introKey: 'ui.introChapter2', startStage: 5, endStage: 10 },
    3: { titleKey: 'quests.chapters.c3', introKey: 'ui.introChapter3', startStage: 11, endStage: 14 }
  };

  const SIDE_QUESTS = {
    ledger: {
      id: 'ledger', npc: 'speedwagon', region: 'england', unlockStage: 1,
      type: 'collect', item: 'ledger', need: 1,
      reward: { coins: 120, items: { smallHeal: 2 } }
    },
    herbs: {
      id: 'herbs', npc: 'erina', region: 'england', unlockStage: 1,
      type: 'collect', item: 'herb', need: 3,
      reward: { coins: 80, items: { bigHeal: 2 } }
    },
    scrolls: {
      id: 'scrolls', npc: 'caesar', region: 'italy', unlockStage: 5,
      type: 'collect', item: 'scroll', need: 2,
      reward: { coins: 150, sp: 2 }
    },
    revenge: {
      id: 'revenge', npc: 'polnareff', region: 'egypt', unlockStage: 11,
      type: 'kill', target: 'standAssassin', need: 4,
      reward: { coins: 250, items: { charm: 1 } }
    },
    gum: {
      id: 'gum', npc: 'iggy', region: 'egypt', unlockStage: 11,
      type: 'collect', item: 'gum', need: 2,
      reward: { coins: 150, items: { coffee: 3 } }
    }
  };

  const XP_TABLE = [];
  for (let l = 1; l <= 25; l++) XP_TABLE[l] = Math.floor(34 * Math.pow(l, 1.42) + l * 12);

  const MAX_LEVEL = 20;

  const WEATHERS = {
    england: 'rain',
    italy: 'clear',
    mexico: 'heat',
    egypt: 'heat'
  };

  const REGION_COLORS = {
    england: { grass: '#4c7a3e', path: '#a68b5c', water: '#2b5570', tree: '#2c5230' },
    italy: { grass: '#5d7f46', path: '#a69a78', water: '#2c6a86', tree: '#2f5a3b' },
    mexico: { grass: '#b57b42', path: '#c9a56a', water: '#2f6d78', tree: '#6f6a3a' },
    egypt: { grass: '#c49a57', path: '#d8bd82', water: '#2a6f86', tree: '#6e7a3b' }
  };

  return {
    CHARACTERS, TREE_NODES, ITEMS, ENEMIES, REGIONS, MAIN_STAGES,
    CHAPTERS, SIDE_QUESTS, XP_TABLE, MAX_LEVEL, WEATHERS, REGION_COLORS
  };
})();
