// ═══════════════════════════════════════════════════════════════
// DATES — everything in the user's LOCAL timezone
// ═══════════════════════════════════════════════════════════════
// Kept in its own tiny file (no Supabase import) so the garden engine
// can use it, and so it can be tested on its own.
//
// ⚠️ Phase 2 bug fix: todayDateStr() used to be
//      new Date().toISOString().split('T')[0]
//    toISOString() always speaks UTC (London winter time), so in Cologne
//    anything saved between 00:00 and 01:00 (02:00 in summer) was stamped
//    with YESTERDAY's date — blocking that day's check-in and breaking
//    streaks. Now we read the local calendar parts directly.
// ═══════════════════════════════════════════════════════════════

// A Date → 'YYYY-MM-DD' as the user's own calendar shows it.
export function localDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayDateStr() {
  return localDateStr(new Date());
}

// 'YYYY-MM-DD' → whole-day counter (days since 1970-01-01).
// Makes "how many days between" a simple subtraction.
export function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
