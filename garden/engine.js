// ═══════════════════════════════════════════════════════════════
// GARDEN ENGINE — turns a garden's history into plants
// ═══════════════════════════════════════════════════════════════
// Input:  every action ever taken in this garden
//         [{ id, type: 'question' | 'note' | 'goal', userId, createdAt }]
// Output: the garden as it looks TODAY — which plants are alive, where
//         they stand, how dry everything is, the streak, the next milestone.
//
// How it works: we "replay" the garden one day at a time, from the first
// action until today, applying the rules in config.js:
//   • active day → plant one flower per action, streak +1
//   • every 7th streak day → that week's flowers merge into a bush
//   • every 14th streak day → the bush + that week's flowers become a tree
//   • quiet day → streak resets; from the 7th quiet day on, one plant dies
//
// It's a PURE function: same input → same garden, every time, on every
// phone. No database writes, no randomness (positions come from a hash of
// the garden id), which also makes it easy to test.
// ═══════════════════════════════════════════════════════════════

import { GARDEN_RULES } from './config.js';
import { localDateStr, dayNumber } from '../lib/dates.js';

// Deterministic "random" number in [0, 1) from any text.
// Same text → same number, so a garden always looks the same.
export function hash01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// All plot cells, ordered: centre first, then ring by ring outwards.
// Inside a ring the order is shuffled per garden, so every garden grows
// its own natural-looking shape.
function cellOrder(gardenId, maxRing) {
  const cells = [];
  for (let i = -maxRing; i <= maxRing; i++) {
    for (let j = -maxRing; j <= maxRing; j++) {
      const ring = Math.max(Math.abs(i), Math.abs(j));
      cells.push({ i, j, ring, r: hash01(`${gardenId}:${i}:${j}`) });
    }
  }
  return cells.sort((a, b) => a.ring - b.ring || a.r - b.r);
}

function drynessFor(quiet, rules) {
  if (quiet < rules.fadeAfter) return 0;
  if (quiet >= rules.dyingAfter) return 0.9;
  return Math.min(0.8, 0.15 * (quiet - rules.fadeAfter + 1)); // 0.15 … 0.75
}

function statusFor(quiet, rules) {
  if (quiet < rules.fadeAfter) return 'fresh';
  if (quiet < rules.thirstyAfter) return 'fading';
  if (quiet < rules.dyingAfter) return 'thirsty';
  return 'dying';
}

function treeStage(growth, rules) {
  const s = rules.treeStages;
  if (growth >= s.fruiting) return 'fruiting';
  if (growth >= s.blossoming) return 'blossoming';
  if (growth >= s.grown) return 'grown';
  return 'young';
}

/**
 * Type hints for TypeScript files that import this (the free version is TS).
 * @typedef {{ id: string, type: string, userId: string, createdAt: string }} Activity
 * @param {{ activities?: Activity[], gardenId?: string, today?: string, rules?: typeof GARDEN_RULES }} [options]
 */
