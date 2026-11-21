// ═══════════════════════════════════════════════════════════════
// AVATARS — the little emoji each person picks in Settings → You
// ═══════════════════════════════════════════════════════════════
// We save the short `id` (in the real app: profiles.avatar; in this free
// version: localStorage 'bloom_try_avatar'), never the emoji itself.
// That way we can restyle an avatar later without touching saved data.
//
// Same list as the real app's src/lib/avatars.js — keep them in sync.
// ═══════════════════════════════════════════════════════════════

export const AVATARS = [
  { id: 'sprout',   emoji: '🌱' },
  { id: 'blossom',  emoji: '🌸' },
  { id: 'mushroom', emoji: '🍄' },
  { id: 'moon',     emoji: '🌙' },
  { id: 'sun',      emoji: '🌞' },
];

export function avatarEmoji(id) {
  return AVATARS.find(a => a.id === id)?.emoji || null;
}
