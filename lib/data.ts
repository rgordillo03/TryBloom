// ─── Legacy shim ──────────────────────────────────────────
// All content now lives in lib/i18n.ts, split by locale.
// This file re-exports the English set so any older import
// paths keep working.

export {
  getDayOfYear,
  FLOWER_COLORS,
  QUESTIONS_BY_LOCALE,
  QUOTES_BY_LOCALE,
} from './i18n';

import { QUESTIONS_BY_LOCALE, QUOTES_BY_LOCALE } from './i18n';

export const QUESTIONS = QUESTIONS_BY_LOCALE.en;
export const QUOTES = QUOTES_BY_LOCALE.en;