export function buildGarden({
  activities = [],
  gardenId = 'garden',
  today = localDateStr(new Date()),
  rules = GARDEN_RULES,
} = {}) {
  const todayN = dayNumber(today);
  const launchN = dayNumber(rules.launchDate);

  // ── 1. Group actions by local day (and apply the notes/goals cap) ──
  const byDay = new Map();
  const extraCount = new Map();
  let totalActions = 0;
  const sorted = activities
    .filter(a => a && a.id && a.createdAt)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  for (const a of sorted) {
    const d = dayNumber(localDateStr(new Date(a.createdAt)));
    if (d > todayN) continue;
    if (a.type !== 'question') {
      const k = `${d}:${a.userId}`;
      const used = extraCount.get(k) || 0;
      if (used >= rules.dailyExtraCap) continue; // saved, but doesn't plant
      extraCount.set(k, used + 1);
    }
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(a);
    totalActions++;
  }

  if (byDay.size === 0) {
    return {
      empty: true, plants: [], plotRing: 1, streak: 0, bestStreak: 0,
      todayActive: false, quietDays: 0, dryness: 0, status: 'empty',
      diedSoFar: 0, revivedToday: false, revivedFrom: 0,
      nextMilestone: { kind: 'bush', inDays: rules.bushEvery },
      counts: { flowers: 0, bushes: 0, trees: 0, total: 0 }, totalActions: 0,
    };
  }

  // ── 2. Replay, day by day ──
  const cells = cellOrder(gardenId, rules.maxRing);
  const occupied = new Set();          // "i,j" of taken cells
  const plants = new Map();            // id → plant (insertion order = age)
  let run = 0, best = 0, runAtStartOfToday = 0;
  let weekFlowers = [];                // flower ids planted in this streak week
  let weekBush = null;                 // bush grown at the last 7-day mark
  let lastActive = null, maxEverRing = 0;
  let diedSinceActive = 0, revivedToday = false, revivedFrom = 0;

  const cellKey = c => `${c.i},${c.j}`;
  const freeCell = () => cells.find(c => !occupied.has(cellKey(c)));
  const place = (plant, cell) => {
    plant.cell = { i: cell.i, j: cell.j };
    occupied.add(cellKey(cell));
    plants.set(plant.id, plant);
    maxEverRing = Math.max(maxEverRing, Math.abs(cell.i), Math.abs(cell.j));
  };
  const remove = id => {
    const p = plants.get(id);
    if (!p) return;
    occupied.delete(cellKey(p.cell));
    plants.delete(id);
  };
  const jitter = id => ({ x: hash01(id + 'x') * 2 - 1, y: hash01(id + 'y') * 2 - 1 });

  // Several plants grow together into one, standing where the oldest stood.
  const merge = (ids, kind, day, extra = {}) => {
    const parts = ids.map(id => plants.get(id)).filter(Boolean);
    if (parts.length === 0) return null;
    const anchorCell = parts[0].cell;
    const owners = [...new Set(parts.flatMap(p => p.owners))];
    parts.forEach(p => remove(p.id));
    const plant = { id: `${kind}-${parts[0].id}`, kind, owners, born: day, jitter: jitter(parts[0].id), growth: 0, ...extra };
    place(plant, anchorCell);
    return plant;
  };

  // Plot is full: the oldest flowers (not this week's) tidy into a bush.
  const tidy = day => {
    const old = [...plants.values()].filter(p => p.kind === 'flower' && !weekFlowers.includes(p.id));
    if (old.length >= 2) return merge(old.slice(0, 7).map(p => p.id), 'bush', day);
    const bushes = [...plants.values()].filter(p => p.kind === 'bush' && p.id !== weekBush);
    if (bushes.length >= 2) return merge(bushes.slice(0, 2).map(p => p.id), 'tree', day);
    return null;
  };

  // A quiet day too many: one plant dries away for good.
  // Returns false when there was nothing left to die.
  const killOne = () => {
    const all = [...plants.values()];
    const pick = (kind, order) => all.filter(p => p.kind === kind).sort(order)[0];
    const victim =
      pick('flower', (a, b) => b.born - a.born) ||   // youngest flowers first
      pick('bush', (a, b) => b.born - a.born) ||
      pick('tree', (a, b) => a.growth - b.growth);   // oldest tree survives longest
    if (!victim) return false;
    remove(victim.id);
    return true;
  };

  // Quiet days that count for drying (nothing counts before launch day).
  const effectiveQuiet = day => Math.max(0, day - Math.max(lastActive, launchN - 1));

  const firstN = Math.min(...byDay.keys());
  for (let day = firstN; day <= todayN; day++) {
    if (day === todayN) runAtStartOfToday = run;
    const acts = byDay.get(day);

    if (acts) {
      // Coming back after the garden started drying? → rain + revival.
      if (day === todayN && lastActive !== null) {
        const q = effectiveQuiet(day - 1);
        if (q >= rules.fadeAfter) { revivedToday = true; revivedFrom = drynessFor(q, rules); }
      }
      diedSinceActive = 0;
      run += 1;
      best = Math.max(best, run);

      for (const a of acts) {
        let cell = freeCell();
        if (!cell) { tidy(day); cell = freeCell(); }
        if (!cell) continue;
        place({ id: a.id, kind: 'flower', type: a.type, owners: [a.userId], born: day, jitter: jitter(a.id), growth: 0 }, cell);
        weekFlowers.push(a.id);
      }
      for (const p of plants.values()) if (p.kind === 'tree') p.growth += 1;

      if (run % rules.bushEvery === 0) {
        if (run % rules.treeEvery === 0 && weekBush && plants.has(weekBush)) {
          merge([weekBush, ...weekFlowers], 'tree', day);
          weekBush = null;
        } else {
          weekBush = merge(weekFlowers, 'bush', day)?.id || null;
        }
        weekFlowers = [];
      }
      lastActive = day;
    } else {
      if (run > 0) { run = 0; weekFlowers = []; weekBush = null; }
      if (effectiveQuiet(day) >= rules.dyingAfter && killOne()) diedSinceActive++;
    }
  }

  // ── 3. Describe today ──
  const todayActive = lastActive === todayN;
  const quietDays = todayActive ? 0 : todayN - lastActive;
  const eq = todayActive ? 0 : effectiveQuiet(todayN);
  // A streak survives until midnight: yesterday active → still alive today.
  const streak = todayActive ? run : (quietDays === 1 ? runAtStartOfToday : 0);
  const baseRun = todayActive ? run : streak;
  const inDays = rules.bushEvery - (baseRun % rules.bushEvery);
  const nextKind = (baseRun + inDays) % rules.treeEvery === 0 ? 'tree' : 'bush';

  const list = [...plants.values()].map(p => ({
    ...p,
    stage: p.kind === 'tree' ? treeStage(p.growth, rules) : null,
    isNew: p.born === todayN,
  }));

  return {
    empty: false,
    plants: list,
    // Visible plot size in rings (1 = 3×3 island). Soil never shrinks back.
    plotRing: Math.min(rules.maxRing, Math.max(1, maxEverRing)),
    streak,
    bestStreak: best,
    todayActive,
    quietDays,
    dryness: drynessFor(eq, rules),
    status: todayActive && revivedToday ? 'revived' : statusFor(eq, rules),
    diedSoFar: diedSinceActive,
    revivedToday,
    revivedFrom,
    nextMilestone: { kind: nextKind, inDays },
    counts: {
      flowers: list.filter(p => p.kind === 'flower').length,
      bushes: list.filter(p => p.kind === 'bush').length,
      trees: list.filter(p => p.kind === 'tree').length,
      total: list.length,
    },
    totalActions,
  };
}
