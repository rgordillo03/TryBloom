// ═══════════════════════════════════════════════════════════════
// GARDEN RULES — the "game design" numbers, all in one place
// ═══════════════════════════════════════════════════════════════
// Change a number here, push, and the whole garden follows.
// Every garden is re-grown from its history each time it's opened, so
// new rules apply to everyone at once (including their past).
//
// 🔁 FREE VERSION NOTE: this whole `garden/` folder is a copy of the real
// app's `src/garden/` (bloom repo). Keep them the same — if you change a
// rule or a drawing there, copy the file here too (and the other way round).
// In the free version the history lives only in the visitor's browser.
// ═══════════════════════════════════════════════════════════════

export const GARDEN_RULES = {
  // ── Launch grace ────────────────────────────────────────────
  // Drying and dying only count from this date on, so nobody opens the
  // update to a dead garden. 👉 Set this to the day you merge Phase 2.
  launchDate: '2026-11-10',

  // ── Planting ────────────────────────────────────────────────
  // Each answered question plants 1 flower (the database already allows
  // only 1 per person per garden per day). Notes + goals together plant
  // at most this many flowers per person per day, so nobody can fill the
  // garden by spamming 50 notes. Extra notes are still saved, they just
  // don't plant.
  dailyExtraCap: 3,

  // ── Streak growth ───────────────────────────────────────────
  // Every 7th streak day, that week's flowers grow together into a bush.
  // Every 14th streak day, the bush + that week's flowers become a tree.
  bushEvery: 7,
  treeEvery: 14,

  // Trees keep maturing (counted in active days since the tree was born).
  // The first tree is born on streak day 14, so it blossoms around day 30
  // and grows fruit + a bird's nest around day 60.
  treeStages: { grown: 7, blossoming: 16, fruiting: 46 },

  // ── Drying & dying ("real stakes") ──────────────────────────
  // Counted in quiet days since the last action (1 = yesterday was active).
  fadeAfter: 2,     // colors start fading
  thirstyAfter: 5,  // plants droop — the last warning
  dyingAfter: 7,    // from here, ONE plant dies per quiet day, for good:
                    // newest flowers first, then bushes, trees last.

  // ── Space ───────────────────────────────────────────────────
  // The plot starts as a tiny 3×3 island and grows ring by ring up to
  // (2 × maxRing + 1)² cells. 4 → 9×9 = 81 spots. When it's full, the
  // oldest flowers tidy themselves into a bush.
  maxRing: 4,
};
